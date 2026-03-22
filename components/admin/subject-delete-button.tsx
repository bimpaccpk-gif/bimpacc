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
import { deleteSubject } from "@/app/actions/courses";
import { Trash2, AlertCircle, Loader2 } from "lucide-react";

interface SubjectDeleteButtonProps {
  subjectId: string;
  subjectTitle: string;
  courseId: string;
}

export function SubjectDeleteButton({
  subjectId,
  subjectTitle,
  courseId,
}: SubjectDeleteButtonProps) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(deleteSubject, undefined);

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
          <DialogTitle>Delete Subject</DialogTitle>
          <DialogDescription>
            Delete <strong>{subjectTitle}</strong>? All lessons under this
            subject will also be deleted.
          </DialogDescription>
        </DialogHeader>
        {state?.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}
        <form action={action} className="mt-4 flex gap-3">
          <input type="hidden" name="subjectId" value={subjectId} />
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
            {pending ? "Deleting..." : "Delete Subject"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
