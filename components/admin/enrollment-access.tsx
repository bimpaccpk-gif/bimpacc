"use client";

import * as React from "react";
import { useCallback, useContext, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm-action";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Loader2,
  BookOpen,
  Pause,
  Play,
  ChevronRight,
  ChevronDown,
  Layers,
  Shield,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import {
  setStudentContentAccess,
  removeStudentContentAccess,
  getCourseAccessForStudent,
  pauseCourseCascade,
} from "@/app/actions/content-access";
import type { CourseAccessTree, StudentContentAccess } from "@/types";

/**
 * Single implementation behind `enrollment-counter-badge` and
 * `enrollment-access-popover` (both re-export shims now). The two surfaces share
 * every tree primitive; they differ only in scope — the counter badge lists ALL
 * of a student's courses as lazy accordions, the access dialog manages ONE
 * course as a flat tree — and in density.
 */
type EffectiveStatus = "active" | "paused_override" | "paused_global";

/** "compact" reproduces the old counter-badge sizing, "default" the access dialog. */
type EnrollmentAccessDensity = "compact" | "default";

const DensityContext = React.createContext<EnrollmentAccessDensity>("default");

const DENSITY_STYLES: Record<
  EnrollmentAccessDensity,
  {
    statusBadge: string;
    toggleRow: string;
    lessonRow: string;
    lessonLabel: string;
    accordion: string;
    accordionTrigger: string;
    accordionLabel: string;
    accordionPanel: string;
    emptyHint: string;
  }
> = {
  compact: {
    statusBadge: "px-1.5 py-0.5 text-[9px] [&>svg]:h-2 [&>svg]:w-2",
    toggleRow: "gap-1",
    lessonRow: "py-1 pl-6",
    lessonLabel: "text-[11px]",
    accordion: "border-border/40",
    accordionTrigger: "gap-1.5 px-2 py-1.5",
    accordionLabel: "text-[11px]",
    accordionPanel: "border-border/20 bg-muted/5 divide-border/10 space-y-1 p-1.5",
    emptyHint: "py-1 pl-6 text-[9px]",
  },
  default: {
    statusBadge: "px-2 py-0.5 text-[10px] [&>svg]:h-2.5 [&>svg]:w-2.5",
    toggleRow: "gap-1.5",
    lessonRow: "py-1.5 pl-6",
    lessonLabel: "text-xs",
    accordion: "border-border/50",
    accordionTrigger: "gap-2 px-3 py-2",
    accordionLabel: "text-xs",
    accordionPanel: "border-border/30 bg-muted/10 divide-border/20 space-y-1 p-2",
    emptyHint: "py-1.5 pl-6 text-[10px]",
  },
};

function useDensityStyle() {
  return DENSITY_STYLES[useContext(DensityContext)];
}

function getEffectiveStatus(
  globalPaused: boolean,
  override: StudentContentAccess | null
): EffectiveStatus {
  if (override) {
    return override.is_paused ? "paused_override" : "active";
  }
  return globalPaused ? "paused_global" : "active";
}

function StatusBadge({ status }: { status: EffectiveStatus }) {
  const styles = useDensityStyle();

  if (status === "active") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-success/10 font-bold text-success",
          styles.statusBadge
        )}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-success" />
        Active
      </span>
    );
  }
  if (status === "paused_override") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-destructive/10 font-bold text-destructive",
          styles.statusBadge
        )}
      >
        <Pause />
        Paused
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-warning/10 font-bold text-warning-foreground dark:bg-warning/20 dark:text-warning",
        styles.statusBadge
      )}
    >
      <Pause />
      Global
    </span>
  );
}

function AccessToggle({
  contentType,
  contentId,
  userId,
  globalPaused,
  override,
  onToggle,
}: {
  contentType: "course" | "semester" | "subject" | "lesson";
  contentId: string;
  userId: string;
  globalPaused: boolean;
  override: StudentContentAccess | null;
  onToggle: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const effectiveStatus = getEffectiveStatus(globalPaused, override);

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (effectiveStatus === "paused_override") {
        await removeStudentContentAccess(userId, contentType, contentId);
      } else {
        await setStudentContentAccess(userId, contentType, contentId, true, "Paused by admin");
      }
      onToggle();
    } catch (err) {
      console.error("Toggle error:", err);
      toast.error("Could not update access. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResumeGlobal = async () => {
    if (!override) return;
    setLoading(true);
    try {
      await removeStudentContentAccess(userId, contentType, contentId);
      onToggle();
    } catch (err) {
      console.error("Resume error:", err);
      toast.error("Could not update access. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loader2 className="text-muted-foreground h-3 w-3 animate-spin" />;
  }

  if (effectiveStatus === "paused_global") {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 rounded-full bg-warning/10 text-warning hover:bg-warning/20"
        onClick={handleToggle}
        title="Pause for this student"
      >
        <Pause className="h-2.5 w-2.5" />
      </Button>
    );
  }
  if (effectiveStatus === "paused_override") {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20"
        onClick={handleResumeGlobal}
        title="Resume (revert to global)"
      >
        <Play className="h-2.5 w-2.5" />
      </Button>
    );
  }
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-5 w-5 rounded-full bg-success/10 text-success hover:bg-success/20"
      onClick={handleToggle}
      title="Pause for this student"
    >
      <Pause className="h-2.5 w-2.5" />
    </Button>
  );
}

