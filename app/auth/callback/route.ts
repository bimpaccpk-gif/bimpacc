import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import type { DeviceComponents } from "@/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  // Extract device fingerprints from URL params
  const deviceFingerprint = searchParams.get("df") || null;
  const hardwareFingerprint = searchParams.get("hf") || null;
  const rawCourseId = searchParams.get("course");
  const requestedCourseId = rawCourseId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawCourseId) ? rawCourseId : null;
  const deviceComponentsStr = searchParams.get("dc") || null;

  const supabase = await createClient();

  // Get user-agent from request headers
  const headersList = await headers();
  const userAgent = headersList.get("user-agent") || null;

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=google_auth_failed", request.url));
  }

  const { error: authError } = await supabase.auth.exchangeCodeForSession(code);
  if (authError) {
    return NextResponse.redirect(new URL("/login?error=google_auth_failed", request.url));
  }

  // Get the newly authenticated user
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return NextResponse.redirect(new URL("/login?error=google_auth_failed", request.url));
  }

  const admin = createAdminClient();
  const googleAuthId = session.user.id;
  const email = session.user.email?.toLowerCase();
  const googleName =
    session.user.user_metadata?.full_name ||
    session.user.user_metadata?.name ||
    (email?.split("@")[0] ?? "Google User");
  const avatarUrl = session.user.user_metadata?.avatar_url ?? null;

  const getDashboardPath = async (userId: string, role: string) => {
    if (role !== "admin") return `/${role}`;

    const { data: capability } = await admin
      .from("super_admins")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    return capability ? "/super-admin" : "/admin";
  };

  // Parse device components
  let deviceComponents: DeviceComponents | null = null;
  try {
    if (deviceComponentsStr) {
      deviceComponents = JSON.parse(deviceComponentsStr);
    }
  } catch {
    // Ignore parse errors
  }

  // Helper to log login history
  const logLogin = async (userId: string, status: string) => {
    await admin.from("login_history").insert({
      user_id: userId,
      email: email ?? "",
      status,
      device_fingerprint: deviceFingerprint,
      hardware_fingerprint: hardwareFingerprint,
      device_components: deviceComponents,
      user_agent: userAgent,
    });
  };

  // Step 1: Check if a users row already exists with this auth ID
  const { data: existingUser } = await admin
    .from("users")
    .select("id, role, is_locked")
    .eq("id", googleAuthId)
    .single();

  if (existingUser) {
    if (existingUser.is_locked) {
      await logLogin(googleAuthId, "failed_screen_record"); // Or just keep it failed, maybe reuse a new status. Actually better just log out
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/login?error=account_locked", request.url));
    }

    // Fingerprint capture remains best-effort for audit/login history.
    if (existingUser.role === "student" && hardwareFingerprint) {
      await admin
        .from("users")
        .update({
          device_fingerprint: deviceFingerprint,
          hardware_fingerprint: hardwareFingerprint,
          device_components: deviceComponents,
        } as never)
        .eq("id", googleAuthId);
    }

    // Log successful Google login
    await logLogin(googleAuthId, "success");
    return NextResponse.redirect(
      new URL(await getDashboardPath(googleAuthId, existingUser.role), request.url)
    );
  }

  // Step 2: If not found by ID, check if there's a pre-created user with matching email
  if (email) {
    const { data: emailMatch } = await admin
      .from("users")
      .select("id, role, is_locked")
      .eq("email", email)
      .single();

    if (emailMatch) {
      if (emailMatch.is_locked) {
        await supabase.auth.signOut();
        return NextResponse.redirect(new URL("/login?error=account_locked", request.url));
      }

      // Found pre-created user — update their ID to match the Google Auth UID
      await admin
        .from("users")
        .update({
          id: googleAuthId,
          avatar_url: avatarUrl,
          device_fingerprint: deviceFingerprint,
          hardware_fingerprint: hardwareFingerprint,
          device_components: deviceComponents,
        })
        .eq("id", emailMatch.id);

      // Log successful Google login for pre-created user
      await logLogin(googleAuthId, "success");
      return NextResponse.redirect(
        new URL(await getDashboardPath(googleAuthId, emailMatch.role), request.url)
      );
    }
  }

  // Step 3: No pre-existing user — create a new student user.
  // Only honour the chosen course if it is a course that is open for registration.
  let selectedCourseId: string | null = null;
  if (requestedCourseId) {
    const { data: openCourse } = await admin
      .from("courses")
      .select("id")
      .eq("id", requestedCourseId)
      .eq("registration_open", true)
      .maybeSingle();
    selectedCourseId = openCourse?.id ?? null;
  }

  await admin.from("users").insert({
    id: googleAuthId,
    email: email,
    full_name: googleName,
    avatar_url: avatarUrl,
    role: "student",
    selected_course_id: selectedCourseId,
    is_approved: false,
    is_paused: false,
    onboarding_completed: false,
    onboarding_bypassed: false,
    device_fingerprint: deviceFingerprint,
    hardware_fingerprint: hardwareFingerprint,
    device_components: deviceComponents,
  });

  // Log first Google login for new user
  await logLogin(googleAuthId, "success");
  return NextResponse.redirect(new URL("/student", request.url));
}
