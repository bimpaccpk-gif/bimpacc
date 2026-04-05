"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  PlayCircle,
  Clock,
  CheckCircle2,
  Circle,
  ChevronLeft,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleLessonCompletion } from "@/app/actions/lesson-progress";
import { YouTubeVideoPlayer } from "./youtube-player";

interface CourseInfo {
  id: string;
  title: string;
  hierarchy_type: number;
}

interface LessonRow {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  content: string | null;
  order_index: number;
  duration_minutes: number | null;
  subject_id?: string | null;
  subject_title?: string | null;
}

interface LessonPlayerClientProps {
  course: CourseInfo;
  current: LessonRow;
  allLessons: LessonRow[];
  completedIds: Set<string>;
  prevLesson: LessonRow | null;
  nextLesson: LessonRow | null;
  videoId: string | null;
  isCompleted: boolean;
  currentIndex: number;
  watermark: {
    fullName: string;
    email: string;
    cnicNumber: string | null;
  };
}

export function LessonPlayerClient({
  course,
  current,
  allLessons,
  completedIds,
  prevLesson,
  nextLesson,
  videoId,
  isCompleted: initialCompleted,
  currentIndex,
  watermark,
}: LessonPlayerClientProps) {
  const [isCompleted, setIsCompleted] = useState(initialCompleted);
  const [isPending, startTransition] = useTransition();

  const handleToggleComplete = () => {
    startTransition(async () => {
      const result = await toggleLessonCompletion(course.id, current.id);
      if (!result.error) {
        setIsCompleted(result.completed);
      }
    });
  };

  const completedCount = allLessons.filter((l) => completedIds.has(l.id)).length;

  return (
    <div className="-mx-4 -my-6 sm:-mx-6 lg:-mx-8">
      {/* ─── Top Bar ──────────────────────────────────────── */}
      <div className="border-border bg-background sticky top-0 z-10 flex shrink-0 items-center gap-3 border-b px-4 py-3">
        <Link
          href={`/student/courses/${course.id}`}
          className="text-muted-foreground hover:text-foreground hover:bg-muted inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back to Course</span>
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-xs">
            Lesson {currentIndex + 1} of {allLessons.length}
            <span className="text-muted-foreground/70 ml-2">
              ({completedCount}/{allLessons.length} completed)
            </span>
          </p>
          <h1 className="text-foreground truncate font-semibold">{current.title}</h1>
        </div>
        <button
          onClick={handleToggleComplete}
          disabled={isPending}
          className={cn(
            "inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200",
            isCompleted
              ? "bg-success/10 text-success hover:bg-success/20 dark:text-success/80"
              : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
            isPending && "cursor-not-allowed opacity-50"
          )}
        >
          {isCompleted ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Completed
            </>
          ) : (
            <>
              <Circle className="h-4 w-4" />
              Mark Complete
            </>
          )}
        </button>
      </div>

      {/* ─── Video Player ────────────────────────────────── */}
      {videoId ? (
        <YouTubeVideoPlayer
          videoId={videoId}
          title={current.title}
          description={current.description}
          durationMinutes={current.duration_minutes}
          watermark={watermark}
        />
      ) : (
        <div className="bg-background">
          <div className="bg-muted/20 mx-auto flex aspect-video w-full max-w-5xl flex-col items-center justify-center">
            <PlayCircle className="text-muted-foreground/30 mb-4 h-16 w-16" />
            <p className="text-muted-foreground text-sm">No video available for this lesson</p>
          </div>
        </div>
      )}

      {/* ─── Lesson Content ──────────────────────────────── */}
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        {/* Title & Meta */}
        <div className="mb-6">
          <h2 className="text-foreground mb-2 text-2xl font-bold">{current.title}</h2>
          {current.description && (
            <p className="text-muted-foreground leading-relaxed">{current.description}</p>
          )}
          <div className="text-muted-foreground mt-3 flex items-center gap-4 text-sm">
            {current.duration_minutes && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {current.duration_minutes} minutes
              </span>
            )}
            {current.subject_title && (
              <span className="flex items-center gap-1">
                <BookOpen className="h-4 w-4" />
                {current.subject_title}
              </span>
            )}
          </div>
        </div>

        {/* Text Content */}
        {current.content && (
          <div className="border-border mb-8 rounded-xl border p-6">
            <h3 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wider uppercase">
              Lesson Notes
            </h3>
            <div className="prose prose-sm dark:prose-invert text-foreground/80 max-w-none leading-relaxed whitespace-pre-wrap">
              {current.content}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="border-border flex items-center justify-between gap-4 border-t pt-4">
          {prevLesson ? (
            <Link
              href={`/student/courses/${course.id}/lessons/${prevLesson.id}`}
              className="border-border hover:bg-muted group flex max-w-xs flex-1 items-center gap-2 rounded-xl border px-4 py-3 transition-colors"
            >
              <ChevronLeft className="text-muted-foreground group-hover:text-foreground h-5 w-5 shrink-0" />
              <div className="min-w-0">
                <p className="text-muted-foreground text-xs">Previous</p>
                <p className="text-foreground truncate text-sm font-medium">{prevLesson.title}</p>
              </div>
            </Link>
          ) : (
            <div />
          )}

          {nextLesson ? (
            <Link
              href={`/student/courses/${course.id}/lessons/${nextLesson.id}`}
              className="border-border hover:bg-muted group flex max-w-xs flex-1 items-center gap-2 rounded-xl border px-4 py-3 text-right transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="text-muted-foreground text-xs">Next</p>
                <p className="text-foreground truncate text-sm font-medium">{nextLesson.title}</p>
              </div>
              <ChevronRight className="text-muted-foreground group-hover:text-foreground h-5 w-5 shrink-0" />
            </Link>
          ) : (
            <div />
          )}
        </div>
      </div>
    </div>
  );
}
