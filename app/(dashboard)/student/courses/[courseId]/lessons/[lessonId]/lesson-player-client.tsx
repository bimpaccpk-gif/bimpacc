"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Circle,
  Clock,
  Loader2,
  PlayCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleLessonCompletion } from "@/app/actions/lesson-progress";
import { submitQuiz } from "@/app/actions/quiz";
import { YouTubeVideoPlayer as SecureYouTubePlayer } from "./youtube-player";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LessonQuiz, type LessonQuizProps } from "@/components/student/lesson-quiz";
import { LessonResources, type LessonResourceItem } from "@/components/student/lesson-resources";
import { LessonComments, type LessonCommentsProps } from "@/components/student/lesson-comments";

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

interface LessonPlayerProps {
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
  quiz: LessonQuizProps["quiz"] | null;
  previousAttempt: LessonQuizProps["previousAttempt"] | null;
  resources: LessonResourceItem[];
  comments: LessonCommentsProps["comments"];
  userId: string;
  isCourseComplete: boolean;
}

/** Group lessons by consecutive subject so the curriculum shows section headings. */
function groupBySubject(lessons: LessonRow[]) {
  const groups: { title: string | null; items: LessonRow[] }[] = [];
  for (const lesson of lessons) {
    const title = lesson.subject_title ?? null;
    const last = groups[groups.length - 1];
    if (last && last.title === title) {
      last.items.push(lesson);
    } else {
      groups.push({ title, items: [lesson] });
    }
  }
  return groups;
}

