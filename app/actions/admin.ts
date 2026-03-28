"use server";

import { verifySession } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";

export interface StudentApplication {
  // Identity
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  onboarding_completed: boolean;
  is_approved: boolean;
  created_at: string;

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
  await verifySession();

  const supabase = await createClient();

  // Verify the caller is an admin
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return { data: null, error: "Not authenticated." };
  }

  const { data: callerProfile } = await supabase
    .from("users")
    .select("role")
    .eq("id", authUser.id)
    .single();

  if ((callerProfile as any)?.role !== "admin") {
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

  return {
    data: {
      id: s.id,
      email: s.email,
      full_name: s.full_name,
      avatar_url: s.avatar_url,
      onboarding_completed: s.onboarding_completed,
      is_approved: s.is_approved,
      created_at: s.created_at,
      father_name: s.father_name,
      dob: s.dob,
      education_level: s.education_level,
      degree_title: s.degree_title,
      profession: s.profession,
      whatsapp_number: s.whatsapp_number,
      postal_address: s.postal_address,
      fee_transaction_id: s.fee_transaction_id,
      fee_submission_date: s.fee_submission_date,
      cnic_url,
      degree_url,
      fee_receipt_url,
      avatar_file_url,
    },
    error: "",
  };
}
