"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { adminBypassOnboarding } from "@/lib/supabase/actions";
import { Loader2, ShieldCheck, ShieldOff } from "lucide-react";

export function BypassOnboardingToggle({
  userId,
  isBypassed,
  onboardingCompleted,
}: {
  userId: string;
  isBypassed: boolean;
  onboardingCompleted: boolean;
}) {
  const [state, action, pending] = useActionState(
    adminBypassOnboarding,
    undefined
  );

  // Don't show bypass button if onboarding is already completed
  if (onboardingCompleted) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <form action={action}>
        <input type="hidden" name="userId" value={userId} />
        <input
          type="hidden"
          name="bypass"
          value={isBypassed ? "false" : "true"}
        />
        <Button
          type="submit"
          variant={isBypassed ? "destructive" : "outline"}
          size="sm"
          disabled={pending}
          className="h-7 text-xs gap-1"
        >
          {pending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : isBypassed ? (
            <>
              <ShieldOff className="h-3 w-3" />
              Restore Onboarding
            </>
          ) : (
            <>
              <ShieldCheck className="h-3 w-3" />
              Bypass Onboarding
            </>
          )}
        </Button>
      </form>
      {state?.error && (
        <p className="text-xs text-destructive">{state.error}</p>
      )}
      {state?.success && (
        <p className="text-xs text-success">{state.success}</p>
      )}
    </div>
  );
}
