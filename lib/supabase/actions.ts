"use server";

import { verifySession } from "@/lib/dal";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types";

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export async function createUserProfile(
  userId: string,
  email: string,
  fullName: string,
  role: UserRole = "student"
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("users")
    .insert({
      id: userId,
      email,
      full_name: fullName,
      role,
    } as never)
    .select()
    .single();

  if (error) {
    console.error("Error creating user profile:", error);
    throw new Error(error.message);
  }

  return data as UserProfile;
}

export async function adminChangeUserRole(
  _prevState: { error: string; success: string } | undefined,
  formData: FormData
): Promise<{ error: string; success: string }> {
  const userId = formData.get("userId") as string;
  const role = formData.get("role") as UserRole;

  if (!userId || !role) {
    return { error: "User ID and role are required.", success: "" };
  }

  if (!["admin", "instructor", "student"].includes(role)) {
    return { error: "Invalid role.", success: "" };
  }

  const session = await verifySession();

  if (session.userId === userId) {
    return { error: "You cannot change your own role.", success: "" };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("users")
    .update({ role } as never)
    .eq("id", userId);

  if (error) {
    return { error: error.message, success: "" };
  }

  return { error: "", success: `Role updated to ${role}.` };
}

export async function adminCreateUser(
  _prevState: { error: string; success: string } | undefined,
  formData: FormData
): Promise<{ error: string; success: string }> {
  await verifySession();

  const fullName = (formData.get("fullName") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const password = (formData.get("password") as string) ?? "";
  const role = (formData.get("role") as UserRole) ?? "student";

  if (!fullName || !email || !password) {
    return { error: "All fields are required.", success: "" };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters.", success: "" };
  }

  if (!["admin", "instructor", "student"].includes(role)) {
    return { error: "Invalid role.", success: "" };
  }

  const supabase = await createClient();

  const { data, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role,
      },
    },
  });

  if (signUpError) {
    return { error: signUpError.message, success: "" };
  }

  if (data.user) {
    await supabase.from("users").upsert(
      {
        id: data.user.id,
        email,
        full_name: fullName,
        role,
      } as never,
      { onConflict: "id" }
    );
  }

  return {
    error: "",
    success: `Account created for ${fullName} (${role}).`,
  };
}

export async function adminDeleteUser(
  _prevState: { error: string; success: string } | undefined,
  formData: FormData
): Promise<{ error: string; success: string }> {
  const userId = formData.get("userId") as string;

  if (!userId) {
    return { error: "User ID is required.", success: "" };
  }

  const session = await verifySession();

  if (session.userId === userId) {
    return { error: "You cannot delete your own account.", success: "" };
  }

  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("users")
    .select("full_name")
    .eq("id", userId)
    .single();

  const { error: dbError } = await supabase
    .from("users")
    .delete()
    .eq("id", userId);

  if (dbError) {
    return { error: dbError.message, success: "" };
  }

  const admin = createAdminClient();
  const { error: authError } = await admin.auth.admin.deleteUser(userId);

  if (authError) {
    console.error("Error deleting auth user:", authError.message);
  }

  return {
    error: "",
    success: `User "${(profile as any)?.full_name ?? userId}" deleted from database and auth.`,
  };
}

export async function updateUserProfile(
  updates: { full_name?: string; avatar_url?: string }
) {
  const session = await verifySession();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("users")
    .update(updates as never)
    .eq("id", session.userId)
    .select()
    .single();

  if (error) {
    console.error("Error updating user profile:", error);
    throw new Error(error.message);
  }

  return data as UserProfile;
}
