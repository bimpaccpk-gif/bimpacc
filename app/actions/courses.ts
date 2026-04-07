"use server";

import { verifyAdmin } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { HierarchyType } from "@/types";

/**
 * Extract a YouTube video ID from any common format.
 * If input looks like a YouTube URL, extracts the ID.
 * If input is already a bare 11-char video ID, returns as-is.
 * Returns null for non-YouTube URLs or empty input.
 */
function extractYouTubeVideoId(input: string): string | null {
  if (!input) return null;

  // Standard watch URL
  const watchMatch = input.match(/(?:youtube\.com\/watch\?v=|youtube\.com\/watch\?.+&v=)([^&\s]+)/);
  if (watchMatch) return watchMatch[1];

  // Shorts URL
  const shortsMatch = input.match(/youtube\.com\/shorts\/([^?\s]+)/);
  if (shortsMatch) return shortsMatch[1];

  // Short URL (youtu.be)
  const shortMatch = input.match(/youtu\.be\/([^?\s]+)/);
  if (shortMatch) return shortMatch[1];

  // Embed URL
  const embedMatch = input.match(/youtube\.com\/embed\/([^?\s]+)/);
  if (embedMatch) return embedMatch[1];

  // Privacy-enhanced embed URL
  const nocookieMatch = input.match(/youtube-nocookie\.com\/embed\/([^?\s]+)/);
  if (nocookieMatch) return nocookieMatch[1];

  // Live URL
  const liveMatch = input.match(/youtube\.com\/live\/([^?\s]+)/);
  if (liveMatch) return liveMatch[1];

  // If already a bare video ID (11 chars)
  const bareMatch = input.match(/^([A-Za-z0-9_-]{11})$/);
  if (bareMatch) return bareMatch[1];

  return null;
}

// ─── Courses ───────────────────────────────────────────────

