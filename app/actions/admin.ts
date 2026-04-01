"use server";

import { verifySession } from "@/lib/dal";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { AuditLogEntry, UserEnrollmentDetail, UserDetailData } from "@/types";

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

export async function getStudentApplication(
  userId: string
): Promise<{ data: StudentApplication | null; error: string }> {
  await verifySession();

  const supabase = await createClient();

  if (!(await verifyAdmin(supabase))) {
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

  const s = student as any;

  // Generate signed URLs for all uploaded documents
  const [cnic_url, degree_url, fee_receipt_url, avatar_file_url] = await Promise.all([
    getSignedUrl(supabase, s.cnic_file_path),
    getSignedUrl(supabase, s.degree_file_path),
    getSignedUrl(supabase, s.fee_receipt_file_path),
    getSignedUrl(supabase, s.avatar_file_path),
  ]);

  // Fetch course information if selected
  let selected_course_title = null;
  let selected_course_batch = null;
  if (s.selected_course_id) {
    const { data: course } = await supabase
      .from("courses")
      .select("title, batch")
      .eq("id", s.selected_course_id)
      .single();
    if (course) {
      selected_course_title = (course as any).title;
      selected_course_batch = (course as any).batch;
    }
  }

  return {
    data: {
      id: s.id,
      email: s.email,
      full_name: s.full_name,
      role: s.role,
      avatar_url: s.avatar_url,
      onboarding_completed: s.onboarding_completed,
      onboarding_bypassed: s.onboarding_bypassed,
      is_approved: s.is_approved,
      created_at: s.created_at,
      updated_at: s.updated_at,
      father_name: s.father_name,
      cnic_number: s.cnic_number,
      dob: s.dob,
      bank_name: s.bank_name,
      education_level: s.education_level,
      degree_title: s.degree_title,
      profession: s.profession,
      whatsapp_number: s.whatsapp_number,
      postal_address: s.postal_address,
      fee_transaction_id: s.fee_transaction_id,
      fee_submission_date: s.fee_submission_date,
      declaration_accepted: s.declaration_accepted,
      selected_course_id: s.selected_course_id,
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
  await verifySession();

  const supabase = await createClient();

  if (!(await verifyAdmin(supabase))) {
    return { error: "Unauthorized. Admin access required.", success: "" };
  }

  const userId = formData.get("userId") as string;
  if (!userId) {
    return { error: "User ID is required.", success: "" };
  }

  // Build the updates object from all editable fields
  const updates: Record<string, any> = {};

  const textFields = [
    "full_name",
    "email",
    "father_name",
    "cnic_number",
    "education_level",
    "degree_title",
    "profession",
    "whatsapp_number",
    "postal_address",
    "fee_transaction_id",
    "bank_name",
  ];

  for (const field of textFields) {
    const value = formData.get(field);
    if (value !== null) {
      updates[field] = (value as string).trim();
    }
  }

  // Date fields
  const dob = formData.get("dob") as string;
  if (dob) updates.dob = dob;

  const fee_submission_date = formData.get("fee_submission_date") as string;
  if (fee_submission_date) updates.fee_submission_date = fee_submission_date;

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
  const session = await verifySession();

  const supabase = await createClient();

  if (!(await verifyAdmin(supabase))) {
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

  const u = user as any;

  // Generate signed URLs for documents
  const [cnic_url, degree_url, fee_receipt_url, avatar_file_url] = await Promise.all([
    getSignedUrl(supabase, u.cnic_file_path),
    getSignedUrl(supabase, u.degree_file_path),
    getSignedUrl(supabase, u.fee_receipt_file_path),
    getSignedUrl(supabase, u.avatar_file_path),
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

  for (const row of (enrollmentsData as any[]) ?? []) {
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

    const totalLessons = (progressData as any[])?.length ?? 0;
    const completedLessons = (progressData as any[])?.filter((p: any) => p.completed).length ?? 0;
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
    for (const au of (adminUsers as any[]) ?? []) {
      adminNameMap[au.id] = au.full_name;
    }
  }

  const auditLog: AuditLogEntry[] = ((auditData as any[]) ?? []).map((a: any) => ({
    id: a.id,
    admin_id: a.admin_id,
    target_user_id: a.target_user_id,
    action: a.action,
    details: a.details ?? {},
    created_at: a.created_at,
    admin_name: adminNameMap[a.admin_id] ?? "Unknown Admin",
  }));

  // Compute stats
  const completedCourses = enrollments.filter((e) => e.progress_percent === 100).length;
  const totalProgress =
    enrollments.length > 0
      ? Math.round(enrollments.reduce((sum, e) => sum + e.progress_percent, 0) / enrollments.length)
      : 0;
  const accountAgeMs = Date.now() - new Date(u.created_at).getTime();
  const accountAgeDays = Math.floor(accountAgeMs / (1000 * 60 * 60 * 24));

  return {
    data: {
      user: {
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        role: u.role,
        avatar_url: u.avatar_url,
        is_paused: u.is_paused ?? false,
        is_approved: u.is_approved,
        onboarding_completed: u.onboarding_completed,
        onboarding_bypassed: u.onboarding_bypassed,
        created_at: u.created_at,
        updated_at: u.updated_at,
        father_name: u.father_name,
        cnic_number: u.cnic_number,
        dob: u.dob,
        bank_name: u.bank_name,
        education_level: u.education_level,
        degree_title: u.degree_title,
        profession: u.profession,
        whatsapp_number: u.whatsapp_number,
        postal_address: u.postal_address,
        fee_transaction_id: u.fee_transaction_id,
        fee_submission_date: u.fee_submission_date,
        cnic_url,
        degree_url,
        fee_receipt_url,
        avatar_file_url,
      },
      enrollments,
      auditLog,
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
  const session = await verifySession();

  const supabase = await createClient();

  if (!(await verifyAdmin(supabase))) {
    return { error: "Unauthorized. Admin access required.", success: "" };
  }

  const userId = formData.get("userId") as string;
  const isPaused = formData.get("isPaused") === "true";

  if (!userId) {
    return { error: "User ID is required.", success: "" };
  }

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
