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
  BookOpen,
  ChevronDown,
} from "lucide-react";
import { usePasswordStrength } from "@/hooks/use-password-strength";
import { GoogleSignInButton } from "@/components/auth/google-signin-button";

export interface Course {
  id: string;
  title: string;
  description: string;
  batch: string;
}

export function RegisterForm({ courses }: { courses: Course[] }) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [state, action, pending] = useActionState(signUp, undefined);

  const {
    score: passwordStrength,
    label: strengthLabel,
    colorClass: strengthColorVar,
    textClass: strengthTextColor,
    requirements: passwordRequirements,
  } = usePasswordStrength(password);

  return (
    <div className="flex flex-col space-y-8">
      {/* Header */}
      <div className="animate-in fade-in slide-in-from-bottom-4 fill-mode-both flex flex-col space-y-3 text-center duration-700">
        <div className="bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary/80 ring-primary/20 mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl ring-1">
          <UserPlus className="h-6 w-6" />
        </div>
        <h1 className="from-foreground to-foreground/80 bg-gradient-to-br bg-clip-text text-3xl font-bold tracking-tight text-transparent">
          Create your account
        </h1>
        <p className="text-muted-foreground/80 text-sm">Start your BIM learning journey today</p>
      </div>

      {/* Google Sign In */}
      <div className="animate-in fade-in slide-in-from-bottom-6 fill-mode-both delay-100 duration-700">
        <GoogleSignInButton />
      </div>

      {/* Divider */}
      <div className="animate-in fade-in zoom-in-95 fill-mode-both relative delay-200 duration-700">
        <div className="absolute inset-0 flex items-center">
          <div className="border-border/50 w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background/60 text-muted-foreground/60 dark:bg-card/60 rounded-full px-3 font-medium backdrop-blur-md">
            Or register with email
          </span>
        </div>
      </div>

      <form
        action={action}
        className="animate-in fade-in slide-in-from-bottom-6 fill-mode-both space-y-6 delay-150 duration-700"
      >
        {state?.error && (
          <Alert
            variant="destructive"
            className="animate-in fade-in slide-in-from-top-2 border-red-500/20 bg-red-500/10 text-red-600 duration-300 dark:border-red-500/20 dark:bg-red-950/20 dark:text-red-400"
          >
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm font-medium">{state.error}</AlertDescription>
          </Alert>
        )}

        {/* CNIC Notice */}
        <div className="border-warning/30 bg-warning/5 dark:border-warning/20 dark:bg-warning/20 rounded-xl border p-4 shadow-sm backdrop-blur-sm">
          <div className="flex gap-3">
            <Info className="text-warning mt-0.5 h-5 w-5 shrink-0" />
            <div className="space-y-1.5 text-sm">
              <p className="text-warning font-semibold">Important: Name Format</p>
              <p className="text-warning/80 leading-relaxed">
                Enter your name{" "}
                <span className="text-warning font-bold">exactly as on your CNIC</span> in
                <span className="text-warning font-bold"> CAPITAL LETTERS</span>. This will appear
                on your certificates.
              </p>
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="flex flex-col space-y-5">
          {/* Full Name */}
          <div className="space-y-2.5">
            <Label htmlFor="fullName" className="text-foreground/80 text-sm font-medium">
              Full Name
            </Label>
            <div className="group relative">
              <div className="text-muted-foreground/50 group-focus-within:text-primary pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 transition-colors">
                <User className="h-5 w-5" />
              </div>
              <Input
                id="fullName"
                type="text"
                name="fullName"
                placeholder="Ex: AHMED KHAN"
                className="placeholder:text-muted-foreground/40 bg-background/50 border-border/20 focus-visible:border-primary focus-visible:ring-primary/50 dark:border-border/10 h-12 rounded-xl pl-11 tracking-wider uppercase shadow-sm transition-all"
                style={{ textTransform: "uppercase" }}
                required
              />
            </div>
            <p className="text-muted-foreground/60 ml-1 text-xs font-medium">
              Write in CAPITAL letters as per your CNIC
            </p>
          </div>

          {/* Email */}
          <div className="space-y-2.5">
            <Label htmlFor="email" className="text-foreground/80 text-sm font-medium">
              Email Address
            </Label>
            <div className="group relative">
              <div className="text-muted-foreground/50 group-focus-within:text-primary pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 transition-colors">
                <Mail className="h-5 w-5" />
              </div>
              <Input
                id="email"
                type="email"
                name="email"
                placeholder="you@gmail.com"
                className="bg-background/50 border-border/20 focus-visible:border-primary focus-visible:ring-primary/50 dark:border-border/10 h-12 rounded-xl pl-11 shadow-sm transition-all"
                required
              />
            </div>
            <p className="text-muted-foreground/60 ml-1 text-xs font-medium">
              Only Gmail emails are allowed
            </p>
          </div>

          {/* Password */}
          <div className="space-y-2.5">
            <Label htmlFor="password" className="text-foreground/80 text-sm font-medium">
              Password
            </Label>
            <div className="group relative">
              <div className="text-muted-foreground/50 group-focus-within:text-primary pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 transition-colors">
                <Lock className="h-5 w-5" />
              </div>
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Create a strong password"
                className="bg-background/50 border-border/20 focus-visible:border-primary focus-visible:ring-primary/50 dark:border-border/10 h-12 rounded-xl pr-11 pl-11 shadow-sm transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="text-muted-foreground/40 hover:text-foreground absolute top-1/2 right-3.5 -translate-y-1/2 transition-colors focus:outline-none"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            {/* Password Strength */}
            {password && (
              <div className="bg-background/50 border-border/50 animate-in fade-in zoom-in-95 space-y-3 rounded-xl border p-3.5 shadow-sm duration-200">
                {/* Strength Bar */}
                <div className="space-y-2">
                  <div className="flex w-full gap-1.5">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                          i < passwordStrength
                            ? strengthColorVar
                            : "bg-muted dark:bg-muted-foreground/10"
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
                        req.met ? "text-green-600 dark:text-green-400" : "text-muted-foreground/60"
                      }`}
                    >
                      <CheckCircle2
                        className={`h-3.5 w-3.5 shrink-0 transition-all duration-300 ${
                          req.met
                            ? "scale-110 fill-green-500/20 text-green-500"
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

          {/* Confirm Password */}
          <div className="space-y-2.5">
            <Label htmlFor="confirmPassword" className="text-foreground/80 text-sm font-medium">
              Confirm Password
            </Label>
            <div className="group relative">
              <div className="text-muted-foreground/50 group-focus-within:text-primary pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 transition-colors">
                <Lock className="h-5 w-5" />
              </div>
              <Input
                id="confirmPassword"
                type={showConfirm ? "text" : "password"}
                name="confirmPassword"
                placeholder="Confirm your password"
                className="bg-background/50 border-border/20 focus-visible:border-primary focus-visible:ring-primary/50 dark:border-border/10 h-12 rounded-xl pr-11 pl-11 shadow-sm transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                aria-label={showConfirm ? "Hide password" : "Show password"}
                className="text-muted-foreground/40 hover:text-foreground absolute top-1/2 right-3.5 -translate-y-1/2 transition-colors focus:outline-none"
              >
                {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Course Selection */}
        <div className="flex flex-col space-y-2.5">
          <Label
            htmlFor="courseId"
            className="text-foreground/80 flex items-center gap-2 text-sm font-medium"
          >
            <BookOpen className="text-primary h-4 w-4" />
            Select Course to Enroll
          </Label>
          <div className="group relative">
            <select
              id="courseId"
              name="courseId"
              required={!!courses && courses.length > 0}
              disabled={!courses || courses.length === 0}
              className="bg-background/50 text-foreground border-border/20 focus:border-primary focus:ring-primary/50 dark:border-border/10 h-12 w-full appearance-none rounded-xl border px-4 shadow-sm transition-all outline-none"
              defaultValue=""
            >
              <option value="" disabled>
                {courses && courses.length > 0
                  ? "Select an open course..."
                  : "No courses currently open for registration"}
              </option>
              {courses?.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title} {course.batch ? `(Batch: ${course.batch})` : ""}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
              <ChevronDown className="text-muted-foreground h-4 w-4" />
            </div>
          </div>
          {courses && courses.length > 0 ? (
            <p className="text-muted-foreground/60 ml-1 text-xs font-medium">
              Choose an open course to start learning immediately.
            </p>
          ) : (
            <p className="text-warning/80 ml-1 text-xs font-medium">
              There are no courses open for registration right now.
            </p>
          )}
        </div>

        {/* Submit Button */}
        <div className="space-y-4 pt-2">
          <Button
            type="submit"
            className="group from-primary to-primary/80 text-primary-foreground shadow-primary/25 hover:from-primary/90 hover:to-primary/70 h-12 w-full rounded-xl bg-gradient-to-r text-base font-semibold shadow-lg transition-all active:scale-[0.98] disabled:opacity-70"
            disabled={pending}
          >
            {pending ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Creating account...
              </>
            ) : (
              <>
                Create Account
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </Button>

          <p className="text-muted-foreground/70 text-center text-xs font-medium">
            By creating an account, you agree to our{" "}
            <Link
              href="/terms"
              className="text-primary hover:text-primary/80 underline-offset-2 transition-colors hover:underline"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="text-primary hover:text-primary/80 underline-offset-2 transition-colors hover:underline"
            >
              Privacy Policy
            </Link>
          </p>
        </div>
      </form>

      {/* Divider */}
      <div className="animate-in fade-in zoom-in-95 fill-mode-both relative delay-300 duration-700">
        <div className="absolute inset-0 flex items-center">
          <div className="border-border/50 w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="text-muted-foreground/60 bg-background/60 dark:bg-card/60 rounded-full px-3 font-medium backdrop-blur-md">
            Already have an account?
          </span>
        </div>
      </div>

      {/* Sign In Link */}
      <div className="animate-in fade-in slide-in-from-bottom-4 fill-mode-both text-center delay-500 duration-700">
        <p className="text-muted-foreground/80 text-sm font-medium">
          Already registered?{" "}
          <Link
            href="/login"
            className="group text-primary hover:text-primary/80 inline-flex items-center font-semibold transition-colors"
          >
            Sign in
            <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </Link>
        </p>
      </div>
    </div>
  );
}
