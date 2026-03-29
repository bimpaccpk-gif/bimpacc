"use server";

import { verifySession } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function enrollInCourse(
  _prevState: { error: string; success: string } | undefined,
  formData: FormData
): Promise<{ error: string; success: string }> {
  const session = await verifySession();
  const courseId = formData.get("courseId") as string;

  if (!courseId) {
    return { error: "Course ID is required.", success: "" };
  }

  const supabase = await createClient();

  // Check if already enrolled
  const { data: existing } = await supabase
    .from("enrollments")
    .select("id")
    .eq("user_id", session.userId)
    .eq("course_id", courseId)
    .single();

  if (existing) {
    return { error: "You are already enrolled in this course.", success: "" };
  }

  // Check course exists and is published
  const { data: course } = await supabase
    .from("courses")
    .select("id, title, status")
    .eq("id", courseId)
    .single();

  if (!course) {
    return { error: "Course not found.", success: "" };
  }

  if ((course as any).status !== "published") {
    return { error: "This course is not available for enrollment.", success: "" };
  }

  const { error } = await supabase.from("enrollments").insert({
    user_id: session.userId,
    course_id: courseId,
  } as never);

  if (error) {
    return { error: error.message, success: "" };
  }

  revalidatePath("/student");
  revalidatePath("/student/courses");
  revalidatePath("/student/my-courses");
  return { error: "", success: `Successfully enrolled in "${(course as any).title}"!` };
}