export async function createCourse(
  _prevState: { error: string; success: string } | undefined,
  formData: FormData
): Promise<{ error: string; success: string }> {
  try {
    await verifyAdmin();
  } catch {
    return { error: "Unauthorized. Admin access required.", success: "" };
  }

  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() ?? "";
  const batch = (formData.get("batch") as string)?.trim();
  const status = (formData.get("status") as string) ?? "draft";
  const hierarchyTypeStr = (formData.get("hierarchy_type") as string) ?? "1";
  const registration_open = formData.get("registration_open") === "on";

  if (!title) {
    return { error: "Course title is required.", success: "" };
  }

  if (!batch) {
    return { error: "Batch is required.", success: "" };
  }

  const hierarchyType = parseInt(hierarchyTypeStr) as HierarchyType;
  if (![1, 2, 3].includes(hierarchyType)) {
    return { error: "Invalid hierarchy type.", success: "" };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("courses")
    .insert({ title, description, batch, status, registration_open, hierarchy_type: hierarchyType } as never)
    .select()
    .single();

  if (error) {
    return { error: error.message, success: "" };
  }

  revalidatePath("/admin/courses");
  return { error: "", success: `Course "${title}" created.` };
}

export async function updateCourse(
  _prevState: { error: string; success: string } | undefined,
  formData: FormData
): Promise<{ error: string; success: string }> {
  try {
    await verifyAdmin();
  } catch {
    return { error: "Unauthorized. Admin access required.", success: "" };
  }

  const id = formData.get("courseId") as string;
  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() ?? "";
  const batch = (formData.get("batch") as string)?.trim();
  const status = (formData.get("status") as string) ?? "draft";
  const registration_open = formData.get("registration_open") === "on";
  const hierarchyTypeStr = formData.get("hierarchy_type") as string;

  if (!id || !title || !batch) {
    return { error: "Course ID, title, and batch are required.", success: "" };
  }

  const supabase = await createClient();

  const updatePayload: any = { title, description, batch, status, registration_open };
  if (hierarchyTypeStr) {
    updatePayload.hierarchy_type = parseInt(hierarchyTypeStr, 10);
  }

  const { error } = await supabase
    .from("courses")
    .update(updatePayload as never)
    .eq("id", id);

  if (error) {
    return { error: error.message, success: "" };
  }

  revalidatePath("/admin/courses");
  return { error: "", success: `Course updated.` };
}

export async function deleteCourse(
  _prevState: { error: string; success: string } | undefined,
  formData: FormData
): Promise<{ error: string; success: string }> {
  try {
    await verifyAdmin();
  } catch {
    return { error: "Unauthorized. Admin access required.", success: "" };
  }

  const id = formData.get("courseId") as string;

  if (!id) {
    return { error: "Course ID is required.", success: "" };
  }

  const supabase = await createClient();

  const { data: course } = await supabase
    .from("courses")
    .select("title")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("courses").delete().eq("id", id);

  if (error) {
    return { error: error.message, success: "" };
  }

  revalidatePath("/admin/courses");
  return {
    error: "",
    success: `Course "${(course as any)?.title ?? id}" deleted.`,
  };
}

// ─── Semesters ──────────────────────────────────────────────

export async function createSemester(
  _prevState: { error: string; success: string; semester?: any } | undefined,
  formData: FormData
): Promise<{ error: string; success: string; semester?: any }> {
  try {
    await verifyAdmin();
  } catch {
    return { error: "Unauthorized. Admin access required.", success: "" };
  }

  const courseId = formData.get("courseId") as string;
  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() ?? "";

  if (!courseId || !title) {
    return { error: "Course ID and title are required.", success: "" };
  }

  const supabase = await createClient();

  const { count } = await supabase
    .from("semesters")
    .select("*", { count: "exact", head: true })
    .eq("course_id", courseId);

  const { data, error } = await supabase.from("semesters").insert({
    course_id: courseId,
    title,
    description,
    order_index: (count ?? 0) + 1,
  }).select().single();

  if (error) {
    return { error: error.message, success: "" };
  }

  revalidatePath(`/admin/courses/${courseId}/semesters`);
  return { error: "", success: `Semester "${title}" created.`, semester: data };
}

export async function updateSemester(
  _prevState: { error: string; success: string } | undefined,
  formData: FormData
): Promise<{ error: string; success: string }> {
  try {
    await verifyAdmin();
  } catch {
    return { error: "Unauthorized. Admin access required.", success: "" };
  }

  const id = formData.get("semesterId") as string;
  const courseId = formData.get("courseId") as string;
  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() ?? "";

  if (!id || !title) {
    return { error: "Semester ID and title are required.", success: "" };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("semesters")
    .update({ title, description } as never)
    .eq("id", id);

  if (error) {
    return { error: error.message, success: "" };
  }

  revalidatePath(`/admin/courses/${courseId}/semesters`);
  return { error: "", success: "Semester updated." };
}

export async function deleteSemester(
  _prevState: { error: string; success: string } | undefined,
  formData: FormData
): Promise<{ error: string; success: string }> {
  try {
    await verifyAdmin();
  } catch {
    return { error: "Unauthorized. Admin access required.", success: "" };
  }

  const id = formData.get("semesterId") as string;
  const courseId = formData.get("courseId") as string;

  if (!id) {
    return { error: "Semester ID is required.", success: "" };
  }

  const supabase = await createClient();

  const { data: semester } = await supabase
    .from("semesters")
    .select("title")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("semesters").delete().eq("id", id);

  if (error) {
    return { error: error.message, success: "" };
  }

  revalidatePath(`/admin/courses/${courseId}/semesters`);
  return {
    error: "",
    success: `Semester "${(semester as any)?.title ?? id}" deleted.`,
  };
}

export async function reorderSemesters(
  courseId: string,
  updates: { id: string; order_index: number }[]
): Promise<{ error: string; success: boolean }> {
  try {
    await verifyAdmin();
  } catch {
    return { error: "Unauthorized. Admin access required.", success: false };
  }

  const supabase = await createClient();

  const promises = updates.map((u) =>
    supabase.from("semesters").update({ order_index: u.order_index } as never).eq("id", u.id)
  );

  await Promise.all(promises);
  revalidatePath(`/admin/courses/${courseId}/semesters`);
  return { error: "", success: true };
}

// ─── Subjects ──────────────────────────────────────────────

export async function createSubject(
  _prevState: { error: string; success: string; subject?: any } | undefined,
  formData: FormData
): Promise<{ error: string; success: string; subject?: any }> {
  try {
    await verifyAdmin();
  } catch {
    return { error: "Unauthorized. Admin access required.", success: "" };
  }

  const courseId = formData.get("courseId") as string;
  const semesterId = formData.get("semesterId") as string;
  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() ?? "";

  if (!title) {
    return { error: "Title is required.", success: "" };
  }

  if (!courseId && !semesterId) {
    return { error: "Course ID or Semester ID is required.", success: "" };
  }

  const supabase = await createClient();

  // Determine count scope
  let countQuery = supabase.from("subjects").select("*", { count: "exact", head: true });
  let revalPath = `/admin/courses/${courseId}/subjects`;
  if (semesterId) {
    countQuery = countQuery.eq("semester_id", semesterId);
    revalPath = `/admin/courses/${courseId}/semesters/${semesterId}/subjects`;
  } else {
    countQuery = countQuery.eq("course_id", courseId);
    revalPath = `/admin/courses/${courseId}/subjects`;
  }

  const { count } = await countQuery;

  const insertData: Record<string, any> = {
    title,
    description,
    order_index: (count ?? 0) + 1,
  };
  if (semesterId) {
    insertData.semester_id = semesterId;
    insertData.course_id = courseId;
  } else {
    insertData.course_id = courseId;
    insertData.semester_id = null;
  }

  const { data, error } = await supabase.from("subjects").insert(insertData as never).select().single();

  if (error) {
    return { error: error.message, success: "" };
  }

  revalidatePath(revalPath);
  return { error: "", success: `Subject "${title}" created.`, subject: data };
}

export async function updateSubject(
  _prevState: { error: string; success: string } | undefined,
  formData: FormData
): Promise<{ error: string; success: string }> {
  try {
    await verifyAdmin();
  } catch {
    return { error: "Unauthorized. Admin access required.", success: "" };
  }

  const id = formData.get("subjectId") as string;
  const courseId = formData.get("courseId") as string;
  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() ?? "";

  if (!id || !title) {
    return { error: "Subject ID and title are required.", success: "" };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("subjects")
    .update({ title, description } as never)
    .eq("id", id);

  if (error) {
    return { error: error.message, success: "" };
  }

  revalidatePath(`/admin/courses/${courseId}/subjects`);
  return { error: "", success: "Subject updated." };
}

export async function deleteSubject(
  _prevState: { error: string; success: string } | undefined,
  formData: FormData
): Promise<{ error: string; success: string }> {
  try {
    await verifyAdmin();
  } catch {
    return { error: "Unauthorized. Admin access required.", success: "" };
  }

  const id = formData.get("subjectId") as string;
  const courseId = formData.get("courseId") as string;

  if (!id) {
    return { error: "Subject ID is required.", success: "" };
  }

  const supabase = await createClient();

  const { data: subject } = await supabase
    .from("subjects")
    .select("title")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("subjects").delete().eq("id", id);

  if (error) {
    return { error: error.message, success: "" };
  }

  revalidatePath(`/admin/courses/${courseId}/subjects`);
  return {
    error: "",
    success: `Subject "${(subject as any)?.title ?? id}" deleted.`,
  };
}

export async function reorderSubjects(
  courseId: string,
  updates: { id: string; order_index: number }[],
  semesterId?: string
): Promise<{ error: string; success: boolean }> {
  try {
    await verifyAdmin();
  } catch {
    return { error: "Unauthorized. Admin access required.", success: false };
  }

  const supabase = await createClient();

  const promises = updates.map((u) =>
    supabase.from("subjects").update({ order_index: u.order_index } as never).eq("id", u.id)
  );

  await Promise.all(promises);
  if (semesterId) {
    revalidatePath(`/admin/courses/${courseId}/semesters/${semesterId}/subjects`);
  } else {
    revalidatePath(`/admin/courses/${courseId}/subjects`);
  }
  return { error: "", success: true };
}

// ─── Courses DND ───────────────────────────────────────────────

export async function reorderCourses(
  updates: { id: string; order_index: number }[]
): Promise<{ error: string; success: boolean }> {
  try {
    await verifyAdmin();
  } catch {
    return { error: "Unauthorized. Admin access required.", success: false };
  }

  const supabase = await createClient();

  const promises = updates.map((u) =>
    supabase.from("courses").update({ order_index: u.order_index } as never).eq("id", u.id)
  );

  await Promise.all(promises);
  revalidatePath(`/admin/courses`);
  return { error: "", success: true };
}

// ─── Lessons ───────────────────────────────────────────────

export async function createLesson(
  _prevState: { error: string; success: string; lesson?: any } | undefined,
  formData: FormData
): Promise<{ error: string; success: string; lesson?: any }> {
  try {
    await verifyAdmin();
  } catch {
    return { error: "Unauthorized. Admin access required.", success: "" };
  }

  const subjectId = formData.get("subjectId") as string;
  const courseId = formData.get("courseId") as string;
  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() ?? "";
  const content = (formData.get("content") as string)?.trim() ?? "";
  const videoUrl = (formData.get("videoUrl") as string)?.trim() ?? "";
  const durationStr = formData.get("durationMinutes") as string;

  if (!title) {
    return { error: "Lesson title is required.", success: "" };
  }

  if (!subjectId && !courseId) {
    return { error: "Either Subject ID or Course ID is required.", success: "" };
  }

  const supabase = await createClient();

  // Validate that subject belongs to the course (security check)
  if (subjectId && courseId) {
    const { data: subject } = await supabase
      .from("subjects")
      .select("course_id")
      .eq("id", subjectId)
      .single();
    
    if (!subject || subject.course_id !== courseId) {
      return { error: "Invalid subject for this course.", success: "" };
    }
  }

  // Determine which parent to use based on hierarchy type
  let parentId: string;
  let parentField: string;
  let revalidateUrl: string;

  if (subjectId) {
    // Hierarchy type 1: Lesson belongs to subject
    parentId = subjectId;
    parentField = "subject_id";
    revalidateUrl = `/admin/courses/${courseId}/subjects/${subjectId}/lessons`;
  } else {
    // Hierarchy type 2 or 3: Lesson belongs directly to course
    parentId = courseId;
    parentField = "course_id";
    revalidateUrl = `/admin/courses/${courseId}/lessons`;
  }

  const { count } = await supabase
    .from("lessons")
    .select("*", { count: "exact", head: true })
    .eq(parentField, parentId);

  const lessonData: any = {
    title,
    description,
    content,
    video_url: extractYouTubeVideoId(videoUrl) || null,
    duration_minutes: durationStr ? parseInt(durationStr) : null,
    order_index: (count ?? 0) + 1,
  };

  // Set the appropriate parent field
  if (parentField === "subject_id") {
    lessonData.subject_id = parentId;
  } else {
    lessonData.course_id = parentId;
  }

  const { data, error } = await supabase.from("lessons").insert(lessonData).select().single();

  if (error) {
    return { error: error.message, success: "" };
  }

  revalidatePath(revalidateUrl);
  return { error: "", success: `Lesson "${title}" created.`, lesson: data };
}

export async function updateLesson(
  _prevState: { error: string; success: string } | undefined,
  formData: FormData
): Promise<{ error: string; success: string }> {
  try {
    await verifyAdmin();
  } catch {
    return { error: "Unauthorized. Admin access required.", success: "" };
  }

  const id = formData.get("lessonId") as string;
  const subjectId = formData.get("subjectId") as string;
  const courseId = formData.get("courseId") as string;
  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() ?? "";
  const content = (formData.get("content") as string)?.trim() ?? "";
  const videoUrl = (formData.get("videoUrl") as string)?.trim() ?? "";
  const durationStr = formData.get("durationMinutes") as string;

  if (!id || !title) {
    return { error: "Lesson ID and title are required.", success: "" };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("lessons")
    .update({
      title,
      description,
      content,
      video_url: extractYouTubeVideoId(videoUrl) || null,
      duration_minutes: durationStr ? parseInt(durationStr) : null,
    } as never)
    .eq("id", id);

  if (error) {
    return { error: error.message, success: "" };
  }

  // Determine revalidate path based on hierarchy type
  let revalidateUrl: string;
  if (subjectId) {
    revalidateUrl = `/admin/courses/${courseId}/subjects/${subjectId}/lessons`;
  } else {
    revalidateUrl = `/admin/courses/${courseId}/lessons`;
  }

  revalidatePath(revalidateUrl);
  return { error: "", success: "Lesson updated." };
}

export async function deleteLesson(
  _prevState: { error: string; success: string } | undefined,
  formData: FormData
): Promise<{ error: string; success: string }> {
  try {
    await verifyAdmin();
  } catch {
    return { error: "Unauthorized. Admin access required.", success: "" };
  }

  const id = formData.get("lessonId") as string;
  const subjectId = formData.get("subjectId") as string;
  const courseId = formData.get("courseId") as string;

  if (!id) {
    return { error: "Lesson ID is required.", success: "" };
  }

  const supabase = await createClient();

  const { data: lesson } = await supabase
    .from("lessons")
    .select("title")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("lessons").delete().eq("id", id);

  if (error) {
    return { error: error.message, success: "" };
  }

  // Determine revalidate path based on hierarchy type
  let revalidateUrl: string;
  if (subjectId) {
    revalidateUrl = `/admin/courses/${courseId}/subjects/${subjectId}/lessons`;
  } else {
    revalidateUrl = `/admin/courses/${courseId}/lessons`;
  }

  revalidatePath(revalidateUrl);
  return {
    error: "",
    success: `Lesson "${(lesson as any)?.title ?? id}" deleted.`,
  };
}

export async function reorderLessons(
  revalidateUrl: string,
  updates: { id: string; order_index: number }[]
): Promise<{ error: string; success: boolean }> {
  try {
    await verifyAdmin();
  } catch {
    return { error: "Unauthorized. Admin access required.", success: false };
  }

  const supabase = await createClient();

  const promises = updates.map((u) =>
    supabase.from("lessons").update({ order_index: u.order_index } as never).eq("id", u.id)
  );

  await Promise.all(promises);
  revalidatePath(revalidateUrl);
  return { error: "", success: true };
}
