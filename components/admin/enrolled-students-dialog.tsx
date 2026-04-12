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

interface EnrolledStudentsDialogProps {
  courseId: string;
  courseTitle: string;
}

export function EnrolledStudentsDialog({ courseId, courseTitle }: EnrolledStudentsDialogProps) {
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="outline"
        size="icon"
        title="View Enrolled Students"
        className="shrink-0"
        onClick={() => setOpen(true)}
      >
        <Users className="h-4 w-4" />
      </Button>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-brand-600" />
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
            <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
          </div>
        ) : students.length === 0 && !error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-10 w-10 text-muted-foreground/50" />
            <p className="mt-2 text-sm font-medium text-foreground">No students enrolled yet</p>
            <p className="text-xs text-muted-foreground">
              Enroll students from the Users page
            </p>
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-lg border">
            <div className="divide-y">
              {students.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-400">
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
                    <div className="text-right">
                      <p className="text-xs font-medium text-foreground">
                        {student.progress != null ? `${student.progress}%` : "0%"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">progress</p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p className="text-[10px]">
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
