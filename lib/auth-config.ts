/**
 * Production signs in with Google only. Email/password is for local development
 * (or an explicit opt-in via ENABLE_PASSWORD_AUTH=true, e.g. a staging project).
 *
 * This must be enforced in the server actions, not only by hiding the form:
 * Server Actions are public POST endpoints, and Supabase Auth itself accepts
 * password requests made with the public anon key. Also disable the Email
 * provider in the Supabase dashboard (Authentication -> Sign In / Providers).
 */
export function isPasswordAuthEnabled(): boolean {
  return process.env.NODE_ENV === "development" || process.env.ENABLE_PASSWORD_AUTH === "true";
}

export const PASSWORD_AUTH_DISABLED_MESSAGE =
  "Email and password sign-in is not available. Please continue with Google.";
