"use client";

import { useState, useActionState, useEffect } from "react";
import { buttonVariants, Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { updateCourse } from "@/app/actions/courses";
import { Edit2, AlertCircle, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CourseEditDialogProps {
  courseId: string;
  initialTitle: string;
  initialDescription: string;
  initialBatch: string;
  initialStatus: string;
  initialRegistrationOpen: boolean;
}

export function CourseEditDialog({
  courseId,
  initialTitle,
  initialDescription,
  initialBatch,
  initialStatus,
  initialRegistrationOpen,
}: CourseEditDialogProps) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(updateCourse, undefined);
  const [status, setStatus] = useState(initialStatus || "draft");
  const [registrationOpen, setRegistrationOpen] = useState(initialRegistrationOpen);

  // Close dialog on success
  useEffect(() => {
    if (state?.success) {
      setOpen(false);
    }
  }, [state?.success]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="flex items-center justify-center border border-input bg-background h-[44px] w-[44px] sm:h-11 sm:w-11 rounded-xl border-primary/20 text-primary hover:bg-primary/5 hover:text-primary dark:border-primary/50 dark:text-primary dark:hover:bg-primary/10 active:scale-[0.98] transition-all">
        <Edit2 className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 dark:bg-primary/20">
            <Edit2 className="h-5 w-5 text-primary" />
          </div>
          <DialogTitle className="text-center text-xl">Edit Course</DialogTitle>
          <DialogDescription className="text-center">
            Update your course metadata and status.
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="mt-6 space-y-6">
          <input type="hidden" name="courseId" value={courseId} />
          <input type="hidden" name="status" value={status} />

          {state?.error && (
            <Alert variant="destructive" className="animate-shake">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          {/* Course Title */}
          <div className="space-y-2">
            <Label htmlFor="edit-title" className="text-sm font-medium">
              Course Title
            </Label>
            <Input
              id="edit-title"
              name="title"
              defaultValue={initialTitle}
              placeholder="e.g., Introduction to Web Development"
              required
              className="h-11"
            />
          </div>

          {/* Batch */}
          <div className="space-y-2">
            <Label htmlFor="edit-batch" className="text-sm font-medium">
              Batch
            </Label>
            <Input
              id="edit-batch"
              name="batch"
              defaultValue={initialBatch}
              placeholder="e.g., 2026-A"
              required
              className="h-11"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="edit-description" className="text-sm font-medium">
              Description
              <span className="ml-1 text-muted-foreground">(optional)</span>
            </Label>
            <textarea
              id="edit-description"
              name="description"
              defaultValue={initialDescription}
              placeholder="Brief description of what students will learn..."
              className="h-20 w-full resize-none rounded-lg border bg-background px-4 py-3 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Course Status</Label>
            <div className="grid grid-cols-3 gap-3">
              {(["draft", "published", "archived"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={cn(
                    "rounded-lg border-2 p-2 text-sm font-medium transition-all capitalize",
                    status === s
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-muted text-muted-foreground hover:border-primary/30 hover:bg-muted/50"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Additional Settings */}
          <div className="space-y-4 rounded-xl border bg-muted/30 p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="edit-registration" className="text-sm font-medium">
                  Registration Open
                </Label>
                <p className="text-xs text-muted-foreground">
                  Allow students to enroll in this course.
                </p>
              </div>
              <div className="flex items-center h-5">
                <input
                  id="edit-registration"
                  name="registration_open"
                  type="checkbox"
                  checked={registrationOpen}
                  onChange={(e) => setRegistrationOpen(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={pending}
            className={buttonVariants({
              className: "w-full h-11 text-base font-medium gap-2"
            })}
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving Changes...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
