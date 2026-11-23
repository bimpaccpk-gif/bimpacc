"use server";

import { verifyAdmin } from "@/lib/dal";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/app/actions/admin";
import { revalidatePath } from "next/cache";
import { UUID_RE, limitAdminAction } from "@/lib/admin-action-limits";

// Student approval (single and bulk). Approving enrolls the student in their selected course.

export async function toggleStudentApproval(
  _prevState: { error: string; success: string } | undefined,
  formData: FormData
): Promise<{ error: string; success: string }> {
  const userId = formData.get("userId") as string;
  const isApproved = formData.get("isApproved") === "true";

  if (!userId) {
    return { error: "User ID is required.", success: "" };
  }

  // Service-role/admin-only action: enforce the admin role BEFORE any work or side effect.
  const session = await verifyAdmin();

  const supabase = await createClient();

  // If approving, enroll the user in their selected course
  if (isApproved) {
    // Get the user's selected course
    const { data: user } = await supabase
      .from("users")
      .select("selected_course_id")
      .eq("id", userId)
      .single();

    if (user?.selected_course_id) {
      // Check if already enrolled
      const { data: existingEnrollment } = await supabase
        .from("enrollments")
        .select("id")
        .eq("user_id", userId)
        .eq("course_id", user.selected_course_id)
        .single();

      // Only enroll if not already enrolled
      if (!existingEnrollment) {
        const admin = createAdminClient();
        await admin.from("enrollments").insert({
          user_id: userId,
          course_id: user.selected_course_id,
          enrolled_by: session.userId,
        } as never);
      }
    }
  }

  const { error } = await supabase
    .from("users")
    .update({ is_approved: isApproved } as never)
    .eq("id", userId);

  if (error) {
    return { error: error.message, success: "" };
  }

  await logAuditEvent(session.userId, userId, isApproved ? "user.approved" : "user.unapproved", {
    action: isApproved ? "approved" : "unapproved",
  });

  revalidatePath("/admin/users");

  return { error: "", success: `User has been ${isApproved ? "Approved" : "Unapproved"}.` };
}

export async function bulkApproveStudents(
  _prevState: { error: string; success: string } | undefined,
  formData: FormData
): Promise<{ error: string; success: string }> {
  const userIdsStr = formData.get("userIds") as string;

  if (!userIdsStr) {
    return { error: "No users selected for approval.", success: "" };
  }

  let userIds: string[];
  try {
    userIds = JSON.parse(userIdsStr);
  } catch {
    return { error: "Invalid user IDs format.", success: "" };
  }

  if (!Array.isArray(userIds) || userIds.length === 0) {
    return { error: "No users selected for approval.", success: "" };
  }

  if (userIds.length > 500 || !userIds.every((id) => typeof id === "string" && UUID_RE.test(id))) {
    return { error: "Invalid user selection.", success: "" };
  }

  // Service-role/admin-only action: enforce the admin role BEFORE any work or side effect.
  const session = await verifyAdmin();
  const limited = await limitAdminAction(session.userId, "bulk-approve-students", 30);
  if (limited) return { error: limited, success: "" };

  const supabase = await createClient();

  // Fetch selected_course_id for all users being approved
  const { data: users } = await supabase
    .from("users")
    .select("id, selected_course_id")
    .in("id", userIds);

  if (!users || users.length === 0) {
    return { error: "No matching users found.", success: "" };
  }

  const admin = createAdminClient();

  // Enroll users who have a selected course and aren't already enrolled
  for (const user of users) {
    if (user.selected_course_id) {
      const { data: existing } = await admin
        .from("enrollments")
        .select("id")
        .eq("user_id", user.id)
        .eq("course_id", user.selected_course_id)
        .single();

      if (!existing) {
        await admin.from("enrollments").insert({
          user_id: user.id,
          course_id: user.selected_course_id,
          enrolled_by: session.userId,
        } as never);
      }
    }

    await admin.from("users").update({ is_approved: true } as never).eq("id", user.id);

    await logAuditEvent(session.userId, user.id, "user.approved", {
      action: "bulk_approved",
    });
  }

  revalidatePath("/admin/users");

  return {
    error: "",
    success: `${users.length} student${users.length > 1 ? "s" : ""} approved.`,
  };
}
