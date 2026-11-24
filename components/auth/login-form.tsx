"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";

import { signIn } from "@/app/actions/auth";
import { AuthHeading } from "@/components/auth/auth-shell";
import { GoogleSignInButton } from "@/components/auth/google-signin-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateDeviceFingerprints } from "@/lib/device-fingerprint";

interface Fingerprints {
  visitorId: string;
  hardwareFingerprint: string;
  components: string;
  generatedAt: string;
}

/** Email/password form. Only rendered when password auth is enabled (local development). */
function PasswordForm() {
  const [state, action, pending] = useActionState(signIn, undefined);
  const [showPassword, setShowPassword] = useState(false);
  const [fp, setFp] = useState<Fingerprints | null>(null);

  useEffect(() => {
    let cancelled = false;
    generateDeviceFingerprints().then((f) => {
      if (!cancelled && f) {
        setFp({
          visitorId: f.visitorId,
          hardwareFingerprint: f.hardwareFingerprint,
          components: JSON.stringify(f.components),
          generatedAt: f.generatedAt.toString(),
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="device_fingerprint" value={fp?.visitorId ?? ""} />
      <input type="hidden" name="hardware_fingerprint" value={fp?.hardwareFingerprint ?? ""} />
      <input type="hidden" name="device_components" value={fp?.components ?? ""} />
      <input type="hidden" name="generated_at" value={fp?.generatedAt ?? ""} />
      <input type="hidden" name="user_agent" value={typeof navigator !== "undefined" ? navigator.userAgent : ""} />

      {state?.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            className="pr-10"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Signing in…
          </>
        ) : (
          "Sign in"
        )}
      </Button>
    </form>
  );
}

export function LoginForm({
  errorMessage,
  passwordEnabled,
}: {
  errorMessage: string | null;
  passwordEnabled: boolean;
}) {
  return (
    <div className="space-y-6">
      <AuthHeading title="Sign in" description="Welcome back. Continue with your Google account." />

      {errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <GoogleSignInButton />

      {passwordEnabled && (
        <>
          <div className="text-muted-foreground flex items-center gap-3 text-xs">
            <span className="bg-border h-px flex-1" />
            or with email (development only)
            <span className="bg-border h-px flex-1" />
          </div>
          <PasswordForm />
        </>
      )}

      <p className="text-muted-foreground text-sm">
        New to BIMPACC?{" "}
        <Link href="/register" className="text-primary font-medium hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
