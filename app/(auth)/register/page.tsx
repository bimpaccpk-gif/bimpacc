"use client";

import Link from "next/link";
import { useState, useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { signUp } from "@/app/actions/auth";
import {
  AlertCircle,
  UserPlus,
  Eye,
  EyeOff,
  Loader2,
  Info,
  CheckCircle2,
  Mail,
  Lock,
  User,
  ArrowRight,
} from "lucide-react";

export default function RegisterPage() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [state, action, pending] = useActionState(signUp, undefined);

  const getPasswordStrength = (pw: string) => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  };

  const passwordStrength = getPasswordStrength(password);
  const strengthLabels = ["Weak", "Fair", "Good", "Strong"];
  const strengthColors = [
    "bg-red-500",
    "bg-amber-500",
    "bg-blue-500",
    "bg-green-500",
  ];
  const strengthColorVars = [
    "bg-destructive",
    "bg-amber-500",
    "bg-blue-500",
    "bg-green-500",
  ];

  const passwordRequirements = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "One uppercase letter", met: /[A-Z]/.test(password) },
    { label: "One number", met: /[0-9]/.test(password) },
    { label: "One special character", met: /[^A-Za-z0-9]/.test(password) },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-3 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <UserPlus className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          Create your account
        </h1>
        <p className="text-sm text-muted-foreground">
          Start your BIM learning journey today
        </p>
      </div>

      <form action={action} className="space-y-6">
        {state?.error && (
          <Alert variant="destructive" className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">{state.error}</AlertDescription>
          </Alert>
        )}

        {/* CNIC Notice */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-800 dark:bg-amber-950/50">
          <div className="flex gap-3">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="space-y-1.5 text-sm">
              <p className="font-semibold text-amber-800 dark:text-amber-300">
                Important: Name Format
              </p>
              <p className="text-amber-700 dark:text-amber-400">
                Enter your name <span className="font-bold">exactly as on your CNIC</span> in 
                <span className="font-bold"> CAPITAL LETTERS</span>. This will appear on your certificates.
              </p>
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-5">
          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-sm font-medium">
              Full Name
            </Label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60">
                <User className="h-4 w-4" />
              </div>
              <Input
                id="fullName"
                type="text"
                name="fullName"
                placeholder="e.g. AHMED KHAN"
                className="h-12 pl-10 uppercase tracking-wider placeholder:text-muted-foreground/50"
                style={{ textTransform: "uppercase" }}
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Write in CAPITAL letters as per your CNIC
            </p>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email Address
            </Label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60">
                <Mail className="h-4 w-4" />
              </div>
              <Input
                id="email"
                type="email"
                name="email"
                placeholder="you@example.com"
                className="h-12 pl-10"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Gmail, Outlook, Yahoo, Hotmail, or iCloud
            </p>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              Password
            </Label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60">
                <Lock className="h-4 w-4" />
              </div>
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Create a strong password"
                className="h-12 pl-10 pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 transition-colors hover:text-foreground"
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
              <div className="space-y-3 rounded-lg bg-muted/50 p-3">
                {/* Strength Bar */}
                <div className="space-y-1.5">
                  <div className="flex gap-1.5">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                          i < passwordStrength
                            ? strengthColorVars[passwordStrength - 1] || "bg-destructive"
                            : "bg-muted"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Password strength:{" "}
                    <span
                      className={`font-medium ${
                        passwordStrength === 1
                          ? "text-red-500"
                          : passwordStrength === 2
                          ? "text-amber-500"
                          : passwordStrength === 3
                          ? "text-blue-500"
                          : "text-green-500"
                      }`}
                    >
                      {strengthLabels[passwordStrength - 1] || "Too weak"}
                    </span>
                  </p>
                </div>

                {/* Requirements Checklist */}
                <div className="grid grid-cols-2 gap-2">
                  {passwordRequirements.map((req, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-1.5 text-xs ${
                        req.met ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                      }`}
                    >
                      <CheckCircle2
                        className={`h-3.5 w-3.5 ${
                          req.met
                            ? "fill-green-500/20 text-green-500"
                            : "text-muted-foreground/40"
                        }`}
                      />
                      {req.label}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirm Password
            </Label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60">
                <Lock className="h-4 w-4" />
              </div>
              <Input
                id="confirmPassword"
                type={showConfirm ? "text" : "password"}
                name="confirmPassword"
                placeholder="Confirm your password"
                className="h-12 pl-10 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 transition-colors hover:text-foreground"
              >
                {showConfirm ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className="h-12 w-full text-base font-semibold"
          disabled={pending}
        >
          {pending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating account...
            </>
          ) : (
            <>
              Create Account
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          By creating an account, you agree to our{" "}
          <Link href="/terms" className="underline underline-offset-2 hover:text-primary">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-primary">
            Privacy Policy
          </Link>
        </p>
      </form>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-3 text-muted-foreground">
            Already have an account?
          </span>
        </div>
      </div>

      {/* Sign In Link */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Already registered?{" "}
          <Link
            href="/login"
            className="inline-flex items-center font-semibold text-primary underline-offset-4 transition-colors hover:underline"
          >
            Sign in
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </p>
      </div>
    </div>
  );
}
