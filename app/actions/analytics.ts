"use server";

import { verifyAdmin } from "@/lib/dal";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types";

/**
 * Admin overview analytics backend.
 *
 * Definitions used throughout (kept honest to what the schema actually records):
 * - Enrollments are counted from `public.enrollments` (`enrolled_at`).
 * - Attendance comes from `public.attendance_records`; a session counts as
 *   attended when status is 'present' or 'late'. Every marked session
 *   ('present' | 'late' | 'absent' | 'excused') counts towards the denominator.
 * - Pending approval mirrors the established rule in app/(dashboard)/admin/users/page.tsx:
 *   role = 'student' AND onboarding_completed AND NOT is_approved.
 * - The completion funnel uses three magnitudes: Enrolled (all enrollments),
 *   Started (any completed lesson or marked attendance — the schema records no
 *   separate "started" event), Completed (every lesson of the course marked complete).
 *
 * Resilience: every aggregation first tries its SECURITY DEFINER RPC
 * (supabase/migrations/038_admin_analytics.sql). If the migration has not been
 * applied yet the call degrades to plain selects + JS-side grouping so the
 * dashboard still renders.
 *
 * Timezones: RPC aggregations bucket by the database timezone; the JS fallback
 * buckets by UTC. Both emit "YYYY-MM" keys, so they only diverge near month
 * boundaries when the database runs in a non-UTC zone.
 */

/** Comparison window for the KPI deltas. Time series always span 12 months. */
export type AnalyticsRange = "7d" | "30d" | "90d" | "12m";

export interface AdminOverviewDelta {
  /** Value recorded during the selected window. */
  current: number;
  /** Value recorded during the equally long window immediately before it. */
  previous: number;
  /**
   * Relative change vs the previous window, percent rounded to 1 decimal.
   * `null` when there is no baseline (previous period had zero activity).
   */
  changePercent: number | null;
  /** Movement between the two windows. */
  direction: "up" | "down" | "flat";
  /** Ready-to-render text for StatTile's delta.value, e.g. "+12%", "-4%", "±0%", "new". */
  label: string;
  /** Whether the movement is desirable. `null` = neutral (flat or no baseline). */
  good: boolean | null;
}

export interface AdminOverviewMonthPoint {
  /** ISO calendar month ("YYYY-MM", UTC). Oldest first; always 12 entries. */
  date: string;
  /** New enrollments created in that month. */
  value: number;
}

export interface AdminOverviewAttendancePoint {
  /** ISO calendar month ("YYYY-MM", UTC). Oldest first; always 12 entries. */
  date: string;
  /** Present+late share of marked sessions, 0-100 rounded to 1 decimal. Months without records report 0. */
  rate: number;
}

export interface AdminOverviewFunnelStep {
  label: string;
  value: number;
  /** One-line definition of the step, safe to render as a tooltip/hint. */
  description: string;
}

export interface AdminOverviewPendingStudent {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  /** Title of the student's selected course, when one was chosen during onboarding. */
  courseTitle: string | null;
  /** ISO signup timestamp. Queue is ordered oldest application first. */
  createdAt: string;
}

export interface AdminOverviewRecentUser {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  avatar_url: string | null;
  /** ISO signup timestamp. */
  createdAt: string;
}

export interface AdminOverviewKpis {
  /** All users with role = 'student'. */
  totalStudents: number;
  /** All users with role = 'instructor'. */
  totalInstructors: number;
  /** All courses regardless of status (draft/published/archived). */
  totalCourses: number;
  /** Enrollments whose student account is not paused. */
  activeEnrollments: number;
  /** Students with onboarding completed but not approved yet (= pendingQueue length bound). */
  pendingApprovals: number;
  /** Present+late share of sessions marked within the selected window, 0-100. */
  attendanceRate: number;
  /** New enrollments this window vs the previous window. Higher is better. */
  enrollmentsDelta: AdminOverviewDelta;
  /**
   * Attendance rate this window vs the previous window; `current`/`previous`
   * carry percentage points (0-100) while `changePercent` is the relative change.
   */
  attendanceDelta: AdminOverviewDelta;
}

export interface AdminOverview {
  /** ISO timestamp of when the payload was assembled. */
  generatedAt: string;
  /** The range actually applied after normalising the argument. */
  range: AnalyticsRange;
  /** Length in days of each comparison window (365 for "12m"). */
  rangeDays: number;
  kpis: AdminOverviewKpis;
  enrollmentsByMonth: AdminOverviewMonthPoint[];
  attendanceRateByMonth: AdminOverviewAttendancePoint[];
  completionFunnel: AdminOverviewFunnelStep[];
  pendingQueue: AdminOverviewPendingStudent[];
  recentUsers: AdminOverviewRecentUser[];
}

