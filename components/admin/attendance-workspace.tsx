import type * as React from "react";

import { Calendar, GraduationCap } from "lucide-react";
import Link from "next/link";

import type { AttendanceCourseMeta, AttendanceSessionSummary } from "@/app/actions/attendance";
import { AttendanceCSVUpload } from "@/components/admin/attendance-csv-upload";
import { EmptyState } from "@/components/layout/empty-state";
import { StatTile } from "@/components/layout/stat-tile";
import { getAttendanceRateStyle } from "@/lib/attendance-ui";
import { cn } from "@/lib/utils";

/**
 * Shared body of the admin and instructor attendance pages: course picker,
 * session summary tiles, session list and the active-session slot. Server-safe
 * — no hooks or state; the interactive marking table is passed as `children`.
 */
interface AttendanceWorkspaceProps {
  /** Which route family deep links point back into. */
  scope: "admin" | "instructor";
  /** Courses the current viewer may pick from (already role-scoped upstream). */
  courses: AttendanceCourseMeta[];
  selectedCourseId?: string | null;
  selectedDate?: string | null;
  sessions: AttendanceSessionSummary[];
  /** Active session panel — `<AttendanceTable>` when a date is selected. */
  children?: React.ReactNode;
}

/** Deep link into the scoped attendance page, preserving ?courseId/?date where meaningful. */
function buildSessionHref(
  scope: AttendanceWorkspaceProps["scope"],
  courseId: string,
  date: string
): string {
  if (scope === "admin") {
    return `/admin/courses/${courseId}/attendance?date=${date}`;
  }
  return `/instructor/attendance?courseId=${courseId}&date=${date}`;
}

function buildCourseHref(
  scope: AttendanceWorkspaceProps["scope"],
  courseId: string
): string {
  if (scope === "admin") {
    return `/admin/courses/${courseId}/attendance`;
  }
  return `/instructor/attendance?courseId=${courseId}`;
}

function formatSessionDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function AttendanceWorkspace({
  scope,
  courses,
  selectedCourseId,
  selectedDate,
  sessions,
  children,
}: AttendanceWorkspaceProps) {
  const avgPercentage =
    sessions.length > 0
      ? Math.round(sessions.reduce((total, s) => total + s.percentage, 0) / sessions.length)
      : 0;

  if (courses.length === 0) {
    return (
      <EmptyState
        icon={GraduationCap}
        title="No courses yet"
        description={
          scope === "instructor"
            ? "You are not assigned to any courses, so there is no attendance to manage."
            : "Create a course first, then manage its attendance here."
        }
      />
    );
  }

  return (
    <div data-slot="attendance-workspace" className="flex flex-col gap-8">
      {/* Course selector */}
      <div data-slot="attendance-course-picker" className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <GraduationCap aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Select Course:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {courses.map((course) => (
            <Link
              key={course.id}
              href={buildCourseHref(scope, course.id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                selectedCourseId === course.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {course.title}
            </Link>
          ))}
        </div>
      </div>

      {selectedCourseId && (
        <>
          {/* Summary tiles */}
          {sessions.length > 0 && (
            <div className="grid gap-4 md:grid-cols-3">
              <StatTile label="Total Sessions" value={sessions.length} icon={Calendar} />
              <StatTile label="Avg Attendance" value={`${avgPercentage}%`} icon={GraduationCap} />
              <StatTile
                label="Latest Session"
                value={`${sessions[0]?.percentage ?? 0}%`}
                hint={sessions[0] ? formatSessionDate(sessions[0].session_date) : undefined}
                icon={Calendar}
              />
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
            {/* Sidebar: session list */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Sessions</h2>
                <AttendanceCSVUpload courseId={selectedCourseId} />
              </div>
              {sessions.length === 0 ? (
                <EmptyState
                  icon={Calendar}
                  title="No sessions yet"
                  description="Upload a CSV to create your first session"
                  className="px-4 py-8"
                />
              ) : (
                <div className="space-y-2">
                  {sessions.map((session) => {
                    const rate = getAttendanceRateStyle(session.percentage);
                    return (
                      <Link
                        key={session.session_date}
                        href={buildSessionHref(scope, selectedCourseId, session.session_date)}
                        className={cn(
                          "hover:bg-muted flex items-center justify-between rounded-lg border p-3 transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                          selectedDate === session.session_date && "border-primary bg-primary/5"
                        )}
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {formatSessionDate(session.session_date)}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {session.present_count}/{session.total_count} present
                          </p>
                        </div>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
                            rate.chipClass
                          )}
                        >
                          {session.percentage}%
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Main: active session */}
            <div data-slot="attendance-session-panel">
              {children ?? (
                <div className="text-muted-foreground flex h-64 items-center justify-center rounded-xl border">
                  <p className="text-sm">Select a session from the sidebar</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export type { AttendanceWorkspaceProps };
