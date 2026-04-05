"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { signIn } from "@/app/actions/auth";
import { AlertCircle, LogIn, Eye, EyeOff, Loader2, Mail, Lock, ArrowRight } from "lucide-react";
import { generateDeviceFingerprints } from "@/lib/device-fingerprint";

export default function LoginPage() {
  const [state, action, pending] = useActionState(signIn, undefined);
  const [showPassword, setShowPassword] = useState(false);
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [hardwareFingerprint, setHardwareFingerprint] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const fingerprints = await generateDeviceFingerprints();
      if (!cancelled && fingerprints) {
        setFingerprint(fingerprints.visitorId);
        setHardwareFingerprint(fingerprints.hardwareFingerprint);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const isVerifying = !fingerprint || !hardwareFingerprint;

  return (
    <div className="flex w-full flex-col space-y-8">
      {/* Header */}
      <div className="animate-in fade-in slide-in-from-bottom-4 fill-mode-both flex flex-col space-y-3 text-center duration-700">
        <div className="bg-primary/10 text-primary ring-primary/20 mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl ring-1 sm:h-14 sm:w-14">
          <LogIn className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
        <h1 className="from-foreground to-foreground/80 bg-gradient-to-br bg-clip-text text-2xl font-bold tracking-tight text-transparent sm:text-3xl">
          Welcome back
        </h1>
        <p className="text-muted-foreground/80 text-sm">
          Sign in to continue your learning journey
        </p>
      </div>

      <form
        action={action}
        className="animate-in fade-in slide-in-from-bottom-6 fill-mode-both space-y-5 delay-150 duration-700 sm:space-y-6"
      >
        <input type="hidden" name="device_fingerprint" value={fingerprint ?? ""} />
        <input type="hidden" name="hardware_fingerprint" value={hardwareFingerprint ?? ""} />
        <input
          type="hidden"
          name="user_agent"
          value={typeof navigator !== "undefined" ? navigator.userAgent : ""}
        />
        {state?.error && (
          <Alert
            variant="destructive"
            className="animate-in fade-in slide-in-from-top-2 border-destructive/20 bg-destructive/10 duration-300"
          >
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm font-medium">{state.error}</AlertDescription>
          </Alert>
        )}

        {/* Form Fields */}
        <div className="flex flex-col space-y-4 sm:space-y-5">
          {/* Email */}
          <div className="space-y-2 sm:space-y-2.5">
            <Label htmlFor="email" className="text-foreground/80 text-sm font-medium">
              Email Address
            </Label>
            <div className="group relative">
              <div className="text-muted-foreground/50 group-focus-within:text-primary pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 transition-colors">
                <Mail className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Ex: you@gmail.com"
                className="bg-background/50 focus-visible:border-primary focus-visible:ring-primary/50 h-11 rounded-xl border-white/10 pl-10 transition-all sm:h-12 sm:pl-11 dark:border-white/5"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2 sm:space-y-2.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-foreground/80 text-sm font-medium">
                Password
              </Label>
              <Link
                href="/forgot-password"
                className="text-muted-foreground/80 hover:text-primary text-xs font-medium transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <div className="group relative">
              <div className="text-muted-foreground/50 group-focus-within:text-primary pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 transition-colors">
                <Lock className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                className="bg-background/50 focus-visible:border-primary focus-visible:ring-primary/50 h-11 rounded-xl border-white/10 pr-10 pl-10 transition-all sm:h-12 sm:pr-11 sm:pl-11 dark:border-white/5"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-muted-foreground/50 hover:text-foreground absolute top-1/2 right-3.5 -translate-y-1/2 transition-colors focus:outline-none"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" />
                ) : (
                  <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className="from-primary to-primary/80 text-primary-foreground shadow-primary/25 hover:from-primary/90 hover:to-primary/70 h-11 w-full rounded-xl bg-gradient-to-r text-base font-semibold shadow-lg transition-all active:scale-[0.98] disabled:opacity-70 sm:h-12"
          disabled={pending || isVerifying}
        >
          {pending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin sm:h-5 sm:w-5" />
              Signing in...
            </>
          ) : isVerifying ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin sm:h-5 sm:w-5" />
              Verifying device...
            </>
          ) : (
            <>
              Sign In
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1 sm:h-5 sm:w-5" />
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
          <span className="bg-background/60 text-muted-foreground/60 dark:bg-card/60 rounded-full px-3 font-medium backdrop-blur-md">
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
            className="group text-primary hover:text-primary/80 inline-flex items-center font-semibold transition-colors"
          >
            Create an account
            <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </Link>
        </p>
      </div>
    </div>
  );
}
