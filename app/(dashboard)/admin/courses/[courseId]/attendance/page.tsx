import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/dal";
import { ArrowLeft, Calendar, Users, TrendingUp } from "lucide-react";
import Link from "next/link";
import { getAttendanceSessionDates } from "@/app/actions/attendance";
import { AttendanceCSVUpload } from "@/components/admin/attendance-csv-upload";
import { AttendanceTable } from "@/components/admin/attendance-table";

async function getCourse(courseId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select("id, title, batch")
    .eq("id", courseId)
    .single();
  return data as { id: string; title: string; batch: string } | null;
}

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
  const course = await getCourse(courseId);
  const sessionDates = await getAttendanceSessionDates(courseId);

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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/admin/courses"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Courses
        </Link>
        <div className="mt-4 flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Calendar className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {course.title} <span className="text-muted-foreground font-normal text-lg">– Attendance</span>
            </h1>
            <p className="mt-1 text-muted-foreground">Batch: {course.batch}</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {sessionDates.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <Calendar className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Sessions</p>
                <p className="text-2xl font-bold">{sessionDates.length}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                <Users className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Attendance</p>
                <p className="text-2xl font-bold">
                  {Math.round(sessionDates.reduce((a, b) => a + b.percentage, 0) / sessionDates.length)}%
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                <TrendingUp className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Latest Session</p>
                <p className="text-2xl font-bold">
                  {sessionDates[0]?.percentage}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Session Dates List / New Session */}
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
                  href={`/admin/courses/${courseId}/attendance?date=${sd.session_date}`}
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
    </div>
  );
}
