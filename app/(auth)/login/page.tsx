"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { signIn } from "@/app/actions/auth";
import {
  AlertCircle,
  LogIn,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Lock,
  ArrowRight,
} from "lucide-react";

export default function LoginPage() {
  const [state, action, pending] = useActionState(signIn, undefined);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="flex flex-col space-y-8">
      {/* Header */}
      <div className="flex flex-col space-y-3 text-center animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both">
        <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 ring-1 ring-indigo-500/20">
          <LogIn className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/80 bg-clip-text text-transparent">
          Welcome back
        </h1>
        <p className="text-sm text-muted-foreground/80">
          Sign in to continue your learning journey
        </p>
      </div>

      <form action={action} className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-150 fill-mode-both">
        {state?.error && (
          <Alert
            variant="destructive"
            className="border-red-500/20 bg-red-500/10 text-red-600 dark:border-red-500/20 dark:bg-red-950/20 dark:text-red-400 animate-in fade-in slide-in-from-top-2 duration-300"
          >
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm font-medium">{state.error}</AlertDescription>
          </Alert>
        )}

        {/* Form Fields */}
        <div className="space-y-5 flex flex-col">
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
                name="email"
                type="email"
                placeholder="Ex: you@gmail.com"
                className="h-12 pl-11 bg-background/50 border-white/10 dark:border-white/5 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500 transition-all rounded-xl"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-sm font-medium text-foreground/80">
                Password
              </Label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-muted-foreground/80 transition-colors hover:text-indigo-500"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative group">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 transition-colors group-focus-within:text-indigo-500 pointer-events-none">
                <Lock className="h-5 w-5" />
              </div>
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                className="h-12 pl-11 pr-11 bg-background/50 border-white/10 dark:border-white/5 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500 transition-all rounded-xl"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 transition-colors hover:text-foreground focus:outline-none"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className="h-12 w-full text-base font-semibold rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25 transition-all active:scale-[0.98] disabled:opacity-70"
          disabled={pending}
        >
          {pending ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              Sign In
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </Button>
      </form>

      {/* Divider */}
      <div className="relative animate-in fade-in zoom-in-95 duration-700 delay-300 fill-mode-both">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/50" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white/60 dark:bg-zinc-950/60 backdrop-blur-md px-3 font-medium text-muted-foreground/60 rounded-full">
            New here?
          </span>
        </div>
      </div>

      {/* Sign Up Link */}
      <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500 fill-mode-both">
        <p className="text-sm text-muted-foreground/80">
          Don't have an account?{" "}
          <Link
            href="/register"
            className="group inline-flex items-center font-semibold text-indigo-600 dark:text-indigo-400 transition-colors hover:text-indigo-700 dark:hover:text-indigo-300"
          >
            Create an account
            <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </Link>
        </p>
      </div>
    </div>
  );
}
