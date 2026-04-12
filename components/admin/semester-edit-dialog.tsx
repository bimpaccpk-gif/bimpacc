"use client";

import { useState, useEffect, useActionState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateSemester } from "@/app/actions/courses";
import { Loader2, Check, AlertCircle, Pencil } from "lucide-react";

interface SemesterEditDialogProps {
  semesterId: string;
  courseId: string;
  initialTitle: string;
  initialDescription: string;
  colorClasses: {
    numBg: string;
    numText: string;
  };
  onSuccess?: (semesterId: string, title: string, description: string) => void;
}

export function SemesterEditDialog({ semesterId, courseId, initialTitle, initialDescription, colorClasses, onSuccess }: SemesterEditDialogProps) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(updateSemester, undefined);
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
      onSuccess?.(semesterId, localTitle, localDesc);
      setOpen(false);
    }
  }, [state?.success, semesterId, localTitle, localDesc, onSuccess]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`h-8 w-8 shrink-0 rounded-md transition-colors hover:bg-muted ${colorClasses.numText}`}
        title="Edit semester"
      >
        <Pencil className="h-4 w-4" />
      </button>
      <DialogContent className="sm:max-w-md w-[calc(100%-2rem)] mx-auto">
        <DialogHeader>
          <DialogTitle>Edit Semester</DialogTitle>
          <DialogDescription className="truncate">Update the semester details below.</DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-5 max-h-[calc(80vh-8rem)] overflow-y-auto pr-1">
          <input type="hidden" name="semesterId" value={semesterId} />
          <input type="hidden" name="courseId" value={courseId} />

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
              placeholder="Semester title"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description (optional)</label>
            <Textarea
              name="description"
              value={localDesc || ""}
              onChange={(e) => setLocalDesc(e.target.value)}
              placeholder="Semester description"
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
