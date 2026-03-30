"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function verifyAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return false;

  const { data: callerProfile } = await supabase
    .from("users")
    .select("role")
    .eq("id", authUser.id)
    .single();

  return (callerProfile as any)?.role === "admin";
}

export async function enrollStudentInCourse(
  _prevState: { error: string; success: string } | undefined,
  formData: FormData
): Promise<{ error: string; success: string }> {
  try {
    const supabase = await createClient();

    if (!(await verifyAdmin(supabase))) {
      return { error: "Unauthorized. Admin access required.", success: "" };
    }

    const studentId = formData.get("studentId") as string;
    const courseId = formData.get("courseId") as string;

    if (!studentId || !courseId) {
      return { error: "Student ID and Course ID are required.", success: "" };
    }

    // Verify student
    const { data: student } = await supabase
      .from("users")
      .select("id, full_name, role")
      .eq("id", studentId)
      .single();

    if (!student) {
      return { error: "Student not found.", success: "" };
    }

    if ((student as any).role !== "student") {
      return { error: "Can only enroll students in courses.", success: "" };
    }

    // Check if already enrolled
    const { data: existing } = await supabase
      .from("enrollments")
      .select("id")
      .eq("user_id", studentId)
      .eq("course_id", courseId)
      .single();

    if (existing) {
      return { error: "Student is already enrolled in this course.", success: "" };
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
      return { error: "Cannot enroll in unpublished courses.", success: "" };
    }

    const admin = createAdminClient();
    const { error: insertError } = await admin.from("enrollments").insert({
      user_id: studentId,
      course_id: courseId,
    } as never);

    if (insertError) {
      return { error: insertError.message, success: "" };
    }

    revalidatePath("/admin/users");
    revalidatePath("/student");
    revalidatePath("/student/courses");
    revalidatePath("/student/my-courses");

    return {
      error: "",
      success: `Successfully enrolled ${(student as any).full_name} in "${(course as any).title}".`,
    };
  } catch (err: any) {
    return { error: err.message || "An unexpected error occurred.", success: "" };
  }
}
