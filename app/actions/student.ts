"use server";

import { createClient } from "@/lib/supabase/server";
import { verifySession } from "@/lib/dal";
import { revalidatePath } from "next/cache";

export async function completeOnboarding(
  _prevState: { error: string } | undefined,
  formData: FormData
): Promise<{ error: string; success?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Not authenticated" };
    }

    // Extract basic fields
    const father_name = formData.get("father_name") as string;
    const dob = formData.get("dob") as string;
    const education_level = formData.get("education_level") as string;
    const degree_title = formData.get("degree_title") as string;
    const profession = formData.get("profession") as string;
    const whatsapp_number = formData.get("whatsapp_number") as string;
    const postal_address = formData.get("postal_address") as string;
    const fee_transaction_id = formData.get("fee_transaction_id") as string;
    const fee_submission_date = formData.get("fee_submission_date") as string;
    const declaration_accepted = formData.get("declaration_accepted") === "on";

    // Extract file paths that the client successfully uploaded directly to Supabase Storage
    const cnic_file_path = formData.get("cnic_file_path") as string;
    const degree_file_path = formData.get("degree_file_path") as string;
    const fee_receipt_file_path = formData.get("fee_receipt_file_path") as string;
    const avatar_file_path = formData.get("avatar_file_path") as string;

    if (
      !father_name || 
      !dob || 
      !education_level || 
      !degree_title || 
      !profession || 
      !whatsapp_number || 
      !postal_address || 
      !fee_transaction_id || 
      !fee_submission_date
    ) {
      return { error: "Please fill out all required text fields." };
    }

    if (!cnic_file_path || !degree_file_path || !fee_receipt_file_path || !avatar_file_path) {
      return { error: "Please wait for all required files to complete uploading." };
    }

    if (!declaration_accepted) {
      return { error: "You must accept the declaration to proceed." };
    }

    // Update users table with all student profile data and mark onboarding as completed
    const { error: updateError } = await supabase
      .from("users")
      .update({
        father_name,
        cnic_file_path,
        dob,
        education_level,
        degree_title,
        degree_file_path,
        profession,
        whatsapp_number,
        postal_address,
        fee_transaction_id,
        fee_submission_date,
        fee_receipt_file_path,
        avatar_file_path,
        declaration_accepted,
        onboarding_completed: true
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("User Update Error:", updateError);
      return { error: "Failed to save profile details. " + updateError.message };
    }

    revalidatePath("/student");
    return { error: "", success: "Onboarding completed successfully!" };
  } catch (error: any) {
    console.error("Onboarding Exception:", error);
    return { error: "An unexpected error occurred." };
  }
}

export async function completeBypassedProfile(
  _prevState: { error: string; success: string } | undefined,
  formData: FormData
): Promise<{ error: string; success: string }> {
  try {
    const session = await verifySession();
    const supabase = await createClient();

    // Verify user is a student with bypassed onboarding
    const { data: user } = await supabase
      .from("users")
      .select("role, onboarding_bypassed, onboarding_completed")
      .eq("id", session.userId)
      .single();

    if (!user || user.role !== "student") {
      return { error: "Only students can complete profile.", success: "" };
    }

    if (!user.onboarding_bypassed) {
      return { error: "Profile completion is only available for bypassed students.", success: "" };
    }

    if (user.onboarding_completed) {
      return { error: "Profile already completed via onboarding.", success: "" };
    }

    // Build update object with only provided fields (all optional)
    const updates: Record<string, any> = {};
    
    // Text fields (optional)
    const fatherName = formData.get("father_name") as string;
    const dob = formData.get("dob") as string;
    const educationLevel = formData.get("education_level") as string;
    const degreeTitle = formData.get("degree_title") as string;
    const profession = formData.get("profession") as string;
    const whatsappNumber = formData.get("whatsapp_number") as string;
    const postalAddress = formData.get("postal_address") as string;
    const feeTransactionId = formData.get("fee_transaction_id") as string;
    const feeSubmissionDate = formData.get("fee_submission_date") as string;

    if (fatherName) updates.father_name = fatherName;
    if (dob) updates.dob = dob;
    if (educationLevel) updates.education_level = educationLevel;
    if (degreeTitle) updates.degree_title = degreeTitle;
    if (profession) updates.profession = profession;
    if (whatsappNumber) updates.whatsapp_number = whatsappNumber;
    if (postalAddress) updates.postal_address = postalAddress;
    if (feeTransactionId) updates.fee_transaction_id = feeTransactionId;
    if (feeSubmissionDate) updates.fee_submission_date = feeSubmissionDate;

    // File paths (optional)
    const cnicPath = formData.get("cnic_file_path") as string;
    const degreePath = formData.get("degree_file_path") as string;
    const receiptPath = formData.get("fee_receipt_file_path") as string;
    const avatarPath = formData.get("avatar_file_path") as string;

    if (cnicPath) updates.cnic_file_path = cnicPath;
    if (degreePath) updates.degree_file_path = degreePath;
    if (receiptPath) updates.fee_receipt_file_path = receiptPath;
    if (avatarPath) updates.avatar_file_path = avatarPath;

    // Only update if there are changes
    if (Object.keys(updates).length === 0) {
      return { error: "No data provided to update.", success: "" };
    }

    const { error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", session.userId);

    if (error) {
      return { error: error.message, success: "" };
    }

    revalidatePath("/profile");
    return { error: "", success: "Profile updated successfully!" };
  } catch (error: any) {
    console.error("Profile Completion Exception:", error);
    return { error: "An unexpected error occurred.", success: "" };
  }
}
