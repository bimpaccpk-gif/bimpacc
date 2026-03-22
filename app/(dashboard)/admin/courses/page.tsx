import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/dal";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Plus } from "lucide-react";
import Link from "next/link";
import { CourseCreateDialog } from "@/components/admin/course-create-dialog";
import { CourseDeleteButton } from "@/components/admin/course-delete-button";

interface CourseRow {
  id: string;
  title: string;
  description: string;
  status: string;
  price: number | null;
  created_at: string;
}

async function getCourses(): Promise<CourseRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .select("id, title, description, status, price, created_at")
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

const statusBadge: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  published:
    "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  archived:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
};

export default async function AdminCoursesPage() {
  await getCurrentUser();
  const courses = await getCourses();
  const subjectCounts = await getCourseSubjectCount(courses.map((c) => c.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Course Management
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage courses, subjects, and lessons
          </p>
        </div>
        <CourseCreateDialog />
      </div>

      {courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <BookOpen className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No courses yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first course to get started.
          </p>
          <div className="mt-4">
            <CourseCreateDialog />
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Card
              key={course.id}
              className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="line-clamp-1 text-lg">
                    {course.title}
                  </CardTitle>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge[course.status] ?? statusBadge.draft}`}
                  >
                    {course.status.charAt(0).toUpperCase() +
                      course.status.slice(1)}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {course.description || "No description"}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{subjectCounts[course.id] ?? 0} subjects</span>
                  <span>Created {formatDate(course.created_at)}</span>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Link href={`/admin/courses/${course.id}/subjects`}>
                    <Button size="sm">Manage Subjects</Button>
                  </Link>
                  <CourseDeleteButton
                    courseId={course.id}
                    courseTitle={course.title}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
