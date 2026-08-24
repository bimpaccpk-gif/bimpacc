"use client";

import { useActionState, useEffect } from "react";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Loader2,
  LockKeyhole,
  LockOpen,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { setAdminDashboardAccess, type BillingActionState } from "@/app/actions/billing";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminDashboardAccessState, ServicePaymentStatus } from "@/lib/billing-policy";
import { cn } from "@/lib/utils";

interface AdminAccessControlProps {
  accessState: AdminDashboardAccessState;
  enforcementEnabled: boolean;
  paymentStatus: ServicePaymentStatus;
  gracePeriodEndsLabel: string;
}

const initialState: BillingActionState = { error: "", success: "" };

const ACCESS_COPY: Record<AdminDashboardAccessState, { label: string; description: string }> = {
  locked: {
    label: "Normal admin access is locked",
    description:
      "Normal administrators are redirected to the billing summary. Student and instructor learning remains available.",
  },
  scheduled: {
    label: "Admin lock is scheduled",
    description:
      "Normal administrators can still work until the disclosed grace period ends. Access will then be restricted automatically.",
  },
  unlocked: {
    label: "Normal admin access is unlocked",
    description: "Normal administrators can open and use their dashboards.",
  },
};

export function AdminAccessControl({
  accessState,
  enforcementEnabled,
  paymentStatus,
  gracePeriodEndsLabel,
}: AdminAccessControlProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(setAdminDashboardAccess, initialState);
  const copy = ACCESS_COPY[accessState];

  useEffect(() => {
    if (state.success) router.refresh();
  }, [router, state.success]);

  return (
    <Card
      className={cn(
        accessState === "locked" && "border-destructive/40",
        accessState === "scheduled" && "border-warning/40"
      )}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {accessState === "locked" ? (
            <LockKeyhole className="text-destructive h-5 w-5" aria-hidden="true" />
          ) : accessState === "scheduled" ? (
            <CalendarClock className="text-warning h-5 w-5" aria-hidden="true" />
          ) : (
            <LockOpen className="text-success h-5 w-5" aria-hidden="true" />
          )}
          Admin dashboard access
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <p className="font-semibold">{copy.label}</p>
          <p className="text-muted-foreground mt-1 text-sm">{copy.description}</p>
          <p className="text-muted-foreground mt-2 text-xs">
            Payment: <span className="text-foreground capitalize">{paymentStatus}</span>
            {enforcementEnabled && <> · Grace period ends: {gracePeriodEndsLabel}</>}
          </p>
        </div>

        {state.error && (
          <Alert variant="destructive" aria-live="polite">
            <AlertCircle aria-hidden="true" />
            <AlertTitle>Access was not changed</AlertTitle>
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

        {state.success && (
          <Alert className="border-success/30 bg-success/5 text-success" aria-live="polite">
            <CheckCircle2 aria-hidden="true" />
            <AlertTitle>Admin access updated</AlertTitle>
            <AlertDescription className="text-success/90">{state.success}</AlertDescription>
          </Alert>
        )}

        <form action={formAction} className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button
              type="submit"
              name="accessMode"
              value="mark_paid_unlock"
              disabled={pending || (paymentStatus === "paid" && !enforcementEnabled)}
              className="gap-2"
            >
              {pending ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <CircleDollarSign aria-hidden="true" />
              )}
              Mark paid and unlock
            </Button>
            <Button
              type="submit"
              name="accessMode"
              value="unlock"
              variant="outline"
              disabled={pending || !enforcementEnabled}
              className="gap-2"
            >
              <LockOpen aria-hidden="true" />
              Unlock without marking paid
            </Button>
            <Button
              type="submit"
              name="accessMode"
              value="enforce"
              variant="destructive"
              disabled={pending || enforcementEnabled}
              className="gap-2"
            >
              <LockKeyhole aria-hidden="true" />
              Enable billing enforcement
            </Button>
          </div>

          <label className="text-muted-foreground flex items-start gap-3 text-xs leading-relaxed">
            <input
              type="checkbox"
              name="confirmAccessEnforcement"
              className="accent-primary mt-0.5 h-4 w-4 shrink-0"
            />
            <span>
              I confirm that enabling enforcement may lock normal administrators when payment is
              pending and the disclosed grace deadline has passed. Super-admin, student, and
              instructor access remains available.
            </span>
          </label>
        </form>

        <div className="bg-muted/50 rounded-lg p-4 text-sm">
          <p className="font-semibold">When the owner pays</p>
          <p className="text-muted-foreground mt-1">
            Select <span className="text-foreground font-medium">Mark paid and unlock</span>. This
            records the payment as paid, disables enforcement, restores normal admin access
            immediately, and writes the change to the billing audit history.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
