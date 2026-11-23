import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getMfaEnforcement } from "@/lib/mfa-policy";
import { isSessionExpired } from "@/lib/session-policy";
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
  is_super_admin: boolean;
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

const readSession = cache(async () => {
  const supabase = await createClient();

  // getClaims() verifies the JWT signature locally (asymmetric signing keys),
  // avoiding a network round trip to Supabase Auth on every request. With a
  // symmetric (HS256) project key it transparently falls back to getUser().
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (error || !claims?.sub) {
    redirect("/login");
  }

  // Defence in depth behind proxy.ts: never serve a session older than the maximum lifetime.
  if (isSessionExpired(claims)) {
    redirect("/login?error=session_expired");
  }

  return {
    userId: claims.sub,
    email: (claims.email as string | undefined) ?? "",
    /** Authenticator assurance level: "aal1" (Google only) or "aal2" (MFA completed). */
    aal: (claims as { aal?: string }).aal ?? "aal1",
  };
});

/**
 * The authenticated session. When MFA is enforced, a session that has not completed
 * MFA (aal2) is sent to /mfa instead of being returned: this is defence in depth
 * behind proxy.ts for every page and action that goes through the DAL.
 */
export const verifySession = cache(async () => {
  const session = await readSession();

  if (getMfaEnforcement() === "enforce" && session.aal !== "aal2") {
    redirect("/mfa");
  }

  return session;
});

/** Explicit check for privileged code that wants a thrown error rather than a redirect. */
export function assertMfaSatisfied(_role: string | null | undefined, aal: string | undefined): void {
  if (getMfaEnforcement() === "enforce" && aal !== "aal2") {
    throw new Error("Unauthorized. Multi-factor authentication required.");
  }
}

/**
 * Minimal profile for the /mfa screen. Deliberately does NOT enforce MFA (the user is
 * here to complete it); it only needs a valid session.
 */
export const getMfaSessionUser = cache(async () => {
  const session = await readSession();
  const supabase = await createClient();

  const [{ data: profile }, { data: superAdmin }] = await Promise.all([
    supabase.from("users").select("role").eq("id", session.userId).single(),
    supabase.from("super_admins").select("user_id").eq("user_id", session.userId).maybeSingle(),
  ]);

  const role = (profile?.role as UserRole | undefined) ?? "student";
  return {
    id: session.userId,
    email: session.email,
    role,
    isSuperAdmin: role === "admin" && Boolean(superAdmin),
    aal: session.aal,
  };
});

export const getCurrentUser = cache(async (): Promise<SessionUser> => {
  const session = await verifySession();

  const supabase = await createClient();

  const [{ data: profile, error }, { data: superAdmin }] = await Promise.all([
    supabase
      .from("users")
      .select(
        "id, email, full_name, role, avatar_url, onboarding_completed, onboarding_bypassed, is_approved, is_paused, selected_course_id, created_at, updated_at"
      )
      .eq("id", session.userId)
      .single(),
    supabase.from("super_admins").select("user_id").eq("user_id", session.userId).maybeSingle(),
  ]);

  if (error || !profile) {
    redirect("/login");
  }

  return {
    ...profile,
    is_super_admin: profile.role === "admin" && Boolean(superAdmin),
  } as SessionUser;
});

export const getFullUserProfile = cache(async (): Promise<FullUserProfile> => {
  const session = await verifySession();

  const supabase = await createClient();

  const [{ data: profile, error }, { data: superAdmin }] = await Promise.all([
    supabase.from("users").select("*").eq("id", session.userId).single(),
    supabase.from("super_admins").select("user_id").eq("user_id", session.userId).maybeSingle(),
  ]);

  if (error || !profile) {
    redirect("/login");
  }

  return {
    ...profile,
    is_super_admin: profile.role === "admin" && Boolean(superAdmin),
  } as FullUserProfile;
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

  assertMfaSatisfied(profile.role, session.aal);

  return { userId: session.userId, role: profile.role as UserRole };
});

