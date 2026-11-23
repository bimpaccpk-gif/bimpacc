import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle, GraduationCap, PlayCircle } from "lucide-react";

import { StudentAttendanceOverview } from "@/components/student/attendance-overview";
import { buttonVariants } from "@/components/ui/button-variants";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { getCurrentUser } from "@/lib/dal";
import { createAdminClient, createClient } from "@/lib/supabase/server";

interface CourseRecord {
  id: string;
  title: string;
  batch: string | null;
  description: string | null;
  thumbnail_url: string | null;
  hierarchy_type: number | null;
  status: string;
  registration_open: boolean | null;
  is_paused: boolean | null;
  order_index: number | null;
  created_at: string;
}

interface EnrollmentRecord {
  course_id: string;
  progress: number | null;
  enrolled_at: string;
}

interface EnrolledCourse extends CourseRecord {
  progress: number;
  enrolled_at: string;
}

/** The course the student should pick up next, with a hint about where they left off. */
interface ResumeTarget {
  course: EnrolledCourse;
  /** Title of the lesson they completed most recently, if any. */
  lastLessonTitle: string | null;
}

/** PostgREST returns a to-one embed as an object; the inferred type may say array. Accept both. */
function firstOf<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function clampProgress(progress: number | null) {
  return Math.min(100, Math.max(0, progress ?? 0));
}

async function getDashboardData(userId: string) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const [enrollmentResult, courseResult, recentResult] = await Promise.all([
    supabase
      .from("enrollments")
      .select("course_id, progress, enrolled_at")
      .eq("user_id", userId)
      .order("enrolled_at", { ascending: false }),
    admin
      .from("courses")
      .select(
        "id, title, batch, description, thumbnail_url, hierarchy_type, status, registration_open, is_paused, order_index, created_at"
      )
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: false }),
    // Most recently completed lesson (RLS limits this to the student's own progress).
    supabase
      .from("lesson_progress")
      .select("completed_at, lessons(title), enrollments(course_id)")
      .eq("completed", true)
      .order("completed_at", { ascending: false })
      .limit(1),
  ]);

  if (enrollmentResult.error || courseResult.error) {
    console.error("Unable to load student course dashboard", {
      enrollmentError: enrollmentResult.error?.message,
      courseError: courseResult.error?.message,
    });
    throw new Error("Unable to load the course dashboard. Please try again.");
  }

  const enrollments = (enrollmentResult.data ?? []) as EnrollmentRecord[];
  const courses = (courseResult.data ?? []) as CourseRecord[];
  const courseMap = new Map(courses.map((course) => [course.id, course]));
  const enrolledIds = new Set(enrollments.map((enrollment) => enrollment.course_id));

  const enrolledCourses = enrollments.flatMap<EnrolledCourse>((enrollment) => {
    const course = courseMap.get(enrollment.course_id);

    if (!course) return [];

    return [
      {
        ...course,
        progress: clampProgress(enrollment.progress),
        enrolled_at: enrollment.enrolled_at,
      },
    ];
  });

  const availableCourses = courses.filter(
    (course) =>
      course.status === "published" &&
      course.registration_open === true &&
      course.is_paused !== true &&
      !enrolledIds.has(course.id)
  );

  // Pick the course to resume: the one with the latest completed lesson (if unfinished),
  // else the first course in progress, else the first enrolled course. A failure to read
  // recent progress must never break the dashboard, so errors are ignored here.
  const recent = recentResult.error ? null : (recentResult.data?.[0] ?? null);
  const recentCourseId = firstOf(recent?.enrollments)?.course_id as string | undefined;
  const recentLessonTitle = (firstOf(recent?.lessons)?.title as string | undefined) ?? null;
  const recentCourse = enrolledCourses.find(
    (course) => course.id === recentCourseId && course.progress < 100
  );

  let resume: ResumeTarget | null = null;
  if (recentCourse) {
    resume = { course: recentCourse, lastLessonTitle: recentLessonTitle };
  } else {
    const fallback =
      enrolledCourses.find((course) => course.progress > 0 && course.progress < 100) ??
      enrolledCourses.find((course) => course.progress < 100);
    if (fallback) resume = { course: fallback, lastLessonTitle: null };
  }

  return {
    enrolledCourses,
    availableCourses,
    resume,
    stats: {
      enrolled: enrolledCourses.length,
      inProgress: enrolledCourses.filter((course) => course.progress > 0 && course.progress < 100)
        .length,
      completed: enrolledCourses.filter((course) => course.progress >= 100).length,
    },
  };
}

