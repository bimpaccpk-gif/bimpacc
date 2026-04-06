import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/dal";
import { Calendar, GraduationCap } from "lucide-react";
import Link from "next/link";
import { verifyInstructor, getInstructorCourses } from "@/app/actions/instructor";
import { getAttendanceSessionDates } from "@/app/actions/attendance";
import { AttendanceCSVUpload } from "@/components/admin/attendance-csv-upload";
import { AttendanceTable } from "@/components/admin/attendance-table";

async function getSessionDates(courseId: string) {
  try {
    return await getAttendanceSessionDates(courseId);
  } catch {
    return [];
  }
}

export default async function InstructorAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string; date?: string }>;
}) {
  await getCurrentUser();
  await verifyInstructor();

  const { courseId: selectedCourseId, date } = await searchParams;
  const courses = await getInstructorCourses();

  const courseId = selectedCourseId || courses[0]?.id;

  // Get session dates for the selected course
  let sessionDates: Awaited<ReturnType<typeof getAttendanceSessionDates>> = [];
  if (courseId) {
    sessionDates = await getSessionDates(courseId);
  }

  const course = courses.find((c) => c.id === courseId);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="mt-4 flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Calendar className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Attendance Management
            </h1>
            <p className="mt-1 text-muted-foreground">
              Manage attendance using Zoom CSV reports or manual marking
            </p>
          </div>
        </div>
      </div>

      {/* Course Selector */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Select Course:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {courses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No courses assigned.</p>
          ) : (
            courses.map((c) => (
              <Link
                key={c.id}
                href={`/instructor/attendance?courseId=${c.id}`}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  courseId === c.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {c.title}
              </Link>
            ))
          )}
        </div>
      </div>

      {courseId && course && (
        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          {/* Sidebar: Session List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Sessions</h2>
              <AttendanceCSVUpload courseId={courseId} />
            </div>
            {sessionDates.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-center text-muted-foreground">
                <Calendar className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm font-medium">No sessions yet</p>
                <p className="mt-1 text-xs">Upload a CSV to create your first session</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sessionDates.map((sd) => (
                  <Link
                    key={sd.session_date}
                    href={`/instructor/attendance?courseId=${courseId}&date=${sd.session_date}`}
                    className={`flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted ${
                      date === sd.session_date
                        ? "border-primary bg-primary/5"
                        : ""
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {new Date(sd.session_date + "T00:00:00").toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {sd.present_count}/{sd.total_count} present
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        sd.percentage >= 80
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : sd.percentage >= 50
                          ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }`}
                    >
                      {sd.percentage}%
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Main: Attendance Table */}
          <div>
            {date ? (
              <AttendanceTable courseId={courseId} sessionDate={date} />
            ) : sessionDates.length > 0 ? (
              <div className="flex h-64 items-center justify-center rounded-xl border text-muted-foreground">
                <p className="text-sm">Select a session from the sidebar</p>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
