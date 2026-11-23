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
interface SubjectQueryRow {
  id: string;
  title: string;
  description?: string | null;
  order_index?: number | null;
  semester_id?: string | null;
  course_id?: string | null;
  is_paused?: boolean | null;
}

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
  hierarchyType: number,
  userId: string
): Promise<{
  current: LessonRow | null;
  allLessons: LessonRow[];
  completedIds: Set<string>;
}> {
  const supabase = await createClient();
  const admin = createAdminClient();

  let lessons: LessonRow[] = [];

  if (hierarchyType === 3) {
    const { data: rawLessons } = await admin
      .from("lessons")
      .select("id, title, description, video_url, content, order_index, duration_minutes")
      .eq("course_id", courseId)
      .order("order_index", { ascending: true });

    lessons = (rawLessons ?? []) as LessonRow[];
  } else {
    // Hierarchy 1 and 2 are subject-based; keep loading compatible with both
    // semester-linked and legacy direct-to-course subjects.
    const semesterOrder = new Map<string, number>();
    let subjects: SubjectQueryRow[] = [];

    if (hierarchyType === 1) {
      const [{ data: semesters }, { data: legacySubjects }] = await Promise.all([
        admin
          .from("semesters")
          .select("id, order_index")
          .eq("course_id", courseId)
          .order("order_index", { ascending: true }),
        admin
          .from("subjects")
          .select("id, title, semester_id, order_index")
          .eq("course_id", courseId)
          .is("semester_id", null)
          .order("order_index", { ascending: true }),
      ]);

      const semesterIds = (semesters ?? []).map((s) => s.id);
      (semesters ?? []).forEach((s) => {
        semesterOrder.set(s.id, s.order_index ?? 0);
      });

      let semesterSubjects: SubjectQueryRow[] = [];
      if (semesterIds.length > 0) {
        const { data } = await admin
          .from("subjects")
          .select("id, title, semester_id, order_index")
          .in("semester_id", semesterIds)
          .order("order_index", { ascending: true });
        semesterSubjects = data ?? [];
      }

      subjects = [...semesterSubjects, ...(legacySubjects ?? [])];
    } else {
      const { data } = await admin
        .from("subjects")
        .select("id, title, semester_id, order_index")
        .eq("course_id", courseId)
        .order("order_index", { ascending: true });
      subjects = data ?? [];
    }

    if (subjects && subjects.length > 0) {
      const subjectIds = subjects.map((s) => s.id);
      const { data: rawLessons } = await admin
        .from("lessons")
        .select(
          "id, title, description, video_url, content, order_index, duration_minutes, subject_id"
        )
        .in("subject_id", subjectIds)
        .order("order_index", { ascending: true });

      const subjectMeta = new Map<
        string,
        { title: string; order_index: number; semester_id?: string | null }
      >();
      subjects.forEach((s) => {
        subjectMeta.set(s.id, {
          title: s.title,
          order_index: s.order_index ?? 0,
          semester_id: s.semester_id,
        });
      });

      lessons = (rawLessons ?? [])
        .map((l) => ({
          id: l.id,
          title: l.title,
          description: l.description,
          video_url: l.video_url,
          content: l.content,
          order_index: l.order_index,
          duration_minutes: l.duration_minutes,
          subject_id: l.subject_id,
          subject_title: subjectMeta.get(l.subject_id)?.title ?? null,
        }))
        .sort((a, b) => {
          const aMeta = a.subject_id ? subjectMeta.get(a.subject_id) : undefined;
          const bMeta = b.subject_id ? subjectMeta.get(b.subject_id) : undefined;

          if (hierarchyType === 1) {
            const aSemOrder = aMeta?.semester_id
              ? (semesterOrder.get(aMeta.semester_id) ?? Number.MAX_SAFE_INTEGER)
              : Number.MAX_SAFE_INTEGER;
            const bSemOrder = bMeta?.semester_id
              ? (semesterOrder.get(bMeta.semester_id) ?? Number.MAX_SAFE_INTEGER)
              : Number.MAX_SAFE_INTEGER;
            if (aSemOrder !== bSemOrder) return aSemOrder - bSemOrder;
          }

          const aSubjectOrder = aMeta?.order_index ?? Number.MAX_SAFE_INTEGER;
          const bSubjectOrder = bMeta?.order_index ?? Number.MAX_SAFE_INTEGER;
          if (aSubjectOrder !== bSubjectOrder) return aSubjectOrder - bSubjectOrder;

          return (a.order_index ?? 0) - (b.order_index ?? 0);
        });
    }
  }

  const current = lessons.find((l) => l.id === lessonId) ?? null;

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id")
    .eq("user_id", userId)
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

  // One storage request for all files instead of one request per file.
  const { data: signedData } = await supabase.storage.from("lesson_resources").createSignedUrls(
    resources.map((r) => r.file_path),
    3600
  );
  const signedUrls = (signedData ?? []).filter(
    (s): s is typeof s & { path: string; signedUrl: string } => !!s.path && !!s.signedUrl
  );

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
  const [user, fullProfile, course] = await Promise.all([
    getCurrentUser(),
    getFullUserProfile(),
    getCourseInfo(courseId),
  ]);

  if (!course) {
    redirect("/student/courses");
  }

  // Access checks and lesson data are independent, so they run together.
  // Nothing is rendered until every check has passed: verifyEnrollment and
  // verifyNotPaused redirect, and a paused result returns the banner below.
  const [, , accessResult, lessonData, quizResult, resources, commentsResult] = await Promise.all([
    verifyEnrollment(user.id, course.id),
    verifyNotPaused(),
    resolveContentAccess(user.id, courseId, lessonId),
    getLessonWithSiblings(courseId, lessonId, course.hierarchy_type, user.id),
    getQuizForLesson(lessonId),
    getResourcesWithUrls(lessonId),
    getLessonComments(lessonId),
  ]);

  if (accessResult.isPaused) {
    return (
      <ContentPausedBanner
        blockedAt={accessResult.blockedAt as "account" | "course" | "subject" | "lesson"}
        courseId={courseId}
      />
    );
  }

  const { current, allLessons: lessonsWithContent, completedIds } = lessonData;

  if (!current) {
    redirect(`/student/courses/${courseId}`);
  }

  // Only the current lesson's body is shown; don't ship every lesson's
  // content to the browser.
  const allLessons = lessonsWithContent.map((l) =>
    l.id === current.id ? l : { ...l, content: null }
  );

  const currentIndex = allLessons.findIndex((l) => l.id === lessonId);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  const videoId = current.video_url ? getYouTubeVideoId(current.video_url) : null;
  const isCompleted = completedIds.has(current.id);

  const quizData = quizResult.data;
  const { data: bestAttempt } = quizData
    ? await getBestQuizAttempt(quizData.id)
    : { data: null };
  const previousAttempt = bestAttempt
    ? { score: bestAttempt.score, passed: bestAttempt.passed }
    : null;

  const commentsData = commentsResult.data;

  const allLessonCount = allLessons.length;
  const completedCount = allLessons.filter((l) => completedIds.has(l.id)).length;

  // Auto-generate a certificate if all lessons are complete (and pass 70% on quizzes)
  if (allLessonCount > 0 && completedCount === allLessonCount) {
    const admin = createAdminClient();

    const [{ data: quizzes }, existingCert] = await Promise.all([
      admin
        .from("quizzes")
        .select("id")
        .in(
          "lesson_id",
          allLessons.map((l) => l.id)
        ),
      admin
        .from("certificates")
        .select("id")
        .eq("user_id", user.id)
        .eq("course_id", courseId)
        .maybeSingle(),
    ]);

    if (!existingCert.data) {
      // One query for all passed attempts instead of one query per quiz.
      const quizIds = ((quizzes as { id: string }[] | null) ?? []).map((q) => q.id);
      let allQuizzesPassed = true;
      if (quizIds.length > 0) {
        const { data: passedAttempts } = await admin
          .from("quiz_attempts")
          .select("quiz_id")
          .eq("user_id", user.id)
          .eq("passed", true)
          .in("quiz_id", quizIds);
        const passedQuizIds = new Set(
          ((passedAttempts as { quiz_id: string }[] | null) ?? []).map((a) => a.quiz_id)
        );
        allQuizzesPassed = quizIds.every((id) => passedQuizIds.has(id));
      }

      if (allQuizzesPassed) {
        const certNumber = `BIMPACC-${courseId.slice(0, 8).toUpperCase()}-${user.id.slice(0, 8).toUpperCase()}`;
        await admin.from("certificates").insert({
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
