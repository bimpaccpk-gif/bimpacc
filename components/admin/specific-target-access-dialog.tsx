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
import {
  getCourseStudentAccessList,
  setStudentContentAccess,
  removeStudentContentAccess,
  bulkPauseForStudents,
} from "@/app/actions/content-access";

interface SpecificTargetAccessDialogProps {
  courseId: string;
  targetType: "semester" | "subject" | "lesson";
  targetId: string;
  targetTitle: string;
}

export function SpecificTargetAccessDialog({
  courseId,
  targetType,
  targetId,
  targetTitle,
}: SpecificTargetAccessDialogProps) {
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

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getCourseStudentAccessList(
        courseId,
        targetType,
        targetId
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
  }, [courseId, targetId, targetType]);

  useEffect(() => {
    if (open) {
      fetchStudents();
    }
  }, [open, fetchStudents]);

  const handleToggle = async (userId: string, currentlyPaused: boolean, overrideId: string | null) => {
    setPendingIds((prev) => new Set(prev).add(userId));
    try {
      let result;
      if (currentlyPaused) {
        if (overrideId) {
          result = await removeStudentContentAccess(userId, targetType, targetId);
        } else {
          result = await setStudentContentAccess(
            userId,
            targetType,
            targetId,
            false,
            `Resumed ${targetType} by admin`
          );
        }
      } else {
        result = await setStudentContentAccess(
          userId,
          targetType,
          targetId,
          true,
          `Paused ${targetType} by admin`
        );
      }

      if (result.error) {
        setError(result.error);
        setMessage("");
      } else {
        await fetchStudents();
        setMessage(
          currentlyPaused
            ? `Student access resumed.`
            : `Student access paused.`
        );
        setTimeout(() => setMessage(""), 2000);
      }
    } catch (err) {
      console.error("Toggle error:", err);
      setError("An unexpected error occurred.");
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
      const result = await bulkPauseForStudents(
        targetType,
        targetId,
        isPaused,
        studentIds
      );
      if (result.error) {
        setError(result.error);
        setMessage("");
      } else {
        setMessage(result.success);
        await fetchStudents();
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (err) {
      console.error("Bulk error:", err);
      setError("An unexpected error occurred.");
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
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-info/10 hover:text-info focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        title="Student Access"
      >
        <Shield className="h-4 w-4" />
      </button>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-2xl">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Shield className={`h-5 w-5 text-info`} />
            Student Access: {targetTitle}
          </DialogTitle>
          <DialogDescription className="capitalize">
            Manage student access for this {targetType}
          </DialogDescription>
        </DialogHeader>

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
                disabled={bulkLoading || students.length === 0}
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
                disabled={bulkLoading || students.length === 0}
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
          <div className="relative shrink-0 mt-2">
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
          <div className="bg-success/10 text-success shrink-0 rounded-md px-3 py-1.5 text-xs font-medium mt-2">
            {message}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="shrink-0 rounded-md bg-destructive/10 px-3 py-3 mt-2">
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
        <div className="min-h-0 flex-1 overflow-y-auto mt-2 pr-2">
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
                    <div className="bg-muted text-muted-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                      {student.userName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{student.userName}</p>
                      <p className="text-muted-foreground truncate text-xs">{student.email}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
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
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleToggle(student.userId, student.isPaused, student.overrideId);
                      }}
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
