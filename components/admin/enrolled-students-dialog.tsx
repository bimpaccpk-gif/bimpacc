"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Users, Loader2, AlertCircle } from "lucide-react";
import { getEnrolledStudents, type EnrolledStudent } from "@/app/actions/ai-admin";
import { HierarchyType } from "@/types";

// Match the course card hierarchy colors
const hierarchyStudentColors: Record<number, {
  avatarBg: string;
  avatarText: string;
  progressBadgeBg: string;
  progressBadgeText: string;
  dateBadgeBg: string;
  dateBadgeText: string;
  dialogIcon: string;
}> = {
  1: {
    avatarBg: "bg-blue-100 dark:bg-blue-950/70",
    avatarText: "text-blue-700 dark:text-blue-400",
    progressBadgeBg: "bg-blue-100 dark:bg-blue-900/60",
    progressBadgeText: "text-blue-700 dark:text-blue-400",
    dateBadgeBg: "bg-blue-50 dark:bg-blue-950/40",
    dateBadgeText: "text-blue-600 dark:text-blue-400",
    dialogIcon: "text-blue-600 dark:text-blue-400",
  },
  2: {
    avatarBg: "bg-teal-100 dark:bg-teal-950/70",
    avatarText: "text-teal-700 dark:text-teal-400",
    progressBadgeBg: "bg-teal-100 dark:bg-teal-900/60",
    progressBadgeText: "text-teal-700 dark:text-teal-400",
    dateBadgeBg: "bg-teal-50 dark:bg-teal-950/40",
    dateBadgeText: "text-teal-600 dark:text-teal-400",
    dialogIcon: "text-teal-600 dark:text-teal-400",
  },
  3: {
    avatarBg: "bg-amber-100 dark:bg-amber-950/70",
    avatarText: "text-amber-700 dark:text-amber-400",
    progressBadgeBg: "bg-amber-100 dark:bg-amber-900/60",
    progressBadgeText: "text-amber-700 dark:text-amber-400",
    dateBadgeBg: "bg-amber-50 dark:bg-amber-950/40",
    dateBadgeText: "text-amber-600 dark:text-amber-400",
    dialogIcon: "text-amber-600 dark:text-amber-400",
  },
};

interface EnrolledStudentsDialogProps {
  courseId: string;
  courseTitle: string;
  hierarchyType: HierarchyType;
}

export function EnrolledStudentsDialog({ courseId, courseTitle, hierarchyType }: EnrolledStudentsDialogProps) {
  const [open, setOpen] = useState(false);
  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const fetchStudents = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getEnrolledStudents(courseId);
        if (result.error) {
          setError(result.error);
          setStudents([]);
        } else {
          setStudents(result.data);
        }
      } catch (err: any) {
        console.error("Error fetching enrolled students:", err);
        setError(err.message ?? "Failed to load enrolled students");
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [open, courseId]);

  const colors = hierarchyStudentColors[hierarchyType] ?? hierarchyStudentColors[1];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="outline"
        size="icon"
        title="View Enrolled Students"
        className={`shrink-0 border-transparent ${colors.avatarBg} ${colors.avatarText}`}
        onClick={() => setOpen(true)}
      >
        <Users className="h-4 w-4" />
      </Button>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className={`h-5 w-5 ${colors.dialogIcon}`} />
            Enrolled Students — {courseTitle}
          </DialogTitle>
          <DialogDescription>
            {students.length} student{students.length !== 1 ? "s" : ""} enrolled in this course
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="shrink-0 rounded-md bg-destructive/10 px-3 py-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <div>
                <p className="text-xs font-medium text-destructive">Failed to load students</p>
                <p className="mt-0.5 text-xs text-destructive/80">{error}</p>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className={`h-6 w-6 animate-spin ${colors.dialogIcon}`} />
          </div>
        ) : students.length === 0 && !error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className={`h-10 w-10 ${colors.dialogIcon} opacity-50`} />
            <p className="mt-2 text-sm font-medium text-foreground">No students enrolled yet</p>
            <p className="text-xs text-muted-foreground">
              Enroll students from the Users page
            </p>
          </div>
        ) : (
          <div className={`mt-4 overflow-hidden rounded-lg border ${colors.avatarBg} border-transparent`}>
            <div className="divide-y divide-muted/30">
              {students.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between px-4 py-3 bg-background/80 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${colors.avatarBg} ${colors.avatarText}`}>
                      {(student.full_name ?? student.email).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {student.full_name ?? "Unknown"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{student.email}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <div className={`text-right rounded-md px-2.5 py-1 ${colors.progressBadgeBg}`}>
                      <p className={`text-xs font-medium ${colors.progressBadgeText}`}>
                        {student.progress != null ? `${student.progress}%` : "0%"}
                      </p>
                      <p className={`text-[10px] ${colors.progressBadgeText} opacity-70`}>progress</p>
                    </div>
                    <div className={`text-right rounded-md px-2.5 py-1 ${colors.dateBadgeBg}`}>
                      <p className={`text-[10px] font-medium ${colors.dateBadgeText}`}>
                        {new Date(student.enrolled_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
