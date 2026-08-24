export const SERVICE_BILLING_SETTINGS_COLUMNS =
  "id, enforcement_enabled, payment_status, amount_due, currency, billing_interval, service_period_start, service_period_end, payment_due_at, grace_period_ends_at, bank_name, account_title, account_number, iban, payment_reference, payment_instructions, support_email, support_phone, notice_title, notice_message, updated_at";

export type ServicePaymentStatus = "pending" | "paid" | "waived";

export interface ServiceBillingSettings {
  id: number;
  enforcement_enabled: boolean;
  payment_status: ServicePaymentStatus;
  amount_due: number | null;
  currency: string;
  billing_interval: "monthly" | "quarterly" | "yearly" | "custom";
  service_period_start: string | null;
  service_period_end: string | null;
  payment_due_at: string | null;
  grace_period_ends_at: string | null;
  bank_name: string | null;
  account_title: string | null;
  account_number: string | null;
  iban: string | null;
  payment_reference: string | null;
  payment_instructions: string | null;
  support_email: string | null;
  support_phone: string | null;
  notice_title: string;
  notice_message: string;
  updated_at: string;
}

/**
 * Access is restricted only when enforcement is explicitly enabled, payment is
 * still pending, and a valid grace deadline has passed. Missing or invalid
 * configuration always fails open to avoid an accidental administrative outage.
 */
export function isAdminDashboardRestricted(
  settings: ServiceBillingSettings | null,
  now: number = Date.now()
): boolean {
  if (!settings?.enforcement_enabled || settings.payment_status !== "pending") {
    return false;
  }

  if (!settings.grace_period_ends_at) return false;

  const graceEndsAt = Date.parse(settings.grace_period_ends_at);
  return Number.isFinite(graceEndsAt) && now >= graceEndsAt;
}
