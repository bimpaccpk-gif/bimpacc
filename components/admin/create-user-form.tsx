"use client";

import { useActionState, useEffect, useState } from "react";
import { adminCreateUser } from "@/lib/supabase/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertCircle, Check, Loader2, UserPlus, ChevronDown } from "lucide-react";
import type { UserRole } from "@/types";

const roles: { value: UserRole; label: string }[] = [
  { value: "student", label: "Student" },
  { value: "instructor", label: "Instructor" },
  { value: "admin", label: "Admin" },
];

export function CreateUserForm({ onSuccess }: { onSuccess?: () => void } = {}) {
  const [state, action, pending] = useActionState(adminCreateUser, undefined);
  const [selectedRole, setSelectedRole] = useState<UserRole>("student");

  useEffect(() => {
    if (state?.success && onSuccess) {
      const timer = setTimeout(() => {
        onSuccess();
        window.location.reload();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [state?.success, onSuccess]);

  if (state?.success) {
    return (
      <div className="space-y-4">
        <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
          <Check className="h-4 w-4" />
          <AlertDescription>{state.success}</AlertDescription>
        </Alert>
        <p className="text-center text-xs text-muted-foreground">
          Closing dialog and refreshing...
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      {state?.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      <div className="space-y-2">
        <Label htmlFor="fullName">Full Name</Label>
        <Input
          id="fullName"
          name="fullName"
          placeholder="John Doe"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="user@example.com"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="Min. 8 characters"
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Role</Label>
        <input type="hidden" name="role" value={selectedRole} />
        <DropdownMenu>
          <DropdownMenuTrigger>
            <div className="flex w-full cursor-pointer items-center justify-between rounded-md border bg-background px-3 py-2 text-sm hover:bg-muted">
              <span>
                {roles.find((r) => r.value === selectedRole)?.label}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[var(--anchor-width)]">
            {roles.map((r) => (
              <DropdownMenuItem
                key={r.value}
                onClick={() => setSelectedRole(r.value)}
              >
                {r.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <UserPlus className="mr-2 h-4 w-4" />
        )}
        {pending ? "Creating..." : "Create Account"}
      </Button>
    </form>
  );
}
