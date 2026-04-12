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
import { HierarchyType } from "@/types";
import { Layers, BookOpen, ArrowRight, CalendarRange } from "lucide-react";

// Match hierarchy colors for dialog header
const hierarchyManageColors: Record<number, {
  iconBg: string;
  iconText: string;
  headerText: string;
}> = {
  1: {
    iconBg: "bg-violet-100 dark:bg-violet-950/60",
    iconText: "text-violet-600 dark:text-violet-400",
    headerText: "text-violet-600 dark:text-violet-400",
  },
  2: {
    iconBg: "bg-teal-100 dark:bg-teal-950/60",
    iconText: "text-teal-600 dark:text-teal-400",
    headerText: "text-teal-600 dark:text-teal-400",
  },
  3: {
    iconBg: "bg-amber-100 dark:bg-amber-950/60",
    iconText: "text-amber-600 dark:text-amber-400",
    headerText: "text-amber-600 dark:text-amber-400",
  },
};

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
  const colors = hierarchyManageColors[hierarchyType] ?? hierarchyManageColors[1];

  const isSemesters = hierarchyType === 1;
  const isSubjects = hierarchyType === 2;
  const isLessons = hierarchyType === 3;
  const buttonText = isSemesters ? "Manage Semesters" : isSubjects ? "Manage Subjects" : "Manage Lessons";
  const Icon = isSemesters ? CalendarRange : isSubjects ? Layers : BookOpen;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`w-full flex items-center justify-center h-11 rounded-xl shadow-md transition-all active:scale-[0.98] group/btn font-semibold bg-gradient-to-r text-white ${
          isSemesters ? "from-violet-600 to-violet-500 shadow-violet-500/20" :
          isSubjects ? "from-teal-600 to-teal-500 shadow-teal-500/20" :
          "from-amber-600 to-amber-500 shadow-amber-500/20"
        }`}
      >
        {buttonText}
        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
      </button>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${colors.iconBg}`}>
              <Icon className={`h-5 w-5 ${colors.iconText}`} />
            </div>
            <div>
              <DialogTitle className={`text-xl ${colors.headerText}`}>{courseTitle}</DialogTitle>
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
