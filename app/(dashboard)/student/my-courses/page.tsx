import { getCurrentUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BookOpen, ArrowRight, Calendar } from "lucide-react";

interface EnrolledCourseRow {
  course_id: string;
  progress: number;
  enrolled_at: string;
  course_title: string;
  course_batch: string;
  course_description: string;
  thumbnail_url: string | null;
  hierarchy_type: number;
}

async function getEnrolledCourses(userId: string): Promise<EnrolledCourseRow[]> {
  const supabase = await createClient();

  const { data: enrollments, error } = await supabase
    .from("enrollments")
    .select("course_id, progress, enrolled_at")
    .eq("user_id", userId)
    .order("enrolled_at", { ascending: false });

  if (error || !enrollments || enrollments.length === 0) return [];

  // Fetch course details for enrolled courses
  const courseIds = enrollments.map((e: any) => e.course_id);
  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, batch, description, thumbnail_url, hierarchy_type")
    .in("id", courseIds);

  const courseMap = new Map<string, any>();
  (courses ?? []).forEach((c: any) => courseMap.set(c.id, c));

  return enrollments.map((e: any) => {
    const course = courseMap.get(e.course_id);
    return {
      course_id: e.course_id,
      progress: e.progress,
      enrolled_at: e.enrolled_at,
      course_title: course?.title ?? "Unknown Course",
      course_batch: course?.batch ?? "",
      course_description: course?.description ?? "",
      thumbnail_url: course?.thumbnail_url ?? null,
      hierarchy_type: course?.hierarchy_type ?? 3,
    };
  });
}

// Match admin card hierarchy colors: Type 1=Blue, Type 2=Violet, Type 3=Amber
const hierarchyCourseColors: Record<number, {
  cardBorder: string;
  edgeGradient: string;
  progressFrom: string;
  progressTo: string;
  textHover: string;
  buttonBg: string;
  buttonHoverBg: string;
  thumbnailFrom: string;
  thumbnailVia: string;
  batchBg: string;
  batchText: string;
}> = {
  1: {
    cardBorder: "border-blue-200 dark:border-blue-800",
    edgeGradient: "from-blue-600 to-blue-400",
    progressFrom: "from-blue-600",
    progressTo: "to-blue-400",
    textHover: "group-hover:text-blue-600 dark:group-hover:text-blue-400",
    buttonBg: "bg-blue-600 hover:bg-blue-700",
    buttonHoverBg: "hover:bg-blue-700",
    thumbnailFrom: "from-blue-500",
    thumbnailVia: "via-blue-600",
    batchBg: "bg-blue-100/90 dark:bg-blue-950/80",
    batchText: "text-blue-700 dark:text-blue-400",
  },
  2: {
    cardBorder: "border-violet-200 dark:border-violet-800",
    edgeGradient: "from-violet-600 to-violet-400",
    progressFrom: "from-violet-600",
    progressTo: "to-violet-400",
    textHover: "group-hover:text-violet-600 dark:group-hover:text-violet-400",
    buttonBg: "bg-violet-600 hover:bg-violet-700",
    buttonHoverBg: "hover:bg-violet-700",
    thumbnailFrom: "from-violet-500",
    thumbnailVia: "via-violet-600",
    batchBg: "bg-violet-100/90 dark:bg-violet-950/80",
    batchText: "text-violet-700 dark:text-violet-400",
  },
  3: {
    cardBorder: "border-amber-200 dark:border-amber-800",
    edgeGradient: "from-amber-600 to-amber-400",
    progressFrom: "from-amber-600",
    progressTo: "to-amber-400",
    textHover: "group-hover:text-amber-600 dark:group-hover:text-amber-400",
    buttonBg: "bg-amber-600 hover:bg-amber-700",
    buttonHoverBg: "hover:bg-amber-700",
    thumbnailFrom: "from-amber-500",
    thumbnailVia: "via-amber-600",
    batchBg: "bg-amber-100/90 dark:bg-amber-950/80",
    batchText: "text-amber-700 dark:text-amber-400",
  },
};

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function MyCoursesPage() {
  const user = await getCurrentUser();
  const courses = await getEnrolledCourses(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-foreground text-2xl font-bold">My Courses</h1>
        <p className="text-muted-foreground mt-1 text-sm">Courses you are enrolled in</p>
      </div>

      {courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <BookOpen className="text-muted-foreground/50 h-12 w-12" />
          <h3 className="mt-4 text-lg font-semibold">No courses yet</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            You haven&apos;t enrolled in any courses.
          </p>
          <Link href="/student/courses" className="mt-4">
            <Button variant="outline" size="sm">
              Browse Available Courses
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => {
            const colors = hierarchyCourseColors[course.hierarchy_type] ?? hierarchyCourseColors[3];
            return (
            <Card
              key={course.course_id}
              className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${colors.cardBorder}`}
            >
              {/* Left Edge Accent */}
              <div className={`absolute inset-y-0 left-0 z-10 w-1.5 bg-gradient-to-b ${colors.edgeGradient}`} />
              {/* Thumbnail */}
              <div className={`relative aspect-video overflow-hidden bg-gradient-to-br ${colors.thumbnailFrom} ${colors.thumbnailVia} to-transparent`}>
                {course.thumbnail_url ? (
                  <img
                    src={course.thumbnail_url}
                    alt={course.course_title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <BookOpen className="text-white/60 h-12 w-12" />
                  </div>
                )}
                {course.course_batch && (
                  <div className="absolute bottom-3 left-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium backdrop-blur-sm ${colors.batchBg} ${colors.batchText}`}>
                      Batch {course.course_batch}
                    </span>
                  </div>
                )}
              </div>

              <CardHeader className="pb-2">
                <CardTitle className={`line-clamp-2 text-lg transition-colors ${colors.textHover}`}>
                  {course.course_title}
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Progress */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-semibold">{course.progress}%</span>
                  </div>
                  <div className="bg-muted h-2.5 w-full overflow-hidden rounded-full">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${colors.progressFrom} ${colors.progressTo} transition-all duration-500`}
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>
                </div>

                {/* Enrolled date */}
                <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <Calendar className="h-3 w-3" />
                  Enrolled {formatDate(course.enrolled_at)}
                </p>

                {/* Action */}
                <Link href={`/student/courses/${course.course_id}`}>
                  <Button size="sm" className={`w-full gap-2 ${colors.buttonBg} transition-colors`}>
                    Continue Learning
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
