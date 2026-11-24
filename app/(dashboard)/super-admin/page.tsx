import { History, Settings2 } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";

import { AdminAccessControl } from "@/components/super-admin/admin-access-control";
import { BillingSettingsForm } from "@/components/super-admin/billing-settings-form";
import { getServiceBillingAuditLog, getServiceBillingSettings } from "@/lib/billing";
import { getAdminDashboardAccessState } from "@/lib/billing-policy";

const AUDIT_IGNORED_FIELDS = new Set(["id", "updated_at", "updated_by"]);

function formatDateTime(value: string | null) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";

  return `${new Intl.DateTimeFormat("en-PK", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Karachi",
  }).format(date)} PKT`;
}

function toKarachiDateTimeInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Karachi",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

function changedFieldLabels(
  oldValues: Record<string, unknown>,
  newValues: Record<string, unknown>
) {
  return Object.keys(newValues)
    .filter((key) => !AUDIT_IGNORED_FIELDS.has(key) && oldValues[key] !== newValues[key])
    .map((key) => key.replaceAll("_", " "));
}

export default async function SuperAdminDashboardPage() {
  const [settings, auditLog] = await Promise.all([
    getServiceBillingSettings(),
    getServiceBillingAuditLog(),
  ]);
  const accessState = getAdminDashboardAccessState(settings);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Super admin"
        description="Control normal admin access and service billing."
        className="mb-0"
      />

      {settings && (
        <AdminAccessControl
          accessState={accessState}
          enforcementEnabled={settings.enforcement_enabled}
          paymentStatus={settings.payment_status}
          gracePeriodEndsLabel={formatDateTime(settings.grace_period_ends_at)}
        />
      )}

      <details className="group bg-card ring-foreground/10 rounded-xl ring-1">
        <summary className="hover:bg-muted/40 flex cursor-pointer list-none items-center gap-3 rounded-xl px-5 py-4 text-sm font-semibold transition-colors [&::-webkit-details-marker]:hidden">
          <Settings2 className="text-primary h-5 w-5" aria-hidden="true" />
          Billing and bank details
          <span className="text-muted-foreground ml-auto text-xs font-normal group-open:hidden">Show</span>
        </summary>
        <div className="border-t p-5 sm:p-6">
          {settings ? (
            <BillingSettingsForm
              settings={settings}
              paymentDueLocal={toKarachiDateTimeInput(settings.payment_due_at)}
              gracePeriodEndsLocal={toKarachiDateTimeInput(settings.grace_period_ends_at)}
            />
          ) : (
            <div className="border-destructive/30 bg-destructive/5 rounded-lg border p-4">
              <p className="text-destructive font-semibold">Billing configuration is unavailable</p>
              <p className="text-muted-foreground mt-1 text-sm">
                No singleton billing row could be read. No access restriction will be applied until
                the database configuration is restored.
              </p>
            </div>
          )}
        </div>
      </details>

      <details className="group bg-card ring-foreground/10 rounded-xl ring-1">
        <summary className="hover:bg-muted/40 flex cursor-pointer list-none items-center gap-3 rounded-xl px-5 py-4 text-sm font-semibold transition-colors [&::-webkit-details-marker]:hidden">
          <History className="text-primary h-5 w-5" aria-hidden="true" />
          Activity history
          <span className="text-muted-foreground ml-auto text-xs font-normal">
            {auditLog.length} updates
          </span>
        </summary>
        <div className="border-t p-5 sm:p-6">
          {auditLog.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No billing updates have been recorded yet.
            </p>
          ) : (
            <ol className="divide-border divide-y">
              {auditLog.map((entry) => {
                const fields = changedFieldLabels(entry.old_values, entry.new_values);
                return (
                  <li key={entry.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold">{entry.changed_by_name}</p>
                        <p className="text-muted-foreground mt-1 text-xs">
                          Changed {fields.length > 0 ? fields.join(", ") : "billing metadata"}
                        </p>
                      </div>
                      <time className="text-muted-foreground text-xs" dateTime={entry.changed_at}>
                        {formatDateTime(entry.changed_at)}
                      </time>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </details>
    </div>
  );
}
