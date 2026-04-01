"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import {
  setStudentContentAccess,
  removeStudentContentAccess,
  getCourseAccessForStudent,
  pauseCourseCascade,
} from "@/app/actions/content-access";
import type { CourseAccessTree, StudentContentAccess } from "@/types";

interface EnrollmentAccessDialogProps {
  userId: string;
  userName: string;
  courseId: string;
  courseTitle: string;
  courseBatch: string | null;
  enrolledCount: number;
}

type EffectiveStatus = "active" | "paused_override" | "paused_global";

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
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Active
      </span>
    );
  }
  if (status === "paused_override") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400">
        <Pause className="h-2.5 w-2.5" />
        Paused
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
      <Pause className="h-2.5 w-2.5" />
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
  contentType: "course" | "subject" | "lesson";
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
        className="h-5 w-5 rounded-full bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"
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
        className="h-5 w-5 rounded-full bg-red-500/10 text-red-600 hover:bg-red-500/20"
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
      className="h-5 w-5 rounded-full bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
      onClick={handleToggle}
      title="Pause for this student"
    >
      <Pause className="h-2.5 w-2.5" />
    </Button>
  );
}

function LessonRow({
  lesson,
  userId,
  courseGlobalPaused,
  subjectGlobalPaused,
  onRefresh,
}: {
  lesson: {
    id: string;
    title: string;
    isPaused: boolean;
    studentOverride: StudentContentAccess | null;
  };
  userId: string;
  courseGlobalPaused: boolean;
  subjectGlobalPaused: boolean;
  onRefresh: () => void;
}) {
  const effectiveGlobal = courseGlobalPaused || subjectGlobalPaused || lesson.isPaused;

  return (
    <div className="flex items-center justify-between gap-2 py-1.5 pl-6">
      <span className="text-muted-foreground flex-1 truncate text-xs">{lesson.title}</span>
      <div className="flex shrink-0 items-center gap-1.5">
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
    lessons: {
      id: string;
      title: string;
      isPaused: boolean;
      studentOverride: StudentContentAccess | null;
    }[];
  };
  userId: string;
  courseGlobalPaused: boolean;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const effectiveGlobal = courseGlobalPaused || subject.isPaused;

  return (
    <div className="border-border/50 rounded-md border">
      <button
        onClick={() => setExpanded(!expanded)}
        className="hover:bg-muted/30 flex w-full items-center gap-2 px-3 py-2 text-left transition-colors"
      >
        {expanded ? (
          <ChevronDown className="text-muted-foreground h-3 w-3 shrink-0" />
        ) : (
          <ChevronRight className="text-muted-foreground h-3 w-3 shrink-0" />
        )}
        <Layers className="h-3 w-3 shrink-0 text-indigo-500" />
        <span className="flex-1 truncate text-xs font-medium">{subject.title}</span>
        <div className="flex shrink-0 items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
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
        <div className="border-border/30 bg-muted/10 divide-border/20 divide-y border-t">
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
            <p className="text-muted-foreground py-1.5 pl-6 text-[10px] italic">No lessons</p>
          )}
        </div>
      )}
    </div>
  );
}

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
    await pauseCourseCascade(userId, courseId, isPaused);
    handleRefresh();
    setCascadeLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-blue-500/10 px-2 py-1 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-500/20 dark:text-blue-400">
        <Shield className="h-3 w-3" />
        Access ({enrolledCount})
      </DialogTrigger>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-indigo-500" />
            Content Access
          </DialogTitle>
          <DialogDescription>
            Manage {courseTitle}
            {courseBatch ? ` (Batch ${courseBatch})` : ""} access for {userName}
          </DialogDescription>
        </DialogHeader>

        {tree && (
          <div className="flex shrink-0 items-center gap-2 border-b pb-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 border-red-200 text-[10px] text-red-600 hover:bg-red-500/10 hover:text-red-700 dark:border-red-900"
              onClick={() => handleCascadePause(true)}
              disabled={cascadeLoading}
            >
              {cascadeLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Pause className="h-3 w-3" />
              )}
              Pause All Content
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 border-emerald-200 text-[10px] text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 dark:border-emerald-900"
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
                  <BookOpen className="h-4 w-4 text-indigo-500" />
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

              {/* Subjects (hierarchy type 1) */}
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
                  <span className="text-emerald-600">Active</span> = student can access.{" "}
                  <span className="text-red-600">Paused</span> = paused by admin for this student.{" "}
                  <span className="text-amber-600">Global</span> = paused for all students.
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
