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
  admin: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  instructor: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  student: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
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
      <DropdownMenuTrigger>
        <div className={`inline-flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors hover:opacity-80 ${roleBadge[role] ?? roleBadge.student}`}>
          {pending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
          {role.charAt(0).toUpperCase() + role.slice(1)}
          <ChevronDown className="h-3 w-3" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-36">
        {roles.map((r) => (
          <DropdownMenuItem
            key={r.value}
            onClick={() => handleRoleChange(r.value)}
          >
            <div className="flex w-full items-center justify-between">
              <span>{r.label}</span>
              {role === r.value && <Check className="h-3.5 w-3.5" />}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
