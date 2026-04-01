import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
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
  is_paused: boolean;
  selected_course_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface FullUserProfile extends SessionUser {
  father_name: string | null;
  cnic_number: string | null;
  cnic_file_path: string | null;
  dob: string | null;
  bank_name: string | null;
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
    .select(
      "id, email, full_name, role, avatar_url, onboarding_completed, onboarding_bypassed, is_approved, is_paused, selected_course_id, created_at, updated_at"
    )
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
export const verifyEnrollment = cache(
  async (
    userId: string,
    courseId: string,
    redirectTo: string = "/student/courses"
  ): Promise<void> => {
    const isEnrolled = await checkEnrollment(userId, courseId);

    if (!isEnrolled) {
      redirect(redirectTo);
    }
  }
);

/**
 * Verify that the current user is an admin, throw error if not
 * Use this in server actions that require admin access
 */
export const verifyAdmin = cache(async (): Promise<{ userId: string; role: UserRole }> => {
  const session = await verifySession();
  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from("users")
    .select("role")
    .eq("id", session.userId)
    .single();

  if (error || !profile || profile.role !== "admin") {
    throw new Error("Unauthorized. Admin access required.");
  }

  return { userId: session.userId, role: profile.role as UserRole };
});

/**
 * Verify that the current user's account is not paused/banned
 * Redirects to login with error message if paused
 */
export const verifyNotPaused = cache(async (): Promise<void> => {
  const user = await getCurrentUser();
  if (user.is_paused) {
    redirect("/login?error=account_paused");
  }
});

/**
 * Check if content is paused for a specific student.
 * Priority: per-student override > global is_paused.
 * Also checks parent-level overrides/cascades.
 * Returns { isPaused: boolean, blockedAt: string|null }
 */
export const resolveContentAccess = cache(
  async (
    userId: string,
    courseId: string,
    lessonId?: string
  ): Promise<{ isPaused: boolean; blockedAt: string | null }> => {
    const supabase = await createClient();
    const admin = createAdminClient();

    // 1. Check account-level pause (highest priority)
    const { data: userRow } = await supabase
      .from("users")
      .select("is_paused")
      .eq("id", userId)
      .single();

    if ((userRow as any)?.is_paused) {
      return { isPaused: true, blockedAt: "account" };
    }

    // 2. Fetch all overrides for this user in one query
    const { data: overrides } = await admin
      .from("student_content_access")
      .select("*")
      .eq("user_id", userId);

    const overrideMap = new Map<string, boolean>();
    for (const o of (overrides as any[]) ?? []) {
      overrideMap.set(`${o.content_type}:${o.content_id}`, o.is_paused);
    }

    // 3. Check course-level (override first, then global)
    const courseOverride = overrideMap.get(`course:${courseId}`);
    const { data: course } = await admin
      .from("courses")
      .select("is_paused")
      .eq("id", courseId)
      .single();

    const coursePaused =
      courseOverride !== undefined ? courseOverride : ((course as any)?.is_paused ?? false);
    if (coursePaused) {
      return { isPaused: true, blockedAt: "course" };
    }

    // 4. If a lesson is specified, check subject and lesson levels
    if (lessonId) {
      const { data: lesson } = await admin
        .from("lessons")
        .select("is_paused, subject_id")
        .eq("id", lessonId)
        .single();

      if (lesson?.subject_id) {
        const subjectOverride = overrideMap.get(`subject:${lesson.subject_id}`);
        const { data: subject } = await admin
          .from("subjects")
          .select("is_paused")
          .eq("id", lesson.subject_id)
          .single();

        const subjectPaused =
          subjectOverride !== undefined ? subjectOverride : ((subject as any)?.is_paused ?? false);
        if (subjectPaused) {
          return { isPaused: true, blockedAt: "subject" };
        }
      }

      const lessonOverride = overrideMap.get(`lesson:${lessonId}`);
      const lessonPaused =
        lessonOverride !== undefined ? lessonOverride : ((lesson as any)?.is_paused ?? false);
      if (lessonPaused) {
        return { isPaused: true, blockedAt: "lesson" };
      }
    }

    return { isPaused: false, blockedAt: null };
  }
);

/**
 * Verify that course/subject/lesson content is not paused for the user
 * Redirects to the course page or course list if any level is paused
 */
export const verifyContentNotPaused = cache(
  async (courseId: string, lessonId: string): Promise<void> => {
    const session = await verifySession();
    const result = await resolveContentAccess(session.userId, courseId, lessonId);

    if (result.isPaused) {
      if (result.blockedAt === "course") {
        redirect("/student/courses");
      }
      redirect(`/student/courses/${courseId}`);
    }
  }
);
