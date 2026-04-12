"use client";

import { useState, useEffect, useActionState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateLesson } from "@/app/actions/courses";
import { Loader2, Check, AlertCircle, Pencil } from "lucide-react";

interface LessonEditDialogProps {
  lessonId: string;
  courseId: string;
  subjectId?: string;
  initialTitle: string;
  initialDescription: string;
  initialContent: string | null;
  initialVideoUrl: string | null;
  initialDuration: number | null;
  colorClasses: {
    numBg: string;
    numText: string;
  };
  onSuccess?: (lessonId: string, title: string, description: string, content: string, videoUrl: string, duration: number | null) => void;
}

export function LessonEditDialog({
  lessonId,
  courseId,
  subjectId,
  initialTitle,
  initialDescription,
  initialContent,
  initialVideoUrl,
  initialDuration,
  colorClasses,
  onSuccess,
}: LessonEditDialogProps) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(updateLesson, undefined);
  const [localTitle, setLocalTitle] = useState(initialTitle);
  const [localDesc, setLocalDesc] = useState(initialDescription);
  const [localContent, setLocalContent] = useState(initialContent || "");
  const [localVideoUrl, setLocalVideoUrl] = useState(initialVideoUrl || "");
  const [localDuration, setLocalDuration] = useState(initialDuration?.toString() || "");

  useEffect(() => {
    if (open) {
      setLocalTitle(initialTitle);
      setLocalDesc(initialDescription);
      setLocalContent(initialContent || "");
      setLocalVideoUrl(initialVideoUrl || "");
      setLocalDuration(initialDuration?.toString() || "");
    }
  }, [open, initialTitle, initialDescription, initialContent, initialVideoUrl, initialDuration]);

  useEffect(() => {
    if (state?.success) {
      onSuccess?.(lessonId, localTitle, localDesc, localContent, localVideoUrl, localDuration ? parseInt(localDuration) : null);
      setOpen(false);
    }
  }, [state?.success, lessonId, localTitle, localDesc, localContent, localVideoUrl, localDuration, onSuccess]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`h-8 w-8 shrink-0 rounded-md transition-colors hover:bg-muted ${colorClasses.numText}`}
        title="Edit lesson"
      >
        <Pencil className="h-4 w-4" />
      </button>
      <DialogContent className="sm:max-w-md w-[calc(100%-2rem)] mx-auto">
        <DialogHeader>
          <DialogTitle>Edit Lesson</DialogTitle>
          <DialogDescription className="truncate">Update the lesson details below.</DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-5 max-h-[calc(80vh-8rem)] overflow-y-auto pr-1">
          <input type="hidden" name="lessonId" value={lessonId} />
          <input type="hidden" name="courseId" value={courseId} />
          {subjectId && <input type="hidden" name="subjectId" value={subjectId} />}

          {state?.error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {state.error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input
              name="title"
              value={localTitle}
              onChange={(e) => setLocalTitle(e.target.value)}
              required
              placeholder="Lesson title"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description (optional)</label>
            <Textarea
              name="description"
              value={localDesc || ""}
              onChange={(e) => setLocalDesc(e.target.value)}
              placeholder="Lesson description"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Content (optional)</label>
            <Textarea
              name="content"
              value={localContent || ""}
              onChange={(e) => setLocalContent(e.target.value)}
              placeholder="Lesson content / notes"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">YouTube URL (optional)</label>
              <Input
                name="videoUrl"
                value={localVideoUrl || ""}
                onChange={(e) => setLocalVideoUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Duration (min, optional)</label>
              <Input
                name="durationMinutes"
                type="number"
                min="1"
                value={localDuration}
                onChange={(e) => setLocalDuration(e.target.value)}
                placeholder="e.g. 30"
              />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !localTitle.trim()} className="sm:w-auto">
              {pending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
