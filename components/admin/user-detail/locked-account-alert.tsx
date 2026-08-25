import { ShieldAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/**
 * Banner shown while an account is locked for a screen-recording/screenshot
 * violation. Server-compatible — no hooks, no state.
 */
function LockedAccountAlert() {
  return (
    <Alert
      variant="destructive"
      data-slot="locked-account-alert"
      className="border-destructive/20 bg-destructive/10"
    >
      <ShieldAlert aria-hidden="true" className="size-5 shrink-0" />
      <AlertTitle>Account Locked: Security Violation</AlertTitle>
      <AlertDescription>
        This user has been automatically locked due to a detected screen recording or screenshot
        attempt. Use &quot;Reset Device &amp; Unlock&quot; to restore access.
      </AlertDescription>
    </Alert>
  );
}

export { LockedAccountAlert };
