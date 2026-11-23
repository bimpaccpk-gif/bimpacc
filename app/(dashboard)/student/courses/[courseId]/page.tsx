import { getCurrentUser, verifyEnrollment } from "@/lib/dal";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button-variants";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, FileText, Layers } from "lucide-react";
import { CourseContent } from "@/components/student/course-content";

// ─── Data fetchers ────────────────────────────────────────

interface SubjectQueryRow {
  id: string;
  title: string;
  description?: string | null;
  order_index?: number | null;
  semester_id?: string | null;
  course_id?: string | null;
  is_paused?: boolean | null;
}

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
  isPaused: boolean;
  lessons: LessonRow[];
}

interface SemesterWithSubjectsWithLessons {
  id: string;
  title: string;
  description: string;
  isPaused: boolean;
  subjects: SubjectWithLessons[];
}

interface LessonRow {
  id: string;
  title: string;
  description: string;
  video_url: string | null;
  content?: string | null;
  order_index: number;
  duration_minutes: number | null;
  isPaused: boolean;
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

async function getOverrideMap(
  admin: ReturnType<typeof createAdminClient>,
  userId: string
): Promise<Map<string, boolean>> {
  const { data: overrides } = await admin
    .from("student_content_access")
    .select("content_type, content_id, is_paused")
    .eq("user_id", userId);

  const overrideMap = new Map<string, boolean>();
  for (const o of overrides ?? []) {
    overrideMap.set(`${o.content_type}:${o.content_id}`, o.is_paused);
  }
  return overrideMap;
}

async function getSubjectsWithLessons(
  courseId: string,
  userId: string
): Promise<SubjectWithLessons[]> {
  const admin = createAdminClient();

  // Overrides and subjects are independent — fetch them together.
  const [overrideMap, { data: subjects }] = await Promise.all([
    getOverrideMap(admin, userId),
    admin
      .from("subjects")
      .select("id, title, description, order_index, is_paused")
      .eq("course_id", courseId)
      .order("order_index", { ascending: true }),
  ]);

  if (!subjects || subjects.length === 0) return [];

  const subjectPauseState = new Map<string, boolean>();
  subjects.forEach((s) => {
    const override = overrideMap.get(`subject:${s.id}`);
    subjectPauseState.set(s.id, override !== undefined ? override : (s.is_paused ?? false));
  });

  const subjectIds = subjects.map((s) => s.id);
  const { data: lessons } = await admin
    .from("lessons")
    .select(
      "id, title, description, video_url, order_index, duration_minutes, subject_id, is_paused"
    )
    .in("subject_id", subjectIds)
    .order("order_index", { ascending: true });

  const lessonsBySubject = new Map<string, LessonRow[]>();
  (lessons ?? []).forEach((l) => {
    const list = lessonsBySubject.get(l.subject_id) ?? [];
    const lessonOverride = overrideMap.get(`lesson:${l.id}`);
    const parentPaused = l.subject_id ? (subjectPauseState.get(l.subject_id) ?? false) : false;
    list.push({
      id: l.id,
      title: l.title,
      description: l.description,
      video_url: l.video_url,
      order_index: l.order_index,
      duration_minutes: l.duration_minutes,
      isPaused:
        lessonOverride !== undefined ? lessonOverride : parentPaused || (l.is_paused ?? false),
    });
    lessonsBySubject.set(l.subject_id, list);
  });

  return subjects.map((s) => {
    return {
      id: s.id,
      title: s.title,
      description: s.description,
      order_index: s.order_index,
      isPaused: subjectPauseState.get(s.id) ?? false,
      lessons: lessonsBySubject.get(s.id) ?? [],
    };
  });
}

async function getSemestersWithSubjectsWithLessons(
  courseId: string,
  userId: string
): Promise<SemesterWithSubjectsWithLessons[]> {
  const admin = createAdminClient();

  // Overrides, semesters and legacy (semester-less) subjects are independent.
  const [overrideMap, { data: semesters }, { data: legacySubjects }] = await Promise.all([
    getOverrideMap(admin, userId),
    admin
      .from("semesters")
      .select("id, title, description, order_index, is_paused")
      .eq("course_id", courseId)
      .order("order_index", { ascending: true }),
    admin
      .from("subjects")
      .select("id, title, description, order_index, semester_id, is_paused")
      .eq("course_id", courseId)
      .is("semester_id", null)
      .order("order_index", { ascending: true }),
  ]);

  if (!semesters || semesters.length === 0) return [];

  // Calculate semester pause states
  const semesterPauseState = new Map<string, boolean>();
  semesters.forEach((s) => {
    const override = overrideMap.get(`semester:${s.id}`);
    semesterPauseState.set(s.id, override !== undefined ? override : (s.is_paused ?? false));
  });

  // Fetch subjects from both possible shapes:
  // 1) semester-linked subjects (new type-1 structure)
  // 2) direct course-linked subjects with no semester (legacy fallback)
  const semesterIds = semesters.map((s) => s.id);
  const semesterIdSet = new Set(semesterIds);

  let semesterSubjects: SubjectQueryRow[] = [];
  if (semesterIds.length > 0) {
    const { data } = await admin
      .from("subjects")
      .select("id, title, description, order_index, semester_id, is_paused")
      .in("semester_id", semesterIds)
      .order("order_index", { ascending: true });
    semesterSubjects = data ?? [];
  }

  const subjects = [...semesterSubjects, ...(legacySubjects ?? [])];

  // Calculate subject pause states
  const subjectPauseState = new Map<string, boolean>();
  (subjects ?? []).forEach((s) => {
    const override = overrideMap.get(`subject:${s.id}`);
    const parentPaused = s.semester_id ? (semesterPauseState.get(s.semester_id) ?? false) : false;
    subjectPauseState.set(
      s.id,
      override !== undefined ? override : parentPaused || (s.is_paused ?? false)
    );
  });

  // Fetch lessons for these subjects
  const subjectIds = (subjects ?? []).map((s) => s.id);
  const lessonsBySubject = new Map<string, LessonRow[]>();
  if (subjectIds.length > 0) {
    const { data: lessons } = await admin
      .from("lessons")
      .select(
        "id, title, description, video_url, order_index, duration_minutes, subject_id, is_paused"
      )
      .in("subject_id", subjectIds)
      .order("order_index", { ascending: true });

    (lessons ?? []).forEach((l) => {
      const list = lessonsBySubject.get(l.subject_id) ?? [];
      const lessonOverride = overrideMap.get(`lesson:${l.id}`);
      const parentPaused = l.subject_id ? (subjectPauseState.get(l.subject_id) ?? false) : false;
      list.push({
        id: l.id,
        title: l.title,
        description: l.description,
        video_url: l.video_url,
          order_index: l.order_index,
        duration_minutes: l.duration_minutes,
        isPaused:
          lessonOverride !== undefined ? lessonOverride : parentPaused || (l.is_paused ?? false),
      });
      lessonsBySubject.set(l.subject_id, list);
    });
  }

  const subjectsBySemester = new Map<string, SubjectWithLessons[]>();
  const unassignedSubjects: SubjectWithLessons[] = [];
  (subjects ?? []).forEach((s) => {
    const subjectNode = {
      id: s.id,
      title: s.title,
      description: s.description,
      order_index: s.order_index,
      isPaused: subjectPauseState.get(s.id) ?? false,
      lessons: lessonsBySubject.get(s.id) ?? [],
    };

    if (s.semester_id && semesterIdSet.has(s.semester_id)) {
      const subjectsList = subjectsBySemester.get(s.semester_id) ?? [];
      subjectsList.push(subjectNode);
      subjectsBySemester.set(s.semester_id, subjectsList);
    } else {
      unassignedSubjects.push(subjectNode);
    }
  });

  const semesterNodes: SemesterWithSubjectsWithLessons[] = semesters.map((s) => {
    return {
      id: s.id,
      title: s.title,
      description: s.description,
      isPaused: semesterPauseState.get(s.id) ?? false,
      subjects: subjectsBySemester.get(s.id) ?? [],
    };
  });

  // Legacy fallback bucket for old subjects not linked to semesters yet.
  if (unassignedSubjects.length > 0) {
    semesterNodes.push({
      id: "legacy-unassigned-semester",
      title: "General",
      description: "Subjects pending semester assignment",
      isPaused: false,
      subjects: unassignedSubjects,
    });
  }

  return semesterNodes;
}

async function getDirectLessons(courseId: string, userId: string): Promise<LessonRow[]> {
  const admin = createAdminClient();

  const [overrideMap, { data }] = await Promise.all([
    getOverrideMap(admin, userId),
    admin
      .from("lessons")
      .select("id, title, description, video_url, order_index, duration_minutes, is_paused")
      .eq("course_id", courseId)
      .order("order_index", { ascending: true }),
  ]);

  return (data ?? []).map((l) => {
    const lessonOverride = overrideMap.get(`lesson:${l.id}`);
    return {
      id: l.id,
      title: l.title,
      description: l.description,
      video_url: l.video_url,
      order_index: l.order_index,
      duration_minutes: l.duration_minutes,
      isPaused: lessonOverride !== undefined ? lessonOverride : (l.is_paused ?? false),
    };
  });
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

// ─── Page Component ───────────────────────────────────────

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const [user, course] = await Promise.all([getCurrentUser(), getCourseDetail(courseId)]);

  if (!course) {
    redirect("/student");
  }

  const supabase = await createClient();

  // Fetch content based on hierarchy type:
  //   1: Course → Semester → Subject → Lesson
  //   2: Course → Subject → Lesson
  //   3: Course → Lesson
  // STRICT ACCESS CONTROL: enrollment is verified in parallel with the content
  // queries; if it fails, verifyEnrollment redirects and nothing is rendered.
  const [, semesters, subjects, directLessons, completedIds] = await Promise.all([
    verifyEnrollment(user.id, course.id),
    course.hierarchy_type === 1
      ? getSemestersWithSubjectsWithLessons(course.id, user.id)
      : Promise.resolve<SemesterWithSubjectsWithLessons[]>([]),
    course.hierarchy_type === 2
      ? getSubjectsWithLessons(course.id, user.id)
      : Promise.resolve<SubjectWithLessons[]>([]),
    course.hierarchy_type !== 1 && course.hierarchy_type !== 2
      ? getDirectLessons(course.id, user.id)
      : Promise.resolve<LessonRow[]>([]),
    getCompletedLessonIds(supabase, user.id, course.id),
  ]);

  // All lessons in curriculum order.
  const allLessons = semesters
    .flatMap((sem) => sem.subjects.flatMap((s) => s.lessons))
    .concat(
      subjects.flatMap((s) => s.lessons),
      directLessons
    );
  const totalLessons = allLessons.length;
  const doneCount = allLessons.filter((l) => completedIds.has(l.id)).length;
  const progress = totalLessons > 0 ? Math.round((doneCount / totalLessons) * 100) : 0;

  // "Continue" skips paused lessons, which the student cannot open.
  const nextLesson = allLessons.find((l) => !l.isPaused && !completedIds.has(l.id));
  const startLesson = nextLesson ?? allLessons.find((l) => !l.isPaused);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/student#enrolled-courses"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        My courses
      </Link>

      <header className="bg-card ring-foreground/10 overflow-hidden rounded-xl ring-1">
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:p-5">
          <div className="from-primary via-brand-500 to-primary/70 relative aspect-[16/7] w-full shrink-0 overflow-hidden rounded-lg bg-gradient-to-br sm:aspect-auto sm:h-24 sm:w-40">
            {course.thumbnail_url ? (
              <Image
                src={course.thumbnail_url}
                alt=""
                fill
                sizes="(min-width: 640px) 160px, 100vw"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <BookOpen className="text-primary-foreground/60 h-7 w-7" aria-hidden="true" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                <span>Batch {course.batch}</span>
                <span className="text-success inline-flex items-center gap-1 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Enrolled
                </span>
                {semesters.length > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                    {semesters.length} semester{semesters.length !== 1 ? "s" : ""}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                  {totalLessons} lesson{totalLessons !== 1 ? "s" : ""}
                </span>
              </div>
              <h1 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">{course.title}</h1>
            </div>

            {totalLessons > 0 && (
              <div className="space-y-1.5">
                <div
                  className="bg-muted h-2 overflow-hidden rounded-full"
                  role="progressbar"
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${course.title} progress`}
                >
                  <div className="bg-success h-full rounded-full" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-muted-foreground text-xs tabular-nums">
                  {doneCount} of {totalLessons} lessons complete · {progress}%
                </p>
              </div>
            )}

            {startLesson && (
              <Link
                href={`/student/courses/${course.id}/lessons/${startLesson.id}`}
                className={buttonVariants({ size: "sm", className: "gap-2" })}
              >
                {doneCount === 0 ? "Start course" : nextLesson ? "Continue learning" : "Review lessons"}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>

        {course.description && (
          <details className="group border-t">
            <summary className="text-muted-foreground hover:text-foreground cursor-pointer list-none px-4 py-2.5 text-xs font-medium transition-colors sm:px-5 [&::-webkit-details-marker]:hidden">
              <span className="group-open:hidden">About this course</span>
              <span className="hidden group-open:inline">Hide description</span>
            </summary>
            <p className="text-muted-foreground px-4 pb-4 text-sm leading-relaxed whitespace-pre-wrap sm:px-5">
              {course.description}
            </p>
          </details>
        )}
      </header>

      <CourseContent
        courseId={course.id}
        hierarchyType={course.hierarchy_type}
        semesters={semesters}
        subjects={subjects}
        directLessons={directLessons}
        completedIds={completedIds}
        nextLessonId={nextLesson?.id}
      />
    </div>
  );
}