type AuthedSupabase = Awaited<ReturnType<typeof createClient>>;
type ServiceSupabase = ReturnType<typeof createAdminClient>;

const MONTHS_IN_SERIES = 12;
const DAY_MS = 24 * 60 * 60 * 1000;
const PENDING_QUEUE_LIMIT = 8;
const RECENT_USERS_LIMIT = 5;

const RANGE_DAYS: Record<AnalyticsRange, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "12m": 365,
};

const ATTENDED_STATUSES = ["present", "late"] as const;
const HEAD_COUNT = { count: "exact", head: true } as const;
const FALLBACK_PAGE_SIZE = 500;
/** Safety valve so a runaway table can't spin the fallback loop forever. */
const FALLBACK_ROW_LIMIT = 200_000;

function resolveRange(range?: string): AnalyticsRange {
  switch ((range ?? "").trim().toLowerCase()) {
    case "7":
    case "7d":
    case "week":
      return "7d";
    case "90":
    case "90d":
    case "quarter":
      return "90d";
    case "365":
    case "365d":
    case "12m":
    case "year":
      return "12m";
    default:
      // "30", "30d" and anything unrecognised fall back to the monthly default.
      return "30d";
  }
}

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function monthKeyOf(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Last `count` calendar months (current month included), oldest first. */
function lastMonthKeys(count: number): string[] {
  const now = new Date();
  return Array.from({ length: count }, (_, index) => {
    const monthsBack = count - 1 - index;
    return monthKeyOf(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsBack, 1)));
  });
}

/** First instant of the oldest month covered by the time series. */
function startOfSeriesUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (MONTHS_IN_SERIES - 1), 1));
}

const warnedFallbacks = new Set<string>();

/** Log at most once per source so repeated renders don't spam the logs. */
function warnFallback(source: string, error: unknown): void {
  if (warnedFallbacks.has(source)) return;
  warnedFallbacks.add(source);
  const message = error instanceof Error ? error.message : String(error);
  console.warn(
    `[analytics] ${source} RPC unavailable — falling back to client-side aggregation (${message})`
  );
}

function buildDelta(currentValue: number, previousValue: number): AdminOverviewDelta {
  const current = toNumber(currentValue);
  const previous = toNumber(previousValue);
  const changePercent =
    previous > 0 ? round1(((current - previous) / previous) * 100) : null;
  const difference = current - previous;
  const direction: AdminOverviewDelta["direction"] =
    difference > 0 ? "up" : difference < 0 ? "down" : "flat";
  const label =
    changePercent === null
      ? current > 0
        ? "new"
        : "±0%"
      : `${changePercent > 0 ? "+" : ""}${Math.round(changePercent)}%`;

  return {
    current,
    previous,
    changePercent,
    direction,
    label,
    good: direction === "flat" ? null : direction === "up",
  };
}

function countOf(result: { count: number | null; error: { message: string } | null }): number {
  if (result.error) {
    console.error("[analytics] count query failed:", result.error.message);
  }
  return result.count ?? 0;
}

/**
 * PostgREST truncates unbounded selects (db.max_rows), so every fallback read
 * walks its result set page by page to stay accurate.
 */
type FallbackRow = Record<string, unknown>;
interface FallbackPage {
  data: FallbackRow[] | null;
  error: { message: string } | null;
}

async function selectAllPages(
  label: string,
  buildPage: (from: number, to: number) => PromiseLike<unknown>
): Promise<FallbackRow[]> {
  const rows: FallbackRow[] = [];
  let from = 0;

  for (;;) {
    const to = from + FALLBACK_PAGE_SIZE - 1;
    const { data, error } = (await buildPage(from, to)) as FallbackPage;

    if (error) {
      console.error(`[analytics] ${label} fallback failed:`, error.message);
      break;
    }

    const page = data ?? [];
    rows.push(...page);
    if (page.length < FALLBACK_PAGE_SIZE || rows.length >= FALLBACK_ROW_LIMIT) break;
    from += FALLBACK_PAGE_SIZE;
  }

  return rows;
}

