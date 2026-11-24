import Link from "next/link";
import {
  ArrowRightIcon,
  BookOpenIcon,
  CalendarCheckIcon,
  CircleCheckIcon,
  GraduationCapIcon,
  type LucideIcon,
  SettingsIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react";

import { getInstructorDashboardData, type InstructorCourseStats } from "@/app/actions/instructor";
import { PageHeader } from "@/components/layout/page-header";
import { StatTile } from "@/components/layout/stat-tile";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  published: "bg-success/10 text-success",
  draft: "bg-warning/10 text-warning",
  archived: "bg-muted text-muted-foreground",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
        STATUS_STYLES[status] ?? STATUS_STYLES.archived
      )}
    >
      {status}
    </span>
  );
}

function ProgressCell({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="bg-muted h-1.5 w-20 overflow-hidden rounded-full"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div className="bg-success h-full rounded-full" style={{ width: `${value}%` }} />
      </div>
      <span className="text-muted-foreground w-9 text-right text-xs tabular-nums">{value}%</span>
    </div>
  );
}

function CourseRow({ course, isAdmin }: { course: InstructorCourseStats; isAdmin: boolean }) {
  const body = (
    <>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium">{course.title}</p>
          <StatusBadge status={course.status} />
        </div>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {course.batch ? `Batch ${course.batch} · ` : ""}
          {course.enrollments} student{course.enrollments !== 1 ? "s" : ""} · {course.lessons} lesson
          {course.lessons !== 1 ? "s" : ""}
        </p>
      </div>
      <ProgressCell value={course.progress} label={`${course.title} average completion`} />
    </>
  );

  // Admins can open the course editor; instructors have no editor of their own.
  return isAdmin ? (
    <Link
      href={`/admin/courses/${course.id}`}
      className="hover:bg-muted/50 focus-visible:ring-ring/50 flex items-center gap-4 px-4 py-3 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset"
    >
      {body}
    </Link>
  ) : (
    <div className="flex items-center gap-4 px-4 py-3">{body}</div>
  );
}

function ShortcutLink({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group hover:bg-muted/50 focus-visible:ring-ring/50 flex items-center gap-3 px-4 py-3 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset"
    >
      <span className="bg-primary/10 flex h-8 w-8 shrink-0 items-center justify-center rounded-md">
        <Icon className="text-primary size-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="group-hover:text-primary block text-sm font-medium transition-colors">{title}</span>
        <span className="text-muted-foreground block truncate text-xs">{description}</span>
      </span>
      <ArrowRightIcon className="text-muted-foreground/50 group-hover:text-primary size-4 shrink-0" aria-hidden="true" />
    </Link>
  );
}

export default async function InstructorDashboardPage() {
  const data = await getInstructorDashboardData();

  if (data.error || !data.courses || !data.totals) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-destructive text-sm">{data.error ?? "No data available."}</p>
      </div>
    );
  }

  const { courses, totals } = data;
  const isAdmin = data.role === "admin";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teaching overview"
        description={
          isAdmin
            ? "All courses on the platform, with enrollment and completion."
            : "Your courses, with enrollment and how far students have got."
        }
        actions={
          <Link href="/instructor/attendance" className={buttonVariants({ size: "sm", className: "gap-2" })}>
            <CalendarCheckIcon className="size-4" aria-hidden="true" />
            Take attendance
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Courses" value={totals.courses} icon={BookOpenIcon} />
        <StatTile label="Enrollments" value={totals.enrollments} icon={UsersIcon} hint="Across all listed courses" />
        <StatTile
          label="Average completion"
          value={`${totals.progress}%`}
          icon={GraduationCapIcon}
          hint="Lessons completed by enrolled students"
        />
        <StatTile label="Published" value={totals.published} icon={CircleCheckIcon} hint={`of ${totals.courses} courses`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="bg-card ring-foreground/10 overflow-hidden rounded-xl ring-1 lg:col-span-2">
          <header className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-sm font-semibold">{isAdmin ? "All courses" : "My courses"}</h2>
            <span className="text-muted-foreground text-xs">Avg. completion</span>
          </header>
          {courses.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
              <BookOpenIcon className="text-muted-foreground/50 size-8" aria-hidden="true" />
              <p className="mt-3 text-sm font-medium">No courses assigned yet</p>
              <p className="text-muted-foreground mt-1 max-w-xs text-xs">
                An admin assigns courses to instructors. They will show up here once assigned.
              </p>
            </div>
          ) : (
            <div className="divide-border divide-y">
              {courses.map((course) => (
                <CourseRow key={course.id} course={course} isAdmin={isAdmin} />
              ))}
            </div>
          )}
        </section>

        <section className="bg-card ring-foreground/10 h-fit overflow-hidden rounded-xl ring-1">
          <header className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold">Shortcuts</h2>
          </header>
          <div className="divide-border divide-y">
            <ShortcutLink
              href="/instructor/attendance"
              icon={CalendarCheckIcon}
              title="Attendance"
              description="Mark and review class attendance"
            />
            {isAdmin && (
              <>
                <ShortcutLink
                  href="/admin/courses"
                  icon={SettingsIcon}
                  title="Manage courses"
                  description="Edit structure, lessons and access"
                />
                <ShortcutLink href="/admin/users" icon={UsersIcon} title="People" description="Students and approvals" />
              </>
            )}
            <ShortcutLink href="/profile" icon={UserIcon} title="Profile" description="Your account details" />
          </div>
        </section>
      </div>
    </div>
  );
}
