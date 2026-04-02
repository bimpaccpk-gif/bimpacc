"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { signIn } from "@/app/actions/auth";
import { AlertCircle, LogIn, Eye, EyeOff, Loader2, Mail, Lock, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [state, action, pending] = useActionState(signIn, undefined);
  const [showPassword, setShowPassword] = useState(false);
  const [fingerprint, setFingerprint] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const FingerprintJS = (await import("@fingerprintjs/fingerprintjs")).default;
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        if (!cancelled) {
          setFingerprint(result.visitorId);
        }
      } catch {
        // Fingerprint generation failed — server will reject with a clear error
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col space-y-8">
      {/* Header */}
      <div className="animate-in fade-in slide-in-from-bottom-4 fill-mode-both flex flex-col space-y-3 text-center duration-700">
        <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 ring-1 ring-indigo-500/20 dark:bg-indigo-500/20 dark:text-indigo-400">
          <LogIn className="h-6 w-6" />
        </div>
        <h1 className="from-foreground to-foreground/80 bg-gradient-to-br bg-clip-text text-3xl font-bold tracking-tight text-transparent">
          Welcome back
        </h1>
        <p className="text-muted-foreground/80 text-sm">
          Sign in to continue your learning journey
        </p>
      </div>

      <form
        action={action}
        className="animate-in fade-in slide-in-from-bottom-6 fill-mode-both space-y-6 delay-150 duration-700"
      >
        <input type="hidden" name="device_fingerprint" value={fingerprint ?? ""} />
        {state?.error && (
          <Alert
            variant="destructive"
            className="animate-in fade-in slide-in-from-top-2 border-red-500/20 bg-red-500/10 text-red-600 duration-300 dark:border-red-500/20 dark:bg-red-950/20 dark:text-red-400"
          >
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm font-medium">{state.error}</AlertDescription>
          </Alert>
        )}

        {/* Form Fields */}
        <div className="flex flex-col space-y-5">
          {/* Email */}
          <div className="space-y-2.5">
            <Label htmlFor="email" className="text-foreground/80 text-sm font-medium">
              Email Address
            </Label>
            <div className="group relative">
              <div className="text-muted-foreground/50 pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 transition-colors group-focus-within:text-indigo-500">
                <Mail className="h-5 w-5" />
              </div>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Ex: you@gmail.com"
                className="bg-background/50 h-12 rounded-xl border-white/10 pl-11 transition-all focus-visible:border-indigo-500 focus-visible:ring-indigo-500/50 dark:border-white/5"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-foreground/80 text-sm font-medium">
                Password
              </Label>
              <Link
                href="/forgot-password"
                className="text-muted-foreground/80 text-xs font-medium transition-colors hover:text-indigo-500"
              >
                Forgot password?
              </Link>
            </div>
            <div className="group relative">
              <div className="text-muted-foreground/50 pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 transition-colors group-focus-within:text-indigo-500">
                <Lock className="h-5 w-5" />
              </div>
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                className="bg-background/50 h-12 rounded-xl border-white/10 pr-11 pl-11 transition-all focus-visible:border-indigo-500 focus-visible:ring-indigo-500/50 dark:border-white/5"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-muted-foreground/50 hover:text-foreground absolute top-1/2 right-3.5 -translate-y-1/2 transition-colors focus:outline-none"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className="h-12 w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-base font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-600 hover:to-purple-700 active:scale-[0.98] disabled:opacity-70"
          disabled={pending || !fingerprint}
        >
          {pending ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Signing in...
            </>
          ) : !fingerprint ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Verifying device...
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
      <div className="animate-in fade-in zoom-in-95 fill-mode-both relative delay-300 duration-700">
        <div className="absolute inset-0 flex items-center">
          <div className="border-border/50 w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="text-muted-foreground/60 rounded-full bg-white/60 px-3 font-medium backdrop-blur-md dark:bg-zinc-950/60">
            New here?
          </span>
        </div>
      </div>

      {/* Sign Up Link */}
      <div className="animate-in fade-in slide-in-from-bottom-4 fill-mode-both text-center delay-500 duration-700">
        <p className="text-muted-foreground/80 text-sm">
          Don't have an account?{" "}
          <Link
            href="/register"
            className="group inline-flex items-center font-semibold text-indigo-600 transition-colors hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            Create an account
            <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </Link>
        </p>
      </div>
    </div>
  );
}
