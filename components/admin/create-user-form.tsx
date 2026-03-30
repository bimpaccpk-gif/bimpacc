"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { AlertCircle, Check, Loader2, UserPlus, ChevronDown, Info, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import type { UserRole } from "@/types";
import { usePasswordStrength } from "@/hooks/use-password-strength";

const roles: { value: UserRole; label: string }[] = [
  { value: "student", label: "Student" },
  { value: "instructor", label: "Instructor" },
  { value: "admin", label: "Admin" },
];

export function CreateUserForm({ onSuccess, courses }: { onSuccess?: () => void; courses?: any[] } = {}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(adminCreateUser, undefined);
  const [selectedRole, setSelectedRole] = useState<UserRole>("student");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { score: passwordStrength, label: strengthLabel, colorClass: strengthColorVar, textClass: strengthTextColor, requirements: passwordRequirements } = usePasswordStrength(password);

  useEffect(() => {
    if (state?.success && onSuccess) {
      const timer = setTimeout(() => {
        onSuccess();
        router.refresh();
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

      {/* CNIC Notice */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 dark:border-amber-500/20 dark:bg-amber-950/20 shadow-sm">
        <div className="flex gap-3">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="space-y-1.5 text-sm">
            <p className="font-semibold text-amber-800 dark:text-amber-300">
              Important: Name Format
            </p>
            <p className="text-amber-700/80 dark:text-amber-400/80 leading-relaxed">
              Enter name <span className="font-bold text-amber-900 dark:text-amber-200">exactly as on CNIC</span> in
              <span className="font-bold text-amber-900 dark:text-amber-200"> CAPITAL LETTERS</span>. This will appear on certificates.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="fullName">Full Name</Label>
        <Input
          id="fullName"
          name="fullName"
          placeholder="Ex: AHMED KHAN"
          style={{ textTransform: "uppercase" }}
          required
        />
        <p className="text-xs text-muted-foreground">
          Write in CAPITAL letters as per CNIC
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="user@gmail.com"
          required
        />
        <p className="text-xs text-muted-foreground">
          Only Gmail emails are allowed
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Create a strong password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        
        {/* Password Strength */}
        {password && (
          <div className="space-y-3 rounded-xl bg-background/50 border border-border/50 p-3.5 shadow-sm">
            {/* Strength Bar */}
            <div className="space-y-2">
              <div className="flex gap-1.5 w-full">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                      i < passwordStrength
                        ? strengthColorVar
                        : "bg-muted dark:bg-zinc-800"
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs font-medium text-muted-foreground">
                Strength:{" "}
                <span
                  className={`font-semibold ${strengthTextColor}`}
                >
                  {strengthLabel}
                </span>
              </p>
            </div>

            {/* Requirements Checklist */}
            <div className="grid grid-cols-2 gap-y-2 gap-x-1">
              {passwordRequirements.map((req, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 text-xs font-medium transition-colors duration-300 ${
                    req.met ? "text-green-600 dark:text-green-400" : "text-muted-foreground/60"
                  }`}
                >
                  <CheckCircle2
                    className={`h-3.5 w-3.5 shrink-0 transition-all duration-300 ${
                      req.met
                        ? "fill-green-500/20 text-green-500 scale-110"
                        : "text-muted-foreground/30 scale-100"
                    }`}
                  />
                  {req.label}
                </div>
              ))}
            </div>
          </div>
        )}
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

      {/* Course Selection (for students only) */}
      {selectedRole === "student" && courses && courses.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="courseId">Select Course to Enroll</Label>
          <select
            id="courseId"
            name="courseId"
            className="w-full h-10 px-3 rounded-md border bg-background focus:ring-indigo-500 focus:border-indigo-500"
            defaultValue=""
          >
            <option value="" disabled>
              Select an open course...
            </option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title} {course.batch ? `(Batch: ${course.batch})` : ""}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Choose an open course to enroll the student
          </p>
        </div>
      )}

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
