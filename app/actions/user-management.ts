"use server";

import type { BulkCreateResult, UserRole } from "@/types";
import { errorMessage } from "@/lib/errors";
import { verifyAdmin } from "@/lib/dal";
import { randomBytes } from "node:crypto";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/app/actions/admin";
import { revalidatePath } from "next/cache";
import { UUID_RE, limitAdminAction } from "@/lib/admin-action-limits";

// Admin user management: create, bulk create, delete, role and onboarding changes.
// Every action here authorizes with verifyAdmin() before doing any work.

export async function adminChangeUserRole(
  _prevState: { error: string; success: string } | undefined,
  formData: FormData
): Promise<{ error: string; success: string }> {
  const userId = formData.get("userId") as string;
  const role = formData.get("role") as UserRole;

  if (!userId || !role) {
    return { error: "User ID and role are required.", success: "" };
  }

  if (!["admin", "instructor", "student"].includes(role)) {
    return { error: "Invalid role.", success: "" };
  }

  // Service-role/admin-only action: enforce the admin role BEFORE any work or side effect.
  const session = await verifyAdmin();

  if (session.userId === userId) {
    return { error: "You cannot change your own role.", success: "" };
  }

  const supabase = await createClient();

  // Get current role for audit log
  const { data: currentUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .single();
  const oldRole = currentUser?.role;

  const { error } = await supabase
    .from("users")
    .update({ role } as never)
    .eq("id", userId);

  if (error) {
    return { error: error.message, success: "" };
  }

  await logAuditEvent(session.userId, userId, "user.role_changed", {
    old_role: oldRole,
    new_role: role,
  });

  revalidatePath("/admin/users");

  return { error: "", success: `Role updated to ${role}.` };
}

export async function adminCreateUser(
  _prevState: { error: string; success: string } | undefined,
  formData: FormData
): Promise<{ error: string; success: string }> {
  // Service-role/admin-only action: enforce the admin role BEFORE any work or side effect.
  const session = await verifyAdmin();
  const limited = await limitAdminAction(session.userId, "create-user", 100);
  if (limited) return { error: limited, success: "" };

  const fullName = (formData.get("fullName") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const password = (formData.get("password") as string) ?? "";
  const role = (formData.get("role") as UserRole) ?? "student";
  const courseId = (formData.get("courseId") as string) || null;
  const bypassOnboarding = formData.get("bypassOnboarding") === "true";

  if (!fullName || !email || !password) {
    return { error: "All fields are required.", success: "" };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters.", success: "" };
  }

  // Validate Gmail only
  const emailDomain = email.split("@")[1]?.toLowerCase();
  if (!emailDomain || emailDomain !== "gmail.com") {
    return { error: "Only Gmail emails are allowed for registration.", success: "" };
  }

  if (!["admin", "instructor", "student"].includes(role)) {
    return { error: "Invalid role.", success: "" };
  }

  // Use the admin (service role) client so the admin's own session is NOT affected.
  // supabase.auth.signUp() would switch the session to the new user — we don't want that.
  const admin = createAdminClient();

  const { data, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role,
    },
  });

  if (createError) {
    return { error: createError.message, success: "" };
  }

  if (data.user) {
    const userRecord: Record<string, unknown> = {
      id: data.user.id,
      email,
      full_name: fullName,
      role,
      selected_course_id: courseId,
    };

    // If bypass onboarding is enabled for students, set both flags
    if (bypassOnboarding && role === "student") {
      userRecord.onboarding_bypassed = true;
      userRecord.onboarding_completed = true;
    }

    await admin.from("users").upsert(userRecord as never, { onConflict: "id" });

    // If a course was selected and role is student, enroll the user
    if (courseId && role === "student") {
      await admin.from("enrollments").insert({
        user_id: data.user.id,
        course_id: courseId,
        enrolled_by: session.userId,
      } as never);
    }

    // Audit log
    await logAuditEvent(session.userId, data.user.id, "user.created", {
      full_name: fullName,
      role,
      course_id: courseId,
      onboarding_bypassed: bypassOnboarding,
    });
  }

  revalidatePath("/admin/users");

  return {
    error: "",
    success: `Account created for ${fullName} (${role}).${courseId && role === "student" ? " Enrolled in selected course." : ""}${bypassOnboarding && role === "student" ? " Onboarding bypassed." : ""}`,
  };
}