/** Verify the current user has the explicit super-admin capability. */
export const verifySuperAdmin = cache(async (): Promise<{ userId: string; role: "admin" }> => {
  const user = await getCurrentUser();

  if (user.role !== "admin" || !user.is_super_admin) {
    throw new Error("Unauthorized. Super admin access required.");
  }

  assertMfaSatisfied(user.role, (await verifySession()).aal);

  return { userId: user.id, role: "admin" };
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

    if (userRow?.is_paused) {
      return { isPaused: true, blockedAt: "account" };
    }

    // 2. Fetch ALL overrides for this user in one query
    const { data: overrides } = await admin
      .from("student_content_access")
      .select("*")
      .eq("user_id", userId);

    const overrideMap = new Map<string, boolean>();
    for (const o of overrides ?? []) {
      overrideMap.set(`${o.content_type}:${o.content_id}`, o.is_paused);
    }

    // 3. Check course-level (override first, then global)
    const courseOverride = overrideMap.get(`course:${courseId}`);
    const { data: course } = await admin
      .from("courses")
      .select("is_paused, hierarchy_type")
      .eq("id", courseId)
      .single();

    const coursePaused =
      courseOverride !== undefined ? courseOverride : (course?.is_paused ?? false);
    if (coursePaused) {
      return { isPaused: true, blockedAt: "course" };
    }

    // 4. If a lesson is specified, check the full hierarchy
    if (lessonId) {
      // Get the lesson first
      const { data: lesson } = await admin
        .from("lessons")
        .select("is_paused, subject_id")
        .eq("id", lessonId)
        .single();

      if (!lesson) {
        return { isPaused: false, blockedAt: null };
      }

      // Check lesson-level override first (most specific)
      const lessonOverride = overrideMap.get(`lesson:${lessonId}`);
      const lessonPaused =
        lessonOverride !== undefined ? lessonOverride : (lesson?.is_paused ?? false);
      if (lessonPaused) {
        return { isPaused: true, blockedAt: "lesson" };
      }

      // Now check subject level - works for both hierarchy type 1 and 2
      if (lesson.subject_id) {
        // Get the subject to check its hierarchy
        const { data: subject } = await admin
          .from("subjects")
          .select("is_paused, semester_id, course_id")
          .eq("id", lesson.subject_id)
          .single();

        if (subject) {
          // Check subject-level override
          const subjectOverride = overrideMap.get(`subject:${lesson.subject_id}`);
          const subjectPaused =
            subjectOverride !== undefined
              ? subjectOverride
              : (subject?.is_paused ?? false);
          if (subjectPaused) {
            return { isPaused: true, blockedAt: "subject" };
          }

          // For hierarchy type 1, check semester level
          if (subject?.semester_id) {
            const semesterOverride = overrideMap.get(`semester:${subject.semester_id}`);
            const { data: semester } = await admin
              .from("semesters")
              .select("is_paused")
              .eq("id", subject.semester_id)
              .single();

            const semesterPaused =
              semesterOverride !== undefined
                ? semesterOverride
                : (semester?.is_paused ?? false);
            if (semesterPaused) {
              return { isPaused: true, blockedAt: "semester" };
            }
          }
        }
      } else {
        // Hierarchy type 3: Direct lesson under course (no subject)
        // Lesson was already checked above at lesson level
        // No subject/semester to check
      }
    }

    return { isPaused: false, blockedAt: null };
  }
);

/**
 * Check if a subject is paused for a specific student (for subject detail pages)
 */
