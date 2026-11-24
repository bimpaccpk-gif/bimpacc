import { LoginForm } from "@/components/auth/login-form";
import { isPasswordAuthEnabled } from "@/lib/auth-config";

/** Every `?error=` code the app redirects to /login with, and what the user should do. */
const LOGIN_ERRORS: Record<string, string> = {
  session_expired: "Your session has ended for your security. Please sign in again.",
  google_auth_failed: "Google sign-in did not complete. Please try again.",
  account_locked: "This account is locked. Please contact the BIMPACC team.",
  account_paused: "This account is paused. Please contact the BIMPACC team.",
  session_revoked:
    "This device was signed out: the account was signed in on another device, or an admin ended this session. Sign in again to continue.",
  device_mismatch:
    "This account is registered to a different device. Use your registered device or contact the BIMPACC team.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const code = Array.isArray(params.error) ? params.error[0] : params.error;

  return (
    <LoginForm
      errorMessage={code ? (LOGIN_ERRORS[code] ?? "Something went wrong. Please sign in again.") : null}
      passwordEnabled={isPasswordAuthEnabled()}
    />
  );
}