export async function adminBulkCreateUsers(
  _prevState: { error: string; success: string; results?: BulkCreateResult[] } | undefined,
  formData: FormData
): Promise<{ error: string; success: string; results?: BulkCreateResult[] }> {
  // Service-role/admin-only action: enforce the admin role BEFORE any work or side effect.
  const session = await verifyAdmin();
  const limited = await limitAdminAction(session.userId, "bulk-create-users", 10);
  if (limited) return { error: limited, success: "", results: [] };

  const csvContent = (formData.get("csvContent") as string)?.trim();
  const role = (formData.get("role") as UserRole) ?? "student";
  const courseId = (formData.get("courseId") as string) || null;
  const bypassOnboarding = formData.get("bypassOnboarding") === "true";

  if (!csvContent) {
    return { error: "CSV content is required.", success: "", results: [] };
  }

  if (!["admin", "instructor", "student"].includes(role)) {
    return { error: "Invalid role.", success: "", results: [] };
  }

  // Parse CSV content
  const lines = csvContent.split("\n").filter((line) => line.trim());

  if (lines.length > 500) {
    return {
      error: "Too many rows. Please upload at most 500 users at a time.",
      success: "",
      results: [],
    };
  }
  const results: BulkCreateResult[] = [];
  let successCount = 0;
  let failCount = 0;

  const admin = createAdminClient();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Skip header row if present
    if (
      i === 0 &&
      line.toLowerCase().includes("email") &&
      line.toLowerCase().includes("fullname")
    ) {
      continue;
    }

    const parts = line.split(",");
    if (parts.length < 2) {
      results.push({
        line: i + 1,
        email: parts[0] || "",
        success: false,
        error: "Invalid format. Expected: email,fullName",
      });
      failCount++;
      continue;
    }

    const email = parts[0].trim().toLowerCase();
    const fullName = parts.slice(1).join(",").trim();

    if (!email || !fullName) {
      results.push({
        line: i + 1,
        email,
        success: false,
        error: "Email and full name are required.",
      });
      failCount++;
      continue;
    }

    // Validate Gmail only
    const emailDomain = email.split("@")[1]?.toLowerCase();
    if (!emailDomain || emailDomain !== "gmail.com") {
      results.push({
        line: i + 1,
        email,
        success: false,
        error: "Only Gmail emails are allowed.",
      });
      failCount++;
      continue;
    }

    // Random per-user password nobody knows. A shared/default password would be a
    // publicly guessable credential on every bulk-created account (Supabase Auth
    // accepts password grants with the public anon key). Users sign in with Google
    // using this email address.
    const password = `${randomBytes(24).toString("base64url")}aA1!`;

    try {
      const { data, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          role,
        },
      });

      if (createError) {
        results.push({
          line: i + 1,
          email,
          success: false,
          error: createError.message,
        });
        failCount++;
        continue;
      }

      if (data.user) {
        const userRecord: Record<string, unknown> = {
          id: data.user.id,
          email,
          full_name: fullName,
          role,
          selected_course_id: courseId,
        };

        // If bypass onboarding is enabled for students, set both flags
        if (bypassOnboarding && role === "student") {
          userRecord.onboarding_bypassed = true;
          userRecord.onboarding_completed = true;
        }

        await admin.from("users").upsert(userRecord as never, { onConflict: "id" });

        // If a course was selected and role is student, enroll the user
        if (courseId && role === "student") {
          await admin.from("enrollments").insert({
            user_id: data.user.id,
            course_id: courseId,
            enrolled_by: session.userId,
          } as never);
        }

        // Audit log
        await logAuditEvent(session.userId, data.user.id, "user.created", {
          full_name: fullName,
          role,
          course_id: courseId,
          bulk: true,
        });

        results.push({
          line: i + 1,
          email,
          fullName,
          success: true,
        });
        successCount++;
      }
    } catch (err) {
      results.push({
        line: i + 1,
        email,
        success: false,
        error: errorMessage(err, "Unknown error occurred"),
      });
      failCount++;
    }
  }

  const courseMessage = courseId && role === "student" ? " and enrolled in selected course" : "";
  const bypassMessage = bypassOnboarding && role === "student" ? " with onboarding bypassed" : "";

  if (successCount > 0) {
    revalidatePath("/admin/users");
  }

  return {
    error: "",
    success: `Bulk creation complete: ${successCount} succeeded, ${failCount} failed${courseMessage}${bypassMessage}. New users sign in with Google using their email address.`,
    results,
  };
}

export async function adminDeleteUser(
  _prevState: { error: string; success: string } | undefined,
  formData: FormData
): Promise<{ error: string; success: string }> {
  const userId = formData.get("userId") as string;

  if (!userId) {
    return { error: "User ID is required.", success: "" };
  }

  // Service-role/admin-only action: enforce the admin role BEFORE any work or side effect.
  const session = await verifyAdmin();
  const limited = await limitAdminAction(session.userId, "delete-user", 60);
  if (limited) return { error: limited, success: "" };

  if (session.userId === userId) {
    return { error: "You cannot delete your own account.", success: "" };
  }

  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("users")
    .select("full_name")
    .eq("id", userId)
    .single();

  // Log audit event before deletion (target_user_id will be set to NULL by ON DELETE SET NULL)
  await logAuditEvent(session.userId, userId, "user.deleted", {
    full_name: profile?.full_name ?? userId,
  });

  const { error: dbError } = await supabase.from("users").delete().eq("id", userId);

  if (dbError) {
    return { error: dbError.message, success: "" };
  }

  const admin = createAdminClient();
  const { error: authError } = await admin.auth.admin.deleteUser(userId);

  if (authError) {
    console.error("Error deleting auth user:", authError.message);
  }

  revalidatePath("/admin/users");

  return {
    error: "",
    success: `User "${profile?.full_name ?? userId}" deleted from database and auth.`,
  };
}

