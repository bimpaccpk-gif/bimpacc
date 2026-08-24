import "server-only";

import { cache } from "react";

import {
  SERVICE_BILLING_SETTINGS_COLUMNS,
  type ServiceBillingSettings,
} from "@/lib/billing-policy";
import { createClient } from "@/lib/supabase/server";

export interface ServiceBillingAuditEntry {
  id: number;
  changed_by: string | null;
  changed_by_name: string;
  old_values: Record<string, unknown>;
  new_values: Record<string, unknown>;
  changed_at: string;
}

export const getServiceBillingSettings = cache(async (): Promise<ServiceBillingSettings | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("service_billing_settings")
    .select(SERVICE_BILLING_SETTINGS_COLUMNS)
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.error("Unable to read service billing settings", error.message);
    return null;
  }

  return data as ServiceBillingSettings | null;
});

export const getServiceBillingAuditLog = cache(
  async (limit = 20): Promise<ServiceBillingAuditEntry[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("service_billing_audit_log")
      .select("id, changed_by, old_values, new_values, changed_at")
      .order("changed_at", { ascending: false })
      .limit(Math.min(Math.max(limit, 1), 50));

    if (error) {
      console.error("Unable to read service billing audit history", error.message);
      return [];
    }

    const rows = data ?? [];
    const userIds = [
      ...new Set(rows.map((row) => row.changed_by).filter((id): id is string => Boolean(id))),
    ];
    const names = new Map<string, string>();

    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from("users")
        .select("id, full_name, email")
        .in("id", userIds);

      for (const user of users ?? []) {
        names.set(user.id, user.full_name || user.email);
      }
    }

    return rows.map((row) => ({
      id: Number(row.id),
      changed_by: row.changed_by,
      changed_by_name: row.changed_by ? (names.get(row.changed_by) ?? "Unknown user") : "System",
      old_values: (row.old_values as Record<string, unknown>) ?? {},
      new_values: (row.new_values as Record<string, unknown>) ?? {},
      changed_at: row.changed_at,
    }));
  }
);
