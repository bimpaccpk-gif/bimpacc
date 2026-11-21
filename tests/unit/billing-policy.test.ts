import { describe, expect, it } from "vitest";
import {
  getAdminDashboardAccessState,
  isAdminDashboardRestricted,
  type ServiceBillingSettings,
} from "@/lib/billing-policy";

const NOW = Date.parse("2026-06-01T00:00:00Z");

function settings(overrides: Partial<ServiceBillingSettings> = {}): ServiceBillingSettings {
  return {
    id: 1,
    enforcement_enabled: true,
    payment_status: "pending",
    amount_due: null,
    currency: "PKR",
    billing_interval: "monthly",
    service_period_start: null,
    service_period_end: null,
    payment_due_at: null,
    grace_period_ends_at: "2026-05-31T00:00:00Z",
    bank_name: null,
    account_title: null,
    account_number: null,
    iban: null,
    payment_reference: null,
    payment_instructions: null,
    support_email: null,
    support_phone: null,
    notice_title: "",
    notice_message: "",
    updated_by: null,
    updated_at: "2026-05-01T00:00:00Z",
    ...overrides,
  };
}

describe("isAdminDashboardRestricted", () => {
  it("fails open when settings are missing", () => {
    expect(isAdminDashboardRestricted(null, NOW)).toBe(false);
  });

  it("restricts only after the grace period when enforcement is on and unpaid", () => {
    expect(isAdminDashboardRestricted(settings(), NOW)).toBe(true);
  });

  it("does not restrict before the grace deadline", () => {
    const s = settings({ grace_period_ends_at: "2026-06-02T00:00:00Z" });
    expect(isAdminDashboardRestricted(s, NOW)).toBe(false);
  });

  it("does not restrict when enforcement is disabled", () => {
    expect(isAdminDashboardRestricted(settings({ enforcement_enabled: false }), NOW)).toBe(false);
  });

  it.each(["paid", "waived"] as const)("does not restrict when status is %s", (status) => {
    expect(isAdminDashboardRestricted(settings({ payment_status: status }), NOW)).toBe(false);
  });

  it("fails open on a missing or invalid deadline", () => {
    expect(isAdminDashboardRestricted(settings({ grace_period_ends_at: null }), NOW)).toBe(false);
    expect(
      isAdminDashboardRestricted(settings({ grace_period_ends_at: "not-a-date" }), NOW)
    ).toBe(false);
  });
});

describe("getAdminDashboardAccessState", () => {
  it("reports locked, scheduled and unlocked", () => {
    expect(getAdminDashboardAccessState(settings(), NOW)).toBe("locked");
    expect(
      getAdminDashboardAccessState(settings({ grace_period_ends_at: "2026-06-02T00:00:00Z" }), NOW)
    ).toBe("scheduled");
    expect(getAdminDashboardAccessState(settings({ payment_status: "paid" }), NOW)).toBe(
      "unlocked"
    );
    expect(getAdminDashboardAccessState(null, NOW)).toBe("unlocked");
  });
});
