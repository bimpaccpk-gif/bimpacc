"use server";

import { verifySession } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ─── Courses ───────────────────────────────────────────────

export async function createCourse(
  _prevState: { error: string; success: string } | undefined,
  formData: FormData
): Promise<{ error: string; success: string }> {
  await verifySession();

  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() ?? "";
  const status = (formData.get("status") as string) ?? "draft";

  if (!title) {
    return { error: "Course title is required.", success: "" };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("courses")
    .insert({ title, description, status } as never)
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

  if (!subjectId || !title) {
    return { error: "Subject ID and title are required.", success: "" };
  }

  const supabase = await createClient();

  const { count } = await supabase
    .from("lessons")
    .select("*", { count: "exact", head: true })
    .eq("subject_id", subjectId);

  const { error } = await supabase.from("lessons").insert({
    subject_id: subjectId,
    title,
    description,
    content,
    video_url: videoUrl || null,
    duration_minutes: durationStr ? parseInt(durationStr) : null,
    order_index: (count ?? 0) + 1,
  } as never);

  if (error) {
    return { error: error.message, success: "" };
  }

  revalidatePath(`/admin/courses/${courseId}/subjects/${subjectId}/lessons`);
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

  revalidatePath(`/admin/courses/${courseId}/subjects/${subjectId}/lessons`);
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

  revalidatePath(`/admin/courses/${courseId}/subjects/${subjectId}/lessons`);
  return {
    error: "",
    success: `Lesson "${(lesson as any)?.title ?? id}" deleted.`,
  };
}
