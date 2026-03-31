import { getCurrentUser, verifyEnrollment } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LessonPlayerClient } from "./lesson-player-client";

// ─── YouTube video ID extractor ───────────────────────────

function getYouTubeVideoId(url: string): string | null {
  if (!url) return null;

  // youtube.com/watch?v=VIDEO_ID
  const watchMatch = url.match(/(?:youtube\.com\/watch\?v=|youtube\.com\/watch\?.+&v=)([^&\s]+)/);
  if (watchMatch) return watchMatch[1];

  // youtu.be/VIDEO_ID
  const shortMatch = url.match(/youtu\.be\/([^?\s]+)/);
  if (shortMatch) return shortMatch[1];

  // youtube.com/embed/VIDEO_ID
  const embedMatch = url.match(/youtube\.com\/embed\/([^?\s]+)/);
  if (embedMatch) return embedMatch[1];

  // youtube-nocookie.com/embed/VIDEO_ID
  const nocookieMatch = url.match(/youtube-nocookie\.com\/embed\/([^?\s]+)/);
  if (nocookieMatch) return nocookieMatch[1];

  return null;
}

// ─── Types ────────────────────────────────────────────────

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

// ─── Data Fetchers ────────────────────────────────────────

async function getCourseInfo(courseId: string): Promise<CourseInfo | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .select("id, title, hierarchy_type")
    .eq("id", courseId)
    .single();

  if (error) return null;
  return data as CourseInfo;
}

async function getLessonWithSiblings(
  courseId: string,
  lessonId: string,
  hierarchyType: number
): Promise<{
  current: LessonRow | null;
  allLessons: LessonRow[];
  completedIds: Set<string>;
}> {
  const supabase = await createClient();

  let lessons: LessonRow[] = [];

  if (hierarchyType === 1) {
    // Course → Subject → Lesson
    const { data: subjects } = await supabase
      .from("subjects")
      .select("id, title, order_index")
      .eq("course_id", courseId)
      .order("order_index", { ascending: true });

    if (subjects && subjects.length > 0) {
      const subjectIds = subjects.map((s) => s.id);
      const { data: rawLessons } = await supabase
        .from("lessons")
        .select(
          "id, title, description, video_url, content, order_index, duration_minutes, subject_id"
        )
        .in("subject_id", subjectIds)
        .order("order_index", { ascending: true });

      const subjectMap = new Map<string, string>();
      subjects.forEach((s) => subjectMap.set(s.id, s.title));

      lessons = (rawLessons ?? []).map((l) => ({
        id: l.id,
        title: l.title,
        description: l.description,
        video_url: l.video_url,
        content: l.content,
        order_index: l.order_index,
        duration_minutes: l.duration_minutes,
        subject_id: l.subject_id,
        subject_title: subjectMap.get(l.subject_id) ?? null,
      }));
    }
  } else {
    // Direct lessons under course
    const { data: rawLessons } = await supabase
      .from("lessons")
      .select("id, title, description, video_url, content, order_index, duration_minutes")
      .eq("course_id", courseId)
      .order("order_index", { ascending: true });

    lessons = (rawLessons ?? []) as LessonRow[];
  }

  const current = lessons.find((l) => l.id === lessonId) ?? null;

  // Fetch completed lesson IDs
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id")
    .eq("course_id", courseId)
    .single();

  let completedIds = new Set<string>();
  if (enrollment) {
    const { data: progressRecords } = await supabase
      .from("lesson_progress")
      .select("lesson_id, completed")
      .eq("enrollment_id", enrollment.id)
      .eq("completed", true);

    completedIds = new Set((progressRecords ?? []).map((p) => p.lesson_id));
  }

  return { current, allLessons: lessons, completedIds };
}

// ─── Page Component ───────────────────────────────────────

export default async function LessonPlayerPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const { courseId, lessonId } = await params;
  const user = await getCurrentUser();
  const course = await getCourseInfo(courseId);

  if (!course) {
    redirect("/student/courses");
  }

  await verifyEnrollment(user.id, course.id);

  const { current, allLessons, completedIds } = await getLessonWithSiblings(
    courseId,
    lessonId,
    course.hierarchy_type
  );

  if (!current) {
    redirect(`/student/courses/${courseId}`);
  }

  const currentIndex = allLessons.findIndex((l) => l.id === lessonId);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  const videoId = current.video_url ? getYouTubeVideoId(current.video_url) : null;
  const isCompleted = completedIds.has(current.id);

  return (
    <LessonPlayerClient
      course={course}
      current={current}
      allLessons={allLessons}
      completedIds={completedIds}
      prevLesson={prevLesson}
      nextLesson={nextLesson}
      videoId={videoId}
      isCompleted={isCompleted}
      currentIndex={currentIndex}
    />
  );
}
