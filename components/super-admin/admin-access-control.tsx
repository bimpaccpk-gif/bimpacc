"use client";

import { useActionState, useEffect } from "react";
import {
  AlertCircle,
  CheckCircle2,
  CircleDollarSign,
  Loader2,
  LockKeyhole,
  LockOpen,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { setAdminDashboardAccess, type BillingActionState } from "@/app/actions/billing";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { AdminDashboardAccessState, ServicePaymentStatus } from "@/lib/billing-policy";
import { cn } from "@/lib/utils";

interface AdminAccessControlProps {
  accessState: AdminDashboardAccessState;
  enforcementEnabled: boolean;
  paymentStatus: ServicePaymentStatus;
  gracePeriodEndsLabel: string;
}

const initialState: BillingActionState = { error: "", success: "" };

const STATUS = {
  locked: {
    label: "LOCKED",
    description: "Normal admins cannot open their dashboards.",
    className: "border-destructive/30 bg-destructive/5 text-destructive",
  },
  scheduled: {
    label: "LOCK SCHEDULED",
    description: "Admin access is open until the grace period ends.",
    className: "border-warning/30 bg-warning/5 text-warning",
  },
  unlocked: {
    label: "UNLOCKED",
    description: "Normal admins can use their dashboards.",
    className: "border-success/30 bg-success/5 text-success",
  },
} as const;

export function AdminAccessControl({
  accessState,
  enforcementEnabled,
  paymentStatus,
  gracePeriodEndsLabel,
}: AdminAccessControlProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(setAdminDashboardAccess, initialState);
  const status = STATUS[accessState];

  useEffect(() => {
    if (state.success) router.refresh();
  }, [router, state.success]);

  return (
    <section className="border-border bg-card rounded-xl border p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-muted-foreground text-sm font-medium">Admin dashboard</p>
          <div
            className={cn(
              "mt-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-bold",
              status.className
            )}
          >
            {accessState === "locked" ? (
              <LockKeyhole className="h-4 w-4" aria-hidden="true" />
            ) : (
              <LockOpen className="h-4 w-4" aria-hidden="true" />
            )}
            {status.label}
          </div>
          <p className="text-muted-foreground mt-2 text-sm">{status.description}</p>
          <p className="text-muted-foreground mt-1 text-xs">
            Billing lock date: {gracePeriodEndsLabel}
          </p>
        </div>

        <div className="bg-muted/50 rounded-lg px-4 py-3 text-sm">
          Payment: <span className="font-semibold capitalize">{paymentStatus}</span>
        </div>
      </div>

      {state.error && (
        <Alert variant="destructive" className="mt-5" aria-live="polite">
          <AlertCircle aria-hidden="true" />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      {state.success && (
        <Alert className="border-success/30 bg-success/5 text-success mt-5" aria-live="polite">
          <CheckCircle2 aria-hidden="true" />
          <AlertDescription className="text-success/90">{state.success}</AlertDescription>
        </Alert>
      )}

      <form action={formAction} className="border-border mt-6 space-y-4 border-t pt-5">
        <p className="text-sm font-semibold">Choose one action</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Button
            type="submit"
            name="accessMode"
            value="mark_paid_unlock"
            disabled={pending || (paymentStatus === "paid" && !enforcementEnabled)}
            size="lg"
            className="gap-2"
          >
            {pending ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <CircleDollarSign aria-hidden="true" />
            )}
            Paid — Unlock Admin
          </Button>

          <Button
            type="submit"
            name="accessMode"
            value="enforce"
            variant="destructive"
            size="lg"
            disabled={pending || enforcementEnabled}
            className="gap-2"
          >
            <LockKeyhole aria-hidden="true" />
            Enable Billing Lock
          </Button>
        </div>

        {!enforcementEnabled && (
          <label className="text-muted-foreground flex items-start gap-3 text-xs">
            <input
              type="checkbox"
              name="confirmAccessEnforcement"
              className="accent-primary mt-0.5 h-4 w-4 shrink-0"
            />
            <span>I confirm the billing lock date shown in Billing Details below.</span>
          </label>
        )}
      </form>

      {enforcementEnabled && (
        <details className="mt-5 text-sm">
          <summary className="text-muted-foreground cursor-pointer">Temporary unlock</summary>
          <form action={formAction} className="mt-3">
            <Button
              type="submit"
              name="accessMode"
              value="unlock"
              variant="outline"
              disabled={pending}
            >
              Unlock without marking paid
            </Button>
          </form>
        </details>
      )}
    </section>
  );
}
