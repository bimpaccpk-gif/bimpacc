import { getCurrentUser } from "@/lib/dal";
import { verifyInstructor } from "@/app/actions/instructor";
import {
  getAttendanceCourseOptions,
  getAttendanceSessionDates,
  type AttendanceSessionSummary,
} from "@/app/actions/attendance";
import { AttendanceTable } from "@/components/admin/attendance-table";
import { AttendanceWorkspace } from "@/components/admin/attendance-workspace";
import { PageHeader } from "@/components/layout/page-header";

/** Stale deep links (unassigned/missing course) degrade to an empty list. */
async function getSessionDates(courseId: string): Promise<AttendanceSessionSummary[]> {
  try {
    return await getAttendanceSessionDates(courseId);
  } catch {
    return [];
  }
}

/**
 * Instructor attendance workspace. Thin wrapper around
 * `<AttendanceWorkspace>`: everything below the header is shared with the
 * admin page — only the picker scope ("instructor" = assigned courses) and the
 * deep-link base differ.
 */
export default async function InstructorAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string; date?: string }>;
}) {
  await getCurrentUser();
  await verifyInstructor();

  const { courseId: selectedCourseId, date } = await searchParams;
  const courses = await getAttendanceCourseOptions("instructor");

  // Default to the first assigned course when no ?courseId= deep link is present.
  const courseId = selectedCourseId || courses[0]?.id;
  const sessions = courseId ? await getSessionDates(courseId) : [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Attendance Management"
        description="Manage attendance using Zoom CSV reports or manual marking"
      />

      <AttendanceWorkspace
        scope="instructor"
        courses={courses}
        selectedCourseId={courseId ?? null}
        selectedDate={date ?? null}
        sessions={sessions}
      >
        {courseId && date ? (
          <AttendanceTable courseId={courseId} sessionDate={date} />
        ) : null}
      </AttendanceWorkspace>
    </div>
  );
}
