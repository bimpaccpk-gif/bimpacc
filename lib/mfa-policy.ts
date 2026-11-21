/**
 * Multi-factor authentication policy for staff (admins and instructors).
 *
 * Supabase issues a JWT with an `aal` claim: "aal1" after a normal sign-in
 * (Google), "aal2" after the user has also passed a TOTP challenge. We require
 * aal2 for staff when STAFF_MFA_ENFORCEMENT=enforce.
 *
 * Rollout is staged on purpose: leave it "off", have each admin enroll at /mfa,
 * then switch it to "enforce". Enforcing before anyone has enrolled just sends
 * every admin to the enrollment screen on next request (still recoverable).
 *
 * Pure (no I/O) so it is unit tested; used by proxy.ts and lib/dal.ts.
 */

export type MfaEnforcement = "off" | "enforce";

export function getMfaEnforcement(
  value: string | undefined = process.env.STAFF_MFA_ENFORCEMENT
): MfaEnforcement {
  return value === "enforce" ? "enforce" : "off";
}

export function roleRequiresMfa(role: string | null | undefined): boolean {
  return role === "admin" || role === "instructor";
}

/** Paths a staff user at aal1 must still be able to reach in order to complete MFA. */
const MFA_EXEMPT_PATHS = ["/mfa", "/auth/callback"];

export function isMfaExemptPath(pathname: string): boolean {
  return MFA_EXEMPT_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export type MfaGateDecision = "allow" | "redirect-to-mfa";

export function mfaGate(input: {
  enforcement: MfaEnforcement;
  role: string | null | undefined;
  aal: string | null | undefined;
  pathname: string;
}): MfaGateDecision {
  if (input.enforcement !== "enforce") return "allow";
  if (!roleRequiresMfa(input.role)) return "allow";
  if (isMfaExemptPath(input.pathname)) return "allow";
  return input.aal === "aal2" ? "allow" : "redirect-to-mfa";
}
