"use server";

import { createClient } from "@/lib/supabase/server";
import { verifySession, verifyEnrollment } from "@/lib/dal";
import { revalidatePath } from "next/cache";

export async function toggleLessonCompletion(
  courseId: string,
  lessonId: string
): Promise<{ error: string; completed: boolean }> {
  const session = await verifySession();
  const supabase = await createClient();

  // Verify enrollment
  await verifyEnrollment(session.userId, courseId);

  // Verify lesson belongs to this course (prevent cross-course manipulation)
  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, course_id, subject_id")
    .eq("id", lessonId)
    .single();

  if (!lesson) {
    return { error: "Lesson not found.", completed: false };
  }

  const lessonBelongsToCourse =
    (lesson.course_id === courseId) ||
    (lesson.subject_id && await (async () => {
      const { data: subject } = await supabase
        .from("subjects")
        .select("course_id")
        .eq("id", lesson.subject_id!)
        .single();
      return subject?.course_id === courseId;
    })());

  if (!lessonBelongsToCourse) {
    return { error: "This lesson does not belong to the specified course.", completed: false };
  }

  // Get enrollment record
  const { data: enrollment, error: enrollError } = await supabase
    .from("enrollments")
    .select("id")
    .eq("user_id", session.userId)
    .eq("course_id", courseId)
    .single();

  if (enrollError || !enrollment) {
    return { error: "Enrollment not found.", completed: false };
  }

  // Check current progress
  const { data: existing } = await supabase
    .from("lesson_progress")
    .select("id, completed")
    .eq("enrollment_id", enrollment.id)
    .eq("lesson_id", lessonId)
    .single();

  if (existing) {
    // Toggle
    const newCompleted = !existing.completed;
    const { error: updateError } = await supabase
      .from("lesson_progress")
      .update({
        completed: newCompleted,
        completed_at: newCompleted ? new Date().toISOString() : null,
      })
      .eq("id", existing.id);

    if (updateError) {
      return { error: updateError.message, completed: !newCompleted };
    }

    revalidatePath(`/student/courses/${courseId}`);
    revalidatePath(`/student/courses/${courseId}/lessons/${lessonId}`);
    return { error: "", completed: newCompleted };
  } else {
    // Create new progress record
    const { error: insertError } = await supabase.from("lesson_progress").insert({
      enrollment_id: enrollment.id,
      lesson_id: lessonId,
      completed: true,
      completed_at: new Date().toISOString(),
    });

    if (insertError) {
      return { error: insertError.message, completed: false };
    }

    revalidatePath(`/student/courses/${courseId}`);
    revalidatePath(`/student/courses/${courseId}/lessons/${lessonId}`);
    return { error: "", completed: true };
  }
}
