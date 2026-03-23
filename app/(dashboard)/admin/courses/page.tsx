import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/dal";
import { Button } from "@/components/ui/button";
import { BookOpen, Sparkles, Layers, List, Calendar, ArrowRight } from "lucide-react";
import Link from "next/link";
import { CourseCreateDialog } from "@/components/admin/course-create-dialog";
import { CourseDeleteButton } from "@/components/admin/course-delete-button";
import { HierarchyIndicator } from "@/components/admin/hierarchy-indicator";
import { getHierarchyConfig } from "@/lib/hierarchy-config";
import { HierarchyType } from "@/types";
import { cn } from "@/lib/utils";

interface CourseRow {
  id: string;
  title: string;
  description: string;
  status: string;
  price: number | null;
  hierarchy_type: HierarchyType;
  created_at: string;
}

async function getCourses(): Promise<CourseRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .select("id, title, description, status, price, hierarchy_type, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching courses:", error);
    return [];
  }
  return data ?? [];
}

async function getCourseSubjectCount(
  courseIds: string[]
): Promise<Record<string, number>> {
  if (courseIds.length === 0) return {};
  const supabase = await createClient();
  const { data } = await supabase
    .from("subjects")
    .select("course_id");

  const counts: Record<string, number> = {};
  (data ?? []).forEach((s: any) => {
    counts[s.course_id] = (counts[s.course_id] ?? 0) + 1;
  });
  return counts;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: {
    label: "Draft",
    className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  },
  published: {
    label: "Published",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  },
  archived: {
    label: "Archived",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  },
};

const hierarchyIcons: Record<number, React.ReactNode> = {
  1: <Layers className="h-4 w-4" />,
  2: <List className="h-4 w-4" />,
  3: <BookOpen className="h-4 w-4" />,
};

function getManageLink(courseId: string, hierarchyType: HierarchyType): string {
  switch (hierarchyType) {
    case 1:
      return `/admin/courses/${courseId}/subjects`;
    case 2:
    case 3:
      return `/admin/courses/${courseId}/lessons`;
    default:
      return `/admin/courses/${courseId}/subjects`;
  }
}

function getManageButtonText(hierarchyType: HierarchyType): string {
  switch (hierarchyType) {
    case 1:
      return "Manage Content";
    case 2:
    case 3:
      return "Manage Lessons";
    default:
      return "Manage";
  }
}

export default async function AdminCoursesPage() {
  await getCurrentUser();
  const courses = await getCourses();
  const subjectCounts = await getCourseSubjectCount(courses.map((c) => c.id));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Courses
          </h1>
          <p className="mt-1 text-muted-foreground">
            Create and manage your courses, subjects, and lessons
          </p>
        </div>
        <CourseCreateDialog />
      </div>

      {/* Course Grid */}
      {courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-muted-foreground/25 bg-muted/30 px-6 py-16">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-10 w-10 text-primary" />
          </div>
          <h3 className="mt-6 text-xl font-semibold">Create your first course</h3>
          <p className="mt-2 text-center text-muted-foreground max-w-sm">
            Get started by creating a new course. Choose from different hierarchy structures to organize your content.
          </p>
          <div className="mt-6">
            <CourseCreateDialog />
          </div>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => {
            const status = statusConfig[course.status] ?? statusConfig.draft;
            const config = getHierarchyConfig(course.hierarchy_type);
            
            return (
              <div
                key={course.id}
                className="group relative overflow-hidden rounded-xl border bg-card transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
              >
                {/* Gradient accent */}
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/80 to-primary" />
                
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate">
                        {course.title}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                        {course.description || "No description added"}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
                        status.className
                      )}
                    >
                      {status.label}
                    </span>
                  </div>

                  {/* Hierarchy Badge */}
                  <div className="mt-4 flex items-center gap-2">
                    <div className="flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1.5 text-xs font-medium">
                      {hierarchyIcons[course.hierarchy_type]}
                      <span>{config.name}</span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="h-4 w-4" />
                      <span>{subjectCounts[course.id] ?? 0} items</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(course.created_at)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-5 flex items-center gap-2">
                    <Link href={getManageLink(course.id, course.hierarchy_type)} className="flex-1">
                      <Button className="w-full group/btn">
                        {getManageButtonText(course.hierarchy_type)}
                        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-0.5" />
                      </Button>
                    </Link>
                    <CourseDeleteButton
                      courseId={course.id}
                      courseTitle={course.title}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
