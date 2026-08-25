"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, Pause, Play, Shield, Users, Check, Search, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { HierarchyType } from "@/types";
import {
  getCourseStudentAccessList,
  getCourseAccessTargets,
  setStudentContentAccess,
  removeStudentContentAccess,
  bulkPauseForStudents,
} from "@/app/actions/content-access";

// Match hierarchy colors
const hierarchyAccessColors: Record<number, {
  avatarBg: string;
  avatarText: string;
  progressBg: string;
  progressText: string;
  dateBg: string;
  dateText: string;
  dialogIcon: string;
}> = {
  1: {
    avatarBg: "bg-blue-100 dark:bg-blue-950/70",
    avatarText: "text-blue-700 dark:text-blue-400",
    progressBg: "bg-blue-100 dark:bg-blue-900/60",
    progressText: "text-blue-700 dark:text-blue-400",
    dateBg: "bg-blue-50 dark:bg-blue-950/40",
    dateText: "text-blue-600 dark:text-blue-400",
    dialogIcon: "text-blue-600 dark:text-blue-400",
  },
  2: {
    avatarBg: "bg-teal-100 dark:bg-teal-950/70",
    avatarText: "text-teal-700 dark:text-teal-400",
    progressBg: "bg-teal-100 dark:bg-teal-900/60",
    progressText: "text-teal-700 dark:text-teal-400",
    dateBg: "bg-teal-50 dark:bg-teal-950/40",
    dateText: "text-teal-600 dark:text-teal-400",
    dialogIcon: "text-teal-600 dark:text-teal-400",
  },
  3: {
    avatarBg: "bg-amber-100 dark:bg-amber-950/70",
    avatarText: "text-amber-700 dark:text-amber-400",
    progressBg: "bg-amber-100 dark:bg-amber-900/60",
    progressText: "text-amber-700 dark:text-amber-400",
    dateBg: "bg-amber-50 dark:bg-amber-950/40",
    dateText: "text-amber-600 dark:text-amber-400",
    dialogIcon: "text-amber-600 dark:text-amber-400",
  },
};

interface CourseAccessDialogProps {
  courseId: string;
  courseTitle: string;
  hierarchyType?: HierarchyType;
}

type AccessTargetType = "course" | "semester" | "subject" | "lesson";

