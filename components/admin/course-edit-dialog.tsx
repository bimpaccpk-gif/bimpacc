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
import { updateCourse } from "@/app/actions/courses";
import { getHierarchyOptions } from "@/lib/hierarchy-config";
import { Edit2, AlertCircle, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { HierarchyType } from "@/types";

interface CourseEditDialogProps {
  courseId: string;
  initialTitle: string;
  initialDescription: string;
  initialBatch: string;
  initialStatus: string;
  initialRegistrationOpen: boolean;
  initialHierarchyType: HierarchyType;
}

export function CourseEditDialog({
  courseId,
  initialTitle,
  initialDescription,
  initialBatch,
  initialStatus,
  initialRegistrationOpen,
  initialHierarchyType,
}: CourseEditDialogProps) {
  const [open, setOpen] = useState(false);
  // Wrap the server action so the dialog closes on success without an effect
  const [state, action, pending] = useActionState(
    async (
      prevState: Parameters<typeof updateCourse>[0],
      formData: Parameters<typeof updateCourse>[1]
    ) => {
      const result = await updateCourse(prevState, formData);
      if (result?.success) {
        setOpen(false);
      }
      return result;
    },
    undefined
  );
  const [status, setStatus] = useState(initialStatus || "draft");
  const [registrationOpen, setRegistrationOpen] = useState(initialRegistrationOpen);
  const [hierarchyType, setHierarchyType] = useState<HierarchyType>(initialHierarchyType);
  const hierarchyOptions = getHierarchyOptions();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={buttonVariants({ variant: "ghost", size: "icon" })}
        title="Edit course"
      >
        <Edit2 className="size-4" />
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
          <input type="hidden" name="hierarchy_type" value={hierarchyType} />

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

          {/* Hierarchy Type */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Hierarchy Structure</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {hierarchyOptions.map((type) => (
                <button
                  key={type.type}
                  type="button"
                  onClick={() => setHierarchyType(type.type)}
                  className={cn(
                    "flex flex-col items-start rounded-lg border-2 p-3 text-left transition-all",
                    hierarchyType === type.type
                      ? "border-primary bg-primary/5"
                      : "border-muted text-muted-foreground hover:border-primary/30 hover:bg-muted/50"
                  )}
                >
                  <span className={cn(
                    "text-sm font-semibold",
                    hierarchyType === type.type ? "text-primary" : "text-foreground"
                  )}>
                    {type.config.name}
                  </span>
                  <span className="text-[10px] font-mono mt-0.5 opacity-70">{type.config.description}</span>
                </button>
              ))}
            </div>
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
