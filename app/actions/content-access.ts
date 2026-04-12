"use server";

import { verifySession, verifyAdmin } from "@/lib/dal";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logAuditEvent } from "@/app/actions/admin";
import type {
  ContentAccessType,
  StudentContentAccess,
  CourseAccessTree,
  SemesterAccessNode,
  SubjectAccessNode,
  LessonAccessNode,
} from "@/types";

// ─── Set per-student content access override ─────────────

export async function setStudentContentAccess(
  userId: string,
  contentType: ContentAccessType,
  contentId: string,
  isPaused: boolean,
  reason: string = ""
): Promise<{ error: string; success: string }> {
  const session = await verifySession();
  const supabase = await createClient();

  const { data: caller } = await supabase
    .from("users")
    .select("role")
    .eq("id", session.userId)
    .single();

  if ((caller as any)?.role !== "admin") {
    return { error: "Unauthorized. Admin access required.", success: "" };
  }

  const admin = createAdminClient();

  const { error } = await admin.from("student_content_access").upsert(
    {
      user_id: userId,
      content_type: contentType,
      content_id: contentId,
      is_paused: isPaused,
      paused_by: session.userId,
      reason,
    } as never,
    { onConflict: "user_id,content_type,content_id" }
  );

  if (error) {
    return { error: error.message, success: "" };
  }

  await logAuditEvent(
    session.userId,
    userId,
    isPaused ? "content_access.paused" : "content_access.unpaused",
    { content_type: contentType, content_id: contentId, reason }
  );

  revalidatePath("/admin/users");
  revalidatePath("/admin/courses");
  return {
    error: "",
    success: `${contentType.charAt(0).toUpperCase() + contentType.slice(1)} ${isPaused ? "paused" : "resumed"} for student.`,
  };
}

// ─── Remove per-student content access override ──────────