function Curriculum({
  courseId,
  lessons,
  completedIds,
  currentId,
}: {
  courseId: string;
  lessons: LessonRow[];
  completedIds: Set<string>;
  currentId: string;
}) {
  const currentRef = useRef<HTMLAnchorElement | null>(null);

  // Keep the active lesson in view when the list is long.
  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "nearest" });
  }, [currentId]);

  const groups = groupBySubject(lessons);
  // Number lessons by their position in the whole course (no mutation during render).
  const numberOf = new Map(lessons.map((lesson, index) => [lesson.id, index + 1]));

  return (
    <nav aria-label="Course content" className="space-y-4">
      {groups.map((group, groupIndex) => (
        <div key={`${group.title ?? "lessons"}-${groupIndex}`}>
          {group.title && (
            <p className="text-muted-foreground mb-1 px-2 text-xs font-medium">{group.title}</p>
          )}
          <ul className="space-y-0.5">
            {group.items.map((lesson) => {
              const isCurrent = lesson.id === currentId;
              const isDone = completedIds.has(lesson.id);
              return (
                <li key={lesson.id}>
                  <Link
                    ref={isCurrent ? currentRef : undefined}
                    href={`/student/courses/${courseId}/lessons/${lesson.id}`}
                    aria-current={isCurrent ? "page" : undefined}
                    className={cn(
                      "flex items-start gap-2.5 rounded-lg px-2 py-2 text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                      isCurrent
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-foreground/80 hover:bg-muted"
                    )}
                  >
                    {isDone ? (
                      <CheckCircle2
                        className="text-success mt-0.5 h-4 w-4 shrink-0"
                        aria-label="Completed"
                      />
                    ) : isCurrent ? (
                      <PlayCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    ) : (
                      <Circle
                        className="text-muted-foreground/60 mt-0.5 h-4 w-4 shrink-0"
                        aria-hidden="true"
                      />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2">
                        {numberOf.get(lesson.id)}. {lesson.title}
                      </span>
                      {lesson.duration_minutes ? (
                        <span className="text-muted-foreground mt-0.5 block text-xs font-normal">
                          {lesson.duration_minutes} min
                        </span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
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
  quiz,
  previousAttempt,
  resources,
  comments,
  userId,
  isCourseComplete,
}: LessonPlayerProps) {
  const [isCompleted, setIsCompleted] = useState(initialCompleted);
  const [pending, startTransition] = useTransition();

  function handleToggleComplete() {
    startTransition(async () => {
      try {
        const result = await toggleLessonCompletion(course.id, current.id);
        if (!result.error) {
          setIsCompleted(result.completed);
        }
      } catch {
        // Leave the button as it was; the student can try again.
      }
    });
  }

  // The server only knows the lesson as it was loaded; reflect the local toggle in the list.
  const liveCompletedIds = new Set(completedIds);
  if (isCompleted) liveCompletedIds.add(current.id);
  else liveCompletedIds.delete(current.id);

  const completedCount = allLessons.filter((l) => liveCompletedIds.has(l.id)).length;
  const percent = allLessons.length > 0 ? Math.round((completedCount / allLessons.length) * 100) : 0;

  async function handleQuizSubmit(
    answers: Record<string, string>,
    _score: number,
    _passed: boolean
  ) {
    if (!quiz?.id) return;
    const answerArray = Object.entries(answers).map(([questionId, selectedOption]) => ({
      question_id: questionId,
      selected_option: selectedOption,
    }));
    await submitQuiz(quiz.id, answerArray);
  }

  const hasResources = resources.length > 0;
  const hasQuiz = !!quiz && quiz.questions.length > 0;

  return (
    <div className="-mx-4 -my-6 sm:-mx-6 lg:-mx-8">
      {/* ─── Top bar ─────────────────────────────────────── */}
      <div className="border-border bg-background sticky top-0 z-10 border-b">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link
            href={`/student/courses/${course.id}`}
            className="text-muted-foreground hover:text-foreground hover:bg-muted inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Back to course</span>
            <span className="sr-only sm:hidden">Back to course</span>
          </Link>

          <div className="min-w-0 flex-1">
            <p className="text-muted-foreground truncate text-xs">
              {course.title} · Lesson {currentIndex + 1} of {allLessons.length}
            </p>
            <h1 className="text-foreground truncate font-semibold">{current.title}</h1>
          </div>

          <button
            type="button"
            onClick={handleToggleComplete}
            disabled={pending}
            aria-pressed={isCompleted}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-70",
              isCompleted
                ? "bg-success/10 text-success hover:bg-success/20"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : isCompleted ? (
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Circle className="h-4 w-4" aria-hidden="true" />
            )}
            <span className="hidden sm:inline">{isCompleted ? "Completed" : "Mark complete"}</span>
            <span className="sm:hidden">{isCompleted ? "Done" : "Complete"}</span>
          </button>
        </div>
        <div
          role="progressbar"
          aria-label="Course progress"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          className="bg-muted h-0.5 w-full"
        >
          <div className="bg-primary h-full transition-[width]" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* ─── Main column ───────────────────────────────── */}
        <div className="min-w-0">
          {videoId ? (
            <SecureYouTubePlayer
              videoId={videoId}
              title={current.title}
              description={current.description}
              durationMinutes={current.duration_minutes}
              watermark={watermark}
            />
          ) : (
            <div className="bg-background">
              <div className="bg-muted/20 mx-auto flex aspect-video w-full max-w-5xl flex-col items-center justify-center">
                <PlayCircle className="text-muted-foreground/30 mb-4 h-16 w-16" aria-hidden="true" />
                <p className="text-muted-foreground text-sm">No video available for this lesson</p>
              </div>
            </div>
          )}

          <div className="space-y-6 px-4 py-6 sm:px-6">
            {/* Course content (mobile / tablet): collapsed by default, rail on large screens */}
            <details className="group border-border rounded-xl border lg:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
                <span>
                  Course content
                  <span className="text-muted-foreground ml-2 font-normal">
                    {completedCount}/{allLessons.length} completed
                  </span>
                </span>
                <ChevronDown
                  className="text-muted-foreground h-4 w-4 transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <div className="border-border max-h-80 overflow-y-auto border-t p-2">
                <Curriculum
                  courseId={course.id}
                  lessons={allLessons}
                  completedIds={liveCompletedIds}
                  currentId={current.id}
                />
              </div>
            </details>

            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b bg-transparent p-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {[
                  { value: "overview", label: "Overview", show: true },
                  { value: "resources", label: `Resources${hasResources ? ` (${resources.length})` : ""}`, show: hasResources },
                  { value: "quiz", label: "Quiz", show: hasQuiz },
                  { value: "discussion", label: `Discussion${comments.length ? ` (${comments.length})` : ""}`, show: true },
                ]
                  .filter((tab) => tab.show)
                  .map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="data-[state=active]:border-primary data-[state=active]:text-foreground rounded-none border-b-2 border-transparent px-3 py-2.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                    >
                      {tab.label}
                    </TabsTrigger>
                  ))}
              </TabsList>

              <TabsContent value="overview" className="mt-5 space-y-5">
                <div>
                  <h2 className="text-foreground text-xl font-bold tracking-tight">{current.title}</h2>
                  {current.description && (
                    <p className="text-muted-foreground mt-2 leading-relaxed">{current.description}</p>
                  )}
                  <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    {current.duration_minutes ? (
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" aria-hidden="true" />
                        {current.duration_minutes} minutes
                      </span>
                    ) : null}
                    {current.subject_title && (
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-4 w-4" aria-hidden="true" />
                        {current.subject_title}
                      </span>
                    )}
                  </div>
                </div>

                {current.content && (
                  <div className="border-border rounded-xl border p-5">
                    <h3 className="text-muted-foreground mb-3 text-xs font-semibold tracking-wider uppercase">
                      Lesson notes
                    </h3>
                    <div className="text-foreground/80 max-w-none leading-relaxed whitespace-pre-wrap">
                      {current.content}
                    </div>
                  </div>
                )}

                {isCourseComplete && (
                  <div className="bg-warning/10 border-warning/30 flex flex-col items-center gap-2 rounded-xl border px-6 py-6 text-center">
                    <Award className="text-warning h-7 w-7" aria-hidden="true" />
                    <p className="text-lg font-semibold">Course complete</p>
                    <p className="text-muted-foreground text-sm">
                      You&apos;ve completed every lesson in {course.title}. Find your certificates on the{" "}
                      <Link
                        href="/student/certificates"
                        className="text-primary font-medium hover:underline"
                      >
                        Certificates
                      </Link>{" "}
                      page.
                    </p>
                  </div>
                )}
              </TabsContent>

              {hasResources && (
                <TabsContent value="resources" className="mt-5">
                  <LessonResources resources={resources} />
                </TabsContent>
              )}

              {hasQuiz && (
                <TabsContent value="quiz" className="mt-5">
                  <LessonQuiz
                    quiz={quiz}
                    previousAttempt={previousAttempt}
                    onSubmit={handleQuizSubmit}
                  />
                </TabsContent>
              )}

              <TabsContent value="discussion" className="mt-5">
                <LessonComments lessonId={current.id} userId={userId} comments={comments} />
              </TabsContent>
            </Tabs>

            {/* Previous / next */}
            <div className="border-border flex items-stretch justify-between gap-3 border-t pt-5">
              {prevLesson ? (
                <Link
                  href={`/student/courses/${course.id}/lessons/${prevLesson.id}`}
                  className="border-border hover:bg-muted group flex min-w-0 max-w-xs flex-1 items-center gap-2 rounded-xl border px-4 py-3 transition-colors"
                >
                  <ChevronLeft
                    className="text-muted-foreground group-hover:text-foreground h-5 w-5 shrink-0"
                    aria-hidden="true"
                  />
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
                  className="border-primary/30 bg-primary/5 hover:bg-primary/10 group flex min-w-0 max-w-xs flex-1 items-center gap-2 rounded-xl border px-4 py-3 text-right transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-primary text-xs">Next</p>
                    <p className="text-foreground truncate text-sm font-medium">{nextLesson.title}</p>
                  </div>
                  <ChevronRight className="text-primary h-5 w-5 shrink-0" aria-hidden="true" />
                </Link>
              ) : (
                <div />
              )}
            </div>
          </div>
        </div>

        {/* ─── Curriculum rail (large screens) ───────────── */}
        <aside className="border-border hidden border-l lg:block">
          <div className="sticky top-[57px] flex max-h-[calc(100vh-57px)] flex-col">
            <div className="border-border border-b px-4 py-3">
              <p className="text-sm font-semibold">Course content</p>
              <p className="text-muted-foreground mt-0.5 text-xs tabular-nums">
                {completedCount} of {allLessons.length} lessons completed · {percent}%
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              <Curriculum
                courseId={course.id}
                lessons={allLessons}
                completedIds={liveCompletedIds}
                currentId={current.id}
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
