"use server";

import { createClient } from "@/lib/supabase/server";
import { verifySession, assertMfaSatisfied } from "@/lib/dal";
import { getCourseLessons } from "@/lib/course-content";

export async function verifyInstructor() {
  const session = await verifySession();
  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from("users")
    .select("role")
    .eq("id", session.userId)
    .single();

  if (error || !profile || (profile.role !== "instructor" && profile.role !== "admin")) {
    throw new Error("Unauthorized. Instructor access required.");
  }

  assertMfaSatisfied(profile.role, session.aal);

  return { userId: session.userId, role: profile.role };
}

export interface InstructorCourseStats {
  id: string;
  title: string;
  status: string;
  batch: string | null;
  enrollments: number;
  lessons: number;
  /** Lessons completed, summed over all enrolled students. */
  completedLessons: number;
  /** completedLessons / (enrollments x lessons), 0-100. */
  progress: number;
}

export interface InstructorDashboardData {
  error?: string;
  role?: "admin" | "instructor";
  courses?: InstructorCourseStats[];
  totals?: { courses: number; published: number; enrollments: number; progress: number };
}

/**
 * Per-course teaching stats. Admins see every course, instructors only their own.
 * Uses COUNT queries (never row lists), so large courses are not cut off at the API's row limit.
 */
export async function getInstructorDashboardData(): Promise<InstructorDashboardData> {
  let auth: { userId: string; role: string };
  try {
    auth = await verifyInstructor();
  } catch {
    return { error: "Unauthorized." };
  }
  const role = auth.role === "admin" ? "admin" : "instructor";
  const supabase = await createClient();

  let query = supabase
    .from("courses")
    .select("id, title, status, batch, hierarchy_type")
    .order("created_at", { ascending: false });
  if (role !== "admin") query = query.eq("instructor_id", auth.userId);

  const { data: courseRows, error } = await query;
  if (error) return { error: "Could not load your courses." };

  const courses = await Promise.all(
    (courseRows ?? []).map(async (c): Promise<InstructorCourseStats> => {
      const [enrollRes, doneRes, lessonList] = await Promise.all([
        supabase.from("enrollments").select("id", { count: "exact", head: true }).eq("course_id", c.id),
        supabase
          .from("lesson_progress")
          .select("id, enrollments!inner(course_id)", { count: "exact", head: true })
          .eq("completed", true)
          .eq("enrollments.course_id", c.id),
        // Shared, cached course structure (same for everyone); safe after the role check above.
        getCourseLessons(c.id, c.hierarchy_type ?? 1).catch(() => []),
      ]);
      const enrollments = enrollRes.count ?? 0;
      const lessons = lessonList.length;
      const completedLessons = doneRes.count ?? 0;
      const possible = enrollments * lessons;
      return {
        id: c.id,
        title: c.title,
        status: c.status,
        batch: c.batch,
        enrollments,
        lessons,
        completedLessons,
        progress: possible > 0 ? Math.min(100, Math.round((completedLessons / possible) * 100)) : 0,
      };
    })
  );

  const possible = courses.reduce((n, c) => n + c.enrollments * c.lessons, 0);
  const done = courses.reduce((n, c) => n + c.completedLessons, 0);

  return {
    role,
    courses,
    totals: {
      courses: courses.length,
      published: courses.filter((c) => c.status === "published").length,
      enrollments: courses.reduce((n, c) => n + c.enrollments, 0),
      progress: possible > 0 ? Math.min(100, Math.round((done / possible) * 100)) : 0,
    },
  };
}

export async function getInstructorCourses() {
  const session = await verifySession();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", session.userId)
    .single();

  const role = profile?.role as string;

  const { data: courses } = role === "admin"
    ? await supabase.from("courses").select("id, title, status, batch, created_at").order("created_at", { ascending: false })
    : await supabase.from("courses").select("id, title, status, batch, created_at").eq("instructor_id", session.userId).order("created_at", { ascending: false });

  return courses ?? [];
}

