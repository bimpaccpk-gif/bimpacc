"use server";

import { verifySession } from "@/lib/dal";
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

export async function getUserProfile(
  userId: string
): Promise<UserProfile | null> {
  await verifySession();

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
