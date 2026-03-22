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
import { createLesson } from "@/app/actions/courses";
import { Plus, AlertCircle, Loader2 } from "lucide-react";

interface LessonCreateDialogProps {
  courseId: string;
  subjectId: string;
}

export function LessonCreateDialog({
  courseId,
  subjectId,
}: LessonCreateDialogProps) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createLesson, undefined);

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
        New Lesson
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Lesson</DialogTitle>
          <DialogDescription>Add a lesson to this subject</DialogDescription>
        </DialogHeader>
        <form action={action} className="mt-4 space-y-4">
          {state?.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          <input type="hidden" name="courseId" value={courseId} />
          <input type="hidden" name="subjectId" value={subjectId} />
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              placeholder="Lesson title"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              name="description"
              placeholder="Lesson description"
              className="h-16 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="videoUrl">Video URL</Label>
            <Input
              id="videoUrl"
              name="videoUrl"
              placeholder="https://youtube.com/watch?v=..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <textarea
              id="content"
              name="content"
              placeholder="Lesson text content"
              className="h-24 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="durationMinutes">Duration (minutes)</Label>
            <Input
              id="durationMinutes"
              name="durationMinutes"
              type="number"
              placeholder="30"
              min="1"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className={buttonVariants({ className: "w-full" })}
          >
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {pending ? "Adding..." : "Add Lesson"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
