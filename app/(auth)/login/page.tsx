"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GoogleSignInButton } from "@/components/auth/google-signin-button";
import { AlertCircle, LogIn, Loader2 } from "lucide-react";
import { generateDeviceFingerprints } from "@/lib/device-fingerprint";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [hardwareFingerprint, setHardwareFingerprint] = useState<string | null>(null);
  const [deviceComponents, setDeviceComponents] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const fingerprints = await generateDeviceFingerprints();
      if (!cancelled && fingerprints) {
        setFingerprint(fingerprints.visitorId);
        setHardwareFingerprint(fingerprints.hardwareFingerprint);
        setDeviceComponents(JSON.stringify(fingerprints.components));
        setGeneratedAt(fingerprints.generatedAt.toString());
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

      {/* Error Messages */}
      {error === "device_mismatch" && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This account is locked to a different device. Please use your registered device or contact admin.
          </AlertDescription>
        </Alert>
      )}

      {error === "google_auth_failed" && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Google authentication failed. Please try again.
          </AlertDescription>
        </Alert>
      )}

      {/* Google Sign In */}
      <div className="animate-in fade-in slide-in-from-bottom-6 fill-mode-both delay-100 duration-700">
        <GoogleSignInButton />
      </div>

      {/* Device Verification Loading */}
      {isVerifying && (
        <div className="animate-in fade-in slide-in-from-top-2 fill-mode-both delay-200 duration-700">
          <Alert className="border-info/20 bg-info/5 text-info">
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription className="text-sm font-medium">
              Verifying your device...
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Sign Up Link */}
      <div className="animate-in fade-in slide-in-from-bottom-4 fill-mode-both text-center delay-500 duration-700">
        <p className="text-muted-foreground/80 text-sm">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="group text-primary hover:text-primary/80 inline-flex items-center font-semibold transition-colors"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
