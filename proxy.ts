import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const protectedRoutes = ["/admin", "/instructor", "/student", "/courses"];
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );
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
    pathname.startsWith("/admin") ||
    pathname.startsWith("/instructor") ||
    (isProtectedRoute && !!user);

  let role: string | null = null;
  let isPaused = false;

  if (needsRoleCheck) {
    const { data: profile } = await supabase
      .from("users")
      .select("role, is_paused")
      .eq("id", user!.id)
      .single();

    role = profile?.role ?? null;
    isPaused = profile?.is_paused ?? false;

    // Account pause/ban check — redirect paused users away from protected routes
    if (isPaused && !isAuthRoute) {
      return NextResponse.redirect(new URL("/login?error=account_paused", request.url));
    }
  }

  // Authenticated users on auth routes → their role-specific dashboard
  if (isAuthRoute && user) {
    const dashboard = DASHBOARD_MAP[role ?? ""] ?? "/student";
    return NextResponse.redirect(new URL(dashboard, request.url));
  }

  // /admin routes → admin only
  if (pathname.startsWith("/admin") && role !== "admin") {
    const fallback = DASHBOARD_MAP[role ?? ""] ?? "/student";
    return NextResponse.redirect(new URL(fallback, request.url));
  }

  // /instructor routes → admin or instructor
  if (
    pathname.startsWith("/instructor") &&
    role !== "admin" &&
    role !== "instructor"
  ) {
    const fallback = DASHBOARD_MAP[role ?? ""] ?? "/student";
    return NextResponse.redirect(new URL(fallback, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
