import { redirect } from "next/navigation";

import { AuthHeading, AuthShell } from "@/components/auth/auth-shell";
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
    <AuthShell>
      <div className="space-y-6">
        <AuthHeading
          title="Two-step verification"
          description={
            mode === "challenge"
              ? `Enter the 6-digit code from your authenticator app to continue to ${APP_NAME}.`
              : "For your security, every account must be protected with an authenticator app."
          }
        />
        <MfaPanel mode={mode} email={user.email} />
      </div>
    </AuthShell>
  );
}