export async function bulkDeleteUsers(
  _prevState: { error: string; success: string } | undefined,
  formData: FormData
): Promise<{ error: string; success: string }> {
  const userIdsStr = formData.get("userIds") as string;

  if (!userIdsStr) {
    return { error: "No users selected for deletion.", success: "" };
  }

  let userIds: string[];
  try {
    userIds = JSON.parse(userIdsStr);
  } catch {
    return { error: "Invalid user IDs format.", success: "" };
  }

  if (!Array.isArray(userIds) || userIds.length === 0) {
    return { error: "No users selected for deletion.", success: "" };
  }

  if (userIds.length > 200 || !userIds.every((id) => typeof id === "string" && UUID_RE.test(id))) {
    return { error: "Invalid user selection.", success: "" };
  }

  // Service-role/admin-only action: enforce the admin role BEFORE any work or side effect.
  const session = await verifyAdmin();
  const limited = await limitAdminAction(session.userId, "bulk-delete-users", 10);
  if (limited) return { error: limited, success: "" };

  // Prevent self-deletion
  if (userIds.includes(session.userId)) {
    return { error: "You cannot delete your own account.", success: "" };
  }

  const supabase = await createClient();
  const admin = createAdminClient();
  let successCount = 0;
  const errors: string[] = [];

  for (const userId of userIds) {
    try {
      // Get user profile for logging
      const { data: profile } = await supabase
        .from("users")
        .select("full_name")
        .eq("id", userId)
        .single();

      // Log audit event before deletion
      await logAuditEvent(session.userId, userId, "user.deleted", {
        full_name: profile?.full_name ?? userId,
        action: "bulk_delete",
      });

      // Delete from database (this will cascade to enrollments)
      const { error: dbError } = await supabase
        .from("users")
        .delete()
        .eq("id", userId);

      if (dbError) {
        errors.push(`Failed to delete user ${userId}: ${dbError.message}`);
        continue;
      }

      // Delete from auth
      const { error: authError } = await admin.auth.admin.deleteUser(userId);

      if (authError) {
        console.error(`Error deleting auth user ${userId}:`, authError.message);
      }

      successCount++;
    } catch (err) {
      errors.push(`Error deleting user ${userId}: ${errorMessage(err)}`);
    }
  }

  const errorMsg = errors.length > 0 ? ` Errors: ${errors.slice(0, 3).join("; ")}` : "";

  if (successCount > 0) {
    revalidatePath("/admin/users");
  }

  return {
    error: errors.length > 0 ? `${errors.length} deletion(s) failed.${errorMsg}` : "",
    success: `Successfully deleted ${successCount} user(s).${errorMsg}`,
  };
}

export async function adminBypassOnboarding(
  _prevState: { error: string; success: string } | undefined,
  formData: FormData
): Promise<{ error: string; success: string }> {
  const userId = formData.get("userId") as string;
  const bypass = formData.get("bypass") === "true";

  if (!userId) {
    return { error: "User ID is required.", success: "" };
  }

  let session: { userId: string };
  try {
    const result = await verifyAdmin();
    session = { userId: result.userId };
  } catch {
    return { error: "Unauthorized. Admin access required.", success: "" };
  }

  const supabase = await createClient();

  // Prevent admin from bypassing their own onboarding
  if (session.userId === userId) {
    return { error: "You cannot bypass your own onboarding.", success: "" };
  }

  // Get the target user to verify they are a student
  const { data: targetUser } = await supabase
    .from("users")
    .select("role, onboarding_completed, onboarding_bypassed")
    .eq("id", userId)
    .single();

  if (!targetUser) {
    return { error: "User not found.", success: "" };
  }

  if (targetUser.role !== "student") {
    return { error: "Onboarding bypass is only applicable to students.", success: "" };
  }

  // Update the user's onboarding_bypassed status
  const { error } = await supabase
    .from("users")
    .update({ onboarding_bypassed: bypass } as never)
    .eq("id", userId);

  if (error) {
    return { error: error.message, success: "" };
  }

  await logAuditEvent(
    session.userId,
    userId,
    bypass ? "user.onboarding_bypassed" : "user.onboarding_restored",
    {
      action: bypass ? "bypassed" : "restored",
    }
  );

  const action = bypass ? "bypassed" : "restored";

  revalidatePath("/admin/users");

  return { error: "", success: `Onboarding has been ${action} for this student.` };
}