export const resolveSubjectAccess = cache(
  async (
    userId: string,
    courseId: string,
    subjectId: string
  ): Promise<{ isPaused: boolean; blockedAt: string | null }> => {
    const supabase = await createClient();
    const admin = createAdminClient();

    // 1. Check account-level pause (highest priority)
    const { data: userRow } = await supabase
      .from("users")
      .select("is_paused")
      .eq("id", userId)
      .single();

    if (userRow?.is_paused) {
      return { isPaused: true, blockedAt: "account" };
    }

    // 2. Fetch ALL overrides for this user in one query
    const { data: overrides } = await admin
      .from("student_content_access")
      .select("*")
      .eq("user_id", userId);

    const overrideMap = new Map<string, boolean>();
    for (const o of overrides ?? []) {
      overrideMap.set(`${o.content_type}:${o.content_id}`, o.is_paused);
    }

    // 3. Check course-level (override first, then global)
    const courseOverride = overrideMap.get(`course:${courseId}`);
    const { data: course } = await admin
      .from("courses")
      .select("is_paused, hierarchy_type")
      .eq("id", courseId)
      .single();

    const coursePaused =
      courseOverride !== undefined ? courseOverride : (course?.is_paused ?? false);
    if (coursePaused) {
      return { isPaused: true, blockedAt: "course" };
    }

    // 4. Check subject-level override
    const subjectOverride = overrideMap.get(`subject:${subjectId}`);
    const { data: subject } = await admin
      .from("subjects")
      .select("is_paused, semester_id")
      .eq("id", subjectId)
      .single();

    const subjectPaused =
      subjectOverride !== undefined ? subjectOverride : (subject?.is_paused ?? false);
    if (subjectPaused) {
      return { isPaused: true, blockedAt: "subject" };
    }

    // 5. For hierarchy type 1, check semester level
    if (subject?.semester_id) {
      const semesterOverride = overrideMap.get(`semester:${subject.semester_id}`);
      const { data: semester } = await admin
        .from("semesters")
        .select("is_paused")
        .eq("id", subject.semester_id)
        .single();

      const semesterPaused =
        semesterOverride !== undefined ? semesterOverride : (semester?.is_paused ?? false);
      if (semesterPaused) {
        return { isPaused: true, blockedAt: "semester" };
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
      if (result.blockedAt === "course" || result.blockedAt === "account") {
        redirect("/student/courses");
      }
      redirect(`/student/courses/${courseId}`);
    }
  }
);

/**
 * Resolve the course a lesson belongs to. Lessons may hang directly off a
 * course, or off a subject (which belongs to a course or to a semester).
 * Uses the service-role client, so callers MUST authorize the user separately
 * (see canAccessLesson).
 */
export const resolveLessonCourseId = cache(async (lessonId: string): Promise<string | null> => {
  const admin = createAdminClient();

  const { data: lesson } = await admin
    .from("lessons")
    .select("course_id, subject_id")
    .eq("id", lessonId)
    .maybeSingle();
  if (!lesson) return null;
  if (lesson.course_id) return lesson.course_id as string;
  if (!lesson.subject_id) return null;

  const { data: subject } = await admin
    .from("subjects")
    .select("course_id, semester_id")
    .eq("id", lesson.subject_id)
    .maybeSingle();
  if (subject?.course_id) return subject.course_id as string;
  if (!subject?.semester_id) return null;

  const { data: semester } = await admin
    .from("semesters")
    .select("course_id")
    .eq("id", subject.semester_id)
    .maybeSingle();
  return (semester?.course_id as string | undefined) ?? null;
});

/**
 * Whether a user may see a lesson's interactive content (comments, quizzes):
 * admins/instructors always, students only when enrolled in the lesson's course.
 * Fails closed when the lesson or its course cannot be resolved.
 */
export const canAccessLesson = cache(async (userId: string, lessonId: string): Promise<boolean> => {
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("users")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) return false;
  if (profile.role === "admin" || profile.role === "instructor") return true;

  const courseId = await resolveLessonCourseId(lessonId);
  if (!courseId) return false;

  const { data: enrollment } = await admin
    .from("enrollments")
    .select("id")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();
  return !!enrollment;
});
