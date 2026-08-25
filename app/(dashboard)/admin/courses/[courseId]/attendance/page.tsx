import Link from "next/link";

import { getCurrentUser } from "@/lib/dal";
import {
  getAttendanceCourse,
  getAttendanceCourseOptions,
  getAttendanceSessionDates,
} from "@/app/actions/attendance";
import { AttendanceTable } from "@/components/admin/attendance-table";
import { AttendanceWorkspace } from "@/components/admin/attendance-workspace";
import { PageHeader } from "@/components/layout/page-header";

/**
 * Admin attendance workspace for one course. Thin wrapper around
 * `<AttendanceWorkspace>`: everything below the header (picker, summary,
 * session list, marking table) is shared with the instructor page — only the
 * picker scope ("admin" = all courses) and the deep-link base differ.
 */
export default async function AdminAttendancePage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  await getCurrentUser();
  const { courseId } = await params;
  const { date } = await searchParams;

  const courses = await getAttendanceCourseOptions("admin");
  const course = await getAttendanceCourse(courseId);

  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <h2 className="text-lg font-semibold">Course not found</h2>
        <Link href="/admin/courses" className="mt-2 text-sm text-primary hover:underline">
          Back to courses
        </Link>
      </div>
    );
  }

  const sessions = await getAttendanceSessionDates(courseId);

  return (
    <div className="space-y-8">
      <PageHeader
        breadcrumbs={[
          { label: "Courses", href: "/admin/courses" },
          { label: course.title, href: `/admin/courses/${courseId}` },
          { label: "Attendance" },
        ]}
        title={`${course.title} – Attendance`}
        description={course.batch ? `Batch ${course.batch}` : undefined}
      />

      <AttendanceWorkspace
        scope="admin"
        courses={courses}
        selectedCourseId={courseId}
        selectedDate={date ?? null}
        sessions={sessions}
      >
        {date ? <AttendanceTable courseId={courseId} sessionDate={date} /> : null}
      </AttendanceWorkspace>
    </div>
  );
}
