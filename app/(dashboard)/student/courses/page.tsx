import { getCurrentUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BookOpen, Layers, FileText, CheckCircle2, ArrowRight, Lock } from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";

interface CourseWithCounts {
  id: string;
  title: string;
  description: string;
  batch: string;
  status: string;
  hierarchy_type: number;
  thumbnail_url: string | null;
  created_at: string;
  subject_count: number;
  lesson_count: number;
  is_enrolled: boolean;
}

async function getAvailableCourses(userId: string): Promise<CourseWithCounts[]> {
  const supabase = await createClient();

  // Fetch published courses
  const { data: courses, error } = await supabase
    .from("courses")
    .select("id, title, description, batch, status, hierarchy_type, thumbnail_url, created_at")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (error || !courses) return [];

  // Fetch enrollment status for this user
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("user_id", userId);

  const enrolledIds = new Set((enrollments ?? []).map((e: any) => e.course_id));

  // Fetch subject counts
  const courseIds = courses.map((c: any) => c.id);
  const { data: subjects } = await supabase
    .from("subjects")
    .select("course_id")
    .in("course_id", courseIds);

  const subjectCounts: Record<string, number> = {};
  (subjects ?? []).forEach((s: any) => {
    subjectCounts[s.course_id] = (subjectCounts[s.course_id] ?? 0) + 1;
  });

  // Fetch lesson counts (lessons with subject_id)
  const { data: subjectLessons } = await supabase
    .from("lessons")
    .select("subject_id, subjects!inner(course_id)")
    .not("subject_id", "is", null);

  const lessonCounts: Record<string, number> = {};
  (subjectLessons ?? []).forEach((l: any) => {
    const cid = l.subjects?.course_id;
    if (cid) lessonCounts[cid] = (lessonCounts[cid] ?? 0) + 1;
  });

  // Fetch direct course lessons (hierarchy type 2,3)
  const { data: directLessons } = await supabase
    .from("lessons")
    .select("course_id")
    .not("course_id", "is", null)
    .in("course_id", courseIds);

  (directLessons ?? []).forEach((l: any) => {
    lessonCounts[l.course_id] = (lessonCounts[l.course_id] ?? 0) + 1;
  });

  return courses.map((c: any) => ({
    ...c,
    subject_count: subjectCounts[c.id] ?? 0,
    lesson_count: lessonCounts[c.id] ?? 0,
    is_enrolled: enrolledIds.has(c.id),
  }));
}

export default async function StudentCoursesPage() {
  const user = await getCurrentUser();
  const courses = await getAvailableCourses(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-foreground text-2xl font-bold">Available Courses</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Browse published courses. Enrollment is managed by the administrator.
        </p>
      </div>

      {courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <BookOpen className="text-muted-foreground/50 h-12 w-12" />
          <h3 className="mt-4 text-lg font-semibold">No courses available</h3>
          <p className="text-muted-foreground mt-1 text-sm">Check back soon for new courses.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Card
              key={course.id}
              className="group overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
              {/* Thumbnail */}
              <div className="from-primary via-brand-500 to-primary/80 relative aspect-video overflow-hidden bg-gradient-to-br">
                {course.thumbnail_url ? (
                  <img
                    src={course.thumbnail_url}
                    alt={course.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <BookOpen className="text-primary-foreground/60 h-12 w-12" />
                  </div>
                )}
                {/* Enrolled badge */}
                {course.is_enrolled && (
                  <div className="absolute top-3 right-3">
                    <span className="bg-success text-success-foreground inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold shadow-lg">
                      <CheckCircle2 className="h-3 w-3" />
                      Enrolled
                    </span>
                  </div>
                )}
                {/* Batch badge */}
                <div className="absolute bottom-3 left-3">
                  <span className="bg-background/60 text-foreground rounded-full px-2.5 py-1 text-xs font-medium backdrop-blur-sm">
                    Batch {course.batch}
                  </span>
                </div>
              </div>

              <CardHeader className="pb-2">
                <CardTitle className="group-hover:text-primary line-clamp-2 text-lg transition-colors">
                  {course.title}
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                {course.description && (
                  <p className="text-muted-foreground line-clamp-2 text-sm">{course.description}</p>
                )}

                {/* Stats */}
                <div className="text-muted-foreground flex items-center gap-4 text-xs">
                  {course.subject_count > 0 && (
                    <span className="flex items-center gap-1">
                      <Layers className="h-3.5 w-3.5" />
                      {course.subject_count} Subject{course.subject_count !== 1 ? "s" : ""}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" />
                    {course.lesson_count} Lesson{course.lesson_count !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Action */}
                {course.is_enrolled ? (
                  <Link href={`/student/courses/${course.id}`}>
                    <Button size="sm" className="w-full gap-2" variant="default">
                      Continue Learning
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                ) : (
                  <div className="space-y-2">
                    <Button size="sm" variant="secondary" className="w-full gap-2" disabled>
                      <Lock className="text-muted-foreground h-4 w-4" />
                      Locked (Not Enrolled)
                    </Button>
                    <a
                      href="https://wa.me/923230191737"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center justify-center gap-2 rounded-md bg-green-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700"
                    >
                      <WhatsAppIcon className="h-4 w-4" />
                      Contact for Enrollment
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
