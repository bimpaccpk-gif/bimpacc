import { getCurrentUser, verifyEnrollment } from "@/lib/dal";
import { createClient, createAdminClient } from "@/lib/supabase/server";
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
  Pause,
  Search,
} from "lucide-react";
import { CourseContent } from "@/components/student/course-content";

// Match hierarchy colors: each level gets its own distinct color
// Type 1: Semester=Violet, Subject=Blue, Lesson=Amber
// Type 2: Subject=Teal, Lesson=Amber
// Type 3: Lesson=Amber
const hierarchyDetailColors: Record<number, {
  heroFrom: string;
  heroVia: string;
  heroTo: string;
  badgeBg: string;
  badgeText: string;
  // Semester colors (only used in Type 1)
  semester: {
    numBg: string;
    numText: string;
    accordionBg: string;
    accordionHoverBg: string;
    subjectCountBg: string;
    subjectCountText: string;
  };
  // Subject colors
  subject: {
    numBg: string;
    numText: string;
    accordionBg: string;
    accordionHoverBg: string;
    subjectCountBg: string;
    subjectCountText: string;
  };
  // Lesson colors (used at all levels)
  lesson: {
    numBg: string;
    numText: string;
    lessonIcon: string;
    lessonButton: string;
  };
}> = {
  1: {
    heroFrom: "from-blue-500",
    heroVia: "via-blue-600",
    heroTo: "to-blue-400",
    badgeBg: "bg-blue-100/90 dark:bg-blue-950/80",
    badgeText: "text-blue-700 dark:text-blue-400",
    semester: {
      numBg: "bg-violet-100 dark:bg-violet-950/70",
      numText: "text-violet-700 dark:text-violet-400",
      accordionBg: "bg-violet-50/50 dark:bg-violet-950/20",
      accordionHoverBg: "hover:bg-violet-50/80 dark:hover:bg-violet-950/30",
      subjectCountBg: "bg-violet-100/80 dark:bg-violet-900/50",
      subjectCountText: "text-violet-700 dark:text-violet-400",
    },
    subject: {
      numBg: "bg-emerald-100 dark:bg-emerald-950/70",
      numText: "text-emerald-700 dark:text-emerald-400",
      accordionBg: "bg-emerald-50/50 dark:bg-emerald-950/20",
      accordionHoverBg: "hover:bg-emerald-50/80 dark:hover:bg-emerald-950/30",
      subjectCountBg: "bg-emerald-100/80 dark:bg-emerald-900/50",
      subjectCountText: "text-emerald-700 dark:text-emerald-400",
    },
    lesson: {
      numBg: "bg-amber-100 dark:bg-amber-950/70",
      numText: "text-amber-700 dark:text-amber-400",
      lessonIcon: "text-amber-600 dark:text-amber-400",
      lessonButton: "bg-amber-600 hover:bg-amber-700",
    },
  },
  2: {
    heroFrom: "from-violet-500",
    heroVia: "via-violet-600",
    heroTo: "to-violet-400",
    badgeBg: "bg-violet-100/90 dark:bg-violet-950/80",
    badgeText: "text-violet-700 dark:text-violet-400",
    semester: {
      numBg: "bg-muted dark:bg-muted/50",
      numText: "text-muted-foreground",
      accordionBg: "bg-muted/20 dark:bg-muted/10",
      accordionHoverBg: "hover:bg-muted/40 dark:hover:bg-muted/20",
      subjectCountBg: "bg-muted/50",
      subjectCountText: "text-muted-foreground",
    },
    subject: {
      numBg: "bg-teal-100 dark:bg-teal-950/70",
      numText: "text-teal-700 dark:text-teal-400",
      accordionBg: "bg-teal-50/50 dark:bg-teal-950/20",
      accordionHoverBg: "hover:bg-teal-50/80 dark:hover:bg-teal-950/30",
      subjectCountBg: "bg-teal-100/80 dark:bg-teal-900/50",
      subjectCountText: "text-teal-700 dark:text-teal-400",
    },
    lesson: {
      numBg: "bg-amber-100 dark:bg-amber-950/70",
      numText: "text-amber-700 dark:text-amber-400",
      lessonIcon: "text-amber-600 dark:text-amber-400",
      lessonButton: "bg-amber-600 hover:bg-amber-700",
    },
  },
  3: {
    heroFrom: "from-amber-500",
    heroVia: "via-amber-600",
    heroTo: "to-amber-400",
    badgeBg: "bg-amber-100/90 dark:bg-amber-950/80",
    badgeText: "text-amber-700 dark:text-amber-400",
    semester: {
      numBg: "bg-muted dark:bg-muted/50",
      numText: "text-muted-foreground",
      accordionBg: "bg-muted/20 dark:bg-muted/10",
      accordionHoverBg: "hover:bg-muted/40 dark:hover:bg-muted/20",
      subjectCountBg: "bg-muted/50",
      subjectCountText: "text-muted-foreground",
    },
    subject: {
      numBg: "bg-muted dark:bg-muted/50",
      numText: "text-muted-foreground",
      accordionBg: "bg-muted/20 dark:bg-muted/10",
      accordionHoverBg: "hover:bg-muted/40 dark:hover:bg-muted/20",
      subjectCountBg: "bg-muted/50",
      subjectCountText: "text-muted-foreground",
    },
    lesson: {
      numBg: "bg-amber-100 dark:bg-amber-950/70",
      numText: "text-amber-700 dark:text-amber-400",
      lessonIcon: "text-amber-600 dark:text-amber-400",
      lessonButton: "bg-amber-600 hover:bg-amber-700",
    },
  },
};

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
  content: string | null;
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

