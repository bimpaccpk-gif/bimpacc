import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/dal";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, ArrowLeft, Clock } from "lucide-react";
import Link from "next/link";
import { LessonCreateDialog } from "@/components/admin/lesson-create-dialog";
import { LessonDeleteButton } from "@/components/admin/lesson-delete-button";

interface LessonRow {
  id: string;
  title: string;
  description: string;
  video_url: string | null;
  duration_minutes: number | null;
  order_index: number;
}

async function getSubject(subjectId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subjects")
    .select("id, title, course_id")
    .eq("id", subjectId)
    .single();
  return data as { id: string; title: string; course_id: string } | null;
}

async function getCourseTitle(courseId: string): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select("title")
    .eq("id", courseId)
    .single();
  return (data as any)?.title ?? "Course";
}

async function getLessons(subjectId: string): Promise<LessonRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lessons")
    .select("id, title, description, video_url, duration_minutes, order_index")
    .eq("subject_id", subjectId)
    .order("order_index", { ascending: true });

  if (error) {
    console.error("Error fetching lessons:", error);
    return [];
  }
  return data ?? [];
}

export default async function AdminLessonsPage({
  params,
}: {
  params: Promise<{ courseId: string; subjectId: string }>;
}) {
  await getCurrentUser();
  const { courseId, subjectId } = await params;
  const subject = await getSubject(subjectId);
  const lessons = await getLessons(subjectId);
  const courseTitle = await getCourseTitle(courseId);

  if (!subject) {
    return (
      <div className="py-16 text-center">
        <h2 className="text-lg font-semibold">Subject not found</h2>
        <Link
          href={`/admin/courses/${courseId}/subjects`}
          className="mt-2 text-sm text-primary"
        >
          Back to subjects
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/admin/courses/${courseId}/subjects`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {courseTitle} / Subjects
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-foreground">
          {subject.title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage lessons for this subject
        </p>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {lessons.length} lesson{lessons.length !== 1 ? "s" : ""}
        </span>
        <LessonCreateDialog courseId={courseId} subjectId={subjectId} />
      </div>

      {lessons.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <BookOpen className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No lessons yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Add lessons to this subject.
          </p>
          <div className="mt-6 w-full max-w-md space-y-3">
            <div className="flex items-start gap-3 rounded-lg border bg-card p-3 text-left">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                1
              </div>
              <div>
                <p className="text-sm font-medium">Create Lessons</p>
                <p className="text-xs text-muted-foreground">
                  Click &quot;New Lesson&quot; above to add lessons to this subject
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border bg-card p-3 text-left">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                2
              </div>
              <div>
                <p className="text-sm font-medium">Add Content</p>
                <p className="text-xs text-muted-foreground">
                  Include video URLs, descriptions, and text content for each lesson
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lessons.map((lesson, index) => (
            <Card
              key={lesson.id}
              className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <span className="text-xs text-muted-foreground">
                    #{index + 1}
                  </span>
                  {lesson.duration_minutes && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {lesson.duration_minutes} min
                    </span>
                  )}
                </div>
                <CardTitle className="text-lg">{lesson.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {lesson.description || "No description"}
                </p>
                {lesson.video_url && (
                  <p className="text-xs text-primary">Has video</p>
                )}
                <div className="flex items-center gap-2 pt-2">
                  <LessonDeleteButton
                    lessonId={lesson.id}
                    lessonTitle={lesson.title}
                    subjectId={subjectId}
                    courseId={courseId}
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
