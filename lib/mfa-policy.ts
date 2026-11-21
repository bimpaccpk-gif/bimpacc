/**
 * Multi-factor authentication policy: EVERY signed-in user (students, instructors,
 * admins) must complete TOTP MFA before doing anything else.
 *
 * Supabase issues a JWT with an `aal` claim: "aal1" after a normal sign-in
 * (Google), "aal2" after the user has also passed a TOTP challenge. When
 * MFA_ENFORCEMENT=enforce, a session below aal2 can only reach /mfa (to enroll
 * an authenticator, or to enter a code if one is already set up).
 *
 * Rollout is staged on purpose: leave it "off" while you test /mfa yourself,
 * then switch it to "enforce". Self-service means nobody is locked out by
 * enforcement itself; the real risk is a lost phone, which an admin resolves
 * with "Reset MFA" on the user's page (users.mfa_reset audit event).
 *
 * Pure (no I/O) so it is unit tested; used by proxy.ts and lib/dal.ts.
 */

export type MfaEnforcement = "off" | "enforce";

export function getMfaEnforcement(
  value: string | undefined = process.env.MFA_ENFORCEMENT ?? process.env.STAFF_MFA_ENFORCEMENT
): MfaEnforcement {
  return value === "enforce" ? "enforce" : "off";
}

/** Paths a user at aal1 must still be able to reach in order to complete MFA. */
const MFA_EXEMPT_PATHS = ["/mfa", "/auth/callback"];

export function isMfaExemptPath(pathname: string): boolean {
  return MFA_EXEMPT_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export type MfaGateDecision = "allow" | "redirect-to-mfa";

/**
 * Decide whether a request from a signed-in user may proceed. Role is deliberately
 * not an input: an unknown or missing role must not bypass MFA (fail closed).
 */
export function mfaGate(input: {
  enforcement: MfaEnforcement;
  aal: string | null | undefined;
  pathname: string;
}): MfaGateDecision {
  if (input.enforcement !== "enforce") return "allow";
  if (isMfaExemptPath(input.pathname)) return "allow";
  return input.aal === "aal2" ? "allow" : "redirect-to-mfa";
}
