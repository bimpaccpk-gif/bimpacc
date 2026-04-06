"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { verifySession, verifyAdmin, getCurrentUser } from "@/lib/dal";
import {
  importAttendanceSchema,
  markAttendanceSchema,
  deleteAttendanceSchema,
} from "@/lib/validations";
import { revalidatePath } from "next/cache";
import Papa from "papaparse";
import type { AttendanceStatus, CourseAttendanceDetail } from "@/types";

// ─── Helpers ──────────────────────────────────────────────────

type AdminOrInstructor = { userId: string; role: string };

async function verifyAdminOrInstructor(): Promise<AdminOrInstructor> {
  const { userId } = await verifySession();
  const supabase = await createClient();
  const { data: profile } = await supabase.from("users").select("role").eq("id", userId).single();
  if (!profile || (profile.role !== "admin" && profile.role !== "instructor")) {
    throw new Error("Unauthorized. Admin or Instructor access required.");
  }
  return { userId, role: profile.role as string };
}

async function verifyAttendanceAccess(courseId: string): Promise<{ userId: string; role: string }> {
  const { userId, role } = await verifyAdminOrInstructor();
  if (role === "admin") return { userId, role };

  const supabase = await createClient();
  const { data: course } = await supabase
    .from("courses")
    .select("instructor_id")
    .eq("id", courseId)
    .single();

  if (!course || course.instructor_id !== userId) {
    throw new Error("Unauthorized. You do not have access to this course.");
  }

  return { userId, role };
}

// ─── Attendance Actions ────────────────────────────────────────

/**
 * Fetch all enrolled students for a course with their attendance record
 * for a specific session date (if exists).
 */
export async function getCourseAttendance(
  courseId: string,
  sessionDate: string
): Promise<CourseAttendanceDetail[]> {
  await verifyAttendanceAccess(courseId);
  const admin = await createAdminClient();

  // Get all enrolled students
  const { data: enrollments, error: enrollError } = await admin
    .from("enrollments")
    .select(
      `
      id,
      user_id,
      users!inner(id, full_name, email)
    `
    )
    .eq("course_id", courseId);

  if (enrollError || !enrollments) {
    console.error("Error fetching enrollments:", enrollError);
    return [];
  }

  // Get attendance records for the session date
  const enrollmentIds = enrollments.map((e: any) => e.id);
  const { data: records } = await admin
    .from("attendance_records")
    .select("*")
    .eq("session_date", sessionDate)
    .in("enrollment_id", enrollmentIds);

  const recordMap = new Map<string, any>();
  for (const r of records ?? []) {
    recordMap.set(r.enrollment_id, r);
  }

  const result: CourseAttendanceDetail[] = enrollments.map((e: any) => {
    const record = recordMap.get(e.id);
    return {
      id: record?.id ?? "",
      enrollment_id: e.id,
      session_date: sessionDate,
      status: record?.status ?? "absent",
      watch_time_minutes: record?.watch_time_minutes ?? null,
      session_duration_minutes: record?.session_duration_minutes ?? null,
      source: record?.source ?? "manual",
      marked_by: record?.marked_by ?? null,
      created_at: record?.created_at ?? new Date().toISOString(),
      updated_at: record?.updated_at ?? new Date().toISOString(),
      student_name: (e.users as any)?.full_name ?? "Unknown",
      student_email: (e.users as any)?.email ?? "Unknown",
    };
  });

  return result;
}

/**
 * Get all session dates that have attendance records for a course.
 */
export async function getAttendanceSessionDates(
  courseId: string
): Promise<{ session_date: string; present_count: number; total_count: number; percentage: number }[]> {
  await verifyAttendanceAccess(courseId);
  const admin = await createAdminClient();

  // Get enrollment IDs first
  const { data: enrollmentIds, error: enrollErr } = await admin
    .from("enrollments")
    .select("id")
    .eq("course_id", courseId);
  if (enrollErr || !enrollmentIds || enrollmentIds.length === 0) return [];

  const { data: records, error } = await admin
    .from("attendance_records")
    .select("session_date, status")
    .in(
      "enrollment_id",
      enrollmentIds.map((e: any) => e.id)
    )
    .order("session_date", { ascending: false });

  if (error || !records) return [];

  // Group by date
  const dateMap = new Map<string, { present: number; total: number }>();
  for (const r of records) {
    if (!dateMap.has(r.session_date)) {
      dateMap.set(r.session_date, { present: 0, total: 0 });
    }
    const entry = dateMap.get(r.session_date)!;
    entry.total++;
    if (r.status === "present" || r.status === "late") {
      entry.present++;
    }
  }

  return Array.from(dateMap.entries())
    .map(([date, stats]) => ({
      session_date: date,
      present_count: stats.present,
      total_count: stats.total,
      percentage: Math.round((stats.present / stats.total) * 100),
    }))
    .sort((a, b) => b.session_date.localeCompare(a.session_date));
}

