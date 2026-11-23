"use server";

import { verifySession } from "@/lib/dal";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type AccessLevel = "granted" | "blocked" | "not_set";
export type EffectiveStatus = "accessible" | "blocked" | "inherited";

export interface AccessTreeNode {
  id: string;
  type: "course" | "semester" | "subject" | "lesson";
  title: string;
  children?: AccessTreeNode[];
  accessLevel: AccessLevel;
  effectiveStatus: EffectiveStatus;
  globalPause?: boolean;
  parentBlocked?: boolean;
}

interface AccessResult {
  success: boolean;
  error?: string;
}

async function verifyAdmin(): Promise<boolean> {
  const session = await verifySession();
  const supabase = await createClient();
  const { data } = await supabase
    .from("users")
    .select("role")
    .eq("id", session.userId)
    .single();
  return data?.role === "admin";
}

// ─── Grant Access to Content ────────────────────────────────────────────────

export async function grantAccess(
  userId: string,
  contentType: "course" | "semester" | "subject" | "lesson",
  contentId: string
): Promise<AccessResult> {
  if (!(await verifyAdmin())) {
    return { success: false, error: "Unauthorized. Admin access required." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("student_content_access").upsert(
    {
      user_id: userId,
      content_type: contentType,
      content_id: contentId,
      is_paused: false,
      paused_by: (await verifySession()).userId,
      reason: "",
    },
    { onConflict: "user_id,content_type,content_id" }
  );

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/users");
  return { success: true };
}

export async function revokeAccess(
  userId: string,
  contentType: "course" | "semester" | "subject" | "lesson",
  contentId: string
): Promise<AccessResult> {
  if (!(await verifyAdmin())) {
    return { success: false, error: "Unauthorized. Admin access required." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("student_content_access").upsert(
    {
      user_id: userId,
      content_type: contentType,
      content_id: contentId,
      is_paused: true,
      paused_by: (await verifySession()).userId,
      reason: "",
    },
    { onConflict: "user_id,content_type,content_id" }
  );

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/users");
  return { success: true };
}

export async function removeAccessOverride(
  userId: string,
  contentType: "course" | "semester" | "subject" | "lesson",
  contentId: string
): Promise<AccessResult> {
  if (!(await verifyAdmin())) {
    return { success: false, error: "Unauthorized. Admin access required." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("student_content_access")
    .delete()
    .eq("user_id", userId)
    .eq("content_type", contentType)
    .eq("content_id", contentId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/users");
  return { success: true };
}

// ─── Cascade Operations ──────────────────────────────────────────────────────

interface CascadeItem {
  contentType: "course" | "semester" | "subject" | "lesson";
  contentId: string;
}

export async function grantAccessCascade(
  userId: string,
  courseId: string,
  hierarchyType: 1 | 2 | 3
): Promise<AccessResult> {
  if (!(await verifyAdmin())) {
    return { success: false, error: "Unauthorized. Admin access required." };
  }

  const admin = createAdminClient();
  const userIdParam = (await verifySession()).userId;
  const items: CascadeItem[] = [{ contentType: "course", contentId: courseId }];

  if (hierarchyType === 1) {
    const { data: semesters } = await admin
      .from("semesters")
      .select("id")
      .eq("course_id", courseId);

    for (const sem of semesters ?? []) {
      items.push({ contentType: "semester", contentId: sem.id });

      const { data: subjects } = await admin
        .from("subjects")
        .select("id")
        .eq("semester_id", sem.id);

      for (const subj of subjects ?? []) {
        items.push({ contentType: "subject", contentId: subj.id });

        const { data: lessons } = await admin
          .from("lessons")
          .select("id")
          .eq("subject_id", subj.id);

        for (const lesson of lessons ?? []) {
          items.push({ contentType: "lesson", contentId: lesson.id });
        }
      }
    }
  } else if (hierarchyType === 2) {
    const { data: subjects } = await admin
      .from("subjects")
      .select("id")
      .eq("course_id", courseId);

    for (const subj of subjects ?? []) {
      items.push({ contentType: "subject", contentId: subj.id });

      const { data: lessons } = await admin
        .from("lessons")
        .select("id")
        .eq("subject_id", subj.id);

      for (const lesson of lessons ?? []) {
        items.push({ contentType: "lesson", contentId: lesson.id });
      }
    }
  } else {
    const { data: lessons } = await admin
      .from("lessons")
      .select("id")
      .eq("course_id", courseId);

    for (const lesson of lessons ?? []) {
      items.push({ contentType: "lesson", contentId: lesson.id });
    }
  }

  const rows = items.map((item) => ({
    user_id: userId,
    content_type: item.contentType,
    content_id: item.contentId,
    is_paused: false,
    paused_by: userIdParam,
  }));

  const { error } = await admin.from("student_content_access").upsert(rows, {
    onConflict: "user_id,content_type,content_id",
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/users");
  return { success: true };
}

export async function revokeAccessCascade(
  userId: string,
  courseId: string,
  hierarchyType: 1 | 2 | 3
): Promise<AccessResult> {
  if (!(await verifyAdmin())) {
    return { success: false, error: "Unauthorized. Admin access required." };
  }

  const admin = createAdminClient();
  const userIdParam = (await verifySession()).userId;
  const items: CascadeItem[] = [{ contentType: "course", contentId: courseId }];

  if (hierarchyType === 1) {
    const { data: semesters } = await admin
      .from("semesters")
      .select("id")
      .eq("course_id", courseId);

    for (const sem of semesters ?? []) {
      items.push({ contentType: "semester", contentId: sem.id });

      const { data: subjects } = await admin
        .from("subjects")
        .select("id")
        .eq("semester_id", sem.id);

      for (const subj of subjects ?? []) {
        items.push({ contentType: "subject", contentId: subj.id });

        const { data: lessons } = await admin
          .from("lessons")
          .select("id")
          .eq("subject_id", subj.id);

        for (const lesson of lessons ?? []) {
          items.push({ contentType: "lesson", contentId: lesson.id });
        }
      }
    }
  } else if (hierarchyType === 2) {
    const { data: subjects } = await admin
      .from("subjects")
      .select("id")
      .eq("course_id", courseId);

    for (const subj of subjects ?? []) {
      items.push({ contentType: "subject", contentId: subj.id });

      const { data: lessons } = await admin
        .from("lessons")
        .select("id")
        .eq("subject_id", subj.id);

      for (const lesson of lessons ?? []) {
        items.push({ contentType: "lesson", contentId: lesson.id });
      }
    }
  } else {
    const { data: lessons } = await admin
      .from("lessons")
      .select("id")
      .eq("course_id", courseId);

    for (const lesson of lessons ?? []) {
      items.push({ contentType: "lesson", contentId: lesson.id });
    }
  }

  const rows = items.map((item) => ({
    user_id: userId,
    content_type: item.contentType,
    content_id: item.contentId,
    is_paused: true,
    paused_by: userIdParam,
  }));

  const { error } = await admin.from("student_content_access").upsert(rows, {
    onConflict: "user_id,content_type,content_id",
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/users");
  return { success: true };
}

export async function grantSemesterAccess(
  userId: string,
  semesterId: string
): Promise<AccessResult> {
  if (!(await verifyAdmin())) {
    return { success: false, error: "Unauthorized. Admin access required." };
  }

  const admin = createAdminClient();
  const userIdParam = (await verifySession()).userId;
  const items: CascadeItem[] = [{ contentType: "semester", contentId: semesterId }];

  const { data: subjects } = await admin
    .from("subjects")
    .select("id")
    .eq("semester_id", semesterId);

  for (const subj of subjects ?? []) {
    items.push({ contentType: "subject", contentId: subj.id });

    const { data: lessons } = await admin
      .from("lessons")
      .select("id")
      .eq("subject_id", subj.id);

    for (const lesson of lessons ?? []) {
      items.push({ contentType: "lesson", contentId: lesson.id });
    }
  }

  const rows = items.map((item) => ({
    user_id: userId,
    content_type: item.contentType,
    content_id: item.contentId,
    is_paused: false,
    paused_by: userIdParam,
  }));

  const { error } = await admin.from("student_content_access").upsert(rows, {
    onConflict: "user_id,content_type,content_id",
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/users");
  return { success: true };
}

export async function revokeSemesterAccess(
  userId: string,
  semesterId: string
): Promise<AccessResult> {
  if (!(await verifyAdmin())) {
    return { success: false, error: "Unauthorized. Admin access required." };
  }

  const admin = createAdminClient();
  const userIdParam = (await verifySession()).userId;
  const items: CascadeItem[] = [{ contentType: "semester", contentId: semesterId }];

  const { data: subjects } = await admin
    .from("subjects")
    .select("id")
    .eq("semester_id", semesterId);

  for (const subj of subjects ?? []) {
    items.push({ contentType: "subject", contentId: subj.id });

    const { data: lessons } = await admin
      .from("lessons")
      .select("id")
      .eq("subject_id", subj.id);

    for (const lesson of lessons ?? []) {
      items.push({ contentType: "lesson", contentId: lesson.id });
    }
  }

  const rows = items.map((item) => ({
    user_id: userId,
    content_type: item.contentType,
    content_id: item.contentId,
    is_paused: true,
    paused_by: userIdParam,
  }));

  const { error } = await admin.from("student_content_access").upsert(rows, {
    onConflict: "user_id,content_type,content_id",
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/users");
  return { success: true };
}

export async function grantSubjectAccess(
  userId: string,
  subjectId: string
): Promise<AccessResult> {
  if (!(await verifyAdmin())) {
    return { success: false, error: "Unauthorized. Admin access required." };
  }

  const admin = createAdminClient();
  const userIdParam = (await verifySession()).userId;
  const items: CascadeItem[] = [{ contentType: "subject", contentId: subjectId }];

  const { data: lessons } = await admin
    .from("lessons")
    .select("id")
    .eq("subject_id", subjectId);

  for (const lesson of lessons ?? []) {
    items.push({ contentType: "lesson", contentId: lesson.id });
  }

  const rows = items.map((item) => ({
    user_id: userId,
    content_type: item.contentType,
    content_id: item.contentId,
    is_paused: false,
    paused_by: userIdParam,
  }));

  const { error } = await admin.from("student_content_access").upsert(rows, {
    onConflict: "user_id,content_type,content_id",
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/users");
  return { success: true };
}

export async function revokeSubjectAccess(
  userId: string,
  subjectId: string
): Promise<AccessResult> {
  if (!(await verifyAdmin())) {
    return { success: false, error: "Unauthorized. Admin access required." };
  }

  const admin = createAdminClient();
  const userIdParam = (await verifySession()).userId;
  const items: CascadeItem[] = [{ contentType: "subject", contentId: subjectId }];

  const { data: lessons } = await admin
    .from("lessons")
    .select("id")
    .eq("subject_id", subjectId);

  for (const lesson of lessons ?? []) {
    items.push({ contentType: "lesson", contentId: lesson.id });
  }

  const rows = items.map((item) => ({
    user_id: userId,
    content_type: item.contentType,
    content_id: item.contentId,
    is_paused: true,
    paused_by: userIdParam,
  }));

  const { error } = await admin.from("student_content_access").upsert(rows, {
    onConflict: "user_id,content_type,content_id",
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/users");
  return { success: true };
}

// ─── Get Simplified Access Tree ─────────────────────────────────────────────

export async function getSimplifiedAccessTree(
  userId: string,
  courseId: string
): Promise<{ data: AccessTreeNode | null; error: string }> {
  if (!(await verifyAdmin())) {
    return { data: null, error: "Unauthorized." };
  }

  const admin = createAdminClient();

  const { data: overrides } = await admin
    .from("student_content_access")
    .select("*")
    .eq("user_id", userId);

  const overrideMap = new Map<string, boolean>();
  for (const o of overrides ?? []) {
    overrideMap.set(`${o.content_type}:${o.content_id}`, o.is_paused);
  }

  const { data: course } = await admin
    .from("courses")
    .select("id, title, hierarchy_type, is_paused")
    .eq("id", courseId)
    .single();

  if (!course) {
    return { data: null, error: "Course not found." };
  }

  const c = course;
  const courseAccess = overrideMap.get(`course:${courseId}`);

  const courseNode: AccessTreeNode = {
    id: courseId,
    type: "course",
    title: c.title,
    accessLevel: courseAccess === undefined ? "not_set" : courseAccess ? "blocked" : "granted",
    effectiveStatus: courseAccess === false ? "accessible" : courseAccess === true ? "blocked" : c.is_paused ? "blocked" : "accessible",
    globalPause: c.is_paused,
    children: [],
  };

  if (c.hierarchy_type === 1) {
    const { data: semesters } = await admin
      .from("semesters")
      .select("id, title, is_paused")
      .eq("course_id", courseId)
      .order("order_index", { ascending: true });

    for (const sem of semesters ?? []) {
      const semAccess = overrideMap.get(`semester:${sem.id}`);
      const semNode: AccessTreeNode = {
        id: sem.id,
        type: "semester",
        title: sem.title,
        accessLevel: semAccess === undefined ? "not_set" : semAccess ? "blocked" : "granted",
        effectiveStatus: semAccess === false ? "accessible" : semAccess === true ? "blocked" : courseNode.effectiveStatus === "blocked" ? "inherited" : "accessible",
        globalPause: sem.is_paused,
        parentBlocked: courseNode.effectiveStatus === "blocked",
        children: [],
      };

      const { data: subjects } = await admin
        .from("subjects")
        .select("id, title, is_paused")
        .eq("semester_id", sem.id)
        .order("order_index", { ascending: true });

      for (const subj of subjects ?? []) {
        const subjAccess = overrideMap.get(`subject:${subj.id}`);
        const subjNode: AccessTreeNode = {
          id: subj.id,
          type: "subject",
          title: subj.title,
          accessLevel: subjAccess === undefined ? "not_set" : subjAccess ? "blocked" : "granted",
          effectiveStatus: subjAccess === false ? "accessible" : subjAccess === true ? "blocked" : semNode.effectiveStatus === "blocked" || semNode.effectiveStatus === "inherited" ? "inherited" : "accessible",
          globalPause: subj.is_paused,
          parentBlocked: semNode.effectiveStatus === "blocked" || semNode.effectiveStatus === "inherited",
          children: [],
        };

        const { data: lessons } = await admin
          .from("lessons")
          .select("id, title, is_paused")
          .eq("subject_id", subj.id)
          .order("order_index", { ascending: true });

        for (const lesson of lessons ?? []) {
          const lessonAccess = overrideMap.get(`lesson:${lesson.id}`);
          subjNode.children!.push({
            id: lesson.id,
            type: "lesson",
            title: lesson.title,
            accessLevel: lessonAccess === undefined ? "not_set" : lessonAccess ? "blocked" : "granted",
            effectiveStatus: lessonAccess === false ? "accessible" : lessonAccess === true ? "blocked" : subjNode.effectiveStatus === "blocked" || subjNode.effectiveStatus === "inherited" ? "inherited" : "accessible",
            globalPause: lesson.is_paused,
            parentBlocked: subjNode.effectiveStatus === "blocked" || subjNode.effectiveStatus === "inherited",
          });
        }

        semNode.children!.push(subjNode);
      }

      courseNode.children!.push(semNode);
    }
  } else if (c.hierarchy_type === 2) {
    const { data: subjects } = await admin
      .from("subjects")
      .select("id, title, is_paused")
      .eq("course_id", courseId)
      .order("order_index", { ascending: true });

    for (const subj of subjects ?? []) {
      const subjAccess = overrideMap.get(`subject:${subj.id}`);
      const subjNode: AccessTreeNode = {
        id: subj.id,
        type: "subject",
        title: subj.title,
        accessLevel: subjAccess === undefined ? "not_set" : subjAccess ? "blocked" : "granted",
        effectiveStatus: subjAccess === false ? "accessible" : subjAccess === true ? "blocked" : courseNode.effectiveStatus === "blocked" ? "inherited" : "accessible",
        globalPause: subj.is_paused,
        parentBlocked: courseNode.effectiveStatus === "blocked",
        children: [],
      };

      const { data: lessons } = await admin
        .from("lessons")
        .select("id, title, is_paused")
        .eq("subject_id", subj.id)
        .order("order_index", { ascending: true });

      for (const lesson of lessons ?? []) {
        const lessonAccess = overrideMap.get(`lesson:${lesson.id}`);
        subjNode.children!.push({
          id: lesson.id,
          type: "lesson",
          title: lesson.title,
          accessLevel: lessonAccess === undefined ? "not_set" : lessonAccess ? "blocked" : "granted",
          effectiveStatus: lessonAccess === false ? "accessible" : lessonAccess === true ? "blocked" : subjNode.effectiveStatus === "blocked" || subjNode.effectiveStatus === "inherited" ? "inherited" : "accessible",
          globalPause: lesson.is_paused,
          parentBlocked: subjNode.effectiveStatus === "blocked" || subjNode.effectiveStatus === "inherited",
        });
      }

      courseNode.children!.push(subjNode);
    }
  } else {
    const { data: lessons } = await admin
      .from("lessons")
      .select("id, title, is_paused")
      .eq("course_id", courseId)
      .order("order_index", { ascending: true });

    for (const lesson of lessons ?? []) {
      const lessonAccess = overrideMap.get(`lesson:${lesson.id}`);
      courseNode.children!.push({
        id: lesson.id,
        type: "lesson",
        title: lesson.title,
        accessLevel: lessonAccess === undefined ? "not_set" : lessonAccess ? "blocked" : "granted",
        effectiveStatus: lessonAccess === false ? "accessible" : lessonAccess === true ? "blocked" : courseNode.effectiveStatus === "blocked" ? "inherited" : "accessible",
        globalPause: lesson.is_paused,
        parentBlocked: courseNode.effectiveStatus === "blocked",
      });
    }
  }

  return { data: courseNode, error: "" };
}

// ─── Get Courses for a Student (for access control selector) ────────────────

export async function getStudentEnrolledCourses(
  userId: string
): Promise<{ data: Array<{ id: string; title: string; hierarchyType: number }>; error: string }> {
  if (!(await verifyAdmin())) {
    return { data: [], error: "Unauthorized." };
  }

  const admin = createAdminClient();

  const { data: enrollments } = await admin
    .from("enrollments")
    .select("course_id")
    .eq("user_id", userId);

  if (!enrollments || enrollments.length === 0) {
    return { data: [], error: "" };
  }

  const courseIds = enrollments.map((e) => e.course_id);

  const { data: courses } = await admin
    .from("courses")
    .select("id, title, hierarchy_type")
    .in("id", courseIds);

  // Map the DB column (hierarchy_type) to the camelCase shape the admin panel expects.
  const mapped = (courses ?? []).map((c) => ({
    id: c.id as string,
    title: c.title as string,
    hierarchyType: Number(c.hierarchy_type ?? 1),
  }));

  return { data: mapped, error: "" };
}