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
  onboarding_bypassed: boolean;
  is_approved: boolean;
  selected_course_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface FullUserProfile extends SessionUser {
  father_name: string | null;
  cnic_file_path: string | null;
  dob: string | null;
  education_level: string | null;
  degree_title: string | null;
  degree_file_path: string | null;
  profession: string | null;
  whatsapp_number: string | null;
  postal_address: string | null;
  fee_transaction_id: string | null;
  fee_submission_date: string | null;
  fee_receipt_file_path: string | null;
  avatar_file_path: string | null;
  declaration_accepted: boolean | null;
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
    .select("id, email, full_name, role, avatar_url, onboarding_completed, onboarding_bypassed, is_approved, selected_course_id, created_at, updated_at")
    .eq("id", session.userId)
    .single();

  if (error || !profile) {
    redirect("/login");
  }

  return profile as SessionUser;
});

export const getFullUserProfile = cache(async (): Promise<FullUserProfile> => {
  const session = await verifySession();

  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", session.userId)
    .single();

  if (error || !profile) {
    redirect("/login");
  }

  return profile as FullUserProfile;
});

/**
 * Check if a user is enrolled in a specific course
 * This is a server-side utility function for enrollment verification
 * @param userId - The user ID to check
 * @param courseId - The course ID to check enrollment for
 * @returns Promise<boolean> - true if enrolled, false otherwise
 */
export const checkEnrollment = cache(async (userId: string, courseId: string): Promise<boolean> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("enrollments")
    .select("id")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .single();

  return !error && !!data;
});

/**
 * Verify that a user is enrolled in a course, redirect if not
 * This enforces the strict access control rule
 * @param userId - The user ID to check
 * @param courseId - The course ID to check enrollment for
 * @param redirectTo - Where to redirect if not enrolled (default: /student/courses)
 */
export const verifyEnrollment = cache(async (
  userId: string,
  courseId: string,
  redirectTo: string = "/student/courses"
): Promise<void> => {
  const isEnrolled = await checkEnrollment(userId, courseId);
  
  if (!isEnrolled) {
    redirect(redirectTo);
  }
});