export async function getInstructorStudentSubmissions() {
  const session = await verifySession();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", session.userId)
    .single();

  const role = profile?.role as string;

  const { data: instructorCourses } = role === "admin"
    ? await supabase.from("courses").select("id, title")
    : await supabase.from("courses").select("id, title").eq("instructor_id", session.userId);

  if (!instructorCourses?.length) {
    return { submissions: [], courses: [] };
  }

  const courseIds = instructorCourses.map((c) => c.id);

  // Get all enrollments for these courses with user info
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("id, user_id, course_id, enrolled_at, users(id, full_name, email), courses(id, title)")
    .in("course_id", courseIds);

  // Get lesson progress for each enrollment
  const submissions: Array<{
    studentName: string;
    studentEmail: string;
    courseTitle: string;
    completedLessons: number;
    totalLessons: number;
    progressPercent: number;
    enrolledAt: string;
  }> = [];

  for (const enrollment of enrollments ?? []) {
    const user = Array.isArray(enrollment.users) ? enrollment.users[0] : enrollment.users;
    const course = Array.isArray(enrollment.courses) ? enrollment.courses[0] : enrollment.courses;

    const { data: progress } = await supabase
      .from("lesson_progress")
      .select("completed")
      .eq("enrollment_id", enrollment.id);

    const totalLessons = progress?.length ?? 0;
    const completedLessons = progress?.filter((p) => p.completed).length ?? 0;
    const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    submissions.push({
      studentName: user?.full_name ?? "Unknown",
      studentEmail: user?.email ?? "",
      courseTitle: course?.title ?? "Unknown Course",
      completedLessons,
      totalLessons,
      progressPercent,
      enrolledAt: enrollment.enrolled_at,
    });
  }

  return { submissions, courses: instructorCourses };
}

export async function getInstructorAnalytics() {
  const session = await verifySession();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", session.userId)
    .single();

  const role = profile?.role as string;
  const { data: instructorCourses } = role === "admin"
    ? await supabase.from("courses").select("id, title")
    : await supabase.from("courses").select("id, title").eq("instructor_id", session.userId);

  if (!instructorCourses?.length) {
    return { analytics: null };
  }

  // Per-course analytics
  const courseAnalytics: Array<{
    courseId: string;
    courseTitle: string;
    enrolledStudents: number;
    avgProgress: number;
    totalLessons: number;
    activeStudents: number; // students with at least one lesson completed
  }> = [];

  for (const course of instructorCourses) {
    // Get enrollments
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("id")
      .eq("course_id", course.id);

    const enrolledStudents = enrollments?.length ?? 0;

    // Get lessons directly under course
    const { data: directLessons } = await supabase
      .from("lessons")
      .select("id")
      .eq("course_id", course.id);

    // Get subjects for this course, then lessons under them
    const { data: subjects } = await supabase
      .from("subjects")
      .select("id")
      .eq("course_id", course.id);

    const subjectIds = (subjects ?? []).map((s) => s.id);
    const { data: subjectLessons } = subjectIds.length > 0
      ? await supabase.from("lessons").select("id").in("subject_id", subjectIds)
      : { data: [] };

    const totalLessons = [...(directLessons ?? []), ...(subjectLessons ?? [])].length;

    // Get student-level progress
    let totalProgress = 0;
    let activeStudents = 0;

    for (const enrollment of enrollments ?? []) {
      const { data: progress } = await supabase
        .from("lesson_progress")
        .select("completed")
        .eq("enrollment_id", enrollment.id);

      if (progress && progress.length > 0) {
        const completedCount = progress.filter((p) => p.completed).length;
        const avg = Math.round((completedCount / progress.length) * 100);
        totalProgress += avg;
        if (completedCount > 0) activeStudents++;
      }
    }

    const avgProgress = enrolledStudents > 0 ? Math.round(totalProgress / enrolledStudents) : 0;

    courseAnalytics.push({
      courseId: course.id,
      courseTitle: course.title,
      enrolledStudents,
      avgProgress,
      totalLessons,
      activeStudents,
    });
  }

  return { analytics: courseAnalytics };
}
