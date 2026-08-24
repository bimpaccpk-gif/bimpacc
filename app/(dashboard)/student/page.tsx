import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle,
  Clock,
  GraduationCap,
} from "lucide-react";

import { StudentAttendanceOverview } from "@/components/student/attendance-overview";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

function clampProgress(progress: number | null) {
  return Math.min(100, Math.max(0, progress ?? 0));
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

async function getDashboardData(userId: string) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const [enrollmentResult, courseResult] = await Promise.all([
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

  return {
    enrolledCourses,
    availableCourses,
    stats: {
      enrolled: enrolledCourses.length,
      available: availableCourses.length,
      inProgress: enrolledCourses.filter((course) => course.progress > 0 && course.progress < 100)
        .length,
      completed: enrolledCourses.filter((course) => course.progress >= 100).length,
    },
  };
}

function CourseCover({ course }: { course: CourseRecord }) {
  return (
    <div className="from-primary via-brand-500 to-primary/70 relative aspect-video overflow-hidden bg-gradient-to-br">
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
          <BookOpen className="text-primary-foreground/60 h-12 w-12" aria-hidden="true" />
        </div>
      )}

      {course.batch && (
        <span className="bg-background/85 text-foreground absolute bottom-3 left-3 rounded-full px-2.5 py-1 text-xs font-medium shadow-sm backdrop-blur-sm">
          Batch {course.batch}
        </span>
      )}
    </div>
  );
}

export default async function StudentDashboardPage() {
  const user = await getCurrentUser();
  const { enrolledCourses, availableCourses, stats } = await getDashboardData(user.id);

  const statCards = [
    {
      title: "Enrolled Courses",
      value: stats.enrolled,
      icon: GraduationCap,
      iconClassName: "text-brand-600 dark:text-brand-400",
      iconBackground: "bg-brand-50 dark:bg-brand-950",
    },
    {
      title: "Available Courses",
      value: stats.available,
      icon: BookOpen,
      iconClassName: "text-info",
      iconBackground: "bg-info/10",
    },
    {
      title: "In Progress",
      value: stats.inProgress,
      icon: Clock,
      iconClassName: "text-warning",
      iconBackground: "bg-warning/10",
    },
    {
      title: "Completed",
      value: stats.completed,
      icon: CheckCircle,
      iconClassName: "text-success",
      iconBackground: "bg-success/10",
    },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-foreground text-2xl font-bold">
          Welcome back, {user.full_name?.split(" ")[0] || "Student"}!
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          View your enrolled courses and discover every course currently open for enrollment.
        </p>
      </header>

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
              <div className={`rounded-lg p-2 ${stat.iconBackground}`}>
                <stat.icon className={`h-5 w-5 ${stat.iconClassName}`} aria-hidden="true" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <section id="enrolled-courses" className="scroll-mt-24 space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Enrolled Courses</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {enrolledCourses.length === 0
              ? "You are not enrolled in a course yet."
              : `${enrolledCourses.length} course${enrolledCourses.length === 1 ? "" : "s"} ready to continue.`}
          </p>
        </div>

        {enrolledCourses.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed px-4 py-12 text-center">
            <GraduationCap className="text-muted-foreground/50 h-12 w-12" aria-hidden="true" />
            <h3 className="mt-4 text-lg font-semibold">Start your learning journey</h3>
            <p className="text-muted-foreground mt-1 max-w-md text-sm">
              Browse the courses currently accepting enrollments and contact the team to join.
            </p>
            <a href="#available-courses" className={buttonVariants({ className: "mt-4 gap-2" })}>
              Browse Available Courses
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {enrolledCourses.map((course) => (
              <Card
                key={course.id}
                className="group overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <CourseCover course={course} />
                <CardHeader className="pb-2">
                  <CardTitle className="group-hover:text-primary line-clamp-2 text-lg transition-colors">
                    {course.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {course.description && (
                    <p className="text-muted-foreground line-clamp-2 text-sm">
                      {course.description}
                    </p>
                  )}

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-semibold">{course.progress}%</span>
                    </div>
                    <div className="bg-muted h-2.5 w-full overflow-hidden rounded-full">
                      <div
                        className="from-primary to-primary/70 h-full rounded-full bg-gradient-to-r"
                        style={{ width: `${course.progress}%` }}
                      />
                    </div>
                  </div>

                  <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                    Enrolled {formatDate(course.enrolled_at)}
                  </p>

                  <Link
                    href={`/student/courses/${course.id}`}
                    className={buttonVariants({ size: "sm", className: "w-full gap-2" })}
                  >
                    Continue Learning
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <StudentAttendanceOverview />

      <section id="available-courses" className="scroll-mt-24 space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Available Courses</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Published courses with registration open that are not already in your enrolled list.
          </p>
        </div>

        {availableCourses.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed px-4 py-12 text-center">
            <CheckCircle className="text-success/70 h-12 w-12" aria-hidden="true" />
            <h3 className="mt-4 text-lg font-semibold">No additional courses available</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              You are enrolled in every course currently accepting registrations.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {availableCourses.map((course) => (
              <Card
                key={course.id}
                className="group overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <CourseCover course={course} />
                <CardHeader className="pb-2">
                  <div className="mb-2">
                    <span className="bg-success/10 text-success inline-flex rounded-full px-2.5 py-1 text-xs font-semibold">
                      Available
                    </span>
                  </div>
                  <CardTitle className="group-hover:text-primary line-clamp-2 text-lg transition-colors">
                    {course.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground line-clamp-3 min-h-15 text-sm">
                    {course.description || "Contact the BIMPACC team for course details."}
                  </p>

                  <a
                    href="https://wa.me/923230191737"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({
                      size: "sm",
                      className: "w-full bg-green-600 hover:bg-green-700",
                    })}
                  >
                    <WhatsAppIcon className="h-4 w-4" />
                    Contact for Enrollment
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
