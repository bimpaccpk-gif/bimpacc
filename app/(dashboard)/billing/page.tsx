import {
  AlertTriangle,
  Banknote,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Landmark,
  ShieldCheck,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button-variants";
import { getServiceBillingSettings } from "@/lib/billing";
import { isAdminDashboardRestricted } from "@/lib/billing-policy";
import { getCurrentUser } from "@/lib/dal";
import { cn } from "@/lib/utils";

function formatDate(value: string | null) {
  if (!value) return "Not specified";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not specified";

  const formatted = new Intl.DateTimeFormat("en-PK", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Karachi",
  }).format(date);

  return `${formatted} PKT`;
}

function formatServiceDate(value: string | null) {
  if (!value) return "Not specified";

  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return "Not specified";

  return new Intl.DateTimeFormat("en-PK", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date);
}

function formatAmount(amount: number | null, currency: string) {
  if (amount === null) return "Not specified";

  try {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString("en-PK")}`;
  }
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b py-3 last:border-b-0 sm:grid-cols-[11rem_1fr] sm:gap-4">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="text-sm font-medium break-words">{value}</dd>
    </div>
  );
}

export default async function ServiceBillingPage() {
  const user = await getCurrentUser();

  if (user.role !== "admin") {
    redirect(user.role === "instructor" ? "/instructor" : "/student");
  }

  const settings = await getServiceBillingSettings();
  const isRestricted = isAdminDashboardRestricted(settings);
  const isPaid = settings?.payment_status === "paid" || settings?.payment_status === "waived";

  if (!settings) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <h1 className="text-2xl font-bold">Service Billing</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Maintenance agreement and payment status.
          </p>
        </header>

        <Card>
          <CardContent className="flex items-start gap-3 py-2">
            <ShieldCheck className="text-success mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">Billing enforcement is not configured</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Administrative access remains available. Configuration errors fail open and never
                interrupt the LMS.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusLabel = isRestricted
    ? "Administrative access limited"
    : isPaid
      ? "Payment confirmed"
      : settings.enforcement_enabled
        ? "Payment pending"
        : "Enforcement disabled";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Service Billing</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Transparent maintenance agreement, payment schedule, and payment instructions.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold",
              isRestricted
                ? "bg-destructive/10 text-destructive"
                : isPaid
                  ? "bg-success/10 text-success"
                  : "bg-warning/15 text-warning-foreground"
            )}
          >
            {statusLabel}
          </span>
          {user.is_super_admin && (
            <Link
              href="/super-admin"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Settings aria-hidden="true" />
              Manage billing
            </Link>
          )}
        </div>
      </header>

      <Card className={cn(isRestricted && "ring-destructive/30")}>
        <CardContent className="flex items-start gap-3 py-2">
          {isRestricted ? (
            <AlertTriangle
              className="text-destructive mt-0.5 h-5 w-5 shrink-0"
              aria-hidden="true"
            />
          ) : isPaid ? (
            <CheckCircle2 className="text-success mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          ) : (
            <Clock3 className="text-warning mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          )}
          <div>
            <p className="font-semibold">{settings.notice_title}</p>
            <p className="text-muted-foreground mt-1 text-sm whitespace-pre-line">
              {settings.notice_message}
            </p>
            {isRestricted && (
              <p className="text-destructive mt-3 text-sm font-medium">
                Student and instructor learning remains available. The administrative dashboard will
                reopen after payment is confirmed in Supabase.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="text-primary h-5 w-5" aria-hidden="true" />
              Billing schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl>
              <DetailRow
                label="Amount due"
                value={formatAmount(settings.amount_due, settings.currency)}
              />
              <DetailRow label="Billing interval" value={settings.billing_interval} />
              <DetailRow
                label="Service period"
                value={`${formatServiceDate(settings.service_period_start)} – ${formatServiceDate(settings.service_period_end)}`}
              />
              <DetailRow label="Payment due" value={formatDate(settings.payment_due_at)} />
              <DetailRow
                label="Grace period ends"
                value={formatDate(settings.grace_period_ends_at)}
              />
              <DetailRow label="Payment status" value={settings.payment_status} />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Landmark className="text-primary h-5 w-5" aria-hidden="true" />
              Payment instructions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl>
              <DetailRow label="Bank" value={settings.bank_name || "Not specified"} />
              <DetailRow label="Account title" value={settings.account_title || "Not specified"} />
              <DetailRow
                label="Account number"
                value={settings.account_number || "Not specified"}
              />
              <DetailRow label="IBAN" value={settings.iban || "Not specified"} />
              <DetailRow
                label="Payment reference"
                value={settings.payment_reference || "Not specified"}
              />
            </dl>
            {settings.payment_instructions && (
              <div className="bg-muted/60 mt-4 rounded-lg p-4">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Banknote className="h-4 w-4" aria-hidden="true" />
                  Additional instructions
                </p>
                <p className="text-muted-foreground mt-2 text-sm whitespace-pre-line">
                  {settings.payment_instructions}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Support and configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <span className="text-muted-foreground">Email:</span>{" "}
            <span className="font-medium">{settings.support_email || "Not specified"}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Phone:</span>{" "}
            <span className="font-medium">{settings.support_phone || "Not specified"}</span>
          </p>
          <p className="text-muted-foreground border-t pt-3">
            These details are read-only on this page. Last updated {formatDate(settings.updated_at)}
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
