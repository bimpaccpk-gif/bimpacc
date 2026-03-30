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

  const { score: passwordStrength, label: strengthLabel, colorClass: strengthColorVar, textClass: strengthTextColor, requirements: passwordRequirements } = usePasswordStrength(password);

  return (
    <div className="flex flex-col space-y-8">
      {/* Header */}
      <div className="flex flex-col space-y-3 text-center animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both">
        <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 ring-1 ring-indigo-500/20">
          <UserPlus className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/80 bg-clip-text text-transparent">
          Create your account
        </h1>
        <p className="text-sm text-muted-foreground/80">
          Start your BIM learning journey today
        </p>
      </div>

      <form action={action} className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-150 fill-mode-both">
        {state?.error && (
          <Alert variant="destructive" className="border-red-500/20 bg-red-500/10 text-red-600 dark:border-red-500/20 dark:bg-red-950/20 dark:text-red-400 animate-in fade-in slide-in-from-top-2 duration-300">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm font-medium">{state.error}</AlertDescription>
          </Alert>
        )}

        {/* CNIC Notice */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 dark:border-amber-500/20 dark:bg-amber-950/20 shadow-sm backdrop-blur-sm">
          <div className="flex gap-3">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="space-y-1.5 text-sm">
              <p className="font-semibold text-amber-800 dark:text-amber-300">
                Important: Name Format
              </p>
              <p className="text-amber-700/80 dark:text-amber-400/80 leading-relaxed">
                Enter your name <span className="font-bold text-amber-900 dark:text-amber-200">exactly as on your CNIC</span> in 
                <span className="font-bold text-amber-900 dark:text-amber-200"> CAPITAL LETTERS</span>. This will appear on your certificates.
              </p>
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-5 flex flex-col">
          {/* Full Name */}
          <div className="space-y-2.5">
            <Label htmlFor="fullName" className="text-sm font-medium text-foreground/80">
              Full Name
            </Label>
            <div className="relative group">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 transition-colors group-focus-within:text-indigo-500 pointer-events-none">
                <User className="h-5 w-5" />
              </div>
              <Input
                id="fullName"
                type="text"
                name="fullName"
                placeholder="Ex: AHMED KHAN"
                className="h-12 pl-11 uppercase tracking-wider placeholder:text-muted-foreground/40 bg-background/50 border-white/10 dark:border-white/5 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500 transition-all rounded-xl shadow-sm"
                style={{ textTransform: "uppercase" }}
                required
              />
            </div>
            <p className="text-xs font-medium text-muted-foreground/60 ml-1">
              Write in CAPITAL letters as per your CNIC
            </p>
          </div>

          {/* Email */}
          <div className="space-y-2.5">
            <Label htmlFor="email" className="text-sm font-medium text-foreground/80">
              Email Address
            </Label>
            <div className="relative group">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 transition-colors group-focus-within:text-indigo-500 pointer-events-none">
                <Mail className="h-5 w-5" />
              </div>
              <Input
                id="email"
                type="email"
                name="email"
                placeholder="you@gmail.com"
                className="h-12 pl-11 bg-background/50 border-white/10 dark:border-white/5 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500 transition-all rounded-xl shadow-sm"
                required
              />
            </div>
            <p className="text-xs font-medium text-muted-foreground/60 ml-1">
              Only Gmail emails are allowed
            </p>
          </div>

          {/* Password */}
          <div className="space-y-2.5">
            <Label htmlFor="password" className="text-sm font-medium text-foreground/80">
              Password
            </Label>
            <div className="relative group">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 transition-colors group-focus-within:text-indigo-500 pointer-events-none">
                <Lock className="h-5 w-5" />
              </div>
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Create a strong password"
                className="h-12 pl-11 pr-11 bg-background/50 border-white/10 dark:border-white/5 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500 transition-all rounded-xl shadow-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/40 transition-colors hover:text-foreground focus:outline-none"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>

            {/* Password Strength */}
            {password && (
              <div className="space-y-3 rounded-xl bg-background/50 border border-border/50 p-3.5 shadow-sm animate-in fade-in zoom-in-95 duration-200">
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

          {/* Confirm Password */}
          <div className="space-y-2.5">
            <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground/80">
              Confirm Password
            </Label>
            <div className="relative group">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 transition-colors group-focus-within:text-indigo-500 pointer-events-none">
                <Lock className="h-5 w-5" />
              </div>
              <Input
                id="confirmPassword"
                type={showConfirm ? "text" : "password"}
                name="confirmPassword"
                placeholder="Confirm your password"
                className="h-12 pl-11 pr-11 bg-background/50 border-white/10 dark:border-white/5 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500 transition-all rounded-xl shadow-sm"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/40 transition-colors hover:text-foreground focus:outline-none"
              >
                {showConfirm ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Course Selection */}
        <div className="space-y-2.5 flex flex-col">
          <Label htmlFor="courseId" className="text-sm font-medium text-foreground/80 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-indigo-500" />
            Select Course to Enroll
          </Label>
          <div className="relative group">
            <select
              id="courseId"
              name="courseId"
              required={!!courses && courses.length > 0}
              disabled={!courses || courses.length === 0}
              className="w-full h-12 px-4 rounded-xl bg-background/50 border border-white/10 dark:border-white/5 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm appearance-none text-foreground outline-none"
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
            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          {courses && courses.length > 0 ? (
            <p className="text-xs font-medium text-muted-foreground/60 ml-1">
              Choose an open course to start learning immediately.
            </p>
          ) : (
            <p className="text-xs font-medium text-amber-600/80 dark:text-amber-500/80 ml-1">
              There are no courses open for registration right now.
            </p>
          )}
        </div>

        {/* Submit Button */}
        <div className="space-y-4 pt-2">
          <Button
            type="submit"
            className="h-12 w-full text-base font-semibold rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25 transition-all active:scale-[0.98] disabled:opacity-70 group"
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

          <p className="text-center text-xs font-medium text-muted-foreground/70">
            By creating an account, you agree to our{" "}
            <Link href="/terms" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors hover:underline underline-offset-2">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors hover:underline underline-offset-2">
              Privacy Policy
            </Link>
          </p>
        </div>
      </form>

      {/* Divider */}
      <div className="relative animate-in fade-in zoom-in-95 duration-700 delay-300 fill-mode-both">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/50" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white/60 dark:bg-zinc-950/60 backdrop-blur-md px-3 font-medium text-muted-foreground/60 rounded-full">
            Already have an account?
          </span>
        </div>
      </div>

      {/* Sign In Link */}
      <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500 fill-mode-both">
        <p className="text-sm font-medium text-muted-foreground/80">
          Already registered?{" "}
          <Link
            href="/login"
            className="group inline-flex items-center text-indigo-600 dark:text-indigo-400 font-semibold transition-colors hover:text-indigo-700 dark:hover:text-indigo-300"
          >
            Sign in
            <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </Link>
        </p>
      </div>
    </div>
  );
}
