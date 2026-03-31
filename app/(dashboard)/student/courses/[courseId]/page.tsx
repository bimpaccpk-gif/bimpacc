import { getCurrentUser, verifyEnrollment } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  BookOpen,
  Layers,
  FileText,
  PlayCircle,
  Clock,
  CheckCircle2,
  ArrowLeft,
  ChevronDown,
  ArrowRight,
} from "lucide-react";

// ─── Data fetchers ────────────────────────────────────────

interface CourseDetail {
  id: string;
  title: string;
  description: string;
  batch: string;
  status: string;
  hierarchy_type: number;
  thumbnail_url: string | null;
}

interface SubjectWithLessons {
  id: string;
  title: string;
  description: string;
  order_index: number;
  lessons: LessonRow[];
}

interface LessonRow {
  id: string;
  title: string;
  description: string;
  video_url: string | null;
  content: string | null;
  order_index: number;
  duration_minutes: number | null;
}

async function getCourseDetail(courseId: string): Promise<CourseDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .select("id, title, description, batch, status, hierarchy_type, thumbnail_url")
    .eq("id", courseId)
    .single();

  if (error) return null;
  return data as CourseDetail;
}

async function getSubjectsWithLessons(courseId: string): Promise<SubjectWithLessons[]> {
  const supabase = await createClient();

  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, title, description, order_index")
    .eq("course_id", courseId)
    .order("order_index", { ascending: true });

  if (!subjects || subjects.length === 0) return [];

  const subjectIds = subjects.map((s) => s.id);
  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, title, description, video_url, content, order_index, duration_minutes, subject_id")
    .in("subject_id", subjectIds)
    .order("order_index", { ascending: true });

  const lessonsBySubject = new Map<string, LessonRow[]>();
  (lessons ?? []).forEach((l) => {
    const list = lessonsBySubject.get(l.subject_id) ?? [];
    list.push(l);
    lessonsBySubject.set(l.subject_id, list);
  });

  return subjects.map((s) => ({
    ...s,
    lessons: lessonsBySubject.get(s.id) ?? [],
  }));
}

async function getDirectLessons(courseId: string): Promise<LessonRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lessons")
    .select("id, title, description, video_url, content, order_index, duration_minutes")
    .eq("course_id", courseId)
    .order("order_index", { ascending: true });

  return (data ?? []) as LessonRow[];
}

async function getCompletedLessonIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  courseId: string
): Promise<Set<string>> {
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .single();

  if (!enrollment) return new Set();

  const { data: progressRecords } = await supabase
    .from("lesson_progress")
    .select("lesson_id, completed")
    .eq("enrollment_id", enrollment.id)
    .eq("completed", true);

  return new Set((progressRecords ?? []).map((p) => p.lesson_id));
}

// ─── Lesson Component ─────────────────────────────────────

