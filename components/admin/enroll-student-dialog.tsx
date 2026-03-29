"use client";

import { useActionState, useState, useEffect } from "react";
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

interface EnrollStudentDialogProps {
  studentId: string;
  studentName: string;
  courses: CourseRow[];
}

export function EnrollStudentDialog({ studentId, studentName, courses }: EnrollStudentDialogProps) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(enrollStudentInCourse, undefined);
  const [selectedCourseId, setSelectedCourseId] = useState("");

  // Auto close dialog on success
  useEffect(() => {
    if (state?.success) {
      const timer = setTimeout(() => {
        setOpen(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [state?.success]);

  // Reset state when dialg opens
  useEffect(() => {
    if (open) {
      setSelectedCourseId("");
      // Reset action state might be tricky without a wrapper, 
      // but users will select a new course anyway
    }
  }, [open]);

  const publishedCourses = courses.filter((c) => c.status === "published");

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2 h-8"
      >
        <PlusCircle className="h-4 w-4" />
        Enroll
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Enroll Student in Course</DialogTitle>
            <DialogDescription>
              Enroll <span className="font-semibold text-foreground">{studentName}</span> into a published course.
            </DialogDescription>
          </DialogHeader>

          {state?.success ? (
            <div className="py-6 flex flex-col items-center justify-center text-center space-y-3">
              <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
              <p className="text-sm font-medium text-emerald-600">
                {state.success}
              </p>
            </div>
          ) : (
            <form action={action} className="space-y-4 py-4">
              <input type="hidden" name="studentId" value={studentId} />
              
              <div className="space-y-2">
                <Label htmlFor="courseId">Select Course</Label>
                <select
                  id="courseId"
                  name="courseId"
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  required
                >
                  <option value="" disabled>Select a course...</option>
                  {publishedCourses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title} {course.batch ? `(Batch ${course.batch})` : ""}
                    </option>
                  ))}
                  {publishedCourses.length === 0 && (
                    <option value="" disabled>No published courses available</option>
                  )}
                </select>
              </div>

              {state?.error && (
                <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                  {state.error}
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
                  disabled={pending || !selectedCourseId || publishedCourses.length === 0}
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
