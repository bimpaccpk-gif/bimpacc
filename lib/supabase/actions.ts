"use server";

import { createClient } from "@/lib/supabase/server";
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

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }

  return data as UserProfile;
}

export async function updateUserProfile(
  userId: string,
  updates: { full_name?: string; avatar_url?: string }
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("users")
    .update(updates as never)
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    console.error("Error updating user profile:", error);
    throw new Error(error.message);
  }

  return data as UserProfile;
}

export async function getCurrentUser() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("Error fetching user profile:", profileError);
    return null;
  }

  return {
    ...(profile as UserProfile),
    auth: user,
  };
}
