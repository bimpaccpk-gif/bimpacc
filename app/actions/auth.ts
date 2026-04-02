"use server";

import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types";

export async function signIn(
  _prevState: { error: string } | undefined,
  formData: FormData
): Promise<{ error: string }> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const deviceFingerprint = formData.get("device_fingerprint") as string | null;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  if (!deviceFingerprint) {
    return {
      error: "Device verification failed. Please refresh the page and try again.",
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
    await (admin as any).from("login_history").insert({
      user_id: null,
      email,
      status: "failed_credentials",
      device_fingerprint: deviceFingerprint,
      user_agent: formData.get("user_agent") as string | null,
    });
    return { error: error.message };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    await (admin as any).from("login_history").insert({
      user_id: null,
      email,
      status: "failed_credentials",
      device_fingerprint: deviceFingerprint,
      user_agent: formData.get("user_agent") as string | null,
    });
    return { error: "Authentication failed." };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role, device_fingerprint")
    .eq("id", user.id)
    .single();

  const role = (profile?.role as UserRole) ?? "student";

  // Device lock enforcement — students only
  if (role === "student") {
    const storedFingerprint = profile?.device_fingerprint as string | null;

    if (!storedFingerprint) {
      // First login — bind this device
      await supabase
        .from("users")
        .update({
          device_fingerprint: deviceFingerprint,
          device_locked_at: new Date().toISOString(),
        })
        .eq("id", user.id);
    } else if (storedFingerprint !== deviceFingerprint) {
      // Device mismatch — sign out and reject
      await supabase.auth.signOut();
      await (admin as any).from("login_history").insert({
        user_id: user.id,
        email,
        status: "failed_device",
        device_fingerprint: deviceFingerprint,
        user_agent: formData.get("user_agent") as string | null,
      });
      return {
        error:
          "This account is locked to a different device. Contact admin to reset your device lock.",
      };
    }
  }

  // Log successful login
  await (admin as any).from("login_history").insert({
    user_id: user.id,
    email,
    status: "success",
    device_fingerprint: deviceFingerprint,
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
