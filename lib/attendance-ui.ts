import type { AttendanceStatus } from "@/types";

/**
 * Single source of attendance status styling.
 *
 * Four surfaces used to keep their own threshold + palette copies (admin
 * session list, instructor session list, admin marking table, student
 * overview). They now all read from here, so a status or rate band changes in
 * exactly one place — and everything stays on semantic tokens
 * (success/warning/destructive/info) with light+dark parity.
 */

// ─── Per-status styling ───────────────────────────────────────

export interface AttendanceStatusStyle {
  /** Human label ("Present", "Absent", …). */
  label: string;
  /** Variant for `<Badge variant={…}>`. */
  badgeVariant: "success" | "destructive" | "warning" | "info";
  /**
   * Explicit token classes for spans/selects that don't go through `<Badge>`.
   * Mirrors the badge variant tints (10% tint in light mode, 20% in dark).
   */
  chipClass: string;
  /** Solid dot color for status indicators. */
  dotClass: string;
}

export const ATTENDANCE_STATUS_STYLES: Record<AttendanceStatus, AttendanceStatusStyle> = {
  present: {
    label: "Present",
    badgeVariant: "success",
    chipClass: "bg-success/10 text-success dark:bg-success/20",
    dotClass: "bg-success",
  },
  absent: {
    label: "Absent",
    badgeVariant: "destructive",
    chipClass: "bg-destructive/10 text-destructive dark:bg-destructive/20",
    dotClass: "bg-destructive",
  },
  late: {
    label: "Late",
    badgeVariant: "warning",
    chipClass:
      "bg-warning/10 text-warning-foreground dark:bg-warning/20 dark:text-warning",
    dotClass: "bg-warning",
  },
  excused: {
    label: "Excused",
    badgeVariant: "info",
    chipClass: "bg-info/10 text-info dark:bg-info/20",
    dotClass: "bg-info",
  },
};

/** Style for any status value (unknown values fall back to `absent`). */
export function getAttendanceStatusStyle(status: string): AttendanceStatusStyle {
  return ATTENDANCE_STATUS_STYLES[status as AttendanceStatus] ?? ATTENDANCE_STATUS_STYLES.absent;
}

/** Ordered statuses for pickers and legends. */
export const ATTENDANCE_STATUSES: AttendanceStatus[] = ["present", "absent", "late", "excused"];

/** Whether a status counts as attended when computing rates. */
export function isAttendedStatus(status: string): boolean {
  return status === "present" || status === "late";
}

// ─── Rate bands (the shared ≥80 / ≥50 thresholds) ─────────────

export type AttendanceRateTier = "high" | "moderate" | "low";

export interface AttendanceRateTierStyle {
  badgeVariant: "success" | "warning" | "destructive";
  chipClass: string;
  /** Progress-bar / meter fill color. */
  barClass: string;
}

export const ATTENDANCE_RATE_TIERS: Record<AttendanceRateTier, AttendanceRateTierStyle> = {
  high: {
    badgeVariant: "success",
    chipClass: "bg-success/10 text-success dark:bg-success/20",
    barClass: "bg-success",
  },
  moderate: {
    badgeVariant: "warning",
    chipClass:
      "bg-warning/10 text-warning-foreground dark:bg-warning/20 dark:text-warning",
    barClass: "bg-warning",
  },
  low: {
    badgeVariant: "destructive",
    chipClass: "bg-destructive/10 text-destructive dark:bg-destructive/20",
    barClass: "bg-destructive",
  },
};

/**
 * Band for an attendance percentage. The ≥80 / ≥50 cutoffs were previously
 * duplicated across every attendance surface; change them here only.
 */
export function getAttendanceRateTier(percentage: number): AttendanceRateTier {
  if (percentage >= 80) return "high";
  if (percentage >= 50) return "moderate";
  return "low";
}

export function getAttendanceRateStyle(percentage: number): AttendanceRateTierStyle {
  return ATTENDANCE_RATE_TIERS[getAttendanceRateTier(percentage)];
}
