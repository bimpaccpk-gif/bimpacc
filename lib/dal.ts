import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types";

export interface SessionUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  onboarding_completed: boolean;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

export const verifySession = cache(async () => {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  return { userId: user.id, email: user.email ?? "" };
});

export const getCurrentUser = cache(async (): Promise<SessionUser> => {
  const session = await verifySession();

  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from("users")
    .select("id, email, full_name, role, avatar_url, onboarding_completed, is_approved, created_at, updated_at")
    .eq("id", session.userId)
    .single();

  if (error || !profile) {
    redirect("/login");
  }

  return profile as SessionUser;
});