async function getSubjectsWithLessons(
  courseId: string,
  userId: string
): Promise<SubjectWithLessons[]> {
  const admin = createAdminClient();

  // Fetch per-student overrides
  const { data: overrides } = await admin
    .from("student_content_access")
    .select("*")
    .eq("user_id", userId);

  const overrideMap = new Map<string, boolean>();
  for (const o of (overrides as any[]) ?? []) {
    overrideMap.set(`${o.content_type}:${o.content_id}`, o.is_paused);
  }

  const { data: subjects } = await admin
    .from("subjects")
    .select("id, title, description, order_index, is_paused")
    .eq("course_id", courseId)
    .order("order_index", { ascending: true });

  if (!subjects || subjects.length === 0) return [];

  const subjectPauseState = new Map<string, boolean>();
  (subjects as any[]).forEach((s) => {
    const override = overrideMap.get(`subject:${s.id}`);
    subjectPauseState.set(s.id, override !== undefined ? override : (s.is_paused ?? false));
  });

  const subjectIds = subjects.map((s) => s.id);
  const { data: lessons } = await admin
    .from("lessons")
    .select(
      "id, title, description, video_url, content, order_index, duration_minutes, subject_id, is_paused"
    )
    .in("subject_id", subjectIds)
    .order("order_index", { ascending: true });

  const lessonsBySubject = new Map<string, LessonRow[]>();
  (lessons ?? []).forEach((l: any) => {
    const list = lessonsBySubject.get(l.subject_id) ?? [];
    const lessonOverride = overrideMap.get(`lesson:${l.id}`);
    const parentPaused = l.subject_id ? (subjectPauseState.get(l.subject_id) ?? false) : false;
    list.push({
      id: l.id,
      title: l.title,
      description: l.description,
      video_url: l.video_url,
      content: l.content,
      order_index: l.order_index,
      duration_minutes: l.duration_minutes,
      isPaused: lessonOverride !== undefined ? lessonOverride : (parentPaused || (l.is_paused ?? false)),
    });
    lessonsBySubject.set(l.subject_id, list);
  });

  return (subjects as any[]).map((s) => {
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

  // Fetch per-student overrides
  const { data: overrides } = await admin
    .from("student_content_access")
    .select("*")
    .eq("user_id", userId);

  const overrideMap = new Map<string, boolean>();
  for (const o of (overrides as any[]) ?? []) {
    overrideMap.set(`${o.content_type}:${o.content_id}`, o.is_paused);
  }

  // Fetch semesters for this course
  const { data: semesters } = await admin
    .from("semesters")
    .select("id, title, description, order_index, is_paused")
    .eq("course_id", courseId)
    .order("order_index", { ascending: true });

  if (!semesters || semesters.length === 0) return [];

  // Calculate semester pause states
  const semesterPauseState = new Map<string, boolean>();
  semesters.forEach((s: any) => {
    const override = overrideMap.get(`semester:${s.id}`);
    semesterPauseState.set(s.id, override !== undefined ? override : (s.is_paused ?? false));
  });

  // Fetch subjects from both possible shapes:
  // 1) semester-linked subjects (new type-1 structure)
  // 2) direct course-linked subjects with no semester (legacy fallback)
  const semesterIds = semesters.map((s) => s.id);
  const semesterIdSet = new Set(semesterIds);

  let semesterSubjects: any[] = [];
  if (semesterIds.length > 0) {
    const { data } = await admin
      .from("subjects")
      .select("id, title, description, order_index, semester_id, is_paused")
      .in("semester_id", semesterIds)
      .order("order_index", { ascending: true });
    semesterSubjects = data ?? [];
  }

  const { data: legacySubjects } = await admin
    .from("subjects")
    .select("id, title, description, order_index, semester_id, is_paused")
    .eq("course_id", courseId)
    .is("semester_id", null)
    .order("order_index", { ascending: true });

  const subjects = [...semesterSubjects, ...(legacySubjects ?? [])];

  // Calculate subject pause states
  const subjectPauseState = new Map<string, boolean>();
  (subjects ?? []).forEach((s: any) => {
    const override = overrideMap.get(`subject:${s.id}`);
    const parentPaused = s.semester_id ? (semesterPauseState.get(s.semester_id) ?? false) : false;
    subjectPauseState.set(s.id, override !== undefined ? override : (parentPaused || (s.is_paused ?? false)));
  });

  // Fetch lessons for these subjects
  const subjectIds = (subjects ?? []).map((s: any) => s.id);
  let lessonsBySubject = new Map<string, LessonRow[]>();
  if (subjectIds.length > 0) {
    const { data: lessons } = await admin
      .from("lessons")
      .select(
        "id, title, description, video_url, content, order_index, duration_minutes, subject_id, is_paused"
      )
      .in("subject_id", subjectIds)
      .order("order_index", { ascending: true });

    (lessons ?? []).forEach((l: any) => {
      const list = lessonsBySubject.get(l.subject_id) ?? [];
      const lessonOverride = overrideMap.get(`lesson:${l.id}`);
      const parentPaused = l.subject_id ? (subjectPauseState.get(l.subject_id) ?? false) : false;
      list.push({
        id: l.id,
        title: l.title,
        description: l.description,
        video_url: l.video_url,
        content: l.content,
        order_index: l.order_index,
        duration_minutes: l.duration_minutes,
        isPaused: lessonOverride !== undefined ? lessonOverride : (parentPaused || (l.is_paused ?? false)),
      });
      lessonsBySubject.set(l.subject_id, list);
    });
  }

  const subjectsBySemester = new Map<string, SubjectWithLessons[]>();
  const unassignedSubjects: SubjectWithLessons[] = [];
  (subjects ?? []).forEach((s: any) => {
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

  const semesterNodes: SemesterWithSubjectsWithLessons[] = semesters.map((s: any) => {
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

  // Fetch per-student overrides
  const { data: overrides } = await admin
    .from("student_content_access")
    .select("*")
    .eq("user_id", userId);

  const overrideMap = new Map<string, boolean>();
  for (const o of (overrides as any[]) ?? []) {
    overrideMap.set(`${o.content_type}:${o.content_id}`, o.is_paused);
  }

  const { data } = await admin
    .from("lessons")
    .select("id, title, description, video_url, content, order_index, duration_minutes, is_paused")
    .eq("course_id", courseId)
    .order("order_index", { ascending: true });

  return ((data as any[]) ?? []).map((l) => {
    const lessonOverride = overrideMap.get(`lesson:${l.id}`);
    return {
      id: l.id,
      title: l.title,
      description: l.description,
      video_url: l.video_url,
      content: l.content,
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
  if (lesson.isPaused) {
    return (
      <div className="border-border bg-muted/20 border-warning/30 overflow-hidden rounded-xl border">
        <div className="flex items-center gap-3 px-5 py-4">
          <div className="bg-warning/10 text-warning dark:text-warning/80 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
            <Pause className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-muted-foreground font-semibold">{lesson.title}</h4>
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
      <div className="flex items-center gap-3 px-5 py-4">
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
          {lesson.video_url && <PlayCircle className="text-primary h-5 w-5" />}
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
  if (subject.isPaused) {
    return (
      <div className="border-border bg-muted/20 border-warning/30 overflow-hidden rounded-xl border">
        <div className="flex items-center gap-3 px-5 py-4">
          <div className="bg-warning/10 text-warning dark:text-warning/80 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
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

  return (
    <details className="group border-border overflow-hidden rounded-xl border" open={index === 0}>
      <summary className="bg-muted/30 hover:bg-muted/50 flex cursor-pointer list-none items-center gap-3 px-5 py-4 transition-colors [&::-webkit-details-marker]:hidden">
        <div className="bg-primary/10 text-primary dark:text-primary/80 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold">
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
  let semesters: SemesterWithSubjectsWithLessons[] = [];
  let subjects: SubjectWithLessons[] = [];
  let directLessons: LessonRow[] = [];

  if (course.hierarchy_type === 1) {
    // Course → Semester → Subject → Lesson
    semesters = await getSemestersWithSubjectsWithLessons(course.id, user.id);
  } else if (course.hierarchy_type === 2) {
    // Course → Subject → Lesson
    subjects = await getSubjectsWithLessons(course.id, user.id);
  } else {
    // Type 3: Course → Lesson
    directLessons = await getDirectLessons(course.id, user.id);
  }

  // Fetch completed lesson IDs
  const supabase = await createClient();
  const completedIds = await getCompletedLessonIds(supabase, user.id, course.id);
  const c = hierarchyDetailColors[course.hierarchy_type] ?? hierarchyDetailColors[3];

  const totalSemesterLessons = semesters.reduce(
    (sum, sem) => sum + sem.subjects.reduce((s, sub) => s + sub.lessons.length, 0),
    0
  );
  const totalSubjectLessons = subjects.reduce((sum, s) => sum + s.lessons.length, 0);
  const totalLessons = totalSemesterLessons + totalSubjectLessons + directLessons.length;

  // Find first incomplete lesson for "Continue Learning" button
  const allSemesterLessons = semesters.flatMap((sem) => sem.subjects.flatMap((s) => s.lessons));
  const allLessonsFlat = allSemesterLessons.concat(subjects.flatMap((s) => s.lessons), directLessons);
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
        <div className={`from-primary via-primary/70 to-primary/40 relative aspect-[3/1] bg-gradient-to-br ${c.heroFrom} ${c.heroVia} ${c.heroTo}`}>
          {course.thumbnail_url ? (
            <img
              src={course.thumbnail_url}
              alt={course.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <BookOpen className="text-white/40 h-16 w-16" />
            </div>
          )}
          <div className="from-background/60 absolute inset-0 bg-gradient-to-t to-transparent" />
          <div className="text-primary-foreground absolute right-0 bottom-0 left-0 p-6">
            <div className="mb-2 flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium backdrop-blur-sm ${c.badgeBg} ${c.badgeText}`}>
                Batch {course.batch}
              </span>
              <span className="bg-success text-primary-foreground inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold shadow-lg">
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
            {semesters.length > 0 && (
              <span className="flex items-center gap-1.5">
                <Layers className="h-4 w-4" />
                {semesters.length} Semester{semesters.length !== 1 ? "s" : ""}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <FileText className="h-4 w-4" />
              {totalLessons} Lesson{totalLessons !== 1 ? "s" : ""}
            </span>
            {completedIds.size > 0 && (
              <span className="text-success flex items-center gap-1.5">
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

      {/* Course Content (with search) */}
      <CourseContent
        courseId={course.id}
        hierarchyType={course.hierarchy_type}
        semesters={semesters}
        subjects={subjects}
        directLessons={directLessons}
        completedIds={completedIds}
        colors={c}
      />
    </div>
  );
}
