"use client";

import { useEffect, useState } from "react";
import { getStudentAttendance } from "@/app/actions/attendance";
import {
  getAttendanceRateStyle,
  isAttendedStatus,
} from "@/lib/attendance-ui";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

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
    if (isAttendedStatus(d.status)) {
      entry.present++;
    }
  }

  return (
    <div className="bg-card rounded-xl border p-5">
      <div className="mb-4 flex items-center gap-2">
        <Calendar className="text-muted-foreground h-4 w-4" />
        <h3 className="font-semibold">Attendance Overview</h3>
      </div>
      <div className="space-y-3">
        {Array.from(courseMap.entries()).map(([courseId, info]) => {
          const percent = info.total > 0 ? Math.round((info.present / info.total) * 100) : 0;
          const rate = getAttendanceRateStyle(percent);
          return (
            <div key={courseId}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{info.title}</span>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-muted-foreground tabular-nums">
                    {info.present}/{info.total}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 font-medium tabular-nums",
                      rate.chipClass
                    )}
                  >
                    {percent}%
                  </span>
                </div>
              </div>
              <div className="bg-muted mt-1 h-2 rounded-full">
                <div
                  className={cn("h-2 rounded-full transition-all", rate.barClass)}
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
