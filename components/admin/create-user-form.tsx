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
import {
  AlertCircle,
  Check,
  Loader2,
  UserPlus,
  ChevronDown,
  Info,
  Eye,
  EyeOff,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import type { UserRole } from "@/types";
import { usePasswordStrength } from "@/hooks/use-password-strength";

const roles: { value: UserRole; label: string }[] = [
  { value: "student", label: "Student" },
  { value: "instructor", label: "Instructor" },
  { value: "admin", label: "Admin" },
];

export function CreateUserForm({
  onSuccess,
  courses,
}: { onSuccess?: () => void; courses?: any[] } = {}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(adminCreateUser, undefined);
  const [selectedRole, setSelectedRole] = useState<UserRole>("student");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [bypassOnboarding, setBypassOnboarding] = useState(false);

  const {
    score: passwordStrength,
    label: strengthLabel,
    colorClass: strengthColorVar,
    textClass: strengthTextColor,
    requirements: passwordRequirements,
  } = usePasswordStrength(password);

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
        <Alert className="border-success/30 bg-success/10 text-success dark:border-success/80 dark:bg-success/950 dark:text-success">
          <Check className="h-4 w-4" />
          <AlertDescription>{state.success}</AlertDescription>
        </Alert>
        <p className="text-muted-foreground text-center text-xs">
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
      <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 shadow-sm dark:border-warning/20 dark:bg-warning/10">
        <div className="flex gap-3">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-warning dark:text-warning" />
          <div className="space-y-1.5 text-sm">
            <p className="font-semibold text-warning dark:text-warning">
              Important: Name Format
            </p>
            <p className="leading-relaxed text-warning/80 dark:text-warning/80">
              Enter name{" "}
              <span className="font-bold text-warning dark:text-warning">
                exactly as on CNIC
              </span>{" "}
              in
              <span className="font-bold text-warning dark:text-warning"> CAPITAL LETTERS</span>
              . This will appear on certificates.
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
        <p className="text-muted-foreground text-xs">Write in CAPITAL letters as per CNIC</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="user@gmail.com" required />
        <p className="text-muted-foreground text-xs">Only Gmail emails are allowed</p>
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
            className="text-muted-foreground/40 hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {/* Password Strength */}
        {password && (
          <div className="bg-background/50 border-border/50 space-y-3 rounded-xl border p-3.5 shadow-sm">
            {/* Strength Bar */}
            <div className="space-y-2">
              <div className="flex w-full gap-1.5">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                      i < passwordStrength ? strengthColorVar : "bg-muted dark:bg-muted"
                    }`}
                  />
                ))}
              </div>
              <p className="text-muted-foreground text-xs font-medium">
                Strength:{" "}
                <span className={`font-semibold ${strengthTextColor}`}>{strengthLabel}</span>
              </p>
            </div>

            {/* Requirements Checklist */}
            <div className="grid grid-cols-2 gap-x-1 gap-y-2">
              {passwordRequirements.map((req, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 text-xs font-medium transition-colors duration-300 ${
                    req.met ? "text-success dark:text-success" : "text-muted-foreground/60"
                  }`}
                >
                  <CheckCircle2
                    className={`h-3.5 w-3.5 shrink-0 transition-all duration-300 ${
                      req.met
                        ? "scale-110 fill-success/20 text-success"
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
          <DropdownMenuTrigger className="bg-background hover:bg-muted flex w-full cursor-pointer items-center justify-between rounded-md border px-3 py-2 text-sm outline-none">
              <span>{roles.find((r) => r.value === selectedRole)?.label}</span>
              <ChevronDown className="text-muted-foreground h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[var(--anchor-width)]">
            {roles.map((r) => (
              <DropdownMenuItem key={r.value} onClick={() => setSelectedRole(r.value)}>
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
            className="bg-background h-10 w-full rounded-md border px-3 focus:border-primary focus:ring-primary"
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
          <p className="text-muted-foreground text-xs">
            Choose an open course to enroll the student
          </p>
        </div>
      )}

      {/* Bypass Onboarding (for students only) */}
      {selectedRole === "student" && (
        <div className="rounded-xl border border-info/30 bg-info/5 p-4 shadow-sm dark:border-info/20 dark:bg-info/10">
          <label className="group flex cursor-pointer items-start gap-3">
            <div className="relative mt-0.5 flex items-center">
              <input
                type="checkbox"
                checked={bypassOnboarding}
                onChange={(e) => setBypassOnboarding(e.target.checked)}
                className="peer border-input bg-background h-4 w-4 shrink-0 cursor-pointer rounded border accent-primary"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-info dark:text-info">
                <ShieldCheck className="h-4 w-4" />
                Bypass Onboarding
              </div>
              <p className="text-xs leading-relaxed text-info/70 dark:text-info/70">
                Skip the onboarding process for this student. They will be able to access the
                platform directly without completing onboarding forms.
              </p>
            </div>
          </label>
        </div>
      )}
      <input
        type="hidden"
        name="bypassOnboarding"
        value={bypassOnboarding && selectedRole === "student" ? "true" : "false"}
      />

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
