import {
  getCurrentUser,
  getFullUserProfile,
  verifyEnrollment,
  verifyNotPaused,
  resolveContentAccess,
} from "@/lib/dal";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LessonPlayerClient } from "./lesson-player-client";
import { ContentPausedBanner } from "@/components/student/content-paused-banner";
import { getQuizForLesson, getBestQuizAttempt } from "@/app/actions/quiz";
import { getLessonComments } from "@/app/actions/lesson-comments";
import { createClient as createStorageClient } from "@/lib/supabase/server";

// ─── YouTube video ID extractor ───────────────────────────

/**
 * Extract a YouTube video ID from any common format.
 * Supported: watch URLs, short URLs, embed/nocookie URLs, Shorts URLs,
 * bare video IDs (11 chars alphanumeric + dash/underscore).
 */
function getYouTubeVideoId(url: string): string | null {
  if (!url) return null;

  // Standard watch URL
  const watchMatch = url.match(/(?:youtube\.com\/watch\?v=|youtube\.com\/watch\?.+&v=)([^&\s]+)/);
  if (watchMatch) return watchMatch[1];

  // Shorts URL
  const shortsMatch = url.match(/youtube\.com\/shorts\/([^?\s]+)/);
  if (shortsMatch) return shortsMatch[1];

  // Short URL (youtu.be)
  const shortMatch = url.match(/youtu\.be\/([^?\s]+)/);
  if (shortMatch) return shortMatch[1];

  // Embed URL
  const embedMatch = url.match(/youtube\.com\/embed\/([^?\s]+)/);
  if (embedMatch) return embedMatch[1];

  // Privacy-enhanced embed URL
  const nocookieMatch = url.match(/youtube-nocookie\.com\/embed\/([^?\s]+)/);
  if (nocookieMatch) return nocookieMatch[1];

  // Live URL
  const liveMatch = url.match(/youtube\.com\/live\/([^?\s]+)/);
  if (liveMatch) return liveMatch[1];

  // If nothing matched, check if it's a bare video ID (11 chars)
  const bareMatch = url.match(/^([A-Za-z0-9_-]{11})$/);
  if (bareMatch) return bareMatch[1];

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
    const { data: rawLessons } = await supabase
      .from("lessons")
      .select("id, title, description, video_url, content, order_index, duration_minutes")
      .eq("course_id", courseId)
      .order("order_index", { ascending: true });

    lessons = (rawLessons ?? []) as LessonRow[];
  }

  const current = lessons.find((l) => l.id === lessonId) ?? null;

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

async function getResourcesWithUrls(lessonId: string) {
  const supabase = await createClient();

  const { data: resources } = await supabase
    .from("lesson_resources")
    .select("*")
    .eq("lesson_id", lessonId)
    .order("created_at", { ascending: true });

  if (!resources || resources.length === 0) return [];

  const signedUrls: { path: string; signedUrl: string }[] = [];
  for (const r of resources) {
    const { data: urlData } = await supabase.storage
      .from("lesson_resources")
      .createSignedUrl(r.file_path, 3600);
    if (urlData) {
      signedUrls.push({ path: r.file_path, signedUrl: urlData.signedUrl });
    }
  }

  return resources.map((r) => {
    const signed = signedUrls.find((s) => s.path === r.file_path);
    return {
      id: r.id,
      file_name: r.file_name,
      file_size: r.file_size,
      file_type: r.file_type,
      signed_url: signed?.signedUrl ?? "",
    };
  });
}

// ─── Page Component ───────────────────────────────────────

export default async function LessonPlayerPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const { courseId, lessonId } = await params;
  const user = await getCurrentUser();
  const fullProfile = await getFullUserProfile();
  const course = await getCourseInfo(courseId);

  if (!course) {
    redirect("/student/courses");
  }

  await verifyEnrollment(user.id, course.id);
  await verifyNotPaused();

  const accessResult = await resolveContentAccess(user.id, courseId, lessonId);

  if (accessResult.isPaused) {
    return (
      <ContentPausedBanner
        blockedAt={accessResult.blockedAt as "account" | "course" | "subject" | "lesson"}
        courseId={courseId}
      />
    );
  }

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

  // Fetch quiz
  const { data: quizData } = await getQuizForLesson(lessonId);
  const { data: bestAttempt } = await getBestQuizAttempt(quizData?.id ?? "");
  const previousAttempt = bestAttempt
    ? { score: bestAttempt.score, passed: bestAttempt.passed }
    : null;

  // Fetch resources with signed URLs
  const resources = await getResourcesWithUrls(lessonId);

  // Fetch comments
  const { data: commentsData } = await getLessonComments(lessonId);

  const allLessonCount = allLessons.length;
  const completedCount = allLessons.filter((l) => completedIds.has(l.id)).length;

  // Auto-generate a certificate if all lessons are complete (and pass 70% on quizzes)
  if (allLessonCount > 0 && completedCount === allLessonCount) {
    const admin = createAdminClient();

    // Check all quiz passing scores
    const { data: quizzes } = await admin
      .from("quizzes")
      .select("id, passing_score, lesson_id")
      .in("lesson_id", allLessons.map((l) => l.id));

    let allQuizzesPassed = true;
    for (const quiz of (quizzes as any[]) ?? []) {
      const { data: bestAttempt } = await admin
        .from("quiz_attempts")
        .select("score, passed")
        .eq("quiz_id", quiz.id)
        .eq("user_id", user.id)
        .eq("passed", true)
        .order("score", { ascending: false })
        .limit(1);

      if (!bestAttempt || bestAttempt.length === 0) {
        allQuizzesPassed = false;
        break;
      }
    }

    if (allQuizzesPassed) {
      const existingCert = await admin
        .from("certificates")
        .select("id")
        .eq("user_id", user.id)
        .eq("course_id", courseId)
        .maybeSingle();

      if (!existingCert.data) {
        const certNumber = `BIMPACC-${courseId.slice(0, 8).toUpperCase()}-${user.id.slice(0, 8).toUpperCase()}`;
        await admin
          .from("certificates")
          .insert({
            user_id: user.id,
            course_id: courseId,
            certificate_number: certNumber,
            issued_at: new Date().toISOString(),
          } as never);
      }
    }
  }

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
      watermark={{
        fullName: fullProfile.full_name,
        email: fullProfile.email,
        cnicNumber: fullProfile.cnic_number,
      }}
      quiz={quizData}
      previousAttempt={previousAttempt}
      resources={resources}
      comments={commentsData ?? []}
      userId={user.id}
      isCourseComplete={allLessonCount > 0 && completedCount === allLessonCount}
    />
  );
}
