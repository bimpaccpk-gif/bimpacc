import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BookOpen,
  CalendarRange,
  ChevronRight,
  ClipboardCheck,
  Layers,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { getAttendanceSessionDates } from "@/app/actions/attendance";
import { PageHeader } from "@/components/layout/page-header";
import { StatTile } from "@/components/layout/stat-tile";
import { Badge } from "@/components/ui/badge";
import { getCourseBreadcrumbs } from "@/components/admin/hierarchy-breadcrumbs";
import { getCurrentUser } from "@/lib/dal";
import { getHierarchyConfig } from "@/lib/hierarchy-config";
import { createClient } from "@/lib/supabase/server";
import type { HierarchyType } from "@/types";

interface HubCourse {
  id: string;
  title: string;
  description: string | null;
  batch: string;
  status: "draft" | "published" | "archived";
  registration_open: boolean;
  hierarchy_type: HierarchyType;
}

interface CourseCounts {
  semesters: number;
  subjects: number;
  lessons: number;
  students: number;
}

async function getCourse(courseId: string): Promise<HubCourse | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .select("id, title, description, batch, status, registration_open, hierarchy_type")
    .eq("id", courseId)
    .single();

  if (error) return null;
  return data as HubCourse;
}

/**
 * Content + enrollment counts for one course. Lessons can hang off the course
 * directly (simple courses) or off any of its subjects, so both pools count.
 */
async function getCourseCounts(courseId: string): Promise<CourseCounts> {
  const supabase = await createClient();

  const [{ data: semesters }, { data: subjects }, { data: enrollments }] =
    await Promise.all([
      supabase.from("semesters").select("id").eq("course_id", courseId),
      supabase.from("subjects").select("id").eq("course_id", courseId),
      supabase.from("enrollments").select("id").eq("course_id", courseId),
    ]);

  const subjectIds = (subjects ?? []).map((s) => s.id);

  const [{ data: courseLessons }, { data: subjectLessons }] = await Promise.all([
    supabase.from("lessons").select("id").eq("course_id", courseId),
    subjectIds.length > 0
      ? supabase.from("lessons").select("id").in("subject_id", subjectIds)
      : Promise.resolve({ data: [] }),
  ]);

  return {
    semesters: semesters?.length ?? 0,
    subjects: subjectIds.length,
    lessons: (courseLessons?.length ?? 0) + (subjectLessons?.length ?? 0),
    students: enrollments?.length ?? 0,
  };
}

/** Session count for the attendance area; a failed lookup must not sink the hub. */
async function getSessionCount(courseId: string): Promise<number> {
  try {
    const sessions = await getAttendanceSessionDates(courseId);
    return sessions.length;
  } catch (error) {
    console.error("Error fetching attendance sessions:", error);
    return 0;
  }
}

const STATUS_BADGES: Record<
  HubCourse["status"],
  { label: string; variant: "success" | "warning" | "secondary" }
> = {
  published: { label: "Published", variant: "success" },
  draft: { label: "Draft", variant: "warning" },
  archived: { label: "Archived", variant: "secondary" },
};

interface CourseArea {
  title: string;
  description: string;
  href: string;
  meta: string;
  icon: LucideIcon;
}

function getCourseAreas(
  course: HubCourse,
  counts: CourseCounts,
  sessionCount: number
): CourseArea[] {
  const config = getHierarchyConfig(course.hierarchy_type);
  const pluralize = (count: number, noun: string) =>
    `${count} ${noun}${count === 1 ? "" : "s"}`;

  const areas: CourseArea[] = [];

  if (config.hasSemesters) {
    areas.push({
      title: "Semesters",
      description:
        "Order the course timeline and manage the subjects inside each semester.",
      href: `/admin/courses/${course.id}/semesters`,
      meta: `${pluralize(counts.semesters, "semester")} · ${pluralize(counts.subjects, "subject")}`,
      icon: CalendarRange,
    });
  }

  if (config.hasSubjects && !config.hasSemesters) {
    areas.push({
      title: "Subjects",
      description: "Add and reorder the subjects that make up this course.",
      href: `/admin/courses/${course.id}/subjects`,
      meta: pluralize(counts.subjects, "subject"),
      icon: Layers,
    });
  }

  areas.push({
    title: "Lessons",
    description:
      config.hasSubjects
        ? "Work through lessons inside each subject of this course."
        : "Add and reorder the lessons taught in this course.",
    href: `/admin/courses/${course.id}/lessons`,
    meta: pluralize(counts.lessons, "lesson"),
    icon: BookOpen,
  });

  areas.push({
    title: "Attendance",
    description: "Review session attendance or import it from a CSV export.",
    href: `/admin/courses/${course.id}/attendance`,
    meta: pluralize(sessionCount, "session"),
    icon: ClipboardCheck,
  });

  return areas;
}

export default async function AdminCourseHubPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  await getCurrentUser();
  const { courseId } = await params;

  const course = await getCourse(courseId);
  if (!course) {
    redirect("/admin/courses");
  }

  const [counts, sessionCount] = await Promise.all([
    getCourseCounts(courseId),
    getSessionCount(courseId),
  ]);

  const config = getHierarchyConfig(course.hierarchy_type);
  const statusBadge = STATUS_BADGES[course.status] ?? STATUS_BADGES.draft;
  const areas = getCourseAreas(course, counts, sessionCount);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        title={course.title}
        description={course.description ?? undefined}
        breadcrumbs={getCourseBreadcrumbs({
          courseId,
          courseTitle: course.title,
        })}
      />

      {/* Course summary */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="rounded-full">
          Batch {course.batch}
        </Badge>
        <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
        <Badge variant={course.registration_open ? "info" : "outline"}>
          {course.registration_open ? "Registration open" : "Registration closed"}
        </Badge>
        <Badge variant="outline">{config.name}</Badge>
      </div>

      {/* Counts — the top-level unit mirrors the course's hierarchy shape */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Students" value={counts.students} icon={Users} />
        {config.hasSemesters ? (
          <StatTile
            label="Semesters"
            value={counts.semesters}
            hint={`${counts.subjects} subjects total`}
            icon={CalendarRange}
          />
        ) : config.hasSubjects ? (
          <StatTile label="Subjects" value={counts.subjects} icon={Layers} />
        ) : null}
        <StatTile label="Lessons" value={counts.lessons} icon={BookOpen} />
        <StatTile
          label="Sessions"
          value={sessionCount}
          hint="Attendance sessions recorded"
          icon={ClipboardCheck}
        />
      </div>

      {/* Areas */}
      <section aria-labelledby="course-areas-heading" className="space-y-3">
        <h2
          id="course-areas-heading"
          className="text-sm font-semibold text-muted-foreground"
        >
          Manage this course
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {areas.map((area) => {
            const Icon = area.icon;

            return (
              <Link
                key={area.title}
                href={area.href}
                data-slot="course-area-card"
                className="group flex items-start justify-between gap-4 rounded-xl bg-card p-5 text-card-foreground ring-1 ring-foreground/10 outline-none transition-colors hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span className="flex items-start gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Icon aria-hidden="true" className="size-5 text-primary" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-medium">{area.title}</span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">
                      {area.description}
                    </span>
                    <span className="mt-2 block text-xs font-medium text-muted-foreground tabular-nums">
                      {area.meta}
                    </span>
                  </span>
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