export async function removeStudentContentAccess(
  userId: string,
  contentType: ContentAccessType,
  contentId: string
): Promise<{ error: string; success: string }> {
  const session = await verifySession();
  const supabase = await createClient();

  const { data: caller } = await supabase
    .from("users")
    .select("role")
    .eq("id", session.userId)
    .single();

  if ((caller as any)?.role !== "admin") {
    return { error: "Unauthorized. Admin access required.", success: "" };
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from("student_content_access")
    .delete()
    .eq("user_id", userId)
    .eq("content_type", contentType)
    .eq("content_id", contentId);

  if (error) {
    return { error: error.message, success: "" };
  }

  await logAuditEvent(session.userId, userId, "content_access.override_removed", {
    content_type: contentType,
    content_id: contentId,
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin/courses");
  return { error: "", success: "Override removed. Content uses global status now." };
}

// ─── Get all access overrides for a student ──────────────

export async function getStudentAccessOverrides(
  userId: string
): Promise<{ data: StudentContentAccess[]; error: string }> {
  const session = await verifySession();
  const supabase = await createClient();

  const { data: caller } = await supabase
    .from("users")
    .select("role")
    .eq("id", session.userId)
    .single();

  if ((caller as any)?.role !== "admin") {
    return { data: [], error: "Unauthorized." };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("student_content_access")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data ?? []) as StudentContentAccess[], error: "" };
}

// ─── Get full course access tree for a student ───────────

export async function getCourseAccessForStudent(
  userId: string,
  courseId: string
): Promise<{ data: CourseAccessTree | null; error: string }> {
  const session = await verifySession();
  const supabase = await createClient();

  const { data: caller } = await supabase
    .from("users")
    .select("role")
    .eq("id", session.userId)
    .single();

  if ((caller as any)?.role !== "admin") {
    return { data: null, error: "Unauthorized." };
  }

  const admin = createAdminClient();

  // Get all overrides for this student
  const { data: overrides } = await admin
    .from("student_content_access")
    .select("*")
    .eq("user_id", userId);

  const overrideMap = new Map<string, StudentContentAccess>();
  for (const o of (overrides as StudentContentAccess[]) ?? []) {
    overrideMap.set(`${o.content_type}:${o.content_id}`, o);
  }

  // Get course
  const { data: course } = await admin
    .from("courses")
    .select("id, title, hierarchy_type, is_paused")
    .eq("id", courseId)
    .single();

  if (!course) {
    return { data: null, error: "Course not found." };
  }

  const c = course as any;
  const tree: CourseAccessTree = {
    courseId: c.id,
    courseTitle: c.title,
    courseIsPaused: c.is_paused ?? false,
    studentOverride: overrideMap.get(`course:${c.id}`) ?? null,
    semesters: [],
    subjects: [],
    directLessons: [],
  };

  if (c.hierarchy_type === 1) {
    // Course → Semester → Subject → Lesson
    const { data: semesters } = await admin
      .from("semesters")
      .select("id, title, is_paused")
      .eq("course_id", courseId)
      .order("order_index", { ascending: true });

    for (const sem of (semesters as any[]) ?? []) {
      const semesterNode: SemesterAccessNode = {
        id: sem.id,
        title: sem.title,
        isPaused: sem.is_paused ?? false,
        studentOverride: overrideMap.get(`semester:${sem.id}`) ?? null,
        subjects: [],
      };

      const { data: subjects } = await admin
        .from("subjects")
        .select("id, title, is_paused")
        .eq("semester_id", sem.id)
        .order("order_index", { ascending: true });

      for (const subj of (subjects as any[]) ?? []) {
        const subjectNode: SubjectAccessNode = {
          id: subj.id,
          title: subj.title,
          isPaused: subj.is_paused ?? false,
          studentOverride: overrideMap.get(`subject:${subj.id}`) ?? null,
          lessons: [],
        };

        const { data: lessons } = await admin
          .from("lessons")
          .select("id, title, is_paused")
          .eq("subject_id", subj.id)
          .order("order_index", { ascending: true });

        for (const lesson of (lessons as any[]) ?? []) {
          subjectNode.lessons.push({
            id: lesson.id,
            title: lesson.title,
            isPaused: lesson.is_paused ?? false,
            studentOverride: overrideMap.get(`lesson:${lesson.id}`) ?? null,
          });
        }

        semesterNode.subjects.push(subjectNode);
      }

      tree.semesters.push(semesterNode);
    }
  } else if (c.hierarchy_type === 2) {
    // Course → Subject → Lesson
    const { data: subjects } = await admin
      .from("subjects")
      .select("id, title, is_paused")
      .eq("course_id", courseId)
      .order("order_index", { ascending: true });

    for (const subj of (subjects as any[]) ?? []) {
      const subjectNode: SubjectAccessNode = {
        id: subj.id,
        title: subj.title,
        isPaused: subj.is_paused ?? false,
        studentOverride: overrideMap.get(`subject:${subj.id}`) ?? null,
        lessons: [],
      };

      const { data: lessons } = await admin
        .from("lessons")
        .select("id, title, is_paused")
        .eq("subject_id", subj.id)
        .order("order_index", { ascending: true });

      for (const lesson of (lessons as any[]) ?? []) {
        subjectNode.lessons.push({
          id: lesson.id,
          title: lesson.title,
          isPaused: lesson.is_paused ?? false,
          studentOverride: overrideMap.get(`lesson:${lesson.id}`) ?? null,
        });
      }

      tree.subjects.push(subjectNode);
    }
  } else {
    // Type 3: Course → Lesson (direct)
    const { data: lessons } = await admin
      .from("lessons")
      .select("id, title, is_paused")
      .eq("course_id", courseId)
      .order("order_index", { ascending: true });

    for (const lesson of (lessons as any[]) ?? []) {
      tree.directLessons.push({
        id: lesson.id,
        title: lesson.title,
        isPaused: lesson.is_paused ?? false,
        studentOverride: overrideMap.get(`lesson:${lesson.id}`) ?? null,
      });
    }
  }

  return { data: tree, error: "" };
}

// ─── Get all enrolled students with their access status for a course ──

export async function getCourseStudentAccessList(
  courseId: string
): Promise<{
  data: Array<{
    userId: string;
    userName: string;
    email: string;
    isPaused: boolean;
    overrideId: string | null;
    progress: number | null;
    enrolledAt: string | null;
  }>;
  error: string;
}> {
  const session = await verifySession();
  const supabase = await createClient();

  const { data: caller } = await supabase
    .from("users")
    .select("role")
    .eq("id", session.userId)
    .single();

  if ((caller as any)?.role !== "admin") {
    return { data: [], error: "Unauthorized." };
  }

  const admin = createAdminClient();

  // Get all enrollments for this course with user info and progress
  const { data: enrollments } = await admin
    .from("enrollments")
    .select("user_id, progress, enrolled_at, users!enrollments_user_id_fkey(id, full_name, email)")
    .eq("course_id", courseId)
    .order("enrolled_at", { ascending: false });

  // Get all course-level overrides for these students
  const userIds = ((enrollments as any[]) ?? []).map((e: any) => e.user_id);
  const overridesMap = new Map<string, StudentContentAccess>();

  if (userIds.length > 0) {
    const { data: overrides } = await admin
      .from("student_content_access")
      .select("*")
      .in("user_id", userIds)
      .eq("content_type", "course")
      .eq("content_id", courseId);

    for (const o of (overrides as StudentContentAccess[]) ?? []) {
      overridesMap.set(o.user_id, o);
    }
  }

  // Get course global pause status
  const { data: course } = await admin
    .from("courses")
    .select("is_paused")
    .eq("id", courseId)
    .single();

  const globalPaused = (course as any)?.is_paused ?? false;

  const result = ((enrollments as any[]) ?? []).map((e: any) => {
    const user = Array.isArray(e.users) ? e.users[0] : e.users;
    const override = overridesMap.get(e.user_id);
    const isPaused = override ? override.is_paused : globalPaused;
    return {
      userId: e.user_id,
      userName: user?.full_name ?? "Unknown",
      email: user?.email ?? "",
      isPaused,
      overrideId: override?.id ?? null,
      progress: e.progress ?? null,
      enrolledAt: e.enrolled_at ?? null,
    };
  });

  return { data: result, error: "" };
}

// ─── Bulk pause/resume for multiple students ─────────────

export async function bulkPauseForStudents(
  contentType: ContentAccessType,
  contentId: string,
  isPaused: boolean,
  studentIds: string[]
): Promise<{ error: string; success: string }> {
  const session = await verifySession();
  const supabase = await createClient();

  const { data: caller } = await supabase
    .from("users")
    .select("role")
    .eq("id", session.userId)
    .single();

  if ((caller as any)?.role !== "admin") {
    return { error: "Unauthorized. Admin access required.", success: "" };
  }

  if (studentIds.length === 0) {
    return { error: "No students selected.", success: "" };
  }

  const admin = createAdminClient();

  const rows = studentIds.map((uid) => ({
    user_id: uid,
    content_type: contentType,
    content_id: contentId,
    is_paused: isPaused,
    paused_by: session.userId,
  }));

  const { error } = await admin
    .from("student_content_access")
    .upsert(rows as never, { onConflict: "user_id,content_type,content_id" });

  if (error) {
    return { error: error.message, success: "" };
  }

  await logAuditEvent(session.userId, null, "content_access.bulk_update", {
    content_type: contentType,
    content_id: contentId,
    is_paused: isPaused,
    student_count: studentIds.length,
    student_ids: studentIds,
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin/courses");
  return {
    error: "",
    success: `${contentType.charAt(0).toUpperCase() + contentType.slice(1)} ${isPaused ? "paused" : "resumed"} for ${studentIds.length} student(s).`,
  };
}

// ─── Pause course + cascade to subjects and lessons ──────

export async function pauseCourseCascade(
  userId: string,
  courseId: string,
  isPaused: boolean
): Promise<{ error: string; success: string }> {
  const session = await verifySession();
  const supabase = await createClient();

  const { data: caller } = await supabase
    .from("users")
    .select("role")
    .eq("id", session.userId)
    .single();

  if ((caller as any)?.role !== "admin") {
    return { error: "Unauthorized. Admin access required.", success: "" };
  }

  const admin = createAdminClient();

  // Get course hierarchy type
  const { data: course } = await admin
    .from("courses")
    .select("hierarchy_type")
    .eq("id", courseId)
    .single();

  const rows: any[] = [
    {
      user_id: userId,
      content_type: "course",
      content_id: courseId,
      is_paused: isPaused,
      paused_by: session.userId,
    },
  ];

  if ((course as any)?.hierarchy_type === 1) {
    // Type 1: Get semesters -> subjects -> lessons
    const { data: semesters } = await admin.from("semesters").select("id").eq("course_id", courseId);

    for (const sem of (semesters as any[]) ?? []) {
      rows.push({
        user_id: userId,
        content_type: "semester",
        content_id: sem.id,
        is_paused: isPaused,
        paused_by: session.userId,
      });

      const { data: subjects } = await admin.from("subjects").select("id").eq("semester_id", sem.id);

      for (const s of (subjects as any[]) ?? []) {
        rows.push({
          user_id: userId,
          content_type: "subject",
          content_id: s.id,
          is_paused: isPaused,
          paused_by: session.userId,
        });

        const { data: lessons } = await admin.from("lessons").select("id").eq("subject_id", s.id);

        for (const l of (lessons as any[]) ?? []) {
          rows.push({
            user_id: userId,
            content_type: "lesson",
            content_id: l.id,
            is_paused: isPaused,
            paused_by: session.userId,
          });
        }
      }
    }
  } else {
    // Get direct lessons
    const { data: lessons } = await admin.from("lessons").select("id").eq("course_id", courseId);

    for (const l of (lessons as any[]) ?? []) {
      rows.push({
        user_id: userId,
        content_type: "lesson",
        content_id: l.id,
        is_paused: isPaused,
        paused_by: session.userId,
      });
    }
  }

  const { error } = await admin
    .from("student_content_access")
    .upsert(rows as never, { onConflict: "user_id,content_type,content_id" });

  if (error) {
    return { error: error.message, success: "" };
  }

  await logAuditEvent(
    session.userId,
    userId,
    isPaused ? "content_access.paused" : "content_access.unpaused",
    {
      content_type: "course",
      content_id: courseId,
      cascade: true,
      items_affected: rows.length,
    }
  );

  revalidatePath("/admin/users");
  revalidatePath("/admin/courses");
  return {
    error: "",
    success: `Course and all its content ${isPaused ? "paused" : "resumed"} for student (${rows.length} items).`,
  };
}

// ─── Resolve effective access for a student ──────────────

export async function resolveEffectiveAccess(
  userId: string,
  contentType: ContentAccessType,
  contentId: string
): Promise<{ isPaused: boolean; source: string }> {
  try {
    await verifyAdmin();
  } catch {
    return { isPaused: false, source: "unauthorized" };
  }

  const admin = createAdminClient();

  // Check per-student override
  const { data: override } = await admin
    .from("student_content_access")
    .select("is_paused")
    .eq("user_id", userId)
    .eq("content_type", contentType)
    .eq("content_id", contentId)
    .maybeSingle();

  if (override) {
    return { isPaused: (override as any).is_paused, source: "student_override" };
  }

  // Fall back to global
  const table =
    contentType === "course"
      ? "courses"
      : contentType === "semester"
        ? "semesters"
        : contentType === "subject"
          ? "subjects"
          : "lessons";
  const { data: content } = await admin
    .from(table)
    .select("is_paused")
    .eq("id", contentId)
    .single();

  return { isPaused: (content as any)?.is_paused ?? false, source: "global" };
}
