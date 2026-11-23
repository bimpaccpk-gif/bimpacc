"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { adminChangeUserRole } from "@/app/actions/user-management";
import { toggleUserPause, resetDeviceFingerprint, resetUserMfa } from "@/app/actions/admin";
import { Loader2, Pause, Play, ChevronDown, Shield, Smartphone, KeyRound } from "lucide-react";
import type { UserRole } from "@/types";

const roles: { value: UserRole; label: string }[] = [
  { value: "student", label: "Student" },
  { value: "instructor", label: "Instructor" },
  { value: "admin", label: "Admin" },
];

export function UserDetailActions({
  userId,
  currentRole,
  isPaused,
  isLocked,
  isSuperAdmin,
}: {
  userId: string;
  currentRole: string;
  isPaused: boolean;
  isLocked?: boolean;
  isSuperAdmin: boolean;
}) {
  const [roleState, roleAction, rolePending] = useActionState(adminChangeUserRole, undefined);
  const [pauseState, pauseAction, pausePending] = useActionState(toggleUserPause, undefined);
  const [deviceState, deviceAction, devicePending] = useActionState(
    resetDeviceFingerprint,
    undefined
  );

  const [mfaState, mfaAction, mfaPending] = useActionState(resetUserMfa, undefined);

  if (isSuperAdmin) {
    return (
      <span className="bg-primary/10 text-primary inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold">
        <Shield className="h-4 w-4" aria-hidden="true" />
        Protected super-admin account
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {/* Role Selector */}
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={rolePending}
          className="border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex h-8 cursor-pointer items-center justify-center gap-1 rounded-md border px-3 text-sm font-medium whitespace-nowrap shadow-xs transition-all outline-none disabled:pointer-events-none disabled:opacity-50"
        >
          <Shield className="h-4 w-4" />
          Change Role
          <ChevronDown className="h-3 w-3" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {roles.map((r) => (
            <DropdownMenuItem
              key={r.value}
              disabled={r.value === currentRole || rolePending}
              className={r.value === currentRole ? "font-semibold" : ""}
            >
              <form action={roleAction} className="w-full">
                <input type="hidden" name="userId" value={userId} />
                <input type="hidden" name="role" value={r.value} />
                <button type="submit" className="w-full text-left">
                  {r.label}
                  {r.value === currentRole && " (current)"}
                </button>
              </form>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Pause / Unpause */}
      <form action={pauseAction}>
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="isPaused" value={isPaused ? "false" : "true"} />
        <Button
          type="submit"
          variant={isPaused ? "default" : "destructive"}
          size="sm"
          disabled={pausePending}
          className="gap-1"
        >
          {pausePending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isPaused ? (
            <>
              <Play className="h-4 w-4" />
              Unpause
            </>
          ) : (
            <>
              <Pause className="h-4 w-4" />
              Pause
            </>
          )}
        </Button>
      </form>

      {/* Reset Device Lock */}
      {currentRole === "student" && (
        <form action={deviceAction}>
          <input type="hidden" name="userId" value={userId} />
          <Button
            type="submit"
            variant="outline"
            size="sm"
            disabled={devicePending}
            className="border-warning/50 bg-warning/10 text-warning hover:bg-warning/20 hover:text-warning/80 dark:border-warning/30 dark:bg-warning/10 dark:text-warning dark:hover:bg-warning/20 dark:hover:text-warning/80 gap-1"
          >
            {devicePending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Smartphone className="h-4 w-4" />
                {isLocked ? "Reset Device & Unlock" : "Reset Device Binding"}
              </>
            )}
          </Button>
        </form>
      )}

      {/* Reset MFA (lost or replaced phone) */}
      <form
        action={mfaAction}
        onSubmit={(e) => {
          if (!window.confirm("Remove this user's authenticator? They must set up a new one at their next sign-in.")) {
            e.preventDefault();
          }
        }}
      >
        <input type="hidden" name="userId" value={userId} />
        <Button type="submit" variant="outline" size="sm" disabled={mfaPending} className="gap-1">
          {mfaPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <KeyRound className="h-4 w-4" />
              Reset MFA
            </>
          )}
        </Button>
      </form>

      {/* Status Messages */}
      {(roleState?.error || pauseState?.error || deviceState?.error || mfaState?.error) && (
        <p className="text-destructive text-xs">
          {roleState?.error || pauseState?.error || deviceState?.error || mfaState?.error}
        </p>
      )}
      {(roleState?.success || pauseState?.success || deviceState?.success || mfaState?.success) && (
        <p className="text-success text-xs">
          {roleState?.success || pauseState?.success || deviceState?.success || mfaState?.success}
        </p>
      )}
    </div>
  );
}
