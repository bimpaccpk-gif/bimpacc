"use server";

import { verifySession } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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
  dob: string | null;

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
  const [cnic_url, degree_url, fee_receipt_url, avatar_file_url] =
    await Promise.all([
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
      dob: s.dob,
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
    "education_level",
    "degree_title",
    "profession",
    "whatsapp_number",
    "postal_address",
    "fee_transaction_id",
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
