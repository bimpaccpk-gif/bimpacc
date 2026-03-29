import { getCurrentUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BookOpen, CheckCircle, Clock, Award, ArrowRight } from "lucide-react";

interface DashboardCourse {
  course_id: string;
  title: string;
  batch: string;
  progress: number;
  enrolled_at: string;
}

interface AvailableCourse {
  id: string;
  title: string;
  batch: string;
  description: string;
}

async function getDashboardData(userId: string) {
  const supabase = await createClient();

  // Get enrollments
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("course_id, progress, enrolled_at")
    .eq("user_id", userId)
    .order("enrolled_at", { ascending: false });

  const enrollmentList = enrollments ?? [];

  // Get course details for enrolled courses
  const enrolledIds = enrollmentList.map((e: any) => e.course_id);
  let enrolledCourses: DashboardCourse[] = [];

  if (enrolledIds.length > 0) {
    const { data: courses } = await supabase
      .from("courses")
      .select("id, title, batch")
      .in("id", enrolledIds);

    const courseMap = new Map<string, any>();
    (courses ?? []).forEach((c: any) => courseMap.set(c.id, c));

    enrolledCourses = enrollmentList.map((e: any) => {
      const c = courseMap.get(e.course_id);
      return {
        course_id: e.course_id,
        title: c?.title ?? "Unknown Course",
        batch: c?.batch ?? "",
        progress: e.progress ?? 0,
        enrolled_at: e.enrolled_at,
      };
    });
  }

  // Get available courses (published, not enrolled)
  let availableQuery = supabase
    .from("courses")
    .select("id, title, batch, description")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(4);

  if (enrolledIds.length > 0) {
    // Filter out enrolled courses - use NOT IN
    for (const id of enrolledIds) {
      availableQuery = availableQuery.neq("id", id);
    }
  }

  const { data: availableCourses } = await availableQuery;

  const inProgress = enrolledCourses.filter((c) => c.progress > 0 && c.progress < 100).length;
  const completed = enrolledCourses.filter((c) => c.progress >= 100).length;

  return {
    enrolledCourses,
    availableCourses: (availableCourses ?? []) as AvailableCourse[],
    stats: {
      enrolled: enrolledCourses.length,
      inProgress,
      completed,
    },
  };
}

export default async function StudentDashboardPage() {
  const user = await getCurrentUser();
  const { enrolledCourses, availableCourses, stats } = await getDashboardData(user.id);

  const statCards = [
    {
      title: "Enrolled Courses",
      value: stats.enrolled.toString(),
      icon: BookOpen,
      bgColor: "bg-brand-50 dark:bg-brand-950",
      iconColor: "text-brand-600 dark:text-brand-400",
    },
    {
      title: "Completed",
      value: stats.completed.toString(),
      icon: CheckCircle,
      bgColor: "bg-success/10",
      iconColor: "text-success",
    },
    {
      title: "In Progress",
      value: stats.inProgress.toString(),
      icon: Clock,
      bgColor: "bg-warning/10",
      iconColor: "text-warning",
    },
    {
      title: "Certificates",
      value: stats.completed.toString(),
      icon: Award,
      bgColor: "bg-info/10",
      iconColor: "text-info",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back, {user.full_name.split(" ")[0]}!
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track your learning progress and continue your courses
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card
            key={stat.title}
            className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`rounded-lg p-2 ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Continue Learning */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Continue Learning</CardTitle>
            {enrolledCourses.length > 0 && (
              <Link href="/student/my-courses">
                <Button variant="ghost" size="sm" className="text-xs gap-1">
                  View All <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {enrolledCourses.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/40" />
                <p className="mt-3 text-sm text-muted-foreground">
                  You haven&apos;t enrolled in any courses yet.
                </p>
                <Link href="/student/courses" className="mt-3 inline-block">
                  <Button variant="outline" size="sm">
                    Browse Courses
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {enrolledCourses.slice(0, 3).map((course) => (
                  <Link
                    key={course.course_id}
                    href={`/student/courses/${course.course_id}`}
                    className="block"
                  >
                    <div className="space-y-2 rounded-lg border p-3 transition-colors hover:bg-muted/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground">
                            {course.title}
                          </p>
                          {course.batch && (
                            <p className="text-xs text-muted-foreground">
                              Batch {course.batch}
                            </p>
                          )}
                        </div>
                        <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                          {course.progress}%
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all"
                          style={{ width: `${course.progress}%` }}
                        />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Available Courses */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Available Courses</CardTitle>
            <Link href="/student/courses">
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                Browse All <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {availableCourses.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="mx-auto h-10 w-10 text-emerald-500/40" />
                <p className="mt-3 text-sm text-muted-foreground">
                  You&apos;re enrolled in all available courses!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {availableCourses.map((course) => (
                  <div
                    key={course.id}
                    className="flex items-center justify-between rounded-lg border p-3 bg-muted/30"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground truncate">
                        {course.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Batch {course.batch}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">
                      Not Enrolled
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
