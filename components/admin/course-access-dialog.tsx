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
import { Loader2, Pause, Play, Shield, Users, Check, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  getCourseStudentAccessList,
  setStudentContentAccess,
  removeStudentContentAccess,
  bulkPauseForStudents,
} from "@/app/actions/content-access";

interface CourseAccessDialogProps {
  courseId: string;
  courseTitle: string;
}

export function CourseAccessDialog({ courseId, courseTitle }: CourseAccessDialogProps) {
  const [open, setOpen] = useState(false);
  const [students, setStudents] = useState<
    Array<{
      userId: string;
      userName: string;
      email: string;
      isPaused: boolean;
      overrideId: string | null;
    }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [message, setMessage] = useState("");

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    const { data, error } = await getCourseStudentAccessList(courseId);
    if (!error) {
      setStudents(data);
    }
    setLoading(false);
  }, [courseId]);

  useEffect(() => {
    if (open) {
      fetchStudents();
    }
  }, [open, fetchStudents]);

  const handleToggle = async (userId: string, currentlyPaused: boolean) => {
    setPendingIds((prev) => new Set(prev).add(userId));
    try {
      if (currentlyPaused) {
        // Currently paused → remove override to resume
        await removeStudentContentAccess(userId, "course", courseId);
      } else {
        // Currently active → pause
        await setStudentContentAccess(userId, "course", courseId, true, "Paused by admin");
      }
      await fetchStudents();
      setMessage(currentlyPaused ? "Student access resumed." : "Student access paused.");
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
    setBulkLoading(true);
    try {
      const studentIds = students.map((s) => s.userId);
      const result = await bulkPauseForStudents("course", courseId, isPaused, studentIds);
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-indigo-500/10 px-2.5 py-1 text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-500/20 dark:text-indigo-400">
        <Shield className="h-3 w-3" />
        Student Access
      </DialogTrigger>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-xl">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-indigo-500" />
            Student Access
          </DialogTitle>
          <DialogDescription>Manage student access for {courseTitle}</DialogDescription>
        </DialogHeader>

        {/* Bulk actions and stats */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b pb-2">
          <div className="text-muted-foreground flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {students.length} enrolled
            </span>
            <span className="flex items-center gap-1 text-emerald-600">
              <Check className="h-3 w-3" />
              {activeCount} active
            </span>
            <span className="flex items-center gap-1 text-red-600">
              <Pause className="h-3 w-3" />
              {pausedCount} paused
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 border-red-200 text-[10px] text-red-600 hover:bg-red-500/10 hover:text-red-700 dark:border-red-900"
              onClick={() => handleBulkPause(true)}
              disabled={bulkLoading || students.length === 0}
            >
              {bulkLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Pause className="h-3 w-3" />
              )}
              Pause All
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 border-emerald-200 text-[10px] text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 dark:border-emerald-900"
              onClick={() => handleBulkPause(false)}
              disabled={bulkLoading || students.length === 0}
            >
              {bulkLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Play className="h-3 w-3" />
              )}
              Resume All
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative shrink-0">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2" />
          <Input
            placeholder="Search students..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>

        {/* Message */}
        {message && (
          <div className="shrink-0 rounded-md bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            {message}
          </div>
        )}

        {/* Student list */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <p className="text-muted-foreground py-8 text-center text-sm">
              {students.length === 0
                ? "No students enrolled in this course."
                : "No students match your search."}
            </p>
          )}

          {!loading && filtered.length > 0 && (
            <div className="divide-border/50 divide-y">
              {filtered.map((student) => (
                <div
                  key={student.userId}
                  className="flex items-center justify-between gap-3 px-1 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{student.userName}</p>
                    <p className="text-muted-foreground truncate text-xs">{student.email}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        student.isPaused
                          ? "bg-red-500/10 text-red-600 dark:text-red-400"
                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
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
                          ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                          : "bg-red-500/10 text-red-600 hover:bg-red-500/20"
                      }`}
                      onClick={() => handleToggle(student.userId, student.isPaused)}
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
        <div className="shrink-0 border-t pt-2">
          <p className="text-muted-foreground px-1 text-[10px]">
            <span className="font-semibold">Active</span> = student can access course.{" "}
            <span className="font-semibold">Paused</span> = access blocked for this student only.
            Click toggle to change.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
