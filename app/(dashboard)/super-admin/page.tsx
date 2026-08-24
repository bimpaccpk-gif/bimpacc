import { Banknote, CalendarClock, History, ShieldCheck } from "lucide-react";

import { AdminAccessControl } from "@/components/super-admin/admin-access-control";
import { BillingSettingsForm } from "@/components/super-admin/billing-settings-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServiceBillingAuditLog, getServiceBillingSettings } from "@/lib/billing";
import { getAdminDashboardAccessState } from "@/lib/billing-policy";
import { getCurrentUser } from "@/lib/dal";

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
  const [user, settings, auditLog] = await Promise.all([
    getCurrentUser(),
    getServiceBillingSettings(),
    getServiceBillingAuditLog(),
  ]);
  const accessState = getAdminDashboardAccessState(settings);

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-primary h-7 w-7" aria-hidden="true" />
          <h1 className="text-2xl font-bold">Super Admin Dashboard</h1>
        </div>
        <p className="text-muted-foreground mt-1 text-sm">
          Protected billing controls for {user.full_name || user.email}. Super-admin assignments
          remain managed in Supabase, while billing details are controlled here.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Capability</CardTitle>
            <ShieldCheck className="text-primary h-5 w-5" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">Super admin active</p>
            <p className="text-muted-foreground mt-1 text-xs">Verified on the server and by RLS</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Payment</CardTitle>
            <Banknote className="text-primary h-5 w-5" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold capitalize">
              {settings?.payment_status ?? "Unknown"}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              Enforcement {settings?.enforcement_enabled ? "enabled" : "disabled"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Grace period
            </CardTitle>
            <CalendarClock className="text-primary h-5 w-5" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <p className="text-sm font-semibold">
              {formatDateTime(settings?.grace_period_ends_at ?? null)}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">All billing times are shown in PKT</p>
          </CardContent>
        </Card>
      </div>

      {settings && (
        <AdminAccessControl
          accessState={accessState}
          enforcementEnabled={settings.enforcement_enabled}
          paymentStatus={settings.payment_status}
          gracePeriodEndsLabel={formatDateTime(settings.grace_period_ends_at)}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Billing configuration</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" aria-hidden="true" />
            Billing audit history
          </CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
}
