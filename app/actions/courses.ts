"use server";

import { verifySession } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { HierarchyType } from "@/types";

// ─── Courses ───────────────────────────────────────────────

export async function createCourse(
  _prevState: { error: string; success: string } | undefined,
  formData: FormData
): Promise<{ error: string; success: string }> {
  await verifySession();

  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() ?? "";
  const status = (formData.get("status") as string) ?? "draft";
  const hierarchyTypeStr = (formData.get("hierarchy_type") as string) ?? "1";

  if (!title) {
    return { error: "Course title is required.", success: "" };
  }

  const hierarchyType = parseInt(hierarchyTypeStr) as HierarchyType;
  if (![1, 2, 3].includes(hierarchyType)) {
    return { error: "Invalid hierarchy type.", success: "" };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("courses")
    .insert({ title, description, status, hierarchy_type: hierarchyType } as never)
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
  await verifySession();

  const id = formData.get("courseId") as string;
  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() ?? "";
  const status = (formData.get("status") as string) ?? "draft";

  if (!id || !title) {
    return { error: "Course ID and title are required.", success: "" };
  }

  const supabase = await createClient();

  // Note: hierarchy_type cannot be changed after creation
  const { error } = await supabase
    .from("courses")
    .update({ title, description, status } as never)
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
  await verifySession();

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

// ─── Subjects ──────────────────────────────────────────────

export async function createSubject(
  _prevState: { error: string; success: string } | undefined,
  formData: FormData
): Promise<{ error: string; success: string }> {
  await verifySession();

  const courseId = formData.get("courseId") as string;
  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() ?? "";

  if (!courseId || !title) {
    return { error: "Course ID and title are required.", success: "" };
  }

  const supabase = await createClient();

  const { count } = await supabase
    .from("subjects")
    .select("*", { count: "exact", head: true })
    .eq("course_id", courseId);

  const { error } = await supabase.from("subjects").insert({
    course_id: courseId,
    title,
    description,
    order_index: (count ?? 0) + 1,
  } as never);

  if (error) {
    return { error: error.message, success: "" };
  }

  revalidatePath(`/admin/courses/${courseId}/subjects`);
  return { error: "", success: `Subject "${title}" created.` };
}

export async function updateSubject(
  _prevState: { error: string; success: string } | undefined,
  formData: FormData
): Promise<{ error: string; success: string }> {
  await verifySession();

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
  await verifySession();

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

// ─── Lessons ───────────────────────────────────────────────

export async function createLesson(
  _prevState: { error: string; success: string } | undefined,
  formData: FormData
): Promise<{ error: string; success: string }> {
  await verifySession();

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
    video_url: videoUrl || null,
    duration_minutes: durationStr ? parseInt(durationStr) : null,
    order_index: (count ?? 0) + 1,
  };

  // Set the appropriate parent field
  if (parentField === "subject_id") {
    lessonData.subject_id = parentId;
  } else {
    lessonData.course_id = parentId;
  }

  const { error } = await supabase.from("lessons").insert(lessonData as never);

  if (error) {
    return { error: error.message, success: "" };
  }

  revalidatePath(revalidateUrl);
  return { error: "", success: `Lesson "${title}" created.` };
}

export async function updateLesson(
  _prevState: { error: string; success: string } | undefined,
  formData: FormData
): Promise<{ error: string; success: string }> {
  await verifySession();

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
      video_url: videoUrl || null,
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
  await verifySession();

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