function LessonItem({
  lesson,
  index,
  courseId,
  isCompleted,
}: {
  lesson: LessonRow;
  index: number;
  courseId: string;
  isCompleted: boolean;
}) {
  return (
    <div className="border-border bg-background overflow-hidden rounded-xl border transition-colors hover:border-indigo-500/30">
      <div className="flex items-center gap-3 px-5 py-4">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
            isCompleted
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
          }`}
        >
          {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-foreground font-semibold">{lesson.title}</h4>
          {lesson.description && (
            <p className="text-muted-foreground mt-0.5 line-clamp-2 text-sm">
              {lesson.description}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {lesson.duration_minutes && (
            <span className="text-muted-foreground flex items-center gap-1 text-xs">
              <Clock className="h-3 w-3" />
              {lesson.duration_minutes} min
            </span>
          )}
          {lesson.video_url && <PlayCircle className="h-5 w-5 text-indigo-500" />}
        </div>
        <Link href={`/student/courses/${courseId}/lessons/${lesson.id}`}>
          <Button size="sm" variant="secondary" className="gap-1.5">
            {lesson.video_url ? "Watch" : "View"}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ─── Subject Accordion ────────────────────────────────────

function SubjectAccordion({
  subject,
  index,
  courseId,
  completedIds,
}: {
  subject: SubjectWithLessons;
  index: number;
  courseId: string;
  completedIds: Set<string>;
}) {
  return (
    <details className="group border-border overflow-hidden rounded-xl border" open={index === 0}>
      <summary className="bg-muted/30 hover:bg-muted/50 flex cursor-pointer list-none items-center gap-3 px-5 py-4 transition-colors [&::-webkit-details-marker]:hidden">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-sm font-bold text-indigo-600 dark:text-indigo-400">
          {index + 1}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-foreground font-semibold">{subject.title}</h3>
          {subject.description && (
            <p className="text-muted-foreground mt-0.5 line-clamp-1 text-sm">
              {subject.description}
            </p>
          )}
        </div>
        <span className="text-muted-foreground mr-2 text-xs">
          {subject.lessons.length} lesson{subject.lessons.length !== 1 ? "s" : ""}
        </span>
        <ChevronDown className="text-muted-foreground h-5 w-5 transition-transform group-open:rotate-180" />
      </summary>

      <div className="bg-background space-y-3 p-4">
        {subject.lessons.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-sm">
            No lessons in this subject yet.
          </p>
        ) : (
          subject.lessons.map((lesson, i) => (
            <LessonItem
              key={lesson.id}
              lesson={lesson}
              index={i}
              courseId={courseId}
              isCompleted={completedIds.has(lesson.id)}
            />
          ))
        )}
      </div>
    </details>
  );
}

// ─── Page Component ───────────────────────────────────────

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const user = await getCurrentUser();
  const course = await getCourseDetail(courseId);

  if (!course) {
    redirect("/student/courses");
  }

  // STRICT ACCESS CONTROL: Verify enrollment before showing any course content
  // This is the LAW - students cannot view courses they are not enrolled in
  await verifyEnrollment(user.id, course.id);

  // Fetch content based on hierarchy type
  let subjects: SubjectWithLessons[] = [];
  let directLessons: LessonRow[] = [];

  if (course.hierarchy_type === 1) {
    // Course → Subject → Lesson
    subjects = await getSubjectsWithLessons(course.id);
  } else {
    // Type 2 & 3: lessons directly under course
    directLessons = await getDirectLessons(course.id);
  }

  // Fetch completed lesson IDs
  const supabase = await createClient();
  const completedIds = await getCompletedLessonIds(supabase, user.id, course.id);

  const totalLessons =
    course.hierarchy_type === 1
      ? subjects.reduce((sum, s) => sum + s.lessons.length, 0)
      : directLessons.length;

  // Find first incomplete lesson for "Continue Learning" button
  const allLessonsFlat =
    course.hierarchy_type === 1 ? subjects.flatMap((s) => s.lessons) : directLessons;
  const firstIncomplete = allLessonsFlat.find((l) => !completedIds.has(l.id));
  const continueLesson = firstIncomplete ?? allLessonsFlat[0];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Back nav */}
      <Link
        href="/student/courses"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Courses
      </Link>

      {/* Course Header */}
      <div className="border-border overflow-hidden rounded-2xl border">
        {/* Hero */}
        <div className="relative aspect-[3/1] bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
          {course.thumbnail_url ? (
            <img
              src={course.thumbnail_url}
              alt={course.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <BookOpen className="h-16 w-16 text-white/40" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute right-0 bottom-0 left-0 p-6 text-white">
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-medium backdrop-blur-sm">
                Batch {course.batch}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-bold shadow-lg">
                <CheckCircle2 className="h-3 w-3" />
                Enrolled
              </span>
            </div>
            <h1 className="text-2xl font-bold md:text-3xl">{course.title}</h1>
          </div>
        </div>

        {/* Course Info Bar */}
        <div className="bg-background border-border flex flex-wrap items-center justify-between gap-4 border-t px-6 py-4">
          <div className="text-muted-foreground flex items-center gap-6 text-sm">
            {subjects.length > 0 && (
              <span className="flex items-center gap-1.5">
                <Layers className="h-4 w-4" />
                {subjects.length} Subject{subjects.length !== 1 ? "s" : ""}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <FileText className="h-4 w-4" />
              {totalLessons} Lesson{totalLessons !== 1 ? "s" : ""}
            </span>
            {completedIds.size > 0 && (
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                {completedIds.size}/{totalLessons} completed
              </span>
            )}
          </div>
          {continueLesson && (
            <Link href={`/student/courses/${course.id}/lessons/${continueLesson.id}`}>
              <Button size="sm" className="gap-2">
                {firstIncomplete ? "Continue Learning" : "Review Lessons"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Description */}
      {course.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">About this Course</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">
              {course.description}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Course Content */}
      <div className="space-y-4">
        <h2 className="text-foreground text-xl font-bold">Course Content</h2>

        {totalLessons === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
            <FileText className="text-muted-foreground/50 h-10 w-10" />
            <p className="text-muted-foreground mt-3 text-sm">
              No content has been added to this course yet.
            </p>
          </div>
        ) : course.hierarchy_type === 1 ? (
          /* Type 1: Subject accordion with nested lessons */
          <div className="space-y-3">
            {subjects.map((subject, i) => (
              <SubjectAccordion
                key={subject.id}
                subject={subject}
                index={i}
                courseId={course.id}
                completedIds={completedIds}
              />
            ))}
          </div>
        ) : (
          /* Type 2 & 3: Direct lesson list */
          <div className="space-y-3">
            {directLessons.map((lesson, i) => (
              <LessonItem
                key={lesson.id}
                lesson={lesson}
                index={i}
                courseId={course.id}
                isCompleted={completedIds.has(lesson.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
