"use server";

import { verifySession, verifyAdmin } from "@/lib/dal";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/app/actions/admin";
import type { UserRole } from "@/types";

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export async function createUserProfile(
  userId: string,
  email: string,
  fullName: string,
  role: UserRole = "student"
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("users")
    .insert({
      id: userId,
      email,
      full_name: fullName,
      role,
    } as never)
    .select()
    .single();

  if (error) {
    console.error("Error creating user profile:", error);
    throw new Error(error.message);
  }

  return data as UserProfile;
}

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

  const session = await verifySession();

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
  const oldRole = (currentUser as any)?.role;

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

  return { error: "", success: `Role updated to ${role}.` };
}

export async function adminCreateUser(
  _prevState: { error: string; success: string } | undefined,
  formData: FormData
): Promise<{ error: string; success: string }> {
  const session = await verifySession();

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
    const userRecord: Record<string, any> = {
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

  return {
    error: "",
    success: `Account created for ${fullName} (${role}).${courseId && role === "student" ? " Enrolled in selected course." : ""}${bypassOnboarding && role === "student" ? " Onboarding bypassed." : ""}`,
  };
}

export async function adminBulkCreateUsers(
  _prevState: { error: string; success: string; results?: any[] } | undefined,
  formData: FormData
): Promise<{ error: string; success: string; results?: any[] }> {
  const session = await verifySession();

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
  const results: any[] = [];
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

    // Use a default temporary password that users must change on first login
    const password = "TempPass123!";

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
        const userRecord: Record<string, any> = {
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
    } catch (err: any) {
      results.push({
        line: i + 1,
        email,
        success: false,
        error: err.message || "Unknown error occurred",
      });
      failCount++;
    }
  }

  const courseMessage = courseId && role === "student" ? " and enrolled in selected course" : "";
  const bypassMessage = bypassOnboarding && role === "student" ? " with onboarding bypassed" : "";
  return {
    error: "",
    success: `Bulk creation complete: ${successCount} succeeded, ${failCount} failed${courseMessage}${bypassMessage}. Temporary password for all users: TempPass123!`,
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

  const session = await verifySession();

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
    full_name: (profile as any)?.full_name ?? userId,
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

  return {
    error: "",
    success: `User "${(profile as any)?.full_name ?? userId}" deleted from database and auth.`,
  };
}

export async function updateUserProfile(updates: { full_name?: string; avatar_url?: string }) {
  const session = await verifySession();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("users")
    .update(updates as never)
    .eq("id", session.userId)
    .select()
    .single();

  if (error) {
    console.error("Error updating user profile:", error);
    throw new Error(error.message);
  }

  return data as UserProfile;
}

export async function toggleStudentApproval(
  _prevState: { error: string; success: string } | undefined,
  formData: FormData
): Promise<{ error: string; success: string }> {
  const userId = formData.get("userId") as string;
  const isApproved = formData.get("isApproved") === "true";

  if (!userId) {
    return { error: "User ID is required.", success: "" };
  }

  const session = await verifySession();

  const supabase = await createClient();

  // If approving, enroll the user in their selected course
  if (isApproved) {
    // Get the user's selected course
    const { data: user } = await supabase
      .from("users")
      .select("selected_course_id")
      .eq("id", userId)
      .single();

    if ((user as any)?.selected_course_id) {
      // Check if already enrolled
      const { data: existingEnrollment } = await supabase
        .from("enrollments")
        .select("id")
        .eq("user_id", userId)
        .eq("course_id", (user as any).selected_course_id)
        .single();

      // Only enroll if not already enrolled
      if (!existingEnrollment) {
        const admin = createAdminClient();
        await admin.from("enrollments").insert({
          user_id: userId,
          course_id: (user as any).selected_course_id,
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

  const userIds: string[] = JSON.parse(userIdsStr);

  if (!Array.isArray(userIds) || userIds.length === 0) {
    return { error: "No users selected for approval.", success: "" };
  }

  const session = await verifySession();

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

  return {
    error: "",
    success: `${users.length} student${users.length > 1 ? "s" : ""} approved.`,
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

  if ((targetUser as any).role !== "student") {
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
  return { error: "", success: `Onboarding has been ${action} for this student.` };
}