function text(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

/* ────────────────────────────────────────────────────────────
   Aggregation loaders — each tries its RPC, then falls back
   ──────────────────────────────────────────────────────────── */

async function loadEnrollmentSeries(
  authed: AuthedSupabase,
  service: ServiceSupabase
): Promise<AdminOverviewMonthPoint[]> {
  try {
    const { data, error } = await authed.rpc("get_admin_enrollment_series", {
      p_months: MONTHS_IN_SERIES,
    });
    if (error) throw error;

    const rows = (Array.isArray(data) ? data : [data]) as Array<{
      month_start: string | null;
      total: number | null;
    }>;
    const totalsByMonth = new Map<string, number>();
    for (const row of rows) {
      if (!row?.month_start) continue;
      totalsByMonth.set(String(row.month_start).slice(0, 7), toNumber(row.total));
    }
    return lastMonthKeys(MONTHS_IN_SERIES).map((date) => ({
      date,
      value: totalsByMonth.get(date) ?? 0,
    }));
  } catch (error) {
    warnFallback("enrollmentsByMonth", error);
  }

  const rows = await selectAllPages("enrollment series", (from, to) =>
    service
      .from("enrollments")
      .select("enrolled_at")
      .gte("enrolled_at", startOfSeriesUtc().toISOString())
      .range(from, to)
  );

  const totalsByMonth = new Map<string, number>();
  for (const row of rows) {
    const key = monthKeyOf(text(row.enrolled_at));
    if (!key) continue;
    totalsByMonth.set(key, (totalsByMonth.get(key) ?? 0) + 1);
  }
  return lastMonthKeys(MONTHS_IN_SERIES).map((date) => ({
    date,
    value: totalsByMonth.get(date) ?? 0,
  }));
}

async function loadAttendanceSeries(
  authed: AuthedSupabase,
  service: ServiceSupabase
): Promise<AdminOverviewAttendancePoint[]> {
  try {
    const { data, error } = await authed.rpc("get_admin_attendance_series", {
      p_months: MONTHS_IN_SERIES,
    });
    if (error) throw error;

    const rows = (Array.isArray(data) ? data : [data]) as Array<{
      month_start: string | null;
      present_count: number | null;
      total_count: number | null;
    }>;
    const ratesByMonth = new Map<string, number>();
    for (const row of rows) {
      if (!row?.month_start) continue;
      const total = toNumber(row.total_count);
      const attended = toNumber(row.present_count);
      ratesByMonth.set(
        String(row.month_start).slice(0, 7),
        total > 0 ? round1((attended / total) * 100) : 0
      );
    }
    return lastMonthKeys(MONTHS_IN_SERIES).map((date) => ({
      date,
      rate: ratesByMonth.get(date) ?? 0,
    }));
  } catch (error) {
    warnFallback("attendanceRateByMonth", error);
  }

  const sinceDate = startOfSeriesUtc().toISOString().slice(0, 10);
  const rows = await selectAllPages("attendance series", (from, to) =>
    service
      .from("attendance_records")
      .select("session_date, status")
      .gte("session_date", sinceDate)
      .range(from, to)
  );

  const totalsByMonth = new Map<string, number>();
  const attendedByMonth = new Map<string, number>();
  for (const row of rows) {
    const key = monthKeyOf(text(row.session_date));
    if (!key) continue;
    totalsByMonth.set(key, (totalsByMonth.get(key) ?? 0) + 1);
    if ((ATTENDED_STATUSES as readonly string[]).includes(text(row.status))) {
      attendedByMonth.set(key, (attendedByMonth.get(key) ?? 0) + 1);
    }
  }
  return lastMonthKeys(MONTHS_IN_SERIES).map((date) => {
    const total = totalsByMonth.get(date) ?? 0;
    const attended = attendedByMonth.get(date) ?? 0;
    return { date, rate: total > 0 ? round1((attended / total) * 100) : 0 };
  });
}

interface PeriodCounters {
  enrollments: { current: number; previous: number };
  attendance: {
    currentPresent: number;
    currentTotal: number;
    previousPresent: number;
    previousTotal: number;
  };
}

async function loadPeriodCounters(
  authed: AuthedSupabase,
  service: ServiceSupabase,
  days: number
): Promise<PeriodCounters> {
  try {
    const { data, error } = await authed.rpc("get_admin_period_deltas", { p_days: days });
    if (error) throw error;

    const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null;
    if (!row || row.enrollments_current === undefined) {
      throw new Error("unexpected empty period-delta response");
    }
    return {
      enrollments: {
        current: toNumber(row.enrollments_current),
        previous: toNumber(row.enrollments_previous),
      },
      attendance: {
        currentPresent: toNumber(row.attendance_present_current),
        currentTotal: toNumber(row.attendance_total_current),
        previousPresent: toNumber(row.attendance_present_previous),
        previousTotal: toNumber(row.attendance_total_previous),
      },
    };
  } catch (error) {
    warnFallback("periodDeltas", error);
  }

  // Fallback: six cheap head-counts split by window.
  const nowMs = Date.now();
  const currentFromIso = new Date(nowMs - days * DAY_MS).toISOString();
  const previousFromIso = new Date(nowMs - days * 2 * DAY_MS).toISOString();
  const currentDate = currentFromIso.slice(0, 10);
  const previousDate = previousFromIso.slice(0, 10);

  const [enrollmentsCurrent, enrollmentsPrevious, attendanceCurrentTotal, attendanceCurrentAttended, attendancePreviousTotal, attendancePreviousAttended] =
    await Promise.all([
      service
        .from("enrollments")
        .select("id", HEAD_COUNT)
        .gte("enrolled_at", currentFromIso),
      service
        .from("enrollments")
        .select("id", HEAD_COUNT)
        .gte("enrolled_at", previousFromIso)
        .lt("enrolled_at", currentFromIso),
      service
        .from("attendance_records")
        .select("id", HEAD_COUNT)
        .gte("session_date", currentDate),
      service
        .from("attendance_records")
        .select("id", HEAD_COUNT)
        .in("status", [...ATTENDED_STATUSES])
        .gte("session_date", currentDate),
      service
        .from("attendance_records")
        .select("id", HEAD_COUNT)
        .gte("session_date", previousDate)
        .lt("session_date", currentDate),
      service
        .from("attendance_records")
        .select("id", HEAD_COUNT)
        .in("status", [...ATTENDED_STATUSES])
        .gte("session_date", previousDate)
        .lt("session_date", currentDate),
    ]);

  return {
    enrollments: {
      current: countOf(enrollmentsCurrent),
      previous: countOf(enrollmentsPrevious),
    },
    attendance: {
      currentPresent: countOf(attendanceCurrentAttended),
      currentTotal: countOf(attendanceCurrentTotal),
      previousPresent: countOf(attendancePreviousAttended),
      previousTotal: countOf(attendancePreviousTotal),
    },
  };
}

interface FunnelTotals {
  enrolled: number;
  started: number;
  completed: number;
}

async function loadCompletionFunnel(
  authed: AuthedSupabase,
  service: ServiceSupabase
): Promise<FunnelTotals> {
  try {
    const { data, error } = await authed.rpc("get_admin_completion_funnel");
    if (error) throw error;

    const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null;
    if (!row || row.enrolled === undefined) {
      throw new Error("unexpected empty funnel response");
    }
    return {
      enrolled: toNumber(row.enrolled),
      started: toNumber(row.started),
      completed: toNumber(row.completed),
    };
  } catch (error) {
    warnFallback("completionFunnel", error);
  }

  return computeCompletionFunnel(service);
}

/** Client-side funnel: plain selects grouped in JS. Mirrors get_admin_completion_funnel(). */
async function computeCompletionFunnel(service: ServiceSupabase): Promise<FunnelTotals> {
  const [enrolledResult, progressRows, attendanceRows, lessonRows, subjectRows, enrollmentRows] =
    await Promise.all([
      service.from("enrollments").select("id", HEAD_COUNT),
      selectAllPages("funnel progress", (from, to) =>
        service
          .from("lesson_progress")
          .select("enrollment_id, lesson_id, completed")
          .range(from, to)
      ),
      selectAllPages("funnel attendance", (from, to) =>
        service.from("attendance_records").select("enrollment_id").range(from, to)
      ),
      selectAllPages("funnel lessons", (from, to) =>
        service.from("lessons").select("id, course_id, subject_id").range(from, to)
      ),
      selectAllPages("funnel subjects", (from, to) =>
        service.from("subjects").select("id, course_id").range(from, to)
      ),
      selectAllPages("funnel enrollments", (from, to) =>
        service.from("enrollments").select("id, course_id").range(from, to)
      ),
    ]);

  const enrolled = countOf(enrolledResult);

  // Started: distinct enrollments with any learning signal.
  const startedIds = new Set<string>();
  for (const row of progressRows) {
    const enrollmentId = text(row.enrollment_id);
    if (enrollmentId) startedIds.add(enrollmentId);
  }
  for (const row of attendanceRows) {
    const enrollmentId = text(row.enrollment_id);
    if (enrollmentId) startedIds.add(enrollmentId);
  }

  // Completed: lessons completed per enrollment vs lessons belonging to the course.
  const courseBySubject = new Map<string, string>();
  for (const subject of subjectRows) {
    const courseId = text(subject.course_id);
    if (courseId) courseBySubject.set(text(subject.id), courseId);
  }

  const lessonCountByCourse = new Map<string, number>();
  for (const lesson of lessonRows) {
    const directCourse = text(lesson.course_id);
    const subjectCourse = text(lesson.subject_id) ? courseBySubject.get(text(lesson.subject_id)) : undefined;
    const courseId = directCourse || subjectCourse;
    if (!courseId) continue;
    lessonCountByCourse.set(courseId, (lessonCountByCourse.get(courseId) ?? 0) + 1);
  }

  const courseByEnrollment = new Map<string, string>();
  for (const enrollment of enrollmentRows) {
    const courseId = text(enrollment.course_id);
    if (courseId) courseByEnrollment.set(text(enrollment.id), courseId);
  }

  const completedLessonsByEnrollment = new Map<string, Set<string>>();
  for (const progress of progressRows) {
    if (progress.completed !== true) continue;
    const enrollmentId = text(progress.enrollment_id);
    const lessonId = text(progress.lesson_id);
    if (!enrollmentId || !lessonId) continue;
    const done = completedLessonsByEnrollment.get(enrollmentId) ?? new Set<string>();
    done.add(lessonId);
    completedLessonsByEnrollment.set(enrollmentId, done);
  }

  let completed = 0;
  for (const [enrollmentId, doneLessons] of completedLessonsByEnrollment) {
    const courseId = courseByEnrollment.get(enrollmentId);
    if (!courseId) continue;
    const totalLessons = lessonCountByCourse.get(courseId) ?? 0;
    // Courses with zero lessons never count as complete.
    if (totalLessons > 0 && doneLessons.size >= totalLessons) completed += 1;
  }

  return { enrolled, started: startedIds.size, completed };
}

/* ────────────────────────────────────────────────────────────
   Public entry point
   ──────────────────────────────────────────────────────────── */

/**
 * Assemble everything the admin overview dashboard needs in one round trip.
 *
 * Guarded by `verifyAdmin()` — throws "Unauthorized. Admin access required."
 * for non-admin callers, mirroring app/actions/admin.ts.
 *
 * @param range Optional comparison window: "7d" | "30d" | "90d" | "12m"
 *              (plain day counts like "30" also accepted). Unknown values
 *              resolve to "30d". Only affects the deltas and `attendanceRate`;
 *               the monthly series always covers the trailing 12 months.
 */
export async function getAdminOverview(range?: string): Promise<AdminOverview> {
  await verifyAdmin();

  const resolvedRange = resolveRange(range);
  const days = RANGE_DAYS[resolvedRange];

  // The authed client drives the RPCs (is_admin() reads auth.uid() server-side);
  // the service client powers the RLS-independent fallback reads.
  const authed = await createClient();
  const service = createAdminClient();

  const [
    studentsCount,
    instructorsCount,
    coursesCount,
    pendingApprovalsCount,
    activeEnrollmentsCount,
    enrollmentSeries,
    attendanceSeries,
    counters,
    funnel,
  ] = await Promise.all([
    service.from("users").select("id", HEAD_COUNT).eq("role", "student"),
    service.from("users").select("id", HEAD_COUNT).eq("role", "instructor"),
    service.from("courses").select("id", HEAD_COUNT),
    service
      .from("users")
      .select("id", HEAD_COUNT)
      .eq("role", "student")
      .eq("onboarding_completed", true)
      .eq("is_approved", false),
    loadActiveEnrollmentCount(service),
    loadEnrollmentSeries(authed, service),
    loadAttendanceSeries(authed, service),
    loadPeriodCounters(authed, service, days),
    loadCompletionFunnel(authed, service),
  ]);

  const [pendingQueue, recentUsers] = await Promise.all([
    loadPendingQueue(service),
    loadRecentUsers(service),
  ]);

  const attendanceCurrentRate =
    counters.attendance.currentTotal > 0
      ? round1((counters.attendance.currentPresent / counters.attendance.currentTotal) * 100)
      : 0;
  const attendancePreviousRate =
    counters.attendance.previousTotal > 0
      ? round1((counters.attendance.previousPresent / counters.attendance.previousTotal) * 100)
      : 0;

  return {
    generatedAt: new Date().toISOString(),
    range: resolvedRange,
    rangeDays: days,
    kpis: {
      totalStudents: countOf(studentsCount),
      totalInstructors: countOf(instructorsCount),
      totalCourses: countOf(coursesCount),
      activeEnrollments: activeEnrollmentsCount,
      pendingApprovals: countOf(pendingApprovalsCount),
      attendanceRate: attendanceCurrentRate,
      enrollmentsDelta: buildDelta(counters.enrollments.current, counters.enrollments.previous),
      attendanceDelta: buildDelta(attendanceCurrentRate, attendancePreviousRate),
    },
    enrollmentsByMonth: enrollmentSeries,
    attendanceRateByMonth: attendanceSeries,
    completionFunnel: [
      {
        label: "Enrolled",
        value: funnel.enrolled,
        description: "All course enrollments on record.",
      },
      {
        label: "Started",
        value: funnel.started,
        description:
          "Enrollments with at least one completed lesson or one marked attendance session.",
      },
      {
        label: "Completed",
        value: funnel.completed,
        description: "Enrollments where every lesson of the course has been marked complete.",
      },
    ],
    pendingQueue,
    recentUsers,
  };
}

/** Enrollments belonging to students whose account is not paused. */
async function loadActiveEnrollmentCount(service: ServiceSupabase): Promise<number> {
  // No FK embed here on purpose: relationship hints have failed in some
  // environments. Total minus paused-students' enrollments is equivalent
  // and uses only plain filters.
  const total = countOf(await service.from("enrollments").select("id", HEAD_COUNT));

  const paused = await service
    .from("users")
    .select("id")
    .eq("role", "student")
    .eq("is_paused", true);

  if (paused.error) {
    console.error(
      "[analytics] paused-student lookup failed:",
      JSON.stringify(paused.error)
    );
    return total;
  }
  if (!paused.data || paused.data.length === 0) return total;

  const blocked = countOf(
    await service
      .from("enrollments")
      .select("id", HEAD_COUNT)
      .in("user_id", paused.data.map((u) => u.id))
  );

  return Math.max(0, total - blocked);
}

/** Oldest applications first — students ready for review but not approved yet. */
async function loadPendingQueue(service: ServiceSupabase): Promise<AdminOverviewPendingStudent[]> {
  const { data, error } = await service
    .from("users")
    .select("id, full_name, email, avatar_url, selected_course_id, created_at")
    .eq("role", "student")
    .eq("onboarding_completed", true)
    .eq("is_approved", false)
    .order("created_at", { ascending: true })
    .limit(PENDING_QUEUE_LIMIT);

  if (error) {
    console.error("[analytics] pending queue query failed:", error.message);
    return [];
  }

  const rows = (data ?? []) as Array<{
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
    selected_course_id: string | null;
    created_at: string;
  }>;

  const courseTitles = new Map<string, string>();
  const courseIds = [
    ...new Set(rows.map((row) => row.selected_course_id).filter((id): id is string => Boolean(id))),
  ];
  if (courseIds.length > 0) {
    const { data: courses, error: coursesError } = await service
      .from("courses")
      .select("id, title")
      .in("id", courseIds);
    if (coursesError) {
      console.error("[analytics] queue course titles failed:", coursesError.message);
    }
    for (const course of (courses ?? []) as Array<{ id: string; title: string }>) {
      courseTitles.set(course.id, course.title);
    }
  }

  return rows.map((row) => ({
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    avatar_url: row.avatar_url,
    courseTitle: row.selected_course_id ? courseTitles.get(row.selected_course_id) ?? null : null,
    createdAt: row.created_at,
  }));
}

async function loadRecentUsers(service: ServiceSupabase): Promise<AdminOverviewRecentUser[]> {
  const { data, error } = await service
    .from("users")
    .select("id, full_name, email, role, avatar_url, created_at")
    .order("created_at", { ascending: false })
    .limit(RECENT_USERS_LIMIT);

  if (error) {
    console.error("[analytics] recent users query failed:", error.message);
    return [];
  }

  return ((data ?? []) as Array<Record<string, string | null>>).map((row) => ({
    id: String(row.id),
    full_name: String(row.full_name ?? ""),
    email: String(row.email ?? ""),
    role: (row.role as UserRole) ?? "student",
    avatar_url: (row.avatar_url as string | null) ?? null,
    createdAt: String(row.created_at),
  }));
}
