"use server";

import { errorMessage } from "@/lib/errors";
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

    if (callerProfile?.role !== "admin") {
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

    if (student.role !== "student") {
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

    if (course.status !== "published") {
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
      course_title: course.title,
    });

    revalidatePath("/admin/users");
    revalidatePath("/student");
    revalidatePath("/student/courses");
    revalidatePath("/student/my-courses");

    return {
      error: "",
      success: `Successfully enrolled ${student.full_name} in "${course.title}".`,
    };
  } catch (err) {
    return { error: errorMessage(err), success: "" };
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

    if (callerProfile?.role !== "admin") {
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

    if (course.status !== "published") {
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

        if (student.role !== "student") {
          errors.push(`${student.full_name} is not a student`);
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
          errors.push(`Failed to enroll ${student.full_name}: ${insertError.message}`);
          continue;
        }

        // Audit log
        await logAuditEvent(authUser.id, studentId, "enrollment.created", {
          course_id: courseId,
          course_title: course.title,
          action: "bulk_enroll",
        });

        successCount++;
      } catch (err) {
        errors.push(`Error enrolling student ${studentId}: ${errorMessage(err)}`);
      }
    }

    const errorMsg = errors.length > 0 ? ` Errors: ${errors.slice(0, 3).join("; ")}` : "";
    let message = `Enrolled ${successCount} student(s) in "${course.title}".`;
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
  } catch (err) {
    return { error: errorMessage(err), success: "" };
  }
}

export interface EnrolledStudent {
  id: string;
  full_name: string | null;
  email: string;
  enrolled_at: string;
  progress: number | null;
  enrolled_by: string | null;
}

interface EnrollmentWithUser {
  user_id: string;
  enrolled_at: string;
  progress: number | null;
  enrolled_by: string | null;
  users:
    | {
        id: string;
        full_name: string | null;
        email: string;
      }
    | Array<{
        id: string;
        full_name: string | null;
        email: string;
      }>
    | null;
}

export async function getEnrolledStudents(
  courseId: string
): Promise<{ data: EnrolledStudent[]; error: string | null }> {
  await verifyAdmin();
  const admin = createAdminClient();

  const { data: enrollments, error } = await admin
    .from("enrollments")
    .select(
      "user_id, enrolled_at, progress, enrolled_by, users!enrollments_user_id_fkey(id, full_name, email)"
    )
    .eq("course_id", courseId)
    .order("enrolled_at", { ascending: false });

  if (error) {
    return { data: [], error: error.message };
  }

  const enrolledStudents = ((enrollments ?? []) as EnrollmentWithUser[]).map((enrollment) => {
    const user = Array.isArray(enrollment.users) ? enrollment.users[0] : enrollment.users;

    return {
      id: enrollment.user_id,
      full_name: user?.full_name ?? null,
      email: user?.email ?? "",
      enrolled_at: enrollment.enrolled_at,
      progress: enrollment.progress,
      enrolled_by: enrollment.enrolled_by,
    };
  });

  return { data: enrolledStudents, error: null };
}
