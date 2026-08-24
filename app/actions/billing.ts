"use server";

import { revalidatePath } from "next/cache";

import { SERVICE_BILLING_SETTINGS_COLUMNS } from "@/lib/billing-policy";
import { verifySuperAdmin } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { serviceBillingSettingsSchema } from "@/lib/validations";

export interface BillingActionState {
  error: string;
  success: string;
}

function toKarachiIso(value: string | null) {
  return value ? new Date(`${value}:00+05:00`).toISOString() : null;
}

export async function updateServiceBillingSettings(
  _previousState: BillingActionState | undefined,
  formData: FormData
): Promise<BillingActionState> {
  let session: Awaited<ReturnType<typeof verifySuperAdmin>>;

  try {
    session = await verifySuperAdmin();
  } catch {
    return { error: "Super admin access is required to change billing settings.", success: "" };
  }

  const validation = serviceBillingSettingsSchema.safeParse({
    enforcementEnabled: formData.get("enforcementEnabled") === "on",
    paymentStatus: formData.get("paymentStatus"),
    amountDue: formData.get("amountDue"),
    currency: formData.get("currency"),
    billingInterval: formData.get("billingInterval"),
    servicePeriodStart: formData.get("servicePeriodStart"),
    servicePeriodEnd: formData.get("servicePeriodEnd"),
    paymentDueAt: formData.get("paymentDueAt"),
    gracePeriodEndsAt: formData.get("gracePeriodEndsAt"),
    bankName: formData.get("bankName"),
    accountTitle: formData.get("accountTitle"),
    accountNumber: formData.get("accountNumber"),
    iban: formData.get("iban"),
    paymentReference: formData.get("paymentReference"),
    paymentInstructions: formData.get("paymentInstructions"),
    supportEmail: formData.get("supportEmail"),
    supportPhone: formData.get("supportPhone"),
    noticeTitle: formData.get("noticeTitle"),
    noticeMessage: formData.get("noticeMessage"),
    confirmEnforcement: formData.get("confirmEnforcement") === "on",
  });

  if (!validation.success) {
    return {
      error: validation.error.errors[0]?.message ?? "Please check the billing details.",
      success: "",
    };
  }

  const values = validation.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("service_billing_settings")
    .update({
      enforcement_enabled: values.enforcementEnabled,
      payment_status: values.paymentStatus,
      amount_due: values.amountDue,
      currency: values.currency,
      billing_interval: values.billingInterval,
      service_period_start: values.servicePeriodStart,
      service_period_end: values.servicePeriodEnd,
      payment_due_at: toKarachiIso(values.paymentDueAt),
      grace_period_ends_at: toKarachiIso(values.gracePeriodEndsAt),
      bank_name: values.bankName,
      account_title: values.accountTitle,
      account_number: values.accountNumber,
      iban: values.iban,
      payment_reference: values.paymentReference,
      payment_instructions: values.paymentInstructions,
      support_email: values.supportEmail,
      support_phone: values.supportPhone,
      notice_title: values.noticeTitle,
      notice_message: values.noticeMessage,
      updated_by: session.userId,
    })
    .eq("id", 1)
    .select(SERVICE_BILLING_SETTINGS_COLUMNS)
    .single();

  if (error) {
    console.error("Unable to update service billing settings", error.message);
    return { error: "Billing settings could not be saved. Please try again.", success: "" };
  }

  revalidatePath("/super-admin");
  revalidatePath("/billing");
  revalidatePath("/admin");

  return { error: "", success: "Billing settings saved and added to the audit history." };
}
