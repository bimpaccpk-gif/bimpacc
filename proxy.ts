import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  SERVICE_BILLING_SETTINGS_COLUMNS,
  isAdminDashboardRestricted,
  type ServiceBillingSettings,
} from "@/lib/billing-policy";
import {
  buildCsp,
  generateNonce,
  staticSecurityHeaders,
} from "@/lib/security-headers";
import { getMfaEnforcement, mfaGate } from "@/lib/mfa-policy";
import { isSessionExpired } from "@/lib/session-policy";

const protectedRoutes = [
  "/super-admin",
  "/admin",
  "/instructor",
  "/student",
  "/courses",
  "/billing",
  "/mfa",
];
const authRoutes = ["/login", "/register"];

const DASHBOARD_MAP: Record<string, string> = {
  admin: "/admin",
  instructor: "/instructor",
  student: "/student",
};

export async function proxy(request: NextRequest) {
  const isDev = process.env.NODE_ENV === "development";

  // Per-request CSP nonce. Next.js reads it from the request's CSP header and
  // applies it to framework scripts; the root layout reads x-nonce for its own.
  const nonce = generateNonce();
  const csp = buildCsp(nonce, isDev);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const staticHeaders = staticSecurityHeaders(isDev);
  const secure = <T extends NextResponse>(res: T): T => {
    for (const [name, value] of Object.entries(staticHeaders)) res.headers.set(name, value);
    return res;
  };

  const response = secure(NextResponse.next({ request: { headers: requestHeaders } }));
  response.headers.set("Content-Security-Policy", csp);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // getClaims() refreshes the session cookie when needed and verifies the JWT
  // locally when the project uses asymmetric signing keys (falls back to a
  // getUser() network call otherwise).
  const { data: claimsData } = await supabase.auth.getClaims();
  let user = claimsData?.claims?.sub ? { id: claimsData.claims.sub } : null;
  // Authenticator assurance level from the JWT: "aal1" after Google sign-in, "aal2" after MFA.
  const aal = (claimsData?.claims as { aal?: string } | undefined)?.aal;
  const mfaEnforcement = getMfaEnforcement();

  const { pathname } = request.nextUrl;

  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // Maximum session lifetime (7 hours by default): after that the user must sign in again,
  // however active they are. /auth/callback is exempt because it is how a NEW session starts.
  if (user && pathname !== "/auth/callback" && isSessionExpired(claimsData?.claims)) {
    // Local scope: end only THIS session, not the user's sessions on other devices.
    await supabase.auth.signOut({ scope: "local" });
    user = null;

    if (!isAuthRoute) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("error", "session_expired");
      const redirectResponse = secure(NextResponse.redirect(loginUrl));
      // Carry over the cookie deletions signOut() just wrote onto `response`.
      for (const cookie of response.cookies.getAll()) redirectResponse.cookies.set(cookie);
      return redirectResponse;
    }
    // On /login or /register: just continue as signed out (cookies are already cleared).
  }

  // Unauthenticated users on protected routes → login
  if (isProtectedRoute && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return secure(NextResponse.redirect(loginUrl));
  }

  // Only query DB when we actually need the role or pause status:
  //   - auth routes with a logged-in user (to pick the right dashboard)
  //   - /admin or /instructor routes (to enforce role access)
  //   - all protected routes (to check account pause)
  const needsRoleCheck =
    (isAuthRoute && !!user) ||
    pathname.startsWith("/super-admin") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/instructor") ||
    (isProtectedRoute && !!user) ||
    // Role is not needed for the MFA gate itself, but fetching it keeps the pause check
    // working on every path, including Server Action POSTs sent to arbitrary paths.
    (mfaEnforcement === "enforce" && !!user);

  let role: string | null = null;
  let isPaused = false;
  let isSuperAdmin = false;

  if (needsRoleCheck) {
    // Fetch the profile and super-admin capability together; the capability
    // only counts for admins.
    const [{ data: profile }, { data: capability }] = await Promise.all([
      supabase.from("users").select("role, is_paused").eq("id", user!.id).single(),
      supabase.from("super_admins").select("user_id").eq("user_id", user!.id).maybeSingle(),
    ]);

    role = profile?.role ?? null;
    isPaused = profile?.is_paused ?? false;
    isSuperAdmin = role === "admin" && Boolean(capability);

    // Account pause/ban check. A paused user is signed out (this session only) and sent to
    // /login with a message. Without the sign-out, /login would send the still-signed-in user
    // back to their dashboard, which sends them to /login again: an endless redirect loop.
    if (isPaused) {
      await supabase.auth.signOut({ scope: "local" });
      user = null;

      if (!isAuthRoute) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("error", "account_paused");
        const redirectResponse = secure(NextResponse.redirect(loginUrl));
        // Carry over the cookie deletions signOut() just wrote onto `response`.
        for (const cookie of response.cookies.getAll()) redirectResponse.cookies.set(cookie);
        return redirectResponse;
      }
      // On /login or /register: continue as signed out so the message can be shown.
    }
  }

  // Every signed-in user must have completed MFA (aal2) when enforcement is on.
  if (user && mfaGate({ enforcement: mfaEnforcement, aal, pathname }) === "redirect-to-mfa") {
    return secure(NextResponse.redirect(new URL("/mfa", request.url)));
  }

  // Authenticated users on auth routes → their role-specific dashboard
  if (isAuthRoute && user) {
    const dashboard = isSuperAdmin ? "/super-admin" : (DASHBOARD_MAP[role ?? ""] ?? "/student");
    return secure(NextResponse.redirect(new URL(dashboard, request.url)));
  }

  // Optimistic route check; the super-admin layout and billing RLS repeat this
  // authorization at the data boundary.
  if (pathname.startsWith("/super-admin") && !isSuperAdmin) {
    const fallback = DASHBOARD_MAP[role ?? ""] ?? "/student";
    return secure(NextResponse.redirect(new URL(fallback, request.url)));
  }

  // /admin routes → admin only
  if (pathname.startsWith("/admin") && role !== "admin") {
    const fallback = DASHBOARD_MAP[role ?? ""] ?? "/student";
    return secure(NextResponse.redirect(new URL(fallback, request.url)));
  }

  // Transparent service-billing gate. This is deliberately fail-open: the
  // admin dashboard is restricted only when a valid, explicitly enabled row
  // says the disclosed grace period has ended.
  if (pathname.startsWith("/admin") && role === "admin" && !isSuperAdmin) {
    const { data: billingSettings } = await supabase
      .from("service_billing_settings")
      .select(SERVICE_BILLING_SETTINGS_COLUMNS)
      .eq("id", 1)
      .maybeSingle();

    if (isAdminDashboardRestricted(billingSettings as ServiceBillingSettings | null)) {
      return secure(NextResponse.redirect(new URL("/billing", request.url)));
    }
  }

  // /instructor routes → admin or instructor
  if (pathname.startsWith("/instructor") && role !== "admin" && role !== "instructor") {
    const fallback = DASHBOARD_MAP[role ?? ""] ?? "/student";
    return secure(NextResponse.redirect(new URL(fallback, request.url)));
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
