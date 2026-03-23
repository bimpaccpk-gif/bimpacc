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
import { createCourse } from "@/app/actions/courses";
import { Plus, AlertCircle, Loader2, Check, Sparkles, BookOpen, List, Layers } from "lucide-react";
import { getHierarchyOptions } from "@/lib/hierarchy-config";
import { HierarchyType } from "@/types";
import { cn } from "@/lib/utils";

export function CourseCreateDialog() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createCourse, undefined);
  const [status, setStatus] = useState("published");
  const [hierarchyType, setHierarchyType] = useState<HierarchyType>(1);
  const hierarchyOptions = getHierarchyOptions();

  const hierarchyIcons: Record<number, React.ReactNode> = {
    1: <Layers className="h-5 w-5" />,
    2: <List className="h-5 w-5" />,
    3: <BookOpen className="h-5 w-5" />,
  };

  if (state?.success) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-2 dark:border-green-800 dark:bg-green-950">
        <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
        <span className="text-sm text-green-700 dark:text-green-300">{state.success}</span>
        <button
          onClick={() => {
            window.location.reload();
          }}
          className={buttonVariants({ size: "sm", variant: "outline" })}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add Another
        </button>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants({ className: "gap-2" })}>
        <Sparkles className="h-4 w-4" />
        Create Course
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center text-xl">Create New Course</DialogTitle>
          <DialogDescription className="text-center">
            Set up your course structure and start adding content
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="mt-6 space-y-6">
          {state?.error && (
            <Alert variant="destructive" className="animate-shake">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          {/* Course Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">
              Course Title
            </Label>
            <Input
              id="title"
              name="title"
              placeholder="e.g., Introduction to Web Development"
              required
              className="h-11"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Description
              <span className="ml-1 text-muted-foreground">(optional)</span>
            </Label>
            <textarea
              id="description"
              name="description"
              placeholder="Brief description of what students will learn..."
              className="h-20 w-full resize-none rounded-lg border bg-background px-4 py-3 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {/* Hierarchy Structure Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Course Structure</Label>
            <input type="hidden" name="hierarchy_type" value={hierarchyType} />
            <input type="hidden" name="status" value={status} />

            <div className="grid gap-3">
              {hierarchyOptions.map(({ type, config }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setHierarchyType(type)}
                  className={cn(
                    "flex items-start gap-4 rounded-lg border-2 p-4 text-left transition-all",
                    hierarchyType === type
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-muted hover:border-primary/30 hover:bg-muted/50"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors",
                      hierarchyType === type
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {hierarchyIcons[type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{config.name}</span>
                      {hierarchyType === type && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {config.description}
                    </p>
                    <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                      <span className="rounded bg-muted px-1.5 py-0.5">{config.entityNames.level1}</span>
                      {config.entityNames.level2 && (
                        <>
                          <span>→</span>
                          <span className="rounded bg-muted px-1.5 py-0.5">{config.entityNames.level2}</span>
                        </>
                      )}
                      {config.entityNames.level3 && (
                        <>
                          <span>→</span>
                          <span className="rounded bg-muted px-1.5 py-0.5">{config.entityNames.level3}</span>
                        </>
                      )}
                    </div>
                  </div>
                </button>
              ))}
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
                Creating Course...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Create Course
              </>
            )}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
