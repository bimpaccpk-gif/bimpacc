"use client";

import Link from "next/link";
import { useState, useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { signUp } from "@/app/actions/auth";
import { AlertCircle, UserPlus, Eye, EyeOff, Loader2, Info } from "lucide-react";

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
    "bg-destructive",
    "bg-warning",
    "bg-info",
    "bg-success",
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Create an account</h1>
        <p className="text-muted-foreground">
          Start your learning journey today
        </p>
      </div>

      <form action={action} className="space-y-4">
        {state?.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

        <div className="flex items-start gap-3 rounded-lg border border-brand-200 bg-brand-50 p-3.5 dark:border-brand-800 dark:bg-brand-950">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
          <div className="space-y-1 text-xs text-brand-800 dark:text-brand-300">
            <p className="font-semibold">Important Notice</p>
            <p>
              Enter your name <span className="font-bold">exactly as it appears on your CNIC</span>. Use
              CAPITAL LETTERS for your full name. Your details will appear
              on your certificate.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fullName" className="text-sm font-medium">
            Full name
          </Label>
          <Input
            id="fullName"
            type="text"
            name="fullName"
            placeholder="e.g. AHMED KHAN"
            className="h-11 uppercase"
            style={{ textTransform: "uppercase" }}
            required
          />
          <p className="text-xs text-muted-foreground">
            Write in CAPITAL letters as per your CNIC
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">
            Email address
          </Label>
          <Input
            id="email"
            type="email"
            name="email"
            placeholder="you@gmail.com"
            className="h-11"
            required
          />
          <p className="text-xs text-muted-foreground">
            Gmail, Outlook, Yahoo, Hotmail, or iCloud
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium">
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="••••••••"
              className="h-11 pr-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {password && (
            <div className="space-y-1.5">
              <div className="flex gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      i < passwordStrength
                        ? strengthColors[passwordStrength - 1]
                        : "bg-muted"
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Strength:{" "}
                <span className="font-medium">
                  {strengthLabels[passwordStrength - 1] || "Too weak"}
                </span>
              </p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-sm font-medium">
            Confirm password
          </Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirm ? "text" : "password"}
              name="confirmPassword"
              placeholder="••••••••"
              className="h-11 pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            >
              {showConfirm ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          className="h-11 w-full text-sm font-semibold"
          disabled={pending}
        >
          {pending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="mr-2 h-4 w-4" />
          )}
          {pending ? "Creating account..." : "Create Account"}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-3 text-muted-foreground">
            Already have an account?
          </span>
        </div>
      </div>

      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Already registered?{" "}
          <Link
            href="/login"
            className="font-semibold text-primary underline-offset-4 transition-colors hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
