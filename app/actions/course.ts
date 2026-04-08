"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { logAuditEvent } from "@/app/actions/admin";

export async function enrollStudentInCourse(
  _prevState: { error: string; success: string } | undefined,
  formData: FormData
): Promise<{ error: string; success: string }> {
  try {
    const supabase = await createClient();

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) return { error: "Unauthorized. Admin access required.", success: "" };

    const { data: callerProfile } = await supabase
      .from("users")
      .select("role")
      .eq("id", authUser.id)
      .single();

    if ((callerProfile as any)?.role !== "admin") {
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
      enrolled_by: authUser.id,
    } as never);

    if (insertError) {
      return { error: insertError.message, success: "" };
    }

    // Audit log
    await logAuditEvent(authUser.id, studentId, "enrollment.created", {
      course_id: courseId,
      course_title: (course as any).title,
    });

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

export async function bulkEnrollStudents(
  _prevState: { error: string; success: string } | undefined,
  formData: FormData
): Promise<{ error: string; success: string }> {
  try {
    const supabase = await createClient();

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) return { error: "Unauthorized. Admin access required.", success: "" };

    const { data: callerProfile } = await supabase
      .from("users")
      .select("role")
      .eq("id", authUser.id)
      .single();

    if ((callerProfile as any)?.role !== "admin") {
      return { error: "Unauthorized. Admin access required.", success: "" };
    }

    const studentIdsStr = formData.get("studentIds") as string;
    const courseId = formData.get("courseId") as string;

    if (!studentIdsStr || !courseId) {
      return { error: "Student IDs and Course ID are required.", success: "" };
    }

    let studentIds: string[];
    try {
      studentIds = JSON.parse(studentIdsStr);
    } catch {
      return { error: "Invalid student IDs format.", success: "" };
    }

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return { error: "No students selected for enrollment.", success: "" };
    }

    // Verify course exists and is published
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
    let successCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const studentId of studentIds) {
      try {
        // Verify student
        const { data: student } = await supabase
          .from("users")
          .select("id, full_name, role")
          .eq("id", studentId)
          .single();

        if (!student) {
          errors.push(`Student ID ${studentId} not found`);
          continue;
        }

        if ((student as any).role !== "student") {
          errors.push(`${(student as any).full_name} is not a student`);
          continue;
        }

        // Check if already enrolled
        const { data: existing } = await supabase
          .from("enrollments")
          .select("id")
          .eq("user_id", studentId)
          .eq("course_id", courseId)
          .single();

        if (existing) {
          skippedCount++;
          continue;
        }

        // Enroll student
        const { error: insertError } = await admin.from("enrollments").insert({
          user_id: studentId,
          course_id: courseId,
          enrolled_by: authUser.id,
        } as never);

        if (insertError) {
          errors.push(`Failed to enroll ${(student as any).full_name}: ${insertError.message}`);
          continue;
        }

        // Audit log
        await logAuditEvent(authUser.id, studentId, "enrollment.created", {
          course_id: courseId,
          course_title: (course as any).title,
          action: "bulk_enroll",
        });

        successCount++;
      } catch (err: any) {
        errors.push(`Error enrolling student ${studentId}: ${err.message}`);
      }
    }

    const errorMsg = errors.length > 0 ? ` Errors: ${errors.slice(0, 3).join("; ")}` : "";
    let message = `Enrolled ${successCount} student(s) in "${(course as any).title}".`;
    if (skippedCount > 0) {
      message += ` ${skippedCount} already enrolled.`;
    }
    if (errors.length > 0) {
      message += ` ${errors.length} failed.${errorMsg}`;
    }

    revalidatePath("/admin/users");
    revalidatePath("/student");
    revalidatePath("/student/courses");
    revalidatePath("/student/my-courses");

    return {
      error: errors.length > 0 ? `${errors.length} enrollment(s) failed.${errorMsg}` : "",
      success: message,
    };
  } catch (err: any) {
    return { error: err.message || "An unexpected error occurred.", success: "" };
  }
}