function CourseCover({ course, className }: { course: CourseRecord; className?: string }) {
  return (
    <div
      className={
        "from-primary via-brand-500 to-primary/70 relative overflow-hidden bg-gradient-to-br " +
        (className ?? "aspect-video")
      }
    >
      {course.thumbnail_url ? (
        <Image
          src={course.thumbnail_url}
          alt=""
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full items-center justify-center">
          <BookOpen className="text-primary-foreground/60 h-8 w-8" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}

function ProgressBar({ value, label }: { value: number; label: string }) {
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className="bg-muted h-1.5 w-full overflow-hidden rounded-full"
    >
      <div className="bg-primary h-full rounded-full" style={{ width: `${value}%` }} />
    </div>
  );
}

function ContinueCard({ resume }: { resume: ResumeTarget }) {
  const { course, lastLessonTitle } = resume;
  const started = course.progress > 0;

  return (
    <section
      aria-labelledby="continue-heading"
      className="bg-primary/5 ring-primary/20 flex flex-col gap-4 rounded-xl p-4 ring-1 sm:flex-row sm:items-center sm:p-5"
    >
      <CourseCover course={course} className="aspect-video w-full shrink-0 rounded-lg sm:w-44" />

      <div className="min-w-0 flex-1 space-y-2">
        <p id="continue-heading" className="text-primary text-xs font-medium">
          {started ? "Continue where you left off" : "Start learning"}
        </p>
        <h2 className="truncate text-lg font-semibold tracking-tight">{course.title}</h2>
        {lastLessonTitle && (
          <p className="text-muted-foreground truncate text-sm">
            Last completed: {lastLessonTitle}
          </p>
        )}
        <div className="flex items-center gap-3">
          <ProgressBar value={course.progress} label={`${course.title} progress`} />
          <span className="text-muted-foreground text-xs font-medium tabular-nums">
            {course.progress}%
          </span>
        </div>
      </div>

      <Link
        href={`/student/courses/${course.id}`}
        className={buttonVariants({ className: "w-full shrink-0 gap-2 sm:w-auto" })}
      >
        <PlayCircle className="h-4 w-4" aria-hidden="true" />
        {started ? "Resume" : "Start"}
      </Link>
    </section>
  );
}

export default async function StudentDashboardPage() {
  const user = await getCurrentUser();
  const { enrolledCourses, availableCourses, resume, stats } = await getDashboardData(user.id);

  const summary = [
    `${stats.enrolled} enrolled`,
    `${stats.inProgress} in progress`,
    `${stats.completed} completed`,
  ].join(" · ");

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h1 className="text-foreground text-2xl font-bold tracking-tight">
          Welcome back, {user.full_name?.split(" ")[0] || "Student"}
        </h1>
        {stats.enrolled > 0 && <p className="text-muted-foreground text-sm">{summary}</p>}
      </header>

      {resume && <ContinueCard resume={resume} />}

      <section id="enrolled-courses" className="scroll-mt-24 space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">My courses</h2>

        {enrolledCourses.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed px-4 py-12 text-center">
            <GraduationCap className="text-muted-foreground/50 h-12 w-12" aria-hidden="true" />
            <h3 className="mt-4 text-lg font-semibold">Start your learning journey</h3>
            <p className="text-muted-foreground mt-1 max-w-md text-sm">
              Browse the courses open for enrollment and contact the team to join.
            </p>
            {availableCourses.length > 0 && (
              <a href="#available-courses" className={buttonVariants({ className: "mt-4 gap-2" })}>
                Browse courses
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {enrolledCourses.map((course) => (
              <Link
                key={course.id}
                href={`/student/courses/${course.id}`}
                className="group bg-card ring-foreground/10 hover:ring-primary/40 focus-visible:ring-ring/50 flex flex-col overflow-hidden rounded-xl ring-1 transition-shadow outline-none focus-visible:ring-3"
              >
                <CourseCover course={course} className="aspect-[16/7]" />
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div className="min-w-0">
                    <h3 className="group-hover:text-primary line-clamp-2 font-semibold transition-colors">
                      {course.title}
                    </h3>
                    {course.batch && (
                      <p className="text-muted-foreground mt-0.5 text-xs">Batch {course.batch}</p>
                    )}
                  </div>
                  <div className="mt-auto space-y-1.5">
                    <ProgressBar value={course.progress} label={`${course.title} progress`} />
                    <p className="text-muted-foreground text-xs tabular-nums">
                      {course.progress >= 100 ? "Completed" : `${course.progress}% complete`}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <StudentAttendanceOverview />

      <section id="available-courses" className="scroll-mt-24 space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Explore more courses</h2>

        {availableCourses.length === 0 ? (
          <div className="text-muted-foreground flex items-center gap-3 rounded-xl border border-dashed px-4 py-5 text-sm">
            <CheckCircle className="text-success/70 h-5 w-5 shrink-0" aria-hidden="true" />
            You are enrolled in every course currently accepting registrations.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {availableCourses.map((course) => (
              <div
                key={course.id}
                className="bg-card ring-foreground/10 flex flex-col overflow-hidden rounded-xl ring-1"
              >
                <CourseCover course={course} className="aspect-[16/7]" />
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div className="min-w-0">
                    <h3 className="line-clamp-2 font-semibold">{course.title}</h3>
                    <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                      {course.description || "Contact the BIMPACC team for course details."}
                    </p>
                  </div>
                  <a
                    href="https://wa.me/923230191737"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({
                      size: "sm",
                      variant: "outline",
                      className: "mt-auto w-full gap-2",
                    })}
                  >
                    <WhatsAppIcon className="h-4 w-4" />
                    Contact to enroll
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
