"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  Pause,
  PlayCircle,
  Search,
} from "lucide-react";

export interface LessonRow {
  id: string;
  title: string;
  description: string;
  video_url: string | null;
  content?: string | null;
  order_index: number;
  duration_minutes: number | null;
  isPaused: boolean;
}

export interface SubjectWithLessons {
  id: string;
  title: string;
  description: string;
  order_index: number;
  isPaused: boolean;
  lessons: LessonRow[];
}

export interface SemesterWithSubjects {
  id: string;
  title: string;
  description: string;
  isPaused: boolean;
  subjects: SubjectWithLessons[];
}

// ─── helpers ──────────────────────────────────────────────

const has = (text: string | null | undefined, q: string) =>
  !!text && text.toLowerCase().includes(q.toLowerCase());

const lessonMatches = (l: LessonRow, q: string) => has(l.title, q) || has(l.description, q);

const countLessons = (subjects: SubjectWithLessons[]) =>
  subjects.reduce((n, s) => n + s.lessons.length, 0);

function countDone(lessons: LessonRow[], done: Set<string>) {
  return lessons.reduce((n, l) => n + (done.has(l.id) ? 1 : 0), 0);
}

function Highlight({ text, query }: { text: string; query?: string }) {
  if (!query) return <>{text}</>;
  const i = text.toLowerCase().indexOf(query.toLowerCase());
  if (i === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-warning/30 rounded px-0.5 text-inherit">{text.slice(i, i + query.length)}</mark>
      {text.slice(i + query.length)}
    </>
  );
}

// ─── rows ─────────────────────────────────────────────────

function LessonRowItem({
  lesson,
  number,
  courseId,
  isCompleted,
  isNext,
  query,
}: {
  lesson: LessonRow;
  number: number;
  courseId: string;
  isCompleted: boolean;
  isNext: boolean;
  query?: string;
}) {
  if (lesson.isPaused) {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 opacity-70">
        <span className="bg-warning/10 text-warning flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
          <Pause className="h-3 w-3" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground truncate text-sm font-medium">{lesson.title}</p>
          <p className="text-warning text-xs">Paused</p>
        </div>
      </div>
    );
  }

  return (
    <Link
      href={`/student/courses/${courseId}/lessons/${lesson.id}`}
      className="group hover:bg-muted/50 focus-visible:ring-ring/50 flex items-center gap-3 px-4 py-2.5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset"
    >
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
          isCompleted
            ? "text-success"
            : isNext
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
        }`}
      >
        {isCompleted ? (
          <CheckCircle2 className="h-5 w-5" aria-label="Completed" />
        ) : isNext ? (
          <PlayCircle className="h-4 w-4" aria-label="Up next" />
        ) : (
          number
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="group-hover:text-primary truncate text-sm font-medium transition-colors">
          <Highlight text={lesson.title} query={query} />
        </p>
        {lesson.description && (
          <p className="text-muted-foreground line-clamp-1 text-xs">{lesson.description}</p>
        )}
      </div>
      {isNext && (
        <span className="bg-primary/10 text-primary hidden shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium sm:inline">
          Up next
        </span>
      )}
      {lesson.duration_minutes ? (
        <span className="text-muted-foreground flex shrink-0 items-center gap-1 text-xs tabular-nums">
          <Clock className="h-3 w-3" aria-hidden="true" />
          {lesson.duration_minutes} min
        </span>
      ) : null}
      <ChevronRight
        className="text-muted-foreground/50 group-hover:text-primary h-4 w-4 shrink-0 transition-colors"
        aria-hidden="true"
      />
    </Link>
  );
}

function SectionSummary({
  index,
  title,
  meta,
  done,
  total,
  icon,
}: {
  index: number;
  title: string;
  meta?: string;
  done: number;
  total: number;
  icon?: ReactNode;
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <summary className="hover:bg-muted/40 flex cursor-pointer list-none items-center gap-3 px-4 py-3 transition-colors [&::-webkit-details-marker]:hidden">
      <span className="bg-primary/10 text-primary flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold">
        {icon ?? index}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold">{title}</h3>
        {meta && <p className="text-muted-foreground truncate text-xs">{meta}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <div
          className="bg-muted hidden h-1.5 w-16 overflow-hidden rounded-full sm:block"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${title} progress`}
        >
          <div className="bg-success h-full rounded-full" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-muted-foreground text-xs tabular-nums">
          {done}/{total}
        </span>
        <ChevronDown
          className="text-muted-foreground h-4 w-4 transition-transform [details[open]>summary_&]:rotate-180"
          aria-hidden="true"
        />
      </div>
    </summary>
  );
}

function PausedBlock({ title, kind }: { title: string; kind: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 opacity-70">
      <span className="bg-warning/10 text-warning flex h-7 w-7 shrink-0 items-center justify-center rounded-md">
        <Pause className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground truncate text-sm font-semibold">{title}</p>
        <p className="text-warning text-xs">This {kind} is currently paused</p>
      </div>
    </div>
  );
}

