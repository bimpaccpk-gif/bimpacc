"use client";

import { useActionState, useState, useTransition } from "react";
import { adminChangeUserRole } from "@/lib/supabase/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown, Check, Loader2 } from "lucide-react";
import type { UserRole } from "@/types";

interface RoleSelectProps {
  userId: string;
  currentRole: UserRole;
  currentUserId: string;
}

const roles: { value: UserRole; label: string }[] = [
  { value: "student", label: "Student" },
  { value: "instructor", label: "Instructor" },
  { value: "admin", label: "Admin" },
];

const roleBadge: Record<string, string> = {
  admin: "bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive",
  instructor: "bg-info/10 text-info dark:bg-info/20 dark:text-info",
  student: "bg-success/10 text-success dark:bg-success/20 dark:text-success",
};

export function RoleSelect({
  userId,
  currentRole,
  currentUserId,
}: RoleSelectProps) {
  const isSelf = userId === currentUserId;
  const [role, setRole] = useState<UserRole>(currentRole);
  const [pending, startTransition] = useTransition();

  if (isSelf) {
    return (
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${roleBadge[currentRole] ?? roleBadge.student}`}>
        {currentRole.charAt(0).toUpperCase() + currentRole.slice(1)} (you)
      </span>
    );
  }

  const handleRoleChange = (newRole: UserRole) => {
    if (newRole === role) return;

    const formData = new FormData();
    formData.set("userId", userId);
    formData.set("role", newRole);

    startTransition(async () => {
      const result = await adminChangeUserRole(undefined, formData);
      if (result.success) {
        setRole(newRole);
      }
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={`inline-flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors hover:opacity-80 outline-none ${roleBadge[role] ?? roleBadge.student}`}>
          {pending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
          {role.charAt(0).toUpperCase() + role.slice(1)}
          <ChevronDown className="h-3 w-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-36">
        {roles.map((r) => (
          <DropdownMenuItem
            key={r.value}
            onClick={() => handleRoleChange(r.value)}
          >
            <span className="flex w-full items-center justify-between">
              <span>{r.label}</span>
              {role === r.value && <Check className="h-3.5 w-3.5" />}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