/**
 * Import attendance from a Zoom-style CSV.
 * Matches students by email, then by name.
 * Marks present if watch_time >= 80% of session_duration, else absent.
 */
export async function importAttendanceCSV(
  courseId: string,
  sessionDate: string,
  sessionDuration: number,
  csvContent: string
): Promise<{
  error?: string;
  presentCount?: number;
  absentCount?: number;
  unmatched?: { name: string; email: string }[];
}> {
  const { userId } = await verifyAdminOrInstructor();
  const admin = await createAdminClient();

  const validated = importAttendanceSchema.safeParse({
    courseId,
    sessionDate,
    sessionDuration,
    csvContent,
  });

  if (!validated.success) {
    return { error: validated.error.errors[0]?.message ?? "Validation failed" };
  }

  // Parse CSV
  const parseResult = Papa.parse<{
    Name?: string;
    name?: string;
    Email?: string;
    email?: string;
    Duration?: string;
    duration?: string;
    "Duration (Minutes)"?: string;
    "Watch Time (Minutes)"?: string;
    "Watch Time"?: string;
    [key: string]: string | undefined;
  }>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim(),
  });

  if (parseResult.errors.length > 0 && parseResult.data.length === 0) {
    return { error: "Failed to parse CSV. Please check the format." };
  }

  const rows = parseResult.data;
  if (rows.length === 0) {
    return { error: "CSV has no data rows." };
  }

  // Get all enrolled students for this course
  const { data: enrollments } = await admin
    .from("enrollments")
    .select(
      `
      id,
      users!inner(id, email, full_name)
    `
    )
    .eq("course_id", courseId);

  if (!enrollments) {
    return { error: "No enrollments found for this course." };
  }

  let presentCount = 0;
  let absentCount = 0;
  const unmatched: { name: string; email: string }[] = [];
  const threshold = sessionDuration * 0.8;

  for (const row of rows) {
    const name = (row.Name ?? row.name ?? "").trim();
    const email = (row.Email ?? row.email ?? "").trim().toLowerCase();
    const durationStr =
      row.Duration ??
      row.duration ??
      row["Duration (Minutes)"] ??
      row["Watch Time (Minutes)"] ??
      row["Watch Time"] ??
      "";
    const watchTime = parseFloat(durationStr) || 0;

    // Try email match first
    let matchedEnrollment: string | null = null;
    if (email) {
      const found = enrollments.find(
        (e: any) => (e.users as any).email.toLowerCase() === email
      );
      if (found) matchedEnrollment = found.id;
    }

    // Fallback to name match (contains)
    if (!matchedEnrollment && name) {
      const found = enrollments.find((e: any) =>
        normalizeName((e.users as any).full_name).includes(normalizeName(name))
      );
      if (found) matchedEnrollment = found.id;
    }

    if (!matchedEnrollment) {
      unmatched.push({ name, email });
      continue;
    }

    const status: AttendanceStatus = watchTime >= threshold ? "present" : "absent";

    const { error: upsertError } = await admin.from("attendance_records").upsert(
      {
        enrollment_id: matchedEnrollment,
        session_date: sessionDate,
        status,
        watch_time_minutes: watchTime,
        session_duration_minutes: sessionDuration,
        source: "csv",
        marked_by: userId,
      },
      {
        onConflict: "enrollment_id,session_date",
        ignoreDuplicates: false,
      }
    );

    if (upsertError) {
      console.error("Error upserting attendance:", upsertError);
      continue;
    }

    if (status === "present") presentCount++;
    else absentCount++;
  }

  // Revalidate attendance pages
  revalidatePath(`/admin/courses/${courseId}/attendance`);
  revalidatePath(`/instructor/attendance`);

  return { presentCount, absentCount, unmatched };
}

/**
 * Manually mark or override a student's attendance for a session.
 */
