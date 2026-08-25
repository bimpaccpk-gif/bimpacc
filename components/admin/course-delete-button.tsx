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
import { deleteCourse } from "@/app/actions/courses";
import { cn } from "@/lib/utils";
import { Trash2, AlertCircle, Loader2 } from "lucide-react";

interface CourseDeleteButtonProps {
  courseId: string;
  courseTitle: string;
}

export function CourseDeleteButton({
  courseId,
  courseTitle,
}: CourseDeleteButtonProps) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(deleteCourse, undefined);

  if (state?.success) {
    return <span className="text-xs text-success">{state.success}</span>;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        )}
        title="Delete course"
      >
        <Trash2 className="size-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Course</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{courseTitle}</strong>? All
            subjects and lessons will also be deleted.
          </DialogDescription>
        </DialogHeader>
        {state?.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}
        <form action={action} className="mt-4 flex gap-3">
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
            {pending ? "Deleting..." : "Delete Course"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
