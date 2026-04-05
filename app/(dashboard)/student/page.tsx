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
        <h1 className="text-foreground text-2xl font-bold">
          Welcome back, {user.full_name?.split(" ")[0] || "Student"}!
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
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
              <CardTitle className="text-muted-foreground text-sm font-medium">
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
                <Button variant="ghost" size="sm" className="gap-1 text-xs">
                  View All <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {enrolledCourses.length === 0 ? (
              <div className="py-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <BookOpen className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-foreground mb-2 text-lg font-semibold">Start Your Learning Journey</h3>
                <p className="text-muted-foreground mb-4 text-sm">
                  Explore our BIM courses and start building industry-relevant skills today.
                </p>
                <Link href="/student/courses">
                  <Button className="gap-2">
                    Browse Courses
                    <ArrowRight className="h-4 w-4" />
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
                    <div className="hover:bg-muted/50 space-y-2 rounded-lg border p-3 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-foreground font-medium">{course.title}</p>
                          {course.batch && (
                            <p className="text-muted-foreground text-xs">Batch {course.batch}</p>
                          )}
                        </div>
                        <span className="text-primary text-sm font-semibold">
                          {course.progress}%
                        </span>
                      </div>
                      <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                        <div
                          className="from-primary to-primary/70 h-full rounded-full bg-gradient-to-r transition-all"
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
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                Browse All <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {availableCourses.length === 0 ? (
              <div className="py-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                  <CheckCircle className="h-8 w-8 text-success" />
                </div>
                <h3 className="text-foreground mb-2 text-lg font-semibold">All Caught Up!</h3>
                <p className="text-muted-foreground text-sm">
                  You're enrolled in all available courses. Check back later for new offerings.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {availableCourses.map((course) => (
                  <div
                    key={course.id}
                    className="bg-muted/30 flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground truncate font-medium">{course.title}</p>
                      <p className="text-muted-foreground text-xs">Batch {course.batch}</p>
                    </div>
                    <span className="text-muted-foreground ml-2 shrink-0 text-xs">
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
