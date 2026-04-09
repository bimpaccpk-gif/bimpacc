import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  // Extract device fingerprints from URL params
  const deviceFingerprint = searchParams.get("df") || null;
  const hardwareFingerprint = searchParams.get("hf") || null;
  const deviceComponentsStr = searchParams.get("dc") || null;

  const supabase = await createClient();

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=google_auth_failed", request.url)
    );
  }

  const { error: authError } = await supabase.auth.exchangeCodeForSession(code);
  if (authError) {
    return NextResponse.redirect(
      new URL("/login?error=google_auth_failed", request.url)
    );
  }

  // Get the newly authenticated user
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return NextResponse.redirect(
      new URL("/login?error=google_auth_failed", request.url)
    );
  }

  const admin = createAdminClient();
  const googleAuthId = session.user.id;
  const email = session.user.email?.toLowerCase();
  const googleName =
    session.user.user_metadata?.full_name ||
    session.user.user_metadata?.name ||
    (email?.split("@")[0] ?? "Google User");
  const avatarUrl = session.user.user_metadata?.avatar_url ?? null;

  // Parse device components
  let deviceComponents: any = null;
  try {
    if (deviceComponentsStr) {
      deviceComponents = JSON.parse(deviceComponentsStr);
    }
  } catch {
    // Ignore parse errors
  }

  // Step 1: Check if a users row already exists with this auth ID
  const { data: existingUser } = await admin
    .from("users")
    .select("id, role, hardware_fingerprint")
    .eq("id", googleAuthId)
    .single();

  if (existingUser) {
    // User already exists - enforce device lock for students
    if (existingUser.role === "student" && hardwareFingerprint) {
      const storedHardware = existingUser.hardware_fingerprint as string | null;
      
      if (!storedHardware) {
        // First Google login - bind device
        await admin
          .from("users")
          .update({
            device_fingerprint: deviceFingerprint,
            hardware_fingerprint: hardwareFingerprint,
            device_components: deviceComponents,
            device_locked_at: new Date().toISOString(),
          } as never)
          .eq("id", googleAuthId);
      } else if (storedHardware !== hardwareFingerprint) {
        // Device mismatch - block login
        await supabase.auth.signOut();
        return NextResponse.redirect(
          new URL("/login?error=device_mismatch", request.url)
        );
      }
    }
    
    return NextResponse.redirect(new URL(`/${existingUser.role}`, request.url));
  }

  // Step 2: If not found by ID, check if there's a pre-created user with matching email
  if (email) {
    const { data: emailMatch } = await admin
      .from("users")
      .select("id, role")
      .eq("email", email)
      .single();

    if (emailMatch) {
      // Found pre-created user — update their ID to match the Google Auth UID
      await admin
        .from("users")
        .update({ 
          id: googleAuthId, 
          avatar_url: avatarUrl,
          device_fingerprint: deviceFingerprint,
          hardware_fingerprint: hardwareFingerprint,
          device_components: deviceComponents,
          device_locked_at: new Date().toISOString(),
        })
        .eq("id", emailMatch.id);

      return NextResponse.redirect(new URL(`/${emailMatch.role}`, request.url));
    }
  }

  // Step 3: No pre-existing user — create a new student user
  await admin.from("users").insert({
    id: googleAuthId,
    email: email,
    full_name: googleName,
    avatar_url: avatarUrl,
    role: "student",
    is_approved: false,
    is_paused: false,
    onboarding_completed: false,
    onboarding_bypassed: false,
    device_fingerprint: deviceFingerprint,
    hardware_fingerprint: hardwareFingerprint,
    device_components: deviceComponents,
    device_locked_at: new Date().toISOString(),
  });

  return NextResponse.redirect(new URL("/student", request.url));
}
