"use client";

import { useState, useCallback } from "react";
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

interface EnrollmentCounterBadgeProps {
  userId: string;
  userName: string;
  enrollments: { course_id: string; title: string; batch: string | null }[];
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
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Active
      </span>
    );
  }
  if (status === "paused_override") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-1.5 py-0.5 text-[9px] font-bold text-red-600 dark:text-red-400">
        <Pause className="h-2 w-2" />
        Paused
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-600 dark:text-amber-400">
      <Pause className="h-2 w-2" />
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
      <button
        className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"
        onClick={handleToggle}
        title="Pause for this student"
      >
        <Pause className="h-2.5 w-2.5" />
      </button>
    );
  }
  if (effectiveStatus === "paused_override") {
    return (
      <button
        className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500/10 text-red-600 hover:bg-red-500/20"
        onClick={handleResumeGlobal}
        title="Resume (revert to global)"
      >
        <Play className="h-2.5 w-2.5" />
      </button>
    );
  }
  return (
    <button
      className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
      onClick={handleToggle}
      title="Pause for this student"
    >
      <Pause className="h-2.5 w-2.5" />
    </button>
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
    <div className="flex items-center justify-between gap-2 py-1 pl-6">
      <span className="text-muted-foreground flex-1 truncate text-[11px]">{lesson.title}</span>
      <div className="flex shrink-0 items-center gap-1">
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
    <div className="border-border/40 rounded-md border">
      <button
        onClick={() => setExpanded(!expanded)}
        className="hover:bg-muted/30 flex w-full items-center gap-1.5 px-2 py-1.5 text-left transition-colors"
      >
        {expanded ? (
          <ChevronDown className="text-muted-foreground h-3 w-3 shrink-0" />
        ) : (
          <ChevronRight className="text-muted-foreground h-3 w-3 shrink-0" />
        )}
        <Layers className="h-3 w-3 shrink-0 text-indigo-500" />
        <span className="flex-1 truncate text-[11px] font-medium">{subject.title}</span>
        <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
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
        <div className="border-border/20 bg-muted/5 divide-border/10 divide-y border-t">
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
            <p className="text-muted-foreground py-1 pl-6 text-[9px] italic">No lessons</p>
          )}
        </div>
      )}
    </div>
  );
}

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
    await pauseCourseCascade(userId, courseId, isPaused);
    handleRefresh();
    setCascadeLoading(false);
  };

  return (
    <div className="overflow-hidden rounded-lg border">
      <button
        onClick={toggleExpand}
        className="hover:bg-muted/30 flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors"
      >
        <BookOpen className="h-4 w-4 shrink-0 text-indigo-500" />
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
                  className="h-6 gap-1 text-[9px] text-red-600 hover:bg-red-500/10 hover:text-red-700"
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
                  className="h-6 gap-1 text-[9px] text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700"
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-blue-500/10 px-2 py-1 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-500/20 dark:text-blue-400">
        <BookOpen className="h-3 w-3" />
        {enrollments.length} {enrollments.length === 1 ? "course" : "courses"}
      </DialogTrigger>
      <DialogContent className="flex max-h-[80vh] flex-col sm:max-w-lg">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-indigo-500" />
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
            <span className="text-emerald-600">Active</span> = accessible.{" "}
            <span className="text-red-600">Paused</span> = blocked for this student.{" "}
            <span className="text-amber-600">Global</span> = paused for all.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
