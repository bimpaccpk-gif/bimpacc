"use server";

import { verifyAdmin } from "@/lib/dal";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  updateStudentProfileSchema,
  toggleUserPauseSchema,
  resetDeviceFingerprintSchema,
} from "@/lib/validations";
import type {
  AuditLogEntry,
  UserEnrollmentDetail,
  UserDetailData,
  LoginHistoryEntry,
} from "@/types";

export interface StudentApplication {
  // Identity
  id: string;
  email: string;
  full_name: string;
  role: string;
  avatar_url: string | null;
  onboarding_completed: boolean;
  onboarding_bypassed: boolean;
  is_approved: boolean;
  created_at: string;
  updated_at: string;

  // Personal
  father_name: string | null;
  cnic_number: string | null;
  dob: string | null;
  bank_name: string | null;

  // Academic
  education_level: string | null;
  degree_title: string | null;
  profession: string | null;

  // Contact
  whatsapp_number: string | null;
  postal_address: string | null;

  // Fee
  fee_transaction_id: string | null;
  fee_submission_date: string | null;

  // Declaration
  declaration_accepted: boolean | null;

  // Course enrollment
  selected_course_id: string | null;
  selected_course_title: string | null;
  selected_course_batch: string | null;

  // Signed document URLs (generated server-side)
  cnic_url: string | null;
  degree_url: string | null;
  fee_receipt_url: string | null;
  avatar_file_url: string | null;
}

async function getSignedUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  filePath: string | null
): Promise<string | null> {
  if (!filePath) return null;

  const { data, error } = await supabase.storage
    .from("student_documents")
    .createSignedUrl(filePath, 60 * 60); // 1 hour expiry

  if (error) {
    console.error("Signed URL error for", filePath, error.message);
    return null;
  }

  return data.signedUrl;
}

export async function getStudentApplication(
  userId: string
): Promise<{ data: StudentApplication | null; error: string }> {
  const supabase = await createClient();

  try {
    await verifyAdmin();
  } catch {
    return { data: null, error: "Unauthorized. Admin access required." };
  }

  // Fetch the student's full profile
  const { data: student, error: fetchError } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (fetchError || !student) {
    return {
      data: null,
      error: fetchError?.message ?? "Student not found.",
    };
  }

  // Generate signed URLs for all uploaded documents
  const [cnic_url, degree_url, fee_receipt_url, avatar_file_url] = await Promise.all([
    getSignedUrl(supabase, student.cnic_file_path),
    getSignedUrl(supabase, student.degree_file_path),
    getSignedUrl(supabase, student.fee_receipt_file_path),
    getSignedUrl(supabase, student.avatar_file_path),
  ]);

  // Fetch course information if selected
  let selected_course_title = null;
  let selected_course_batch = null;
  if (student.selected_course_id) {
    const { data: course } = await supabase
      .from("courses")
      .select("title, batch")
      .eq("id", student.selected_course_id)
      .single();
    if (course) {
      selected_course_title = course.title;
      selected_course_batch = course.batch;
    }
  }

  return {
    data: {
      id: student.id,
      email: student.email,
      full_name: student.full_name,
      role: student.role,
      avatar_url: student.avatar_url,
      onboarding_completed: student.onboarding_completed,
      onboarding_bypassed: student.onboarding_bypassed,
      is_approved: student.is_approved,
      created_at: student.created_at,
      updated_at: student.updated_at,
      father_name: student.father_name,
      cnic_number: student.cnic_number,
      dob: student.dob,
      bank_name: student.bank_name,
      education_level: student.education_level,
      degree_title: student.degree_title,
      profession: student.profession,
      whatsapp_number: student.whatsapp_number,
      postal_address: student.postal_address,
      fee_transaction_id: student.fee_transaction_id,
      fee_submission_date: student.fee_submission_date,
      declaration_accepted: student.declaration_accepted,
      selected_course_id: student.selected_course_id,
      selected_course_title,
      selected_course_batch,
      cnic_url,
      degree_url,
      fee_receipt_url,
      avatar_file_url,
    },
    error: "",
  };
}

