import { getCurrentUser } from "@/lib/dal";
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
  Shield,
} from "lucide-react";

// ─── YouTube no-cookie URL helper ─────────────────────────

function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;

  let videoId: string | null = null;

  // youtube.com/watch?v=VIDEO_ID
  const watchMatch = url.match(
    /(?:youtube\.com\/watch\?v=|youtube\.com\/watch\?.+&v=)([^&\s]+)/
  );
  if (watchMatch) videoId = watchMatch[1];

  // youtu.be/VIDEO_ID
  if (!videoId) {
    const shortMatch = url.match(/youtu\.be\/([^?\s]+)/);
    if (shortMatch) videoId = shortMatch[1];
  }

  // youtube.com/embed/VIDEO_ID
  if (!videoId) {
    const embedMatch = url.match(/youtube\.com\/embed\/([^?\s]+)/);
    if (embedMatch) videoId = embedMatch[1];
  }

  // youtube-nocookie.com/embed/VIDEO_ID (already correct)
  if (!videoId) {
    const nocookieMatch = url.match(/youtube-nocookie\.com\/embed\/([^?\s]+)/);
    if (nocookieMatch) videoId = nocookieMatch[1];
  }

  if (!videoId) return null;

  return `https://www.youtube-nocookie.com/embed/${videoId}`;
}

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

  const subjectIds = subjects.map((s: any) => s.id);
  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, title, description, video_url, content, order_index, duration_minutes, subject_id")
    .in("subject_id", subjectIds)
    .order("order_index", { ascending: true });

  const lessonsBySubject = new Map<string, LessonRow[]>();
  (lessons ?? []).forEach((l: any) => {
    const list = lessonsBySubject.get(l.subject_id) ?? [];
    list.push(l);
    lessonsBySubject.set(l.subject_id, list);
  });

  return subjects.map((s: any) => ({
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

async function isEnrolled(userId: string, courseId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("enrollments")
    .select("id")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .single();

  return !!data;
}

// ─── Lesson Component ─────────────────────────────────────

function LessonItem({ lesson, index }: { lesson: LessonRow; index: number }) {
  const embedUrl = lesson.video_url ? getYouTubeEmbedUrl(lesson.video_url) : null;

  return (
    <div className="rounded-xl border border-border bg-background overflow-hidden">
      {/* Lesson Header */}
      <div className="flex items-center gap-3 px-5 py-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-sm font-bold text-indigo-600 dark:text-indigo-400">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-foreground">{lesson.title}</h4>
          {lesson.description && (
            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
              {lesson.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {lesson.duration_minutes && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {lesson.duration_minutes} min
            </span>
          )}
          {lesson.video_url && (
            <PlayCircle className="h-5 w-5 text-indigo-500" />
          )}
        </div>
      </div>

      {/* Video Player */}
      {embedUrl && (
        <div className="border-t border-border">
          <div className="aspect-video w-full bg-black">
            <iframe
              src={embedUrl}
              title={lesson.title}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        </div>
      )}

      {/* Text Content */}
      {lesson.content && !embedUrl && (
        <div className="border-t border-border px-5 py-4">
          <div className="prose prose-sm dark:prose-invert max-w-none text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
            {lesson.content}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Subject Accordion ────────────────────────────────────

function SubjectAccordion({ subject, index }: { subject: SubjectWithLessons; index: number }) {
  return (
    <details className="group rounded-xl border border-border overflow-hidden" open={index === 0}>
      <summary className="flex cursor-pointer items-center gap-3 px-5 py-4 bg-muted/30 hover:bg-muted/50 transition-colors list-none [&::-webkit-details-marker]:hidden">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-sm font-bold text-indigo-600 dark:text-indigo-400">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground">{subject.title}</h3>
          {subject.description && (
            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{subject.description}</p>
          )}
        </div>
        <span className="text-xs text-muted-foreground mr-2">
          {subject.lessons.length} lesson{subject.lessons.length !== 1 ? "s" : ""}
        </span>
        <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>

      <div className="space-y-3 p-4 bg-background">
        {subject.lessons.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No lessons in this subject yet.
          </p>
        ) : (
          subject.lessons.map((lesson, i) => (
            <LessonItem key={lesson.id} lesson={lesson} index={i} />
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

  const enrolled = await isEnrolled(user.id, course.id);

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

  const totalLessons =
    course.hierarchy_type === 1
      ? subjects.reduce((sum, s) => sum + s.lessons.length, 0)
      : directLessons.length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back nav */}
      <Link
        href="/student/courses"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Courses
      </Link>

      {/* Course Header */}
      <div className="rounded-2xl border border-border overflow-hidden">
        {/* Hero */}
        <div className="aspect-[3/1] bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 relative">
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
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <div className="flex items-center gap-2 mb-2">
              <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-medium backdrop-blur-sm">
                Batch {course.batch}
              </span>
              {enrolled && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-bold shadow-lg">
                  <CheckCircle2 className="h-3 w-3" />
                  Enrolled
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold">{course.title}</h1>
          </div>
        </div>

        {/* Course Info Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 bg-background border-t border-border">
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
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
          </div>

          {!enrolled && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-4 py-2 rounded-lg">
              <Shield className="h-4 w-4" />
              <span>Enrollment is managed by the administrator.</span>
            </div>
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
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {course.description}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Course Content */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">Course Content</h2>

        {totalLessons === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
            <FileText className="h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">
              No content has been added to this course yet.
            </p>
          </div>
        ) : course.hierarchy_type === 1 ? (
          /* Type 1: Subject accordion with nested lessons */
          <div className="space-y-3">
            {subjects.map((subject, i) => (
              <SubjectAccordion key={subject.id} subject={subject} index={i} />
            ))}
          </div>
        ) : (
          /* Type 2 & 3: Direct lesson list */
          <div className="space-y-3">
            {directLessons.map((lesson, i) => (
              <LessonItem key={lesson.id} lesson={lesson} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
