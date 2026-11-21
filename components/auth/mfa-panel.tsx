"use client";

import { useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";

import { signOut } from "@/app/actions/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

type Mode = "enroll" | "challenge";

interface Enrollment {
  factorId: string;
  qrCode: string;
  secret: string;
}

/**
 * TOTP enrollment / challenge using Supabase MFA. The 6-digit code is verified by
 * Supabase Auth (which rate-limits attempts); on success the session is upgraded to
 * aal2 and the cookies are refreshed, then we do a full navigation so the proxy sees it.
 */
export function MfaPanel({ mode, email }: { mode: Mode; email: string }) {
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const supabase = createClient();

  async function startEnrollment() {
    setBusy(true);
    setError("");
    try {
      // Drop abandoned (unverified) factors from an earlier attempt.
      const { data: factors } = await supabase.auth.mfa.listFactors();
      for (const f of factors?.all ?? []) {
        if (f.factor_type === "totp" && f.status === "unverified") {
          await supabase.auth.mfa.unenroll({ factorId: f.id });
        }
      }

      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `Authenticator ${new Date().toISOString().slice(0, 10)}-${Math.random()
          .toString(36)
          .slice(2, 6)}`,
        issuer: "BIMPACC LMS",
      });
      if (enrollError || !data) {
        setError("Could not start setup. Please try again.");
        return;
      }
      setEnrollment({
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
      });
    } finally {
      setBusy(false);
    }
  }

  async function verify(factorId: string) {
    setBusy(true);
    setError("");
    try {
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code: code.trim(),
      });
      if (verifyError) {
        setError("That code is not valid. Check the code and try again.");
        setCode("");
        return;
      }
      // Full navigation: the proxy re-reads the upgraded (aal2) session cookie.
      window.location.assign("/login");
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(code.trim())) {
      setError("Enter the 6-digit code.");
      return;
    }

    if (mode === "enroll") {
      if (!enrollment) return;
      await verify(enrollment.factorId);
      return;
    }

    const { data: factors } = await supabase.auth.mfa.listFactors();
    const factor = factors?.totp?.[0];
    if (!factor) {
      setError("No authenticator is set up for this account. Contact an administrator.");
      return;
    }
    await verify(factor.id);
  }

  const showCodeForm = mode === "challenge" || enrollment !== null;

  return (
    <div className="bg-card space-y-5 rounded-2xl border p-6 shadow-sm">
      <p className="text-muted-foreground text-center text-xs">Signed in as {email}</p>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {mode === "enroll" && !enrollment && (
        <div className="space-y-4">
          <ol className="text-muted-foreground list-decimal space-y-1 pl-5 text-sm">
            <li>Install an authenticator app (Google Authenticator, Microsoft Authenticator, Authy).</li>
            <li>Scan the QR code we show you.</li>
            <li>Enter the 6-digit code to finish.</li>
          </ol>
          <Button className="w-full" onClick={startEnrollment} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Set up authenticator"}
          </Button>
        </div>
      )}

      {mode === "enroll" && enrollment && (
        <div className="space-y-3 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={enrollment.qrCode}
            alt="QR code for your authenticator app"
            className="mx-auto h-44 w-44 rounded-lg bg-white p-2"
          />
          <p className="text-muted-foreground text-xs">
            Can&apos;t scan? Enter this key manually:
          </p>
          <code className="bg-muted block rounded-md px-2 py-1 text-xs break-all select-all">
            {enrollment.secret}
          </code>
        </div>
      )}

      {showCodeForm && (
        <form onSubmit={submit} className="space-y-3">
          <Input
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="text-center text-lg tracking-widest"
            aria-label="6-digit verification code"
            autoFocus
          />
          <Button type="submit" className="w-full" disabled={busy || code.length !== 6}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify and continue"}
          </Button>
        </form>
      )}

      <form action={signOut}>
        <Button type="submit" variant="ghost" className="text-muted-foreground w-full" size="sm">
          Sign out
        </Button>
      </form>
    </div>
  );
}