interface LessonNode {
  id: string;
  title: string;
  isPaused: boolean;
  studentOverride: StudentContentAccess | null;
}

function LessonRow({
  lesson,
  userId,
  courseGlobalPaused,
  subjectGlobalPaused,
  onRefresh,
}: {
  lesson: LessonNode;
  userId: string;
  courseGlobalPaused: boolean;
  subjectGlobalPaused: boolean;
  onRefresh: () => void;
}) {
  const styles = useDensityStyle();
  const effectiveGlobal = courseGlobalPaused || subjectGlobalPaused || lesson.isPaused;

  return (
    <div className={cn("flex items-center justify-between", styles.lessonRow)}>
      <span className={cn("text-muted-foreground flex-1 truncate", styles.lessonLabel)}>
        {lesson.title}
      </span>
      <div className={cn("flex shrink-0 items-center", styles.toggleRow)}>
        <StatusBadge status={getEffectiveStatus(effectiveGlobal, lesson.studentOverride)} />
        <AccessToggle
          contentType="lesson"
          contentId={lesson.id}
          userId={userId}
          globalPaused={effectiveGlobal}
          override={lesson.studentOverride}
          onToggle={onRefresh}
        />
      </div>
    </div>
  );
}

function AccordionChevron({ expanded }: { expanded: boolean }) {
  return expanded ? (
    <ChevronDown className="text-muted-foreground h-3 w-3 shrink-0" />
  ) : (
    <ChevronRight className="text-muted-foreground h-3 w-3 shrink-0" />
  );
}

function SemesterAccordion({
  semester,
  userId,
  courseGlobalPaused,
  onRefresh,
}: {
  semester: {
    id: string;
    title: string;
    isPaused: boolean;
    studentOverride: StudentContentAccess | null;
    subjects: {
      id: string;
      title: string;
      isPaused: boolean;
      studentOverride: StudentContentAccess | null;
      lessons: LessonNode[];
    }[];
  };
  userId: string;
  courseGlobalPaused: boolean;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const styles = useDensityStyle();
  const effectiveGlobal = courseGlobalPaused || semester.isPaused;

  return (
    <div className={cn("rounded-md border", styles.accordion)}>
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "hover:bg-muted/30 flex w-full items-center text-left transition-colors",
          styles.accordionTrigger
        )}
      >
        <AccordionChevron expanded={expanded} />
        <Calendar className="h-3 w-3 shrink-0 text-muted-foreground" />
        <span className={cn("flex-1 truncate font-medium", styles.accordionLabel)}>
          {semester.title}
        </span>
        <div
          className={cn("flex shrink-0 items-center", styles.toggleRow)}
          onClick={(e) => e.stopPropagation()}
        >
          <StatusBadge status={getEffectiveStatus(effectiveGlobal, semester.studentOverride)} />
          <AccessToggle
            contentType="semester"
            contentId={semester.id}
            userId={userId}
            globalPaused={effectiveGlobal}
            override={semester.studentOverride}
            onToggle={onRefresh}
          />
        </div>
      </button>
      {expanded && (
        <div className={cn("divide-border/10 space-y-1 border-t", styles.accordionPanel)}>
          {semester.subjects.map((subject) => (
            <SubjectAccordion
              key={subject.id}
              subject={subject}
              userId={userId}
              courseGlobalPaused={effectiveGlobal}
              onRefresh={onRefresh}
            />
          ))}
          {semester.subjects.length === 0 && (
            <p className={cn("text-muted-foreground italic", styles.emptyHint)}>No subjects</p>
          )}
        </div>
      )}
    </div>
  );
}

