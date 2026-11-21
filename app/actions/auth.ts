"use server";

import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { isFingerprintFresh } from "@/lib/fingerprint-utils";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/client-ip";
import type { UserRole, DeviceComponents } from "@/types";


/** Messages returned to the browser. Deliberately identical for unknown email and wrong password. */
const GENERIC_SIGN_IN_ERROR = "Invalid email or password.";
const GENERIC_SIGN_UP_ERROR =
  "We couldn't create your account. If you already have one, try signing in instead.";

const MAX_EMAIL_LENGTH = 254;
const MAX_PASSWORD_LENGTH = 1024;
const MAX_USER_AGENT_LENGTH = 512;
const MAX_COMPONENTS_JSON_LENGTH = 8192;

/** Bound untrusted strings before they are stored (login_history is written with the service role). */
function clip(value: string | null | undefined, max: number): string | null {
  if (value == null) return null;
  return value.slice(0, max);
}

export async function signIn(
  _prevState: { error: string } | undefined,
  formData: FormData
): Promise<{ error: string }> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  if (email.length > MAX_EMAIL_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    return { error: GENERIC_SIGN_IN_ERROR };
  }

  // Rate limit per email (5 attempts / 15 min) AND per IP (30 / 15 min), so one
  // address cannot spray many accounts and one account cannot be hammered from many IPs.
  const ip = await getClientIp();
  const [emailLimit, ipLimit] = await Promise.all([
    rateLimit(`signin:${email.toLowerCase()}`, 5, 15 * 60 * 1000),
    rateLimit(`signin-ip:${ip}`, 30, 15 * 60 * 1000),
  ]);
  const limit = !emailLimit.allowed ? emailLimit : ipLimit;
  if (!limit.allowed) {
    const mins = Math.max(1, Math.ceil((limit.retryAfterMs ?? 60_000) / 60000));
    return { error: `Too many login attempts. Please try again in ${mins} minute(s).` };
  }

  const rawDeviceFingerprint = formData.get("device_fingerprint") as string | null;
  const rawHardwareFingerprint = formData.get("hardware_fingerprint") as string | null;
  const componentsJson = formData.get("device_components") as string | null;
  const generatedAtStr = formData.get("generated_at") as string | null;

  let deviceFingerprint: string | null = null;
  let hardwareFingerprint: string | null = null;
  let components: DeviceComponents | null = null;

  // Fingerprint capture is best-effort while device-lock enforcement is disabled.
  if (rawDeviceFingerprint && rawHardwareFingerprint && generatedAtStr) {
    const generatedAt = parseInt(generatedAtStr, 10);
    if (!isNaN(generatedAt) && isFingerprintFresh(generatedAt)) {
      deviceFingerprint = rawDeviceFingerprint;
      hardwareFingerprint = rawHardwareFingerprint;

      try {
        if (componentsJson && componentsJson.length <= MAX_COMPONENTS_JSON_LENGTH) {
          components = JSON.parse(componentsJson);
        }
      } catch {
        // Components are optional for backwards compatibility
      }
    }
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Log failed login (credentials)
    await admin.from("login_history").insert({
      user_id: null,
      email: clip(email, MAX_EMAIL_LENGTH),
      status: "failed_credentials",
      device_fingerprint: deviceFingerprint,
      hardware_fingerprint: hardwareFingerprint,
      device_components: components,
      user_agent: clip(formData.get("user_agent") as string | null, MAX_USER_AGENT_LENGTH),
    });
    // Never echo Supabase's message: it can distinguish unknown email / unconfirmed / wrong password.
    return { error: GENERIC_SIGN_IN_ERROR };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    await admin.from("login_history").insert({
      user_id: null,
      email: clip(email, MAX_EMAIL_LENGTH),
      status: "failed_credentials",
      device_fingerprint: deviceFingerprint,
      hardware_fingerprint: hardwareFingerprint,
      device_components: components,
      user_agent: clip(formData.get("user_agent") as string | null, MAX_USER_AGENT_LENGTH),
    });
    return { error: "Authentication failed." };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role, device_fingerprint, hardware_fingerprint, device_components, is_locked")
    .eq("id", user.id)
    .single();

  if (profile?.is_locked) {
    await supabase.auth.signOut();
    return { error: "Account locked due to security policy violation. Contact admin." };
  }

  const role = (profile?.role as UserRole) ?? "student";

  if (role === "student" && deviceFingerprint && hardwareFingerprint) {
    // Service-role write: users cannot change their own fingerprint columns (RLS trigger).
    await admin
      .from("users")
      .update({
        device_fingerprint: deviceFingerprint,
        hardware_fingerprint: hardwareFingerprint,
        device_components: components,
      } as never)
      .eq("id", user.id);
  }

  // Log successful login
  await admin.from("login_history").insert({
    user_id: user.id,
    email: clip(email, MAX_EMAIL_LENGTH) ?? "",
    status: "success",
    device_fingerprint: deviceFingerprint,
    hardware_fingerprint: hardwareFingerprint,
    device_components: components,
    user_agent: clip(formData.get("user_agent") as string | null, MAX_USER_AGENT_LENGTH),
  });

  if (role === "admin") {
    const { data: capability } = await supabase
      .from("super_admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (capability) redirect("/super-admin");
  }

  redirect(`/${role}`);
}

export async function signUp(
  _prevState: { error: string } | undefined,
  formData: FormData
): Promise<{ error: string }> {
  const fullName = formData.get("fullName") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;
  const courseId = formData.get("courseId") as string;

  if (!fullName || !email || !password) {
    return { error: "All fields are required." };
  }

  if (
    email.length > MAX_EMAIL_LENGTH ||
    password.length > MAX_PASSWORD_LENGTH ||
    fullName.length > 100
  ) {
    return { error: "Please check the details you entered." };
  }

  // Rate limit registrations per email (2 / 30 min) and per IP (5 / hour).
  // Fail closed: if we cannot count, refuse rather than allow unlimited account creation.
  const ip = await getClientIp();
  const [emailLimit, ipLimit] = await Promise.all([
    rateLimit(`signup:${email.toLowerCase()}`, 2, 30 * 60 * 1000, { failClosed: true }),
    rateLimit(`signup-ip:${ip}`, 5, 60 * 60 * 1000, { failClosed: true }),
  ]);
  if (!emailLimit.allowed || !ipLimit.allowed) {
    return { error: "Too many registration attempts. Please try again later." };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const allowedDomains = ["gmail.com"];
  const emailDomain = email.split("@")[1]?.toLowerCase();

  if (!emailDomain || !allowedDomains.includes(emailDomain)) {
    return {
      error: "Only Gmail emails are allowed for registration.",
    };
  }

  // Validate courseId format if provided (should be UUID)
  if (
    courseId &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(courseId)
  ) {
    return { error: "Invalid course selection." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: "student",
      },
    },
  });

  if (error) {
    // Generic: "User already registered" would reveal which emails have accounts.
    console.error("[signUp] failed:", error.message);
    return { error: GENERIC_SIGN_UP_ERROR };
  }

  if (data.user) {
    await supabase.from("users").upsert(
      {
        id: data.user.id,
        email,
        full_name: fullName,
        role: "student",
        selected_course_id: courseId || null,
      } as never,
      { onConflict: "id" }
    );
  }

  redirect("/student");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function signInWithGoogle(
  deviceFingerprint?: string | null,
  hardwareFingerprint?: string | null,
  deviceComponents?: string | null
) {
  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const redirectUrl = new URL("/auth/callback", origin);

  if (deviceFingerprint) {
    redirectUrl.searchParams.set("df", deviceFingerprint);
  }
  if (hardwareFingerprint) {
    redirectUrl.searchParams.set("hf", hardwareFingerprint);
  }
  if (deviceComponents) {
    redirectUrl.searchParams.set("dc", deviceComponents);
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectUrl.toString(),
    },
  });

  if (error) {
    redirect(`/login?error=google_auth_failed`);
  }

  if (data.url) {
    redirect(data.url);
  }
}

export async function reportScreenRecordingViolation() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Update user to locked
  await admin.from("users").update({ is_locked: true }).eq("id", user.id);

  // Insert history
  await admin.from("login_history").insert({
    user_id: user.id,
    email: user.email || "",
    status: "failed_screen_record",
    device_fingerprint: null,
    hardware_fingerprint: null,
    user_agent: "Screen Protection System",
  });

  // Sign out
  await supabase.auth.signOut();

  return { success: true };
}
