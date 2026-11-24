"use client";

import { useActionState } from "react";
import { Loader2, LogOut } from "lucide-react";

import { signOutUserDevices } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";

/** Signs a user out of all devices, or of one session when `sessionId` is given. */
export function SignOutDevicesButton({
  userId,
  sessionId,
  label,
}: {
  userId: string;
  sessionId?: string;
  label: string;
}) {
  const [state, action, pending] = useActionState(signOutUserDevices, undefined);

  return (
    <form
      action={action}
      onSubmit={(e) => {
        const message = sessionId
          ? "Sign this device out? The user will need to sign in again on it."
          : "Sign this user out of every device? They will need to sign in again.";
        if (!window.confirm(message)) e.preventDefault();
      }}
      className="flex flex-col items-end gap-1"
    >
      <input type="hidden" name="userId" value={userId} />
      {sessionId && <input type="hidden" name="sessionId" value={sessionId} />}
      <Button type="submit" variant={sessionId ? "ghost" : "outline"} size="sm" disabled={pending} className="gap-1.5">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <LogOut className="h-4 w-4" aria-hidden="true" />}
        {label}
      </Button>
      {state?.error && <p className="text-destructive text-xs">{state.error}</p>}
      {state?.success && <p className="text-success text-xs">{state.success}</p>}
    </form>
  );
}