function SubjectAccordion({
  subject,
  userId,
  courseGlobalPaused,
  onRefresh,
}: {
  subject: {
    id: string;
    title: string;
    isPaused: boolean;
    studentOverride: StudentContentAccess | null;
    lessons: LessonNode[];
  };
  userId: string;
  courseGlobalPaused: boolean;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const styles = useDensityStyle();
  const effectiveGlobal = courseGlobalPaused || subject.isPaused;

  return (
    <div className={cn("rounded-md border", styles.accordion)}>
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "hover:bg-muted/30 flex w-full items-center text-left transition-colors",
          styles.accordionTrigger
        )}
      >
        <AccordionChevron expanded={expanded} />
        <Layers className="h-3 w-3 shrink-0 text-primary" />
        <span className={cn("flex-1 truncate font-medium", styles.accordionLabel)}>
          {subject.title}
        </span>
        <div
          className={cn("flex shrink-0 items-center", styles.toggleRow)}
          onClick={(e) => e.stopPropagation()}
        >
          <StatusBadge status={getEffectiveStatus(effectiveGlobal, subject.studentOverride)} />
          <AccessToggle
            contentType="subject"
            contentId={subject.id}
            userId={userId}
            globalPaused={effectiveGlobal}
            override={subject.studentOverride}
            onToggle={onRefresh}
          />
        </div>
      </button>
      {expanded && (
        <div className={cn("divide-border/10 divide-y border-t", styles.accordionPanel)}>
          {subject.lessons.map((lesson) => (
            <LessonRow
              key={lesson.id}
              lesson={lesson}
              userId={userId}
              courseGlobalPaused={courseGlobalPaused}
              subjectGlobalPaused={effectiveGlobal}
              onRefresh={onRefresh}
            />
          ))}
          {subject.lessons.length === 0 && (
            <p className={cn("text-muted-foreground italic", styles.emptyHint)}>No lessons</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Public contract: per-course management dialog ───────────────────────────

export interface EnrollmentAccessDialogProps {
  userId: string;
  userName: string;
  courseId: string;
  courseTitle: string;
  courseBatch: string | null;
  enrolledCount: number;
}

/**
 * Manage content access for ONE course: flat course → semester/subject/lesson
 * tree with cascade pause/resume. Previously lived in
 * `enrollment-access-popover.tsx` as `EnrollmentAccessDialog`.
 */
export function EnrollmentAccessDialog({
  userId,
  userName,
  courseId,
  courseTitle,
  courseBatch,
  enrolledCount,
}: EnrollmentAccessDialogProps) {
  const [open, setOpen] = useState(false);
  const [tree, setTree] = useState<CourseAccessTree | null>(null);
  const [loading, setLoading] = useState(false);
  const [cascadeLoading, setCascadeLoading] = useState(false);

  const fetchTree = useCallback(async () => {
    setLoading(true);
    const { data } = await getCourseAccessForStudent(userId, courseId);
    setTree(data);
    setLoading(false);
  }, [userId, courseId]);

  useEffect(() => {
    if (open && !tree) {
      fetchTree();
    }
  }, [open, tree, fetchTree]);

  const handleRefresh = () => {
    setTree(null);
    fetchTree();
  };

  const handleCascadePause = async (isPaused: boolean) => {
    setCascadeLoading(true);
    try {
      const res = await pauseCourseCascade(userId, courseId, isPaused);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success(
          isPaused
            ? `All content paused for ${userName}`
            : `All content resumed for ${userName}`
        );
      }
      handleRefresh();
    } finally {
      setCascadeLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-info/10 px-2 py-1 text-xs font-semibold text-info transition-colors hover:bg-info/20 dark:text-info">
        <Shield className="h-3 w-3" />
        Access ({enrolledCount})
      </DialogTrigger>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Content Access
          </DialogTitle>
          <DialogDescription>
            Manage {courseTitle}
            {courseBatch ? ` (Batch ${courseBatch})` : ""} access for {userName}
          </DialogDescription>
        </DialogHeader>

        {tree && (
          <div className="flex shrink-0 items-center gap-2 border-b pb-2">
            <ConfirmAction
              trigger={
                <Button
                  variant="outline"
                  size="sm"
                  disabled={cascadeLoading}
                  className="h-7 gap-1 border-destructive/30 text-[10px] text-destructive hover:bg-destructive/10 hover:text-destructive dark:border-destructive/30"
                >
                  {cascadeLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Pause className="h-3 w-3" />
                  )}
                  Pause All Content
                </Button>
              }
              title="Pause all content?"
              description={`${userName} will lose access to every part of ${courseTitle}${
                courseBatch ? ` (Batch ${courseBatch})` : ""
              } until it is resumed.`}
              confirmLabel="Pause All"
              onConfirm={() => handleCascadePause(true)}
            />
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 border-success/30 text-[10px] text-success hover:bg-success/10 hover:text-success dark:border-success/30"
              onClick={() => handleCascadePause(false)}
              disabled={cascadeLoading}
            >
              {cascadeLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Play className="h-3 w-3" />
              )}
              Resume All Content
            </Button>
          </div>
        )}

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
            </div>
          )}

          {!loading && tree && (
            <>
              {/* Course level */}
              <div className="bg-muted/30 flex items-center justify-between gap-2 rounded-md px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">Course Level</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <StatusBadge
                    status={getEffectiveStatus(tree.courseIsPaused, tree.studentOverride)}
                  />
                  <AccessToggle
                    contentType="course"
                    contentId={courseId}
                    userId={userId}
                    globalPaused={tree.courseIsPaused}
                    override={tree.studentOverride}
                    onToggle={handleRefresh}
                  />
                </div>
              </div>

              {/* Semesters (hierarchy type 1) */}
              {tree.semesters.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-muted-foreground px-1 text-[10px] font-semibold tracking-wider uppercase">
                    Semesters & Subjects
                  </p>
                  {tree.semesters.map((semester) => (
                    <SemesterAccordion
                      key={semester.id}
                      semester={semester}
                      userId={userId}
                      courseGlobalPaused={tree.courseIsPaused}
                      onRefresh={handleRefresh}
                    />
                  ))}
                </div>
              )}

              {/* Subjects (hierarchy type 2) */}
              {tree.subjects.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-muted-foreground px-1 text-[10px] font-semibold tracking-wider uppercase">
                    Subjects & Lessons
                  </p>
                  {tree.subjects.map((subject) => (
                    <SubjectAccordion
                      key={subject.id}
                      subject={subject}
                      userId={userId}
                      courseGlobalPaused={tree.courseIsPaused}
                      onRefresh={handleRefresh}
                    />
                  ))}
                </div>
              )}

              {/* Direct lessons (hierarchy type 2/3) */}
              {tree.directLessons.length > 0 && (
                <div className="space-y-1">
                  <p className="text-muted-foreground px-1 text-[10px] font-semibold tracking-wider uppercase">
                    Lessons
                  </p>
                  {tree.directLessons.map((lesson) => (
                    <LessonRow
                      key={lesson.id}
                      lesson={lesson}
                      userId={userId}
                      courseGlobalPaused={tree.courseIsPaused}
                      subjectGlobalPaused={false}
                      onRefresh={handleRefresh}
                    />
                  ))}
                </div>
              )}

              {/* Legend */}
              <div className="mt-2 border-t pt-2">
                <p className="text-muted-foreground px-1 text-[10px]">
                  <span className="font-semibold">Status:</span>{" "}
                  <span className="text-success">Active</span> = student can access.{" "}
                  <span className="text-destructive">Paused</span> = paused by admin for this
                  student. <span className="text-warning">Global</span> = paused for all students.
                </p>
              </div>
            </>
          )}

          {!loading && !tree && (
            <p className="text-muted-foreground py-8 text-center text-sm">
              Failed to load access data.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Public contract: all-courses counter badge ──────────────────────────────

export interface EnrollmentCounterBadgeProps {
  userId: string;
  userName: string;
  enrollments: { course_id: string; title: string; batch: string | null }[];
}

/** One enrolled course rendered as a lazily-loaded accordion (badge dialog body). */
function CourseAccessItem({
  userId,
  courseId,
  courseTitle,
  courseBatch,
  onRefresh,
}: {
  userId: string;
  courseId: string;
  courseTitle: string;
  courseBatch: string | null;
  onRefresh: () => void;
}) {
  const [tree, setTree] = useState<CourseAccessTree | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [cascadeLoading, setCascadeLoading] = useState(false);

  const fetchTree = useCallback(async () => {
    setLoading(true);
    const { data } = await getCourseAccessForStudent(userId, courseId);
    setTree(data);
    setLoading(false);
  }, [userId, courseId]);

  const toggleExpand = () => {
    if (!expanded && !tree) {
      fetchTree();
    }
    setExpanded(!expanded);
  };

  const handleRefresh = () => {
    setTree(null);
    fetchTree();
    onRefresh();
  };

  const handleCascadePause = async (isPaused: boolean) => {
    setCascadeLoading(true);
    try {
      await pauseCourseCascade(userId, courseId, isPaused);
      handleRefresh();
    } catch {
      toast.error("Could not update course access.");
    } finally {
      setCascadeLoading(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-lg border">
      <button
        onClick={toggleExpand}
        className="hover:bg-muted/30 flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors"
      >
        <BookOpen className="h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{courseTitle}</span>
          {courseBatch && (
            <span className="text-muted-foreground text-[10px]">Batch {courseBatch}</span>
          )}
        </div>
        {tree && (
          <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <StatusBadge status={getEffectiveStatus(tree.courseIsPaused, tree.studentOverride)} />
            <AccessToggle
              contentType="course"
              contentId={courseId}
              userId={userId}
              globalPaused={tree.courseIsPaused}
              override={tree.studentOverride}
              onToggle={handleRefresh}
            />
          </div>
        )}
        {expanded ? (
          <ChevronDown className="text-muted-foreground h-4 w-4 shrink-0" />
        ) : (
          <ChevronRight className="text-muted-foreground h-4 w-4 shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="bg-muted/10 space-y-1.5 border-t p-2">
          {loading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
            </div>
          )}

          {!loading && tree && (
            <>
              {/* Cascade buttons */}
              <div className="border-border/30 flex items-center gap-1 border-b pb-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1 text-[9px] text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => handleCascadePause(true)}
                  disabled={cascadeLoading}
                >
                  {cascadeLoading ? (
                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                  ) : (
                    <Pause className="h-2.5 w-2.5" />
                  )}
                  Pause All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1 text-[9px] text-success hover:bg-success/10 hover:text-success"
                  onClick={() => handleCascadePause(false)}
                  disabled={cascadeLoading}
                >
                  {cascadeLoading ? (
                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                  ) : (
                    <Play className="h-2.5 w-2.5" />
                  )}
                  Resume All
                </Button>
              </div>

              {/* Subjects */}
              {tree.subjects.length > 0 && (
                <div className="space-y-1">
                  {tree.subjects.map((subject) => (
                    <SubjectAccordion
                      key={subject.id}
                      subject={subject}
                      userId={userId}
                      courseGlobalPaused={tree.courseIsPaused}
                      onRefresh={handleRefresh}
                    />
                  ))}
                </div>
              )}

              {/* Direct lessons */}
              {tree.directLessons.length > 0 && (
                <div className="space-y-0.5">
                  {tree.directLessons.map((lesson) => (
                    <LessonRow
                      key={lesson.id}
                      lesson={lesson}
                      userId={userId}
                      courseGlobalPaused={tree.courseIsPaused}
                      subjectGlobalPaused={false}
                      onRefresh={handleRefresh}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {!loading && !tree && (
            <p className="text-muted-foreground py-3 text-center text-xs">Failed to load.</p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Trigger pill showing how many courses a student is enrolled in; opens a
 * dialog listing every course with per-course access management. Previously
 * lived in `enrollment-counter-badge.tsx` as `EnrollmentCounterBadge`.
 */
export function EnrollmentCounterBadge({
  userId,
  userName,
  enrollments,
}: EnrollmentCounterBadgeProps) {
  const [open, setOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
  };

  if (enrollments.length === 0) {
    return <span className="text-muted-foreground text-xs">Not enrolled</span>;
  }

  return (
    <CompactDensity>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-info/10 px-2 py-1 text-xs font-semibold text-info transition-colors hover:bg-info/20 dark:text-info">
          <BookOpen className="h-3 w-3" />
          {enrollments.length} {enrollments.length === 1 ? "course" : "courses"}
        </DialogTrigger>
        <DialogContent className="flex max-h-[80vh] flex-col sm:max-w-lg">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Enrolled Courses
            </DialogTitle>
            <DialogDescription>
              {userName} is enrolled in {enrollments.length}{" "}
              {enrollments.length === 1 ? "course" : "courses"}. Click a course to manage content
              access.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto py-1">
            {enrollments.map((enrollment) => (
              <CourseAccessItem
                key={`${enrollment.course_id}-${refreshKey}`}
                userId={userId}
                courseId={enrollment.course_id}
                courseTitle={enrollment.title}
                courseBatch={enrollment.batch}
                onRefresh={handleRefresh}
              />
            ))}
          </div>
          <div className="shrink-0 border-t pt-2">
            <p className="text-muted-foreground px-1 text-[10px]">
              Click a course to expand and manage access at course, subject, or lesson level.{" "}
              <span className="text-success">Active</span> = accessible.{" "}
              <span className="text-destructive">Paused</span> = blocked for this student.{" "}
              <span className="text-warning">Global</span> = paused for all.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </CompactDensity>
  );
}

/**
 * Renders children at the counter-badge's compact density so the badge dialog
 * keeps its tighter scale without consumers opting in manually.
 */
function CompactDensity({ children }: { children: React.ReactNode }) {
  return (
    <DensityContext.Provider value="compact">
      {children}
    </DensityContext.Provider>
  );
}
