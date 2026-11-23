"use client";

import { errorMessage } from "@/lib/errors";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { enrollStudentInCourse } from "@/app/actions/course";
import { Loader2, PlusCircle, CheckCircle2 } from "lucide-react";
import { Label } from "@/components/ui/label";

interface CourseRow {
  id: string;
  title: string;
  batch: string;
  status: string;
}

interface EnrollmentRow {
  user_id: string;
  course_id: string;
  courses: {
    id: string;
    title: string;
    batch: string | null;
  } | null;
}

interface EnrollStudentDialogProps {
  studentId: string;
  studentName: string;
  courses: CourseRow[];
  enrolledCourseIds: string[];
  onEnroll: (enrollment: EnrollmentRow) => void;
}

export function EnrollStudentDialog({
  studentId,
  studentName,
  courses,
  enrolledCourseIds,
  onEnroll,
}: EnrollStudentDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedCourseId("");
      setError(null);
      setSuccess(null);
    }
  }, [open]);

  // Auto close dialog on success
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setOpen(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const availableCourses = courses.filter(
    (c) => c.status === "published" && !enrolledCourseIds.includes(c.id)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) return;

    setPending(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("studentId", studentId);
      formData.append("courseId", selectedCourseId);

      const result = await enrollStudentInCourse(undefined, formData);

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(result.success);
        // Find the course to build the enrollment object
        const course = courses.find((c) => c.id === selectedCourseId);
        if (course) {
          onEnroll({
            user_id: studentId,
            course_id: selectedCourseId,
            courses: {
              id: course.id,
              title: course.title,
              batch: course.batch,
            },
          });
        }
      }
    } catch (err) {
      setError(errorMessage(err, "An error occurred"));
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="h-8 gap-2">
        <PlusCircle className="h-4 w-4" />
        Enroll
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Enroll Student in Course</DialogTitle>
            <DialogDescription>
              Enroll <span className="text-foreground font-semibold">{studentName}</span> into a
              published course.
            </DialogDescription>
          </DialogHeader>

          {success ? (
            <div className="flex flex-col items-center justify-center space-y-3 py-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                <CheckCircle2 className="h-6 w-6 text-success" />
              </div>
              <p className="text-sm font-medium text-success">{success}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="courseId">Select Course</Label>
                <select
                  id="courseId"
                  className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full items-center justify-between rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  required
                >
                  <option value="" disabled>
                    Select a course...
                  </option>
                  {availableCourses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title} {course.batch ? `(Batch ${course.batch})` : ""}
                    </option>
                  ))}
                  {availableCourses.length === 0 && (
                    <option value="" disabled>
                      {enrolledCourseIds.length ===
                      courses.filter((c) => c.status === "published").length
                        ? "Student is enrolled in all published courses"
                        : "No published courses available"}
                    </option>
                  )}
                </select>
              </div>

              {error && (
                <div className="bg-destructive/15 text-destructive rounded-md p-3 text-sm">
                  {error}
                </div>
              )}

              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={pending || !selectedCourseId || availableCourses.length === 0}
                  className="gap-2"
                >
                  {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Confirm Enrollment
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
