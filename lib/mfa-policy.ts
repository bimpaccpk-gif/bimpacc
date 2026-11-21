/**
 * Multi-factor authentication policy: EVERY signed-in user (students, instructors,
 * admins) must complete TOTP MFA before doing anything else.
 *
 * Supabase issues a JWT with an `aal` claim: "aal1" after a normal sign-in
 * (Google), "aal2" after the user has also passed a TOTP challenge. While
 * enforced (the default in production), a session below aal2 can only reach /mfa
 * (to enroll an authenticator, or to enter a code if one is already set up); the
 * rest of the app is unreachable until that is done.
 *
 * Enrollment is self-service, so enforcement itself locks nobody out. The real
 * risk is a lost phone, which an admin resolves with "Reset MFA" on the user's
 * page (audited as user.mfa_reset). Emergency kill switch: MFA_ENFORCEMENT=off.
 *
 * Pure (no I/O) so it is unit tested; used by proxy.ts and lib/dal.ts.
 */

export type MfaEnforcement = "off" | "enforce";

/**
 * Enforced by default in production. The only way to turn it off there is the explicit
 * emergency switch MFA_ENFORCEMENT=off (e.g. if the /mfa screen ever breaks and nobody
 * can get in). Local development and tests default to off so they keep working without
 * an authenticator; set MFA_ENFORCEMENT=enforce to try the real flow locally.
 */
export function getMfaEnforcement(
  value: string | undefined = process.env.MFA_ENFORCEMENT ?? process.env.STAFF_MFA_ENFORCEMENT,
  nodeEnv: string | undefined = process.env.NODE_ENV
): MfaEnforcement {
  if (value === "off") return "off";
  if (value === "enforce") return "enforce";
  return nodeEnv === "production" ? "enforce" : "off";
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
