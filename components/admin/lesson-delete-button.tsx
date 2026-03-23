"use client";

import { useState, useActionState } from "react";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { deleteLesson } from "@/app/actions/courses";
import { Trash2, AlertCircle, Loader2 } from "lucide-react";

interface LessonDeleteButtonProps {
  lessonId: string;
  lessonTitle: string;
  subjectId?: string;
  courseId: string;
}

export function LessonDeleteButton({
  lessonId,
  lessonTitle,
  subjectId,
  courseId,
}: LessonDeleteButtonProps) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(deleteLesson, undefined);

  if (state?.success) {
    return <span className="text-xs text-success">{state.success}</span>;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={buttonVariants({ variant: "destructive", size: "sm" })}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Lesson</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{lessonTitle}</strong>?
          </DialogDescription>
        </DialogHeader>
        {state?.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}
        <form action={action} className="mt-4 flex gap-3">
          <input type="hidden" name="lessonId" value={lessonId} />
          {subjectId && <input type="hidden" name="subjectId" value={subjectId} />}
          <input type="hidden" name="courseId" value={courseId} />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className={buttonVariants({ variant: "outline" })}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className={buttonVariants({ variant: "destructive" })}
          >
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {pending ? "Deleting..." : "Delete Lesson"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