export async function updateStudentProfile(
  _prevState: { error: string; success: string } | undefined,
  formData: FormData
): Promise<{ error: string; success: string }> {
  try {
    await verifyAdmin();
  } catch {
    return { error: "Unauthorized. Admin access required.", success: "" };
  }

  const supabase = await createClient();

  const validation = updateStudentProfileSchema.safeParse({
    userId: formData.get("userId"),
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    father_name: formData.get("father_name"),
    cnic_number: formData.get("cnic_number"),
    dob: formData.get("dob"),
    bank_name: formData.get("bank_name"),
    education_level: formData.get("education_level"),
    degree_title: formData.get("degree_title"),
    profession: formData.get("profession"),
    whatsapp_number: formData.get("whatsapp_number"),
    postal_address: formData.get("postal_address"),
    fee_transaction_id: formData.get("fee_transaction_id"),
    fee_submission_date: formData.get("fee_submission_date"),
  });

  if (!validation.success) {
    return { error: validation.error.issues[0].message, success: "" };
  }

  const { userId, ...rest } = validation.data;

  // Build updates from validated data, removing empty/undefined values
  const updates: Record<string, string | null> = {};

  for (const [key, value] of Object.entries(rest)) {
    if (value !== undefined && value !== null && value !== "") {
      updates[key] = value as string;
    }
  }

  if (Object.keys(updates).length === 0) {
    return { error: "No changes to save.", success: "" };
  }

  const { error } = await supabase
    .from("users")
    .update(updates as never)
    .eq("id", userId);

  if (error) {
    return { error: error.message, success: "" };
  }

  revalidatePath("/admin/users");
  return { error: "", success: "Student profile updated successfully." };
}

export async function logAuditEvent(
  adminId: string,
  targetUserId: string | null,
  action: string,
  details: Record<string, any> = {}
) {
  try {
    await verifyAdmin();
  } catch {
    return; // Silently fail — audit log should not break calling code
  }

  const admin = createAdminClient();
  await admin.from("audit_log").insert({
    admin_id: adminId,
    target_user_id: targetUserId,
    action,
    details,
  } as never);
}

