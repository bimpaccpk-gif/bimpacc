"use client";

import { useActionState, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Save, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";

import { updateServiceBillingSettings, type BillingActionState } from "@/app/actions/billing";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ServiceBillingSettings } from "@/lib/billing-policy";

interface BillingSettingsFormProps {
  settings: ServiceBillingSettings;
  paymentDueLocal: string;
  gracePeriodEndsLocal: string;
}

const initialState: BillingActionState = { error: "", success: "" };

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
    </div>
  );
}

export function BillingSettingsForm({
  settings,
  paymentDueLocal,
  gracePeriodEndsLocal,
}: BillingSettingsFormProps) {
  const router = useRouter();
  const [enforcementEnabled, setEnforcementEnabled] = useState(settings.enforcement_enabled);
  const [state, formAction, pending] = useActionState(updateServiceBillingSettings, initialState);

  useEffect(() => {
    if (state.success) router.refresh();
  }, [router, state.success]);

  return (
    <form action={formAction} className="space-y-8">
      {state.error && (
        <Alert variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Could not save billing settings</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      {state.success && (
        <Alert className="border-success/30 bg-success/5 text-success">
          <CheckCircle2 aria-hidden="true" />
          <AlertTitle>Settings saved</AlertTitle>
          <AlertDescription className="text-success/90">{state.success}</AlertDescription>
        </Alert>
      )}

      <fieldset className="space-y-5">
        <legend className="text-lg font-semibold">Payment and access</legend>
        <p className="text-muted-foreground text-sm">
          Set the amount and payment state. Access enforcement applies only to normal admin
          dashboards; learning remains available to students and instructors.
        </p>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <Field label="Payment status" htmlFor="paymentStatus">
            <select
              id="paymentStatus"
              name="paymentStatus"
              defaultValue={settings.payment_status}
              className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-3"
            >
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="waived">Waived</option>
            </select>
          </Field>
          <Field label="Amount due" htmlFor="amountDue">
            <Input
              id="amountDue"
              name="amountDue"
              type="number"
              min="0"
              step="0.01"
              defaultValue={settings.amount_due ?? ""}
              placeholder="0.00"
            />
          </Field>
          <Field label="Currency" htmlFor="currency" hint="Three-letter code, for example PKR.">
            <Input
              id="currency"
              name="currency"
              defaultValue={settings.currency}
              maxLength={3}
              required
            />
          </Field>
          <Field label="Billing interval" htmlFor="billingInterval">
            <select
              id="billingInterval"
              name="billingInterval"
              defaultValue={settings.billing_interval}
              className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-3"
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
              <option value="custom">Custom</option>
            </select>
          </Field>
        </div>

        <label className="border-border bg-muted/30 flex cursor-pointer items-start gap-3 rounded-lg border p-4">
          <input
            type="checkbox"
            name="enforcementEnabled"
            checked={enforcementEnabled}
            onChange={(event) => setEnforcementEnabled(event.target.checked)}
            className="accent-primary mt-1 h-4 w-4"
          />
          <span>
            <span className="block text-sm font-semibold">Enable billing access enforcement</span>
            <span className="text-muted-foreground mt-1 block text-xs leading-relaxed">
              When payment is pending and the disclosed grace period has ended, normal admins are
              redirected to the billing summary. Super admins can always open this dashboard to
              correct or disable the setting.
            </span>
          </span>
        </label>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="text-lg font-semibold">Schedule</legend>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Service period starts" htmlFor="servicePeriodStart">
            <Input
              id="servicePeriodStart"
              name="servicePeriodStart"
              type="date"
              defaultValue={settings.service_period_start ?? ""}
            />
          </Field>
          <Field label="Service period ends" htmlFor="servicePeriodEnd">
            <Input
              id="servicePeriodEnd"
              name="servicePeriodEnd"
              type="date"
              defaultValue={settings.service_period_end ?? ""}
            />
          </Field>
          <Field label="Payment due (Pakistan time)" htmlFor="paymentDueAt">
            <Input
              id="paymentDueAt"
              name="paymentDueAt"
              type="datetime-local"
              defaultValue={paymentDueLocal}
            />
          </Field>
          <Field
            label="Grace period ends (Pakistan time)"
            htmlFor="gracePeriodEndsAt"
            hint="Must be at or after the payment due time."
          >
            <Input
              id="gracePeriodEndsAt"
              name="gracePeriodEndsAt"
              type="datetime-local"
              defaultValue={gracePeriodEndsLocal}
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="text-lg font-semibold">Bank and payment details</legend>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Bank name" htmlFor="bankName">
            <Input id="bankName" name="bankName" defaultValue={settings.bank_name ?? ""} />
          </Field>
          <Field label="Account title" htmlFor="accountTitle">
            <Input
              id="accountTitle"
              name="accountTitle"
              defaultValue={settings.account_title ?? ""}
            />
          </Field>
          <Field label="Account number" htmlFor="accountNumber">
            <Input
              id="accountNumber"
              name="accountNumber"
              defaultValue={settings.account_number ?? ""}
              autoComplete="off"
            />
          </Field>
          <Field label="IBAN" htmlFor="iban">
            <Input id="iban" name="iban" defaultValue={settings.iban ?? ""} autoComplete="off" />
          </Field>
          <Field label="Payment reference" htmlFor="paymentReference">
            <Input
              id="paymentReference"
              name="paymentReference"
              defaultValue={settings.payment_reference ?? ""}
            />
          </Field>
          <Field label="Support phone" htmlFor="supportPhone">
            <Input
              id="supportPhone"
              name="supportPhone"
              type="tel"
              defaultValue={settings.support_phone ?? ""}
            />
          </Field>
        </div>
        <Field label="Payment instructions" htmlFor="paymentInstructions">
          <Textarea
            id="paymentInstructions"
            name="paymentInstructions"
            rows={4}
            defaultValue={settings.payment_instructions ?? ""}
          />
        </Field>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="text-lg font-semibold">Billing notice and support</legend>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Notice title" htmlFor="noticeTitle">
            <Input
              id="noticeTitle"
              name="noticeTitle"
              defaultValue={settings.notice_title}
              required
            />
          </Field>
          <Field label="Support email" htmlFor="supportEmail">
            <Input
              id="supportEmail"
              name="supportEmail"
              type="email"
              defaultValue={settings.support_email ?? ""}
            />
          </Field>
        </div>
        <Field label="Notice message" htmlFor="noticeMessage">
          <Textarea
            id="noticeMessage"
            name="noticeMessage"
            rows={5}
            defaultValue={settings.notice_message}
            required
          />
        </Field>
      </fieldset>

      {enforcementEnabled && (
        <Alert className="border-warning/40 bg-warning/5">
          <ShieldAlert className="text-warning" aria-hidden="true" />
          <AlertTitle>Confirm access enforcement</AlertTitle>
          <AlertDescription>
            <label className="text-foreground mt-2 flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                name="confirmEnforcement"
                className="accent-primary mt-1 h-4 w-4"
              />
              <span>
                I understand that a pending payment can redirect normal administrators after the
                grace period, while the LMS and this super-admin dashboard remain available.
              </span>
            </label>
          </AlertDescription>
        </Alert>
      )}

      <div className="border-border flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground text-xs">
          Every successful update records the previous and new values with your account and time.
        </p>
        <Button type="submit" size="lg" disabled={pending} className="gap-2">
          {pending ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Save aria-hidden="true" />
          )}
          {pending ? "Saving…" : "Save billing settings"}
        </Button>
      </div>
    </form>
  );
}
