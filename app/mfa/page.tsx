import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { MfaPanel } from "@/components/auth/mfa-panel";
import { getMfaSessionUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { APP_NAME } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function MfaPage() {
  const user = await getMfaSessionUser();
  const home = user.isSuperAdmin ? "/super-admin" : `/${user.role}`;

  const supabase = await createClient();
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  // Already verified for this session: nothing to do here.
  if (aal?.currentLevel === "aal2") {
    redirect(home);
  }

  // A verified factor exists -> challenge. Otherwise -> enroll.
  const mode = aal?.nextLevel === "aal2" ? "challenge" : "enroll";

  return (
    <main className="bg-background flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <div className="bg-primary/10 text-primary ring-primary/20 mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl ring-1">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Two-step verification</h1>
          <p className="text-muted-foreground text-sm">
            {mode === "challenge"
              ? `Enter the 6-digit code from your authenticator app to continue to ${APP_NAME}.`
              : "For your security, every account must be protected with an authenticator app."}
          </p>
        </div>

        <MfaPanel mode={mode} email={user.email} />
      </div>
    </main>
  );
}