export async function getUserDetail(
  userId: string
): Promise<{ data: UserDetailData | null; error: string }> {
  const supabase = await createClient();

  try {
    await verifyAdmin();
  } catch {
    return { data: null, error: "Unauthorized. Admin access required." };
  }

  // Fetch user
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (userError || !user) {
    return { data: null, error: userError?.message ?? "User not found." };
  }

  const { data: superAdmin } = await supabase
    .from("super_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  // Generate signed URLs for documents
  const [cnic_url, degree_url, fee_receipt_url, avatar_file_url] = await Promise.all([
    getSignedUrl(supabase, user.cnic_file_path),
    getSignedUrl(supabase, user.degree_file_path),
    getSignedUrl(supabase, user.fee_receipt_file_path),
    getSignedUrl(supabase, user.avatar_file_path),
  ]);

  // Fetch enrollments with course info and enrolled_by admin name
  const admin = createAdminClient();

  const { data: enrollmentsData } = await admin
    .from("enrollments")
    .select(
      `
      id,
      course_id,
      enrolled_at,
      enrolled_by,
      courses ( id, title, batch )
    `
    )
    .eq("user_id", userId)
    .order("enrolled_at", { ascending: false });

  const enrollments: UserEnrollmentDetail[] = [];

  for (const row of enrollmentsData ?? []) {
    const course = Array.isArray(row.courses) ? row.courses[0] : row.courses;

    // Get enrolled_by admin name
    let enrolledByName: string | null = null;
    if (row.enrolled_by) {
      const { data: adminUser } = await admin
        .from("users")
        .select("full_name")
        .eq("id", row.enrolled_by)
        .single();
      enrolledByName = (adminUser as any)?.full_name ?? null;
    }

    // Get lesson progress for this enrollment
    const { data: progressData } = await admin
      .from("lesson_progress")
      .select("id, completed")
      .eq("enrollment_id", row.id);

    const totalLessons = progressData?.length ?? 0;
    const completedLessons =
      progressData?.filter((p: { completed: boolean }) => p.completed).length ?? 0;
    const progressPercent =
      totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    enrollments.push({
      enrollment_id: row.id,
      course_id: row.course_id,
      course_title: course?.title ?? "Unknown Course",
      course_batch: course?.batch ?? null,
      enrolled_at: row.enrolled_at,
      enrolled_by_name: enrolledByName,
      total_lessons: totalLessons,
      completed_lessons: completedLessons,
      progress_percent: progressPercent,
    });
  }

  // Fetch audit log entries for this user
  const { data: auditData } = await admin
    .from("audit_log")
    .select(
      `
      id,
      admin_id,
      target_user_id,
      action,
      details,
      created_at
    `
    )
    .eq("target_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  // Enrich audit log with admin names
  const adminIds = [...new Set(((auditData as any[]) ?? []).map((a: any) => a.admin_id))];
  const adminNameMap: Record<string, string> = {};
  if (adminIds.length > 0) {
    const { data: adminUsers } = await admin
      .from("users")
      .select("id, full_name")
      .in("id", adminIds);
    for (const au of adminUsers ?? []) {
      adminNameMap[au.id] = au.full_name;
    }
  }

  const auditLog: AuditLogEntry[] = (auditData ?? []).map((a) => ({
    id: a.id,
    admin_id: a.admin_id,
    target_user_id: a.target_user_id,
    action: a.action,
    details: (a.details as Record<string, unknown>) ?? {},
    created_at: a.created_at,
    admin_name: adminNameMap[a.admin_id] ?? "Unknown Admin",
  }));

  // Compute stats
  const completedCourses = enrollments.filter((e) => e.progress_percent === 100).length;
  const totalProgress =
    enrollments.length > 0
      ? Math.round(enrollments.reduce((sum, e) => sum + e.progress_percent, 0) / enrollments.length)
      : 0;
  const accountAgeMs = Date.now() - new Date(user.created_at).getTime();
  const accountAgeDays = Math.floor(accountAgeMs / (1000 * 60 * 60 * 24));

  // Fetch login history
  const { data: loginHistoryData } = await admin
    .from("login_history")
    .select(
      "id, email, status, device_fingerprint, hardware_fingerprint, device_components, user_agent, created_at"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  const loginHistory: LoginHistoryEntry[] = (loginHistoryData ?? []).map((l) => ({
    id: l.id,
    email: l.email,
    status: l.status,
    device_fingerprint: l.device_fingerprint,
    hardware_fingerprint: l.hardware_fingerprint,
    device_components: l.device_components,
    similarity_score: null,
    user_agent: l.user_agent,
    created_at: l.created_at,
  }));

  return {
    data: {
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        is_super_admin: Boolean(superAdmin),
        avatar_url: user.avatar_url,
        is_paused: user.is_paused ?? false,
        is_approved: user.is_approved,
        onboarding_completed: user.onboarding_completed,
        onboarding_bypassed: user.onboarding_bypassed,
        created_at: user.created_at,
        updated_at: user.updated_at,
        father_name: user.father_name,
        cnic_number: user.cnic_number,
        dob: user.dob,
        bank_name: user.bank_name,
        education_level: user.education_level,
        degree_title: user.degree_title,
        profession: user.profession,
        whatsapp_number: user.whatsapp_number,
        postal_address: user.postal_address,
        fee_transaction_id: user.fee_transaction_id,
        fee_submission_date: user.fee_submission_date,
        cnic_url,
        degree_url,
        fee_receipt_url,
        avatar_file_url,
        device_fingerprint: user.device_fingerprint,
        hardware_fingerprint: user.hardware_fingerprint,
        device_locked_at: user.device_locked_at,
        device_components: user.device_components,
        is_locked: user.is_locked ?? false,
      },
      enrollments,
      auditLog,
      loginHistory,
      stats: {
        totalEnrollments: enrollments.length,
        completedCourses,
        overallProgress: totalProgress,
        accountAgeDays,
      },
    },
    error: "",
  };
}

export async function toggleUserPause(
  _prevState: { error: string; success: string } | undefined,
  formData: FormData
): Promise<{ error: string; success: string }> {
  const session = await verifyAdmin();
  const supabase = await createClient();

  const validation = toggleUserPauseSchema.safeParse({
    userId: formData.get("userId"),
    isPaused: formData.get("isPaused") === "true",
  });

  if (!validation.success) {
    return { error: validation.error.issues[0].message, success: "" };
  }

  const { userId, isPaused } = validation.data;

  if (session.userId === userId) {
    return { error: "You cannot pause your own account.", success: "" };
  }

  const { error } = await supabase
    .from("users")
    .update({ is_paused: isPaused } as never)
    .eq("id", userId);

  if (error) {
    return { error: error.message, success: "" };
  }

  // Log audit event
  await logAuditEvent(session.userId, userId, isPaused ? "user.paused" : "user.unpaused", {
    action: isPaused ? "paused" : "unpaused",
  });

  revalidatePath("/admin/users");
  return {
    error: "",
    success: `User account has been ${isPaused ? "paused" : "unpaused"}.`,
  };
}

export async function resetDeviceFingerprint(
  _prevState: { error: string; success: string } | undefined,
  formData: FormData
): Promise<{ error: string; success: string }> {
  const session = await verifyAdmin();
  const supabase = await createClient();

  const validation = resetDeviceFingerprintSchema.safeParse({
    userId: formData.get("userId"),
  });

  if (!validation.success) {
    return { error: validation.error.issues[0].message, success: "" };
  }

  const { userId } = validation.data;

  // Verify target user is a student
  const { data: target } = await supabase.from("users").select("role").eq("id", userId).single();

  if (!target || target.role !== "student") {
    return { error: "Device lock reset is only available for student accounts.", success: "" };
  }

  const { error } = await supabase
    .from("users")
    .update({
      device_fingerprint: null,
      hardware_fingerprint: null,
      device_components: null,
      device_locked_at: null,
      is_locked: false,
    } as never)
    .eq("id", userId);

  if (error) {
    return { error: error.message, success: "" };
  }

  await logAuditEvent(session.userId, userId, "user.device_reset", {
    action: "device_lock_reset",
  });

  revalidatePath("/admin/users");
  return {
    error: "",
    success: "Device lock has been reset. The student can now login from a new device.",
  };
}