export async function markAttendance(
  enrollmentId: string,
  sessionDate: string,
  status: string,
  sessionDuration?: number | null
): Promise<{ error?: string }> {
  const { userId } = await verifyAdminOrInstructor();

  const validated = markAttendanceSchema.safeParse({
    enrollmentId,
    sessionDate,
    status,
    sessionDuration,
  });

  if (!validated.success) {
    return { error: validated.error.errors[0]?.message ?? "Validation failed" };
  }

  // Verify the enrollment exists and get the course_id
  const admin = await createAdminClient();
  const { data: enrollment } = await admin
    .from("enrollments")
    .select("id, course_id")
    .eq("id", enrollmentId)
    .single();

  if (!enrollment) {
    return { error: "Enrollment not found." };
  }

  // Verify access to this course
  try {
    await verifyAttendanceAccess(enrollment.course_id);
  } catch {
    return { error: "Unauthorized." };
  }

  const { error } = await admin.from("attendance_records").upsert(
    {
      enrollment_id: enrollmentId,
      session_date: sessionDate,
      status,
      watch_time_minutes: null,
      session_duration_minutes: sessionDuration ?? null,
      source: "manual",
      marked_by: userId,
    },
    {
      onConflict: "enrollment_id,session_date",
      ignoreDuplicates: false,
    }
  );

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/admin/courses/${enrollment.course_id}/attendance`);
  revalidatePath(`/instructor/attendance`);

  return {};
}

/**
 * Delete a single attendance record.
 */
export async function deleteAttendanceRecord(
  recordId: string
): Promise<{ error?: string }> {
  const { userId } = await verifyAdminOrInstructor();
  const admin = await createAdminClient();

  // Get the record to check course access
  const { data: record } = await admin
    .from("attendance_records")
    .select(
      `
      id,
      enrollment_id,
      enrollments!inner(course_id)
    `
    )
    .eq("id", recordId)
    .single();

  if (!record) {
    return { error: "Record not found." };
  }

  try {
    await verifyAttendanceAccess((record as any).enrollments.course_id);
  } catch {
    return { error: "Unauthorized." };
  }

  const { error } = await admin.from("attendance_records").delete().eq("id", recordId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/admin/courses/${(record as any).enrollments.course_id}/attendance`);
  revalidatePath(`/instructor/attendance`);

  return {};
}

/**
 * Get a student's own attendance grouped by course.
 */
export async function getStudentAttendance(
  userId?: string
): Promise<
  {
    course_id: string;
    course_title: string;
    session_date: string;
    status: string;
    watch_time_minutes: number | null;
    session_duration_minutes: number | null;
  }[]
> {
  if (!userId) {
    const session = await verifySession();
    userId = session.userId;
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("attendance_records")
    .select(
      `
      session_date,
      status,
      watch_time_minutes,
      session_duration_minutes,
      enrollments!inner(
        course_id,
        courses!inner(id, title)
      )
    `
    )
    .eq("enrollments.user_id", userId)
    .order("session_date", { ascending: false });

  if (error || !data) return [];

  return data.map((r: any) => ({
    course_id: r.enrollments.course_id,
    course_title: r.enrollments.courses.title,
    session_date: r.session_date,
    status: r.status,
    watch_time_minutes: r.watch_time_minutes,
    session_duration_minutes: r.session_duration_minutes,
  }));
}

/**
 * Get attendance statistics for a course session.
 */
export async function getAttendanceStats(
  courseId: string,
  sessionDate: string
): Promise<{
  totalEnrolled: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  unmarked: number;
  attendancePercentage: number;
}> {
  await verifyAttendanceAccess(courseId);
  const admin = await createAdminClient();

  // Total enrolled
  const { count: totalEnrolled } = await admin
    .from("enrollments")
    .select("*", { count: "exact", head: true })
    .eq("course_id", courseId);

  // Get enrollment IDs for this course
  const { data: enrollIds } = await admin
    .from("enrollments")
    .select("id")
    .eq("course_id", courseId);

  // Get attendance records for the session
  const { data: records } = await admin
    .from("attendance_records")
    .select("status")
    .in(
      "enrollment_id",
      enrollIds?.map((e: any) => e.id) ?? []
    )
    .eq("session_date", sessionDate);

  const stats = {
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
  };

  for (const r of records ?? []) {
    if (r.status in stats) {
      stats[r.status as keyof typeof stats]++;
    }
  }

  const marked = stats.present + stats.absent + stats.late + stats.excused;
  const unmarked = Math.max(0, (totalEnrolled ?? 0) - marked);
  const attendancePercentage =
    totalEnrolled && totalEnrolled > 0
      ? Math.round(((stats.present + stats.late) / totalEnrolled) * 100)
      : 0;

  return {
    totalEnrolled: totalEnrolled ?? 0,
    ...stats,
    unmarked,
    attendancePercentage,
  };
}

// ─── Utility ──────────────────────────────────────────────────

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
