"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InlineSemesterManager } from "@/components/admin/inline-semester-manager";
import { InlineSubjectManager } from "@/components/admin/inline-subject-manager";
import { InlineLessonManager } from "@/components/admin/inline-lesson-manager";
import { HierarchyType } from "@/types";
import { Layers, BookOpen, ArrowRight, CalendarRange } from "lucide-react";

interface ManageContentDialogProps {
  courseId: string;
  courseTitle: string;
  hierarchyType: HierarchyType;
}

export function ManageContentDialog({
  courseId,
  courseTitle,
  hierarchyType,
}: ManageContentDialogProps) {
  const [open, setOpen] = useState(false);

  const isSemesters = hierarchyType === 1;
  const isSubjects = hierarchyType === 2;
  const isLessons = hierarchyType === 3;
  const buttonText = isSemesters ? "Manage Semesters" : isSubjects ? "Manage Subjects" : "Manage Lessons";
  const Icon = isSemesters ? CalendarRange : isSubjects ? Layers : BookOpen;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="w-full flex items-center justify-center h-11 rounded-xl bg-gradient-to-r hover:from-primary hover:to-primary/80 bg-primary text-primary-foreground shadow-md shadow-primary/10 transition-all active:scale-[0.98] group/btn font-semibold">
        {buttonText}
        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">{courseTitle}</DialogTitle>
              <DialogDescription>
                {isSemesters
                  ? "Add, reorder and manage semesters, subjects & lessons"
                  : isSubjects
                    ? "Add, reorder and manage subjects & lessons"
                    : "Add, reorder and manage lessons"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6 py-2 min-h-0">
          {open && (
            isSemesters ? (
              <InlineSemesterManager courseId={courseId} />
            ) : isSubjects ? (
              <InlineSubjectManager courseId={courseId} />
            ) : (
              <InlineLessonManager courseId={courseId} />
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
