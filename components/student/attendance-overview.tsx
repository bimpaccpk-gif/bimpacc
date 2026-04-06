"use client";

import { useEffect, useState } from "react";
import { getStudentAttendance } from "@/app/actions/attendance";
import { Calendar } from "lucide-react";

interface AttendanceData {
  course_id: string;
  course_title: string;
  session_date: string;
  status: string;
  watch_time_minutes: number | null;
  session_duration_minutes: number | null;
}

export function StudentAttendanceOverview() {
  const [data, setData] = useState<AttendanceData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const result = await getStudentAttendance();
      setData(result);
      setLoading(false);
    })();
  }, []);

  if (loading) return null;
  if (data.length === 0) return null;

  // Group by course
  const courseMap = new Map<string, { title: string; present: number; total: number }>();
  for (const d of data) {
    if (!courseMap.has(d.course_id)) {
      courseMap.set(d.course_id, { title: d.course_title, present: 0, total: 0 });
    }
    const entry = courseMap.get(d.course_id)!;
    entry.total++;
    if (d.status === "present" || d.status === "late") {
      entry.present++;
    }
  }

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-semibold">Attendance Overview</h3>
      </div>
      <div className="space-y-3">
        {Array.from(courseMap.entries()).map(([courseId, info]) => {
          const percent = info.total > 0 ? Math.round((info.present / info.total) * 100) : 0;
          return (
            <div key={courseId}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{info.title}</span>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-muted-foreground">
                    {info.present}/{info.total}
                  </span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 font-medium ${
                      percent >= 80
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : percent >= 50
                        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    }`}
                  >
                    {percent}%
                  </span>
                </div>
              </div>
              <div className="mt-1 h-2 rounded-full bg-muted">
                <div
                  className={`h-2 rounded-full transition-all ${
                    percent >= 80 ? "bg-green-500" : percent >= 50 ? "bg-yellow-500" : "bg-red-500"
                  }`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
