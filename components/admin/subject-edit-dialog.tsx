"use client";

import { useState, useEffect, useActionState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateSubject } from "@/app/actions/courses";
import { Loader2, Check, AlertCircle, Pencil } from "lucide-react";

interface SubjectEditDialogProps {
  subjectId: string;
  courseId: string;
  semesterId?: string;
  initialTitle: string;
  initialDescription: string;
  colorClasses: {
    numBg: string;
    numText: string;
  };
  onSuccess?: (subjectId: string, title: string, description: string) => void;
}

export function SubjectEditDialog({ subjectId, courseId, semesterId, initialTitle, initialDescription, colorClasses, onSuccess }: SubjectEditDialogProps) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(updateSubject, undefined);
  const [localTitle, setLocalTitle] = useState(initialTitle);
  const [localDesc, setLocalDesc] = useState(initialDescription);

  useEffect(() => {
    if (open) {
      setLocalTitle(initialTitle);
      setLocalDesc(initialDescription);
    }
  }, [open, initialTitle, initialDescription]);

  useEffect(() => {
    if (state?.success) {
      onSuccess?.(subjectId, localTitle, localDesc);
      setOpen(false);
    }
  }, [state?.success, subjectId, localTitle, localDesc, onSuccess]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`h-8 w-8 shrink-0 rounded-md transition-colors hover:bg-muted ${colorClasses.numText}`}
        title="Edit subject"
      >
        <Pencil className="h-4 w-4" />
      </button>
      <DialogContent className="sm:max-w-md w-[calc(100%-2rem)] mx-auto">
        <DialogHeader>
          <DialogTitle>Edit Subject</DialogTitle>
          <DialogDescription className="truncate">Update the subject details below.</DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-5 max-h-[calc(80vh-8rem)] overflow-y-auto pr-1">
          <input type="hidden" name="subjectId" value={subjectId} />
          <input type="hidden" name="courseId" value={courseId} />
          {semesterId && <input type="hidden" name="semesterId" value={semesterId} />}

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
              placeholder="Subject title"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description (optional)</label>
            <Textarea
              name="description"
              value={localDesc || ""}
              onChange={(e) => setLocalDesc(e.target.value)}
              placeholder="Subject description"
              rows={3}
            />
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
