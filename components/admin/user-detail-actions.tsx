"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { adminChangeUserRole } from "@/lib/supabase/actions";
import { toggleUserPause, resetDeviceFingerprint } from "@/app/actions/admin";
import { Loader2, Pause, Play, ChevronDown, Shield, Smartphone } from "lucide-react";
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
}: {
  userId: string;
  currentRole: string;
  isPaused: boolean;
}) {
  const [roleState, roleAction, rolePending] = useActionState(adminChangeUserRole, undefined);
  const [pauseState, pauseAction, pausePending] = useActionState(toggleUserPause, undefined);
  const [deviceState, deviceAction, devicePending] = useActionState(
    resetDeviceFingerprint,
    undefined
  );

  return (
    <div className="flex items-center gap-2">
      {/* Role Selector */}
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button variant="outline" size="sm" disabled={rolePending} className="gap-1">
            <Shield className="h-4 w-4" />
            Change Role
            <ChevronDown className="h-3 w-3" />
          </Button>
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
            className="gap-1 border-amber-500/50 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 hover:text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20 dark:hover:text-amber-300"
          >
            {devicePending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Smartphone className="h-4 w-4" />
                Reset Device Binding
              </>
            )}
          </Button>
        </form>
      )}

      {/* Status Messages */}
      {(roleState?.error || pauseState?.error || deviceState?.error) && (
        <p className="text-destructive text-xs">
          {roleState?.error || pauseState?.error || deviceState?.error}
        </p>
      )}
      {(roleState?.success || pauseState?.success || deviceState?.success) && (
        <p className="text-xs text-green-600">
          {roleState?.success || pauseState?.success || deviceState?.success}
        </p>
      )}
    </div>
  );
}