export function CourseAccessDialog({ courseId, courseTitle, hierarchyType = 1 }: CourseAccessDialogProps) {
  const [open, setOpen] = useState(false);
  const [students, setStudents] = useState<
    Array<{
      userId: string;
      userName: string;
      email: string;
      isPaused: boolean;
      overrideId: string | null;
      progress: number | null;
      enrolledAt: string | null;
    }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [targetType, setTargetType] = useState<AccessTargetType>("course");
  const [selectedSemesterId, setSelectedSemesterId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [targets, setTargets] = useState<{
    semesters: Array<{ id: string; title: string }>;
    subjects: Array<{ id: string; title: string; subtitle: string }>;
    lessons: Array<{ id: string; title: string; subtitle: string }>;
  }>({ semesters: [], subjects: [], lessons: [] });

  const selectedTarget =
    targetType === "course"
      ? { type: "course" as const, id: courseId, label: "course" }
      : targetType === "semester"
        ? {
            type: "semester" as const,
            id: selectedSemesterId,
            label: "semester",
          }
        : targetType === "subject"
          ? {
              type: "subject" as const,
              id: selectedSubjectId,
              label: "subject",
            }
        : {
            type: "lesson" as const,
            id: selectedLessonId,
            label: "lesson",
          };

  const fetchStudents = useCallback(async () => {
    if (selectedTarget.type !== "course" && !selectedTarget.id) {
      setStudents([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await getCourseStudentAccessList(
        courseId,
        selectedTarget.type,
        selectedTarget.id
      );
      if (result.error) {
        setError(result.error);
        setStudents([]);
      } else {
        setStudents(result.data);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load students");
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [courseId, selectedTarget.id, selectedTarget.type]);

  const fetchTargets = useCallback(async () => {
    const result = await getCourseAccessTargets(courseId);
    if (!result.error) {
      setTargets(result.data);
      setSelectedSemesterId((current) =>
        current || result.data.semesters[0]?.id || ""
      );
      setSelectedSubjectId((current) => current || result.data.subjects[0]?.id || "");
      setSelectedLessonId((current) => current || result.data.lessons[0]?.id || "");
    }
  }, [courseId]);

  useEffect(() => {
    if (open) {
      fetchTargets();
    }
  }, [open, fetchTargets]);

  useEffect(() => {
    if (open) {
      fetchStudents();
    }
  }, [open, selectedTarget.id, selectedTarget.type, fetchStudents]);

  const handleToggle = async (userId: string, currentlyPaused: boolean, overrideId: string | null) => {
    if (!selectedTarget.id) return;

    setPendingIds((prev) => new Set(prev).add(userId));
    try {
      if (currentlyPaused) {
        if (overrideId) {
          await removeStudentContentAccess(userId, selectedTarget.type, selectedTarget.id);
        } else {
          await setStudentContentAccess(
            userId,
            selectedTarget.type,
            selectedTarget.id,
            false,
            `Resumed ${selectedTarget.label} by admin`
          );
        }
      } else {
        await setStudentContentAccess(
          userId,
          selectedTarget.type,
          selectedTarget.id,
          true,
          `Paused ${selectedTarget.label} by admin`
        );
      }
      await fetchStudents();
      setMessage(
        currentlyPaused
          ? `Student ${selectedTarget.label} access resumed.`
          : `Student ${selectedTarget.label} access paused.`
      );
      setTimeout(() => setMessage(""), 2000);
    } catch (err) {
      console.error("Toggle error:", err);
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const handleBulkPause = async (isPaused: boolean) => {
    if (!selectedTarget.id) return;

    setBulkLoading(true);
    try {
      const studentIds = students.map((s) => s.userId);
      const result = await bulkPauseForStudents(
        selectedTarget.type,
        selectedTarget.id,
        isPaused,
        studentIds
      );
      setMessage(result.success || result.error);
      await fetchStudents();
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      console.error("Bulk error:", err);
    } finally {
      setBulkLoading(false);
    }
  };

  const filtered = students.filter(
    (s) =>
      s.userName.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
  );

  const pausedCount = students.filter((s) => s.isPaused).length;
  const activeCount = students.length - pausedCount;
  const colors = hierarchyAccessColors[hierarchyType] ?? hierarchyAccessColors[1];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Student Access"
        aria-label="Manage student access"
        className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&_svg]:size-4"
      >
        <Shield />
      </button>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-2xl">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Shield className={`h-5 w-5 ${colors.dialogIcon}`} />
            Student Access
          </DialogTitle>
          <DialogDescription>
            Manage access by target for {courseTitle}
          </DialogDescription>
        </DialogHeader>

        {/* Target selection */}
        <div className="grid shrink-0 gap-2 rounded-md border p-2 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
              Target Type
            </p>
            <select
              value={targetType}
              onChange={(e) => setTargetType(e.target.value as AccessTargetType)}
              className="border-input bg-background focus-visible:ring-ring h-8 w-full rounded-md border px-2 text-xs focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:outline-none"
            >
              <option value="course">Course</option>
              <option value="semester" disabled={targets.semesters.length === 0}>
                Semester
              </option>
              <option value="subject" disabled={targets.subjects.length === 0}>
                Subject
              </option>
              <option value="lesson" disabled={targets.lessons.length === 0}>
                Lesson
              </option>
            </select>
          </div>

          <div className="space-y-1">
            <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
              Target Item
            </p>
            {targetType === "course" && (
              <div className="bg-muted text-foreground flex h-8 items-center rounded-md px-2 text-xs font-medium">
                Entire course
              </div>
            )}

            {targetType === "semester" && (
              <select
                value={selectedSemesterId}
                onChange={(e) => setSelectedSemesterId(e.target.value)}
                disabled={targets.semesters.length === 0}
                className="border-input bg-background focus-visible:ring-ring h-8 w-full rounded-md border px-2 text-xs focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:outline-none disabled:opacity-60"
              >
                {targets.semesters.length === 0 && <option value="">No semesters available</option>}
                {targets.semesters.map((semester) => (
                  <option key={semester.id} value={semester.id}>
                    {semester.title}
                  </option>
                ))}
              </select>
            )}

            {targetType === "lesson" && (
              <select
                value={selectedLessonId}
                onChange={(e) => setSelectedLessonId(e.target.value)}
                disabled={targets.lessons.length === 0}
                className="border-input bg-background focus-visible:ring-ring h-8 w-full rounded-md border px-2 text-xs focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:outline-none disabled:opacity-60"
              >
                {targets.lessons.length === 0 && <option value="">No lessons available</option>}
                {targets.lessons.map((lesson) => (
                  <option key={lesson.id} value={lesson.id}>
                    {lesson.title} ({lesson.subtitle})
                  </option>
                ))}
              </select>
            )}

            {targetType === "subject" && (
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                disabled={targets.subjects.length === 0}
                className="border-input bg-background focus-visible:ring-ring h-8 w-full rounded-md border px-2 text-xs focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:outline-none disabled:opacity-60"
              >
                {targets.subjects.length === 0 && <option value="">No subjects available</option>}
                {targets.subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.title} ({subject.subtitle})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Bulk actions and stats */}
        {students.length > 0 && (
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b pb-2">
            <div className="text-muted-foreground flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {students.length} enrolled
              </span>
              <span className="text-success flex items-center gap-1">
                <Check className="h-3 w-3" />
                {activeCount} active
              </span>
              <span className="text-destructive flex items-center gap-1">
                <Pause className="h-3 w-3" />
                {pausedCount} paused
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="border-destructive/20 text-destructive hover:bg-destructive/10 dark:border-destructive/30 h-7 gap-1 text-[10px]"
                onClick={() => handleBulkPause(true)}
                disabled={bulkLoading || students.length === 0 || !selectedTarget.id}
              >
                {bulkLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Pause className="h-3 w-3" />
                )}
                Pause All Students
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-success/30 text-success hover:bg-success/10 hover:text-success dark:border-success/20 h-7 gap-1 text-[10px]"
                onClick={() => handleBulkPause(false)}
                disabled={bulkLoading || students.length === 0 || !selectedTarget.id}
              >
                {bulkLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Play className="h-3 w-3" />
                )}
                Resume All Students
              </Button>
            </div>
          </div>
        )}

        {/* Search */}
        {students.length > 0 && (
          <div className="relative shrink-0">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2" />
            <Input
              placeholder="Search students..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
        )}

        {/* Message */}
        {message && (
          <div className="bg-success/10 text-success shrink-0 rounded-md px-3 py-1.5 text-xs font-medium">
            {message}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="shrink-0 rounded-md bg-destructive/10 px-3 py-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <div>
                <p className="text-xs font-medium text-destructive">Failed to load students</p>
                <p className="mt-0.5 text-xs text-destructive/80">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Student list */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="h-10 w-10 text-muted-foreground/50" />
              <p className="mt-2 text-sm font-medium text-foreground">
                {students.length === 0
                  ? "No students enrolled in this course."
                  : "No students match your search."}
              </p>
            </div>
          )}

          {!loading && !error && filtered.length > 0 && (
            <div className="divide-border/50 divide-y">
              {filtered.map((student) => (
                <div
                  key={student.userId}
                  className="flex items-center justify-between gap-3 px-1 py-2.5"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${colors.avatarBg} ${colors.avatarText}`}>
                      {student.userName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{student.userName}</p>
                      <p className="text-muted-foreground truncate text-xs">{student.email}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    {student.enrolledAt && (
                      <div className={`text-right rounded-md px-2.5 py-1 ${colors.dateBg}`}>
                        <p className={`text-[10px] font-medium ${colors.dateText}`}>
                          {new Date(student.enrolledAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    )}
                    <div className={`text-right rounded-md px-2.5 py-1 ${colors.progressBg}`}>
                      <p className={`text-xs font-medium ${colors.progressText}`}>
                        {student.progress != null ? `${student.progress}%` : "0%"}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        student.isPaused
                          ? "text-destructive bg-destructive/10"
                          : "bg-success/10 text-success"
                      }`}
                    >
                      {student.isPaused ? (
                        <>
                          <Pause className="h-2.5 w-2.5" />
                          Paused
                        </>
                      ) : (
                        <>
                          <Check className="h-2.5 w-2.5" />
                          Active
                        </>
                      )}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-7 w-7 rounded-full ${
                        student.isPaused
                          ? "bg-success/10 text-success hover:bg-success/20"
                          : "bg-destructive/10 text-destructive hover:bg-destructive/20"
                      }`}
                      onClick={() =>
                        handleToggle(student.userId, student.isPaused, student.overrideId)
                      }
                      disabled={pendingIds.has(student.userId)}
                    >
                      {pendingIds.has(student.userId) ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : student.isPaused ? (
                        <Play className="h-3.5 w-3.5" />
                      ) : (
                        <Pause className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Legend */}
        {students.length > 0 && (
          <div className="shrink-0 border-t pt-2">
            <p className="text-muted-foreground px-1 text-[10px]">
              <span className="font-semibold">Active</span> = student can access selected target. {" "}
              <span className="font-semibold">Paused</span> = target access blocked for this student.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
