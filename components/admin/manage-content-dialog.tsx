"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InlineSemesterManager } from "@/components/admin/inline-semester-manager";
import { InlineSubjectManager } from "@/components/admin/inline-subject-manager";
import { InlineLessonManager } from "@/components/admin/inline-lesson-manager";
import { CourseAccessDialog } from "@/components/admin/course-access-dialog";
import { getCourseAccent } from "@/lib/course-accent";
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
  const accent = getCourseAccent(hierarchyType);

  const isSemesters = hierarchyType === 1;
  const isSubjects = hierarchyType === 2;
  const buttonText = isSemesters ? "Manage Semesters" : isSubjects ? "Manage Subjects" : "Manage Lessons";
  const Icon = isSemesters ? CalendarRange : isSubjects ? Layers : BookOpen;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" onClick={() => setOpen(true)} className="group/btn">
        {buttonText}
        <ArrowRight data-icon="inline-end" className="transition-transform group-hover/btn:translate-x-0.5" />
      </Button>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg border [&_svg]:size-4 ${accent.iconTile} ${accent.iconColor}`}>
              <Icon />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="truncate text-lg tracking-tight">{courseTitle}</DialogTitle>
              <DialogDescription>
                {isSemesters
                  ? "Add, reorder and manage semesters, subjects & lessons"
                  : isSubjects
                    ? "Add, reorder and manage subjects & lessons"
                    : "Add, reorder and manage lessons"}
              </DialogDescription>
            </div>
            <div className="shrink-0 flex items-center">
               <CourseAccessDialog courseId={courseId} courseTitle={courseTitle} hierarchyType={hierarchyType} />
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
