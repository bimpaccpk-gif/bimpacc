"use server";

import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  computeSimilarityScore,
  SIMILARITY_THRESHOLD,
  isFingerprintFresh,
} from "@/lib/fingerprint-utils";
import { rateLimit } from "@/lib/rate-limit";
import type { UserRole, DeviceComponents } from "@/types";

export async function signIn(
  _prevState: { error: string } | undefined,
  formData: FormData
): Promise<{ error: string }> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  // Rate limit per email (5 attempts per 15 minutes)
  const limit = rateLimit(`signin:${email.toLowerCase()}`, 5, 15 * 60 * 1000);
  if (!limit.allowed) {
    const mins = Math.ceil(limit.retryAfterMs! / 60000);
    return { error: `Too many login attempts. Please try again in ${mins} minute(s).` };
  }

  const deviceFingerprint = formData.get("device_fingerprint") as string | null;
  const hardwareFingerprint = formData.get("hardware_fingerprint") as string | null;
  const componentsJson = formData.get("device_components") as string | null;
  const generatedAtStr = formData.get("generated_at") as string | null;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  if (!deviceFingerprint || !hardwareFingerprint) {
    return {
      error: "Device verification failed. Please refresh the page and try again.",
    };
  }

  // Parse device components
  let components: DeviceComponents | null = null;
  try {
    if (componentsJson) {
      components = JSON.parse(componentsJson);
    }
  } catch {
    // Components are optional for backwards compatibility
  }

  // Anti-replay: validate fingerprint freshness (required)
  if (!generatedAtStr) {
    return {
      error: "Device verification expired. Please refresh the page and try again.",
    };
  }

  const generatedAt = parseInt(generatedAtStr, 10);
  if (isNaN(generatedAt) || !isFingerprintFresh(generatedAt)) {
    return {
      error: "Device verification expired. Please refresh the page and try again.",
    };
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
      email,
      status: "failed_credentials",
      device_fingerprint: deviceFingerprint,
      hardware_fingerprint: hardwareFingerprint,
      device_components: components,
      user_agent: formData.get("user_agent") as string | null,
    });
    return { error: error.message };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    await admin.from("login_history").insert({
      user_id: null,
      email,
      status: "failed_credentials",
      device_fingerprint: deviceFingerprint,
      hardware_fingerprint: hardwareFingerprint,
      device_components: components,
      user_agent: formData.get("user_agent") as string | null,
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

  // Device lock enforcement — students only
  if (role === "student") {
    const storedHardwareFingerprint = profile?.hardware_fingerprint as string | null;
    const storedDeviceFingerprint = profile?.device_fingerprint as string | null;
    const storedComponents = profile?.device_components as DeviceComponents | null;

    console.log("[Device Auth] Comparing fingerprints:", {
      stored: storedHardwareFingerprint,
      current: hardwareFingerprint,
      exactMatch: storedHardwareFingerprint === hardwareFingerprint,
    });

    if (!storedHardwareFingerprint) {
      // First login — bind this device (store fingerprints + components)
      console.log("[Device Auth] First login, binding device:", hardwareFingerprint);
      await supabase
        .from("users")
        .update({
          device_fingerprint: deviceFingerprint,
          hardware_fingerprint: hardwareFingerprint,
          device_components: components,
          device_locked_at: new Date().toISOString(),
        } as never)
        .eq("id", user.id);
    } else if (storedHardwareFingerprint !== hardwareFingerprint) {
      // Hash mismatch — try fuzzy matching on individual components
      let similarityScore = 0;
      let allowed = false;

      if (storedComponents && components) {
        // Log every signal being compared for debugging
        console.log("[Device Auth] Component comparison:", {
          platform: { stored: storedComponents.platform, current: components.platform, match: storedComponents.platform === components.platform },
          screen: { stored: storedComponents.screenResolution, current: components.screenResolution, match: storedComponents.screenResolution === components.screenResolution },
          colorDepth: { stored: storedComponents.colorDepth, current: components.colorDepth, match: storedComponents.colorDepth === components.colorDepth },
          pixelRatio: { stored: storedComponents.devicePixelRatio, current: components.devicePixelRatio, match: storedComponents.devicePixelRatio === components.devicePixelRatio },
          cores: { stored: storedComponents.hardwareConcurrency, current: components.hardwareConcurrency, match: storedComponents.hardwareConcurrency === components.hardwareConcurrency },
          touch: { stored: storedComponents.maxTouchPoints, current: components.maxTouchPoints, match: storedComponents.maxTouchPoints === components.maxTouchPoints },
          gpuNormalized: { stored: storedComponents.webglRenderer, current: components.webglRenderer },
          gpuRaw: { stored: storedComponents.webglRendererRaw, current: components.webglRendererRaw },
        });

        similarityScore = computeSimilarityScore(storedComponents, components);
        console.log("[Device Auth] Fuzzy match score:", {
          score: similarityScore,
          threshold: SIMILARITY_THRESHOLD,
          pass: similarityScore >= SIMILARITY_THRESHOLD,
        });

        if (similarityScore >= SIMILARITY_THRESHOLD) {
          // Same device, minor change (OS update, driver update, etc.)
          // Update stored fingerprints to the latest values
          allowed = true;
          console.log(
            "[Device Auth] Fuzzy match passed — updating stored fingerprints"
          );
          await supabase
            .from("users")
            .update({
              device_fingerprint: deviceFingerprint,
              hardware_fingerprint: hardwareFingerprint,
              device_components: components,
            } as never)
            .eq("id", user.id);
        }
      }

      if (!allowed) {
        // Device mismatch — block login
        console.log("[Device Auth] Device mismatch — blocking login", {
          similarityScore,
        });
        await supabase.auth.signOut();
        await admin.from("login_history").insert({
          user_id: user.id,
          email,
          status: "failed_device",
          device_fingerprint: deviceFingerprint,
          hardware_fingerprint: hardwareFingerprint,
          device_components: components,
          user_agent: formData.get("user_agent") as string | null,
        });
        return {
          error:
            "This account is locked to a different device. Please use your registered device or contact admin.",
        };
      }
    }
    // If hardware matches but device fingerprint differs → same device, different browser
    // Update the device_fingerprint for audit trail
    else if (storedDeviceFingerprint !== deviceFingerprint) {
      console.log(
        "[Device Auth] Same device, different browser — updating device fingerprint"
      );
      await supabase
        .from("users")
        .update({
          device_fingerprint: deviceFingerprint,
          device_components: components,
        } as never)
        .eq("id", user.id);
    }
  }

  // Log successful login
  await admin.from("login_history").insert({
    user_id: user.id,
    email,
    status: "success",
    device_fingerprint: deviceFingerprint,
    hardware_fingerprint: hardwareFingerprint,
    device_components: components,
    user_agent: formData.get("user_agent") as string | null,
  });

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

  // Rate limit registrations per IP/email (2 per 30 minutes)
  const limit = rateLimit(`signup:${email.toLowerCase()}`, 2, 30 * 60 * 1000);
  if (!limit.allowed) {
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
    return { error: error.message };
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
  deviceFingerprint: string,
  hardwareFingerprint: string,
  deviceComponents: string | null
) {
  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  // Store fingerprints in a temporary cookie that the callback can read
  // Since we can't use cookies directly here, we'll pass them as URL params
  // The callback will extract them from the URL

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?df=${encodeURIComponent(deviceFingerprint)}&hf=${encodeURIComponent(hardwareFingerprint)}&dc=${encodeURIComponent(deviceComponents || "")}`,
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
  
  const { data: { user } } = await supabase.auth.getUser();
  
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
