"use server";

import { createClient } from "@/lib/supabase/server";
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
