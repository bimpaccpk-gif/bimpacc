import { getCurrentUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BookOpen } from "lucide-react";

interface EnrolledCourse {
  course_id: string;
  progress: number;
  enrolled_at: string;
}

async function getEnrolledCourses(userId: string): Promise<EnrolledCourse[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("enrollments")
    .select("course_id, progress, enrolled_at")
    .eq("user_id", userId)
    .order("enrolled_at", { ascending: false });

  if (error) {
    console.error("Error fetching enrollments:", error);
    return [];
  }

  return data ?? [];
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function CoursesPage() {
  const user = await getCurrentUser();
  const enrollments = await getEnrolledCourses(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Courses</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Courses you are enrolled in
        </p>
      </div>

      {enrollments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <BookOpen className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No courses yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            You haven&apos;t enrolled in any courses.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {enrollments.map((enrollment) => (
            <Card
              key={enrollment.course_id}
              className="overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="aspect-video bg-gradient-to-br from-brand-500 to-brand-700 dark:from-brand-700 dark:to-brand-900" />
              <CardHeader className="pb-2">
                <CardTitle className="line-clamp-1 text-lg">
                  Course #{enrollment.course_id.slice(0, 8)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{enrollment.progress}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary transition-all"
                      style={{ width: `${enrollment.progress}%` }}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Enrolled {formatDate(enrollment.enrolled_at)}
                </p>
                <div className="pt-2">
                  <Link href={`/courses/${enrollment.course_id}`}>
                    <Button size="sm" className="w-full">
                      Continue Learning
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
