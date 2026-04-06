"use client";

import { useState, useCallback, use } from "react";
import { getCourseAttendance, markAttendance, deleteAttendanceRecord, getAttendanceStats } from "@/app/actions/attendance";
import type { CourseAttendanceDetail } from "@/types";
import { Loader2, Trash2, CheckCircle2, XCircle, Clock, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";

interface AttendanceTableProps {
  courseId: string;
  sessionDate: string;
}

// Simple cache keyed by `${courseId}|${sessionDate}`
const attendanceCache = new Map<string, Promise<{ attendance: CourseAttendanceDetail[]; stats: Awaited<ReturnType<typeof getAttendanceStats>> }>>();

function getAttendanceData(courseId: string, sessionDate: string) {
  const key = `${courseId}|${sessionDate}`;
  if (!attendanceCache.has(key)) {
    // Delete old cache entries when keys change to prevent memory leaks
    attendanceCache.delete(key);
    attendanceCache.set(key, Promise.all([
      getCourseAttendance(courseId, sessionDate),
      getAttendanceStats(courseId, sessionDate),
    ]).then(([attendance, stats]) => ({ attendance, stats })));
  }
  return attendanceCache.get(key)!;
}

export function AttendanceTable({ courseId, sessionDate }: AttendanceTableProps) {
  const { attendance: initialData, stats: initialStats } = use(getAttendanceData(courseId, sessionDate));
  const [attendance, setAttendance] = useState(initialData);
  const [stats] = useState(initialStats);
  const [bulkMarking, setBulkMarking] = useState<string | null>(null);

  const fetchAttendance = useCallback(async () => {
    const data = await getCourseAttendance(courseId, sessionDate);
    setAttendance(data);

    const s = await getAttendanceStats(courseId, sessionDate);
    attendanceCache.set(`${courseId}|${sessionDate}`, Promise.resolve({ attendance: data, stats: s }));
  }, [courseId, sessionDate]);

  const handleStatusChange = async (enrollmentId: string, status: string) => {
    const res = await markAttendance(enrollmentId, sessionDate, status);
    if (res.error) {
      toast.error(res.error);
    } else {
      setAttendance((prev) =>
        prev.map((a) =>
          a.enrollment_id === enrollmentId ? { ...a, status: status as CourseAttendanceDetail["status"], source: "manual" as const } : a
        )
      );
      fetchAttendance();
    }
  };

  const handleDelete = async (recordId: string) => {
    const res = await deleteAttendanceRecord(recordId);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Record deleted");
      fetchAttendance();
    }
  };

  const handleBulkMark = async (status: string) => {
    setBulkMarking(status);
    const records = attendance.filter(
      (a) => a.status === "absent" && !a.id
    );
    let count = 0;
    for (const a of records) {
      const res = await markAttendance(a.enrollment_id, sessionDate, status);
      if (!res.error) count++;
    }
    setBulkMarking(null);
    if (count > 0) {
      toast.success(`Marked ${count} student(s) as ${status}`);
      fetchAttendance();
    }
  };

  const statusBadgeClasses: Record<string, string> = {
    present: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    absent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    late: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    excused: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  };

  const formattedDate = new Date(sessionDate + "T00:00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="space-y-4">
      {/* Stats header */}
      {stats && (
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">{formattedDate}</h2>
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium">
            {stats.attendancePercentage}% attendance
          </span>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => handleBulkMark("present")}
              disabled={bulkMarking === "present"}
              className="flex items-center gap-1 rounded-md border border-green-200 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-50 disabled:opacity-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950/30"
            >
              {bulkMarking === "present" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3 w-3" />
              )}
              Mark all present
            </button>
            <button
              onClick={() => handleBulkMark("absent")}
              disabled={bulkMarking === "absent"}
              className="flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              {bulkMarking === "absent" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <XCircle className="h-3 w-3" />
              )}
              Mark all absent
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/30">
            <tr>
              <th className="px-4 py-3 font-medium text-muted-foreground">#</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Student</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Email</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Watch Time</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Source</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {attendance.map((a, i) => (
              <tr key={a.enrollment_id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                <td className="px-4 py-3 font-medium">{a.student_name}</td>
                <td className="px-4 py-3 text-muted-foreground">{a.student_email}</td>
                <td className="px-4 py-3">
                  {a.watch_time_minutes != null
                    ? `${a.watch_time_minutes} min`
                    : "\u2014"}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={a.status}
                    onChange={(e) => handleStatusChange(a.enrollment_id, e.target.value)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium cursor-pointer ${
                      statusBadgeClasses[a.status]
                    }`}
                  >
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="late">Late</option>
                    <option value="excused">Excused</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded bg-muted px-1.5 py-0.5 text-xs">
                    {a.source === "csv" ? "CSV Import" : "Manual"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {a.id && (
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      title="Delete record"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
