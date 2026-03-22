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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createSubject } from "@/app/actions/courses";
import { Plus, AlertCircle, Loader2 } from "lucide-react";

export function SubjectCreateDialog({ courseId }: { courseId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createSubject, undefined);

  if (state?.success) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-success">{state.success}</span>
        <button
          onClick={() => window.location.reload()}
          className={buttonVariants({ size: "sm" })}
        >
          <Plus className="mr-1 h-4 w-4" /> Add Another
        </button>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants()}>
        <Plus className="mr-2 h-4 w-4" />
        New Subject
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Subject</DialogTitle>
          <DialogDescription>
            Add a subject to organize course content
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="mt-4 space-y-4">
          {state?.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          <input type="hidden" name="courseId" value={courseId} />
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              placeholder="Subject title"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              name="description"
              placeholder="Subject description"
              className="h-20 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className={buttonVariants({ className: "w-full" })}
          >
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {pending ? "Adding..." : "Add Subject"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
