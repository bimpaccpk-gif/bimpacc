"use server";

import { createClient } from "@/lib/supabase/server";
import { verifySession } from "@/lib/dal";

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

  return { userId: session.userId, role: profile.role };
}

export async function getInstructorDashboardData() {
  const session = await verifySession();
  const supabase = await createClient();

  // Verify instructor role
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", session.userId)
    .single();

  if (!profile || (profile.role !== "instructor" && profile.role !== "admin")) {
    return { error: "Unauthorized." };
  }

  // Get courses where this instructor is the instructor_id, or all courses if admin
  const role = profile.role as string;

  const { data: coursesList } = role === "admin"
    ? await supabase.from("courses").select("id, title, status, created_at, batch").order("created_at", { ascending: false })
    : await supabase.from("courses").select("id, title, status, created_at, batch").eq("instructor_id", session.userId).order("created_at", { ascending: false });

  const courses = coursesList ?? [];

  // Get total enrollments across these courses
  const courseIds = courses.map((c) => c.id);
  let totalStudents = 0;
  let enrollmentMap: Record<string, number> = {};

  if (courseIds.length > 0) {
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("user_id, course_id")
      .in("course_id", courseIds);

    if (enrollments) {
      const uniqueUserIds = new Set(enrollments.map((e) => e.user_id));
      totalStudents = uniqueUserIds.size;
      enrollmentMap = enrollments.reduce(
        (acc, e) => {
          acc[e.course_id] = (acc[e.course_id] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );
    }
  }

  // Calculate completion rate from lesson_progress for enrollments in these courses
  let completionRate = 0;
  // Get enrollment IDs for these courses
    const { data: courseEnrollments } = await supabase
      .from("enrollments")
      .select("id")
      .in("course_id", courseIds);

    const enrollmentIds = courseEnrollments?.map((e) => e.id) ?? [];

    if (enrollmentIds.length > 0) {
      const { data: progressData } = await supabase
        .from("lesson_progress")
        .select("completed")
        .in("enrollment_id", enrollmentIds);

    if (progressData && progressData.length > 0) {
      const completedCount = progressData.filter((p) => p.completed).length;
      completionRate = Math.round((completedCount / progressData.length) * 100);
    }
  }

  return {
    courses,
    totalStudents,
    completionRate,
    enrollmentMap,
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
