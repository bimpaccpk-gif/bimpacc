import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  SERVICE_BILLING_SETTINGS_COLUMNS,
  isAdminDashboardRestricted,
  type ServiceBillingSettings,
} from "@/lib/billing-policy";

const protectedRoutes = [
  "/super-admin",
  "/admin",
  "/instructor",
  "/student",
  "/courses",
  "/billing",
];
const authRoutes = ["/login", "/register"];

const DASHBOARD_MAP: Record<string, string> = {
  admin: "/admin",
  instructor: "/instructor",
  student: "/student",
};

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Security headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-XSS-Protection", "1; mode=block");

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
  const user = claimsData?.claims?.sub ? { id: claimsData.claims.sub } : null;

  const { pathname } = request.nextUrl;

  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // Unauthenticated users on protected routes → login
  if (isProtectedRoute && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
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
    (isProtectedRoute && !!user);

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

    // Account pause/ban check — redirect paused users away from protected routes
    if (isPaused && !isAuthRoute) {
      return NextResponse.redirect(new URL("/login?error=account_paused", request.url));
    }
  }

  // Authenticated users on auth routes → their role-specific dashboard
  if (isAuthRoute && user) {
    const dashboard = isSuperAdmin ? "/super-admin" : (DASHBOARD_MAP[role ?? ""] ?? "/student");
    return NextResponse.redirect(new URL(dashboard, request.url));
  }

  // Optimistic route check; the super-admin layout and billing RLS repeat this
  // authorization at the data boundary.
  if (pathname.startsWith("/super-admin") && !isSuperAdmin) {
    const fallback = DASHBOARD_MAP[role ?? ""] ?? "/student";
    return NextResponse.redirect(new URL(fallback, request.url));
  }

  // /admin routes → admin only
  if (pathname.startsWith("/admin") && role !== "admin") {
    const fallback = DASHBOARD_MAP[role ?? ""] ?? "/student";
    return NextResponse.redirect(new URL(fallback, request.url));
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
      return NextResponse.redirect(new URL("/billing", request.url));
    }
  }

  // /instructor routes → admin or instructor
  if (pathname.startsWith("/instructor") && role !== "admin" && role !== "instructor") {
    const fallback = DASHBOARD_MAP[role ?? ""] ?? "/student";
    return NextResponse.redirect(new URL(fallback, request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