function SubjectBlock({
  subject,
  index,
  courseId,
  completedIds,
  nextLessonId,
  query,
  nested,
}: {
  subject: SubjectWithLessons;
  index: number;
  courseId: string;
  completedIds: Set<string>;
  nextLessonId?: string;
  query?: string;
  nested?: boolean;
}) {
  if (subject.isPaused && !query) {
    return (
      <div className={nested ? "bg-card rounded-lg ring-1 ring-foreground/10" : "bg-card rounded-xl ring-1 ring-foreground/10"}>
        <PausedBlock title={subject.title} kind="subject" />
      </div>
    );
  }

  const subjectHit = !!query && (has(subject.title, query) || has(subject.description, query));
  const lessons = query && !subjectHit ? subject.lessons.filter((l) => lessonMatches(l, query)) : subject.lessons;
  if (lessons.length === 0) return null;

  const containsNext = !!nextLessonId && subject.lessons.some((l) => l.id === nextLessonId);

  return (
    <details
      className={`group bg-card overflow-hidden ring-1 ring-foreground/10 ${nested ? "rounded-lg" : "rounded-xl"}`}
      open={!!query || containsNext}
    >
      <SectionSummary
        index={index + 1}
        title={subject.title}
        meta={query ? `${lessons.length} matching` : subject.description || undefined}
        done={countDone(subject.lessons, completedIds)}
        total={subject.lessons.length}
      />
      <div className="divide-border divide-y border-t">
        {lessons.map((lesson, i) => (
          <LessonRowItem
            key={lesson.id}
            lesson={lesson}
            number={subject.lessons.indexOf(lesson) + 1 || i + 1}
            courseId={courseId}
            isCompleted={completedIds.has(lesson.id)}
            isNext={lesson.id === nextLessonId}
            query={query}
          />
        ))}
      </div>
    </details>
  );
}

// ─── main ─────────────────────────────────────────────────

export function CourseContent({
  courseId,
  hierarchyType,
  semesters = [],
  subjects,
  directLessons,
  completedIds,
  nextLessonId,
}: {
  courseId: string;
  hierarchyType: number;
  semesters?: SemesterWithSubjects[];
  subjects: SubjectWithLessons[];
  directLessons: LessonRow[];
  completedIds: Set<string>;
  /** The lesson the student should do next; its section opens by default. */
  nextLessonId?: string;
}) {
  const [search, setSearch] = useState("");
  const q = search.trim() || undefined;

  const total =
    semesters.reduce((n, s) => n + countLessons(s.subjects), 0) +
    countLessons(subjects) +
    directLessons.length;

  if (total === 0) {
    return (
      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Curriculum</h2>
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12">
          <FileText className="text-muted-foreground/50 h-8 w-8" aria-hidden="true" />
          <p className="text-muted-foreground mt-3 text-sm">No content has been added to this course yet.</p>
        </div>
      </section>
    );
  }

  const subjectVisible = (s: SubjectWithLessons) =>
    !q || has(s.title, q) || has(s.description, q) || s.lessons.some((l) => lessonMatches(l, q));

  const visibleSemesters = semesters.filter((sem) => !q || has(sem.title, q) || sem.subjects.some(subjectVisible));
  const visibleSubjects = subjects.filter(subjectVisible);
  const visibleDirect = q ? directLessons.filter((l) => lessonMatches(l, q)) : directLessons;

  const nothingFound =
    !!q &&
    (hierarchyType === 1
      ? visibleSemesters.length === 0
      : hierarchyType === 2
        ? visibleSubjects.length === 0
        : visibleDirect.length === 0);

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Curriculum</h2>
        <div className="relative sm:w-64">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Search lessons"
            aria-label="Search lessons"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-border bg-background focus:ring-primary h-9 w-full rounded-lg border py-1 pr-3 pl-8 text-sm focus:ring-2 focus:outline-none"
          />
        </div>
      </div>

      {nothingFound ? (
        <p className="text-muted-foreground py-6 text-center text-sm">No lessons match &ldquo;{search}&rdquo;</p>
      ) : hierarchyType === 1 ? (
        <div className="space-y-3">
          {visibleSemesters.map((semester, si) => {
            if (semester.isPaused && !q) {
              return (
                <div key={semester.id} className="bg-card rounded-xl ring-1 ring-foreground/10">
                  <PausedBlock title={semester.title} kind="semester" />
                </div>
              );
            }
            const all = semester.subjects.flatMap((s) => s.lessons);
            const containsNext = !!nextLessonId && all.some((l) => l.id === nextLessonId);
            return (
              <details
                key={semester.id}
                className="group bg-card overflow-hidden rounded-xl ring-1 ring-foreground/10"
                open={!!q || containsNext || (!nextLessonId && si === 0)}
              >
                <SectionSummary
                  index={si + 1}
                  title={semester.title}
                  meta={`${semester.subjects.length} subject${semester.subjects.length !== 1 ? "s" : ""}`}
                  done={countDone(all, completedIds)}
                  total={all.length}
                />
                <div className="bg-muted/20 space-y-2 border-t p-3">
                  {semester.subjects.map((subject, i) => (
                    <SubjectBlock
                      key={subject.id}
                      subject={subject}
                      index={i}
                      courseId={courseId}
                      completedIds={completedIds}
                      nextLessonId={nextLessonId}
                      query={q}
                      nested
                    />
                  ))}
                </div>
              </details>
            );
          })}
        </div>
      ) : hierarchyType === 2 ? (
        <div className="space-y-3">
          {visibleSubjects.map((subject, i) => (
            <SubjectBlock
              key={subject.id}
              subject={subject}
              index={i}
              courseId={courseId}
              completedIds={completedIds}
              nextLessonId={nextLessonId}
              query={q}
            />
          ))}
        </div>
      ) : (
        <div className="bg-card divide-border divide-y overflow-hidden rounded-xl ring-1 ring-foreground/10">
          {visibleDirect.map((lesson) => (
            <LessonRowItem
              key={lesson.id}
              lesson={lesson}
              number={directLessons.indexOf(lesson) + 1}
              courseId={courseId}
              isCompleted={completedIds.has(lesson.id)}
              isNext={lesson.id === nextLessonId}
              query={q}
            />
          ))}
        </div>
      )}
    </section>
  );
}
