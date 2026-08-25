import { BookOpen } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/layout/empty-state";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { UserEnrollmentDetail } from "@/types";

import { formatDate } from "./formatters";

interface EnrollmentsPanelProps {
  enrollments: UserEnrollmentDetail[];
}

/**
 * "Courses" tab: every enrollment with its per-course lesson progress.
 * Server-compatible — no hooks, no state.
 */
function EnrollmentsPanel({ enrollments }: EnrollmentsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" aria-hidden="true" />
          Enrolled Courses ({enrollments.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {enrollments.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Not enrolled in any courses."
            description="Enroll this user in a course to see progress here."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course</TableHead>
                <TableHead>Enrolled</TableHead>
                <TableHead>Enrolled By</TableHead>
                <TableHead>Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrollments.map((enrollment) => (
                <TableRow key={enrollment.enrollment_id}>
                  <TableCell className="min-w-[220px] whitespace-normal">
                    <span className="font-medium">{enrollment.course_title}</span>
                    {enrollment.course_batch && (
                      <span className="text-muted-foreground ml-1">
                        (Batch {enrollment.course_batch})
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(enrollment.enrolled_at)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {enrollment.enrolled_by_name ?? "System"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Progress
                        value={enrollment.progress_percent}
                        aria-label={`${enrollment.course_title} progress`}
                        className="w-24"
                      />
                      <span className="text-muted-foreground text-xs font-medium whitespace-nowrap">
                        {enrollment.completed_lessons}/{enrollment.total_lessons} (
                        {enrollment.progress_percent}%)
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export { EnrollmentsPanel };
export type { EnrollmentsPanelProps };
