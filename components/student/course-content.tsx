"use client";

import { useState } from "react";
import { ChevronDown, FileText, Pause, Search } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Clock, PlayCircle } from "lucide-react";

interface LessonRow {
  id: string;
  title: string;
  description: string;
  video_url: string | null;
  content: string | null;
  order_index: number;
  duration_minutes: number | null;
  isPaused: boolean;
}

interface SubjectWithLessons {
  id: string;
  title: string;
  description: string;
  order_index: number;
  isPaused: boolean;
  lessons: LessonRow[];
}

interface SemesterWithSubjects {
  id: string;
  title: string;
  description: string;
  isPaused: boolean;
  subjects: SubjectWithLessons[];
}

function LessonItem({
  lesson,
  index,
  courseId,
  isCompleted,
  highlight,
}: {
  lesson: LessonRow;
  index: number;
  courseId: string;
  isCompleted: boolean;
  highlight?: string;
}) {
  const title = lesson.title;
  const desc = lesson.description;

  const titleMatch = highlight
    ? title.toLowerCase().includes(highlight.toLowerCase())
    : false;

  if (lesson.isPaused) {
    return (
      <div className="border-border bg-muted/20 border-warning/30 overflow-hidden rounded-xl border">
        <div className="flex items-center gap-3 px-5 py-4">
          <div className="bg-warning/10 text-warning dark:text-warning/80 h-8 w-8 shrink-0 rounded-full bg-warning/10 flex items-center justify-center">
            <Pause className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-muted-foreground font-semibold">{title}</h4>
            <p className="text-warning/80 dark:text-warning/60 mt-0.5 text-xs">
              This lesson is currently paused
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-border bg-background hover:border-primary/30 overflow-hidden rounded-xl border transition-colors">
      <div className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3 flex-1">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
              isCompleted
                ? "bg-success/10 text-success dark:text-success/80"
                : "bg-primary/10 text-primary dark:text-primary/80"
            }`}
          >
            {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-foreground font-semibold">
              {titleMatch && highlight ? (
                <HighlightText text={title} query={highlight} />
              ) : (
                title
              )}
            </h4>
            {desc && (
              <p className="text-muted-foreground mt-0.5 line-clamp-2 text-sm">
                {highlight
                  ? desc.toLowerCase().includes(highlight.toLowerCase())
                    ? desc
                    : desc
                  : desc}
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3 ml-11 sm:ml-0">
          {lesson.duration_minutes && (
            <span className="text-muted-foreground flex items-center gap-1 text-xs">
              <Clock className="h-3 w-3" />
              {lesson.duration_minutes} min
            </span>
          )}
          {lesson.video_url && <PlayCircle className="text-primary h-5 w-5" />}
          <Link href={`/student/courses/${courseId}/lessons/${lesson.id}`}>
            <Button size="sm" variant="secondary" className="gap-1.5">
              {lesson.video_url ? "Watch" : "View"}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function HighlightText({ text, query }: { text: string; query: string }) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-warning/30 rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function SubjectAccordion({
  subject,
  index,
  courseId,
  completedIds,
  highlight,
}: {
  subject: SubjectWithLessons;
  index: number;
  courseId: string;
  completedIds: Set<string>;
  highlight?: string;
}) {
  const filteredLessons = highlight
    ? subject.lessons.filter(
        (l) =>
          l.title.toLowerCase().includes(highlight.toLowerCase()) ||
          (l.description && l.description.toLowerCase().includes(highlight.toLowerCase()))
      )
    : subject.lessons;

  if (filteredLessons.length === 0) return null;

  if (subject.isPaused && !highlight) {
    return (
      <div className="border-border bg-muted/20 border-warning/30 overflow-hidden rounded-xl border">
        <div className="flex items-center gap-3 px-5 py-4">
          <div className="bg-warning/10 text-warning dark:text-warning/80 h-8 w-8 shrink-0 rounded-full flex items-center justify-center">
            <Pause className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-muted-foreground font-semibold">{subject.title}</h4>
            <p className="text-warning/80 dark:text-warning/60 mt-0.5 text-xs">
              This subject is currently paused
            </p>
          </div>
        </div>
      </div>
    );
  }

  const subjectMatch =
    highlight &&
    (subject.title.toLowerCase().includes(highlight.toLowerCase()) ||
      (subject.description &&
        subject.description.toLowerCase().includes(highlight.toLowerCase())));

  const matchedLessons = subjectMatch ? subject.lessons : filteredLessons;

  return (
    <details
      className="group border-border overflow-hidden rounded-xl border"
      open={index === 0}
    >
      <summary className="bg-muted/30 hover:bg-muted/50 flex cursor-pointer list-none items-center gap-3 px-5 py-4 transition-colors [&::-webkit-details-marker]:hidden">
        <div className="bg-primary/10 text-primary dark:text-primary/80 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold">
          {index + 1}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-foreground font-semibold">
            {subjectMatch && highlight ? (
              <HighlightText text={subject.title} query={highlight} />
            ) : (
              subject.title
            )}
          </h3>
          {subject.description && (
            <p className="text-muted-foreground mt-0.5 line-clamp-1 text-sm">
              {subject.description}
            </p>
          )}
        </div>
        <span className="text-muted-foreground mr-2 text-xs">
          {matchedLessons.length}/{subject.lessons.length} lessons
          {highlight ? " matching" : ""}
        </span>
        <ChevronDown className="text-muted-foreground h-5 w-5 transition-transform group-open:rotate-180" />
      </summary>

      <div className="bg-background space-y-3 p-4">
        {matchedLessons.map((lesson, i) => (
          <LessonItem
            key={lesson.id}
            lesson={lesson}
            index={i}
            courseId={courseId}
            isCompleted={completedIds.has(lesson.id)}
            highlight={highlight}
          />
        ))}
      </div>
    </details>
  );
}

export function CourseContent({
  courseId,
  hierarchyType,
  semesters,
  subjects,
  directLessons,
  completedIds,
}: {
  courseId: string;
  hierarchyType: number;
  semesters?: SemesterWithSubjects[];
  subjects: SubjectWithLessons[];
  directLessons: LessonRow[];
  completedIds: Set<string>;
}) {
  const [search, setSearch] = useState("");

  const totalSemesterLessons = (semesters ?? []).reduce(
    (sum, sem) => sum + sem.subjects.reduce((s, sub) => s + sub.lessons.length, 0),
    0
  );
  const totalSubjectLessons = subjects.reduce((sum, s) => sum + s.lessons.length, 0);
  const totalLessons = totalSemesterLessons + totalSubjectLessons + directLessons.length;

  const filteredSemesters = (semesters ?? []).filter((sem) => {
    if (!search) return true;
    return (
      sem.title.toLowerCase().includes(search.toLowerCase()) ||
      sem.description?.toLowerCase().includes(search.toLowerCase()) ||
      sem.subjects.some(
        (s) =>
          s.title.toLowerCase().includes(search.toLowerCase()) ||
          s.description?.toLowerCase().includes(search.toLowerCase()) ||
          s.lessons.some(
            (l) =>
              l.title.toLowerCase().includes(search.toLowerCase()) ||
              l.description?.toLowerCase().includes(search.toLowerCase())
          )
      )
    );
  });

  const filteredSubjects = search
    ? subjects.filter(
        (s) =>
          s.title.toLowerCase().includes(search.toLowerCase()) ||
          s.description?.toLowerCase().includes(search.toLowerCase()) ||
          s.lessons.some(
            (l) =>
              l.title.toLowerCase().includes(search.toLowerCase()) ||
              l.description?.toLowerCase().includes(search.toLowerCase())
          )
      )
    : subjects;

  const filteredDirectLessons = search
    ? directLessons.filter(
        (l) =>
          l.title.toLowerCase().includes(search.toLowerCase()) ||
          l.description?.toLowerCase().includes(search.toLowerCase())
      )
    : directLessons;

  const resultsVisible = hierarchyType === 1
    ? filteredSemesters.reduce((sum, sem) => sum + sem.subjects.reduce((s, sub) => s + (search ? sub.lessons.filter(
        (l) =>
          l.title.toLowerCase().includes(search.toLowerCase()) ||
          l.description?.toLowerCase().includes(search.toLowerCase())
      ).length : sub.lessons.length), 0), 0)
    : hierarchyType === 2
      ? filteredSubjects.reduce((sum, s) => {
          const matchCount = search
            ? s.lessons.filter(
                (l) =>
                  l.title.toLowerCase().includes(search.toLowerCase()) ||
                  l.description?.toLowerCase().includes(search.toLowerCase())
              ).length + (s.title.toLowerCase().includes(search.toLowerCase()) ? s.lessons.length : 0)
            : s.lessons.length;
          return sum + matchCount;
        }, 0)
      : filteredDirectLessons.length;

  if (totalLessons === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-foreground text-xl font-bold">Course Content</h2>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <FileText className="text-muted-foreground/50 h-10 w-10" />
          <p className="text-muted-foreground mt-3 text-sm">
            No content has been added to this course yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-foreground text-xl font-bold">Course Content</h2>
        <div className="relative max-w-sm flex-1 sm:flex-initial">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search lessons..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-border bg-background focus:ring-primary w-full rounded-lg border py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2"
          />
        </div>
      </div>

      {search && (
        <p className="text-muted-foreground text-sm">
          Showing {resultsVisible} of {totalLessons} lessons
        </p>
      )}

      {hierarchyType === 1 ? (
        filteredSemesters.length === 0 && search ? (
          <p className="text-muted-foreground py-4 text-center text-sm">
            No lessons match &ldquo;{search}&rdquo;
          </p>
        ) : (
          <div className="space-y-4">
            {filteredSemesters.map((semester, si) => (
              <details key={semester.id} className="group border-border overflow-hidden rounded-xl border" open={si === 0}>
                <summary className="bg-muted/30 hover:bg-muted/50 flex cursor-pointer list-none items-center gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
                  <div className="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold">
                    {si + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-foreground font-semibold">
                      {semester.title}
                    </h3>
                    {semester.description && (
                      <p className="text-muted-foreground mt-0.5 line-clamp-1 text-sm">
                        {semester.description}
                      </p>
                    )}
                  </div>
                  <span className="text-muted-foreground mr-2 text-xs">
                    {semester.subjects.length} subject{semester.subjects.length !== 1 ? "s" : ""}
                    ({semester.subjects.reduce((s, sub) => s + sub.lessons.length, 0)} lessons)
                  </span>
                  <ChevronDown className="text-muted-foreground h-5 w-5 transition-transform group-open:rotate-180" />
                </summary>
                <div className="bg-background space-y-3 p-4">
                  {semester.subjects.map((subject, subI) => (
                    <SubjectAccordion
                      key={subject.id}
                      subject={subject}
                      index={subI}
                      courseId={courseId}
                      completedIds={completedIds}
                      highlight={search || undefined}
                    />
                  ))}
                </div>
              </details>
            ))}
          </div>
        )
      ) : hierarchyType === 2 ? (
        filteredSubjects.length === 0 && search ? (
          <p className="text-muted-foreground py-4 text-center text-sm">
            No lessons match &ldquo;{search}&rdquo;
          </p>
        ) : (
          <div className="space-y-3">
            {filteredSubjects.map((subject, i) => (
              <SubjectAccordion
                key={subject.id}
                subject={subject}
                index={i}
                courseId={courseId}
                completedIds={completedIds}
                highlight={search || undefined}
              />
            ))}
          </div>
        )
      ) : filteredDirectLessons.length === 0 && search ? (
        <p className="text-muted-foreground py-4 text-center text-sm">
          No lessons match &ldquo;{search}&rdquo;
        </p>
      ) : (
        <div className="space-y-3">
          {filteredDirectLessons.map((lesson, i) => (
            <LessonItem
              key={lesson.id}
              lesson={lesson}
              index={i}
              courseId={courseId}
              isCompleted={completedIds.has(lesson.id)}
              highlight={search}
            />
          ))}
        </div>
      )}
    </div>
  );
}
