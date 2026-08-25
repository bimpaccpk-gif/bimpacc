import { redirect } from "next/navigation";
import { BookOpen, Clock } from "lucide-react";

import { getCourseBreadcrumbs } from "@/components/admin/hierarchy-breadcrumbs";
import { LessonCreateDialog } from "@/components/admin/lesson-create-dialog";
import { LessonDeleteButton } from "@/components/admin/lesson-delete-button";
import { LessonEditDialog } from "@/components/admin/lesson-edit-dialog";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";

interface SubjectRow {
  id: string;
  title: string;
  course_id: string;
  semester_id: string | null;
}

interface SemesterRow {
  id: string;
  title: string;
}

interface LessonRow {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  video_url: string | null;
  duration_minutes: number | null;
  order_index: number;
}

async function getSubject(subjectId: string): Promise<SubjectRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subjects")
    .select("id, title, course_id, semester_id")
    .eq("id", subjectId)
    .single();

  if (error) return null;
  return data as SubjectRow;
}

async function getCourseTitle(courseId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .select("title")
    .eq("id", courseId)
    .single();

  if (error) return null;
  return (data as { title: string } | null)?.title ?? null;
}

async function getSemester(semesterId: string): Promise<SemesterRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("semesters")
    .select("id, title")
    .eq("id", semesterId)
    .single();

  if (error) return null;
  return data as SemesterRow;
}

async function getLessons(subjectId: string): Promise<LessonRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lessons")
    .select(
      "id, title, description, content, video_url, duration_minutes, order_index"
    )
    .eq("subject_id", subjectId)
    .order("order_index", { ascending: true });

  if (error) {
    console.error("Error fetching lessons:", error);
    return [];
  }
  return (data ?? []) as LessonRow[];
}

export default async function SubjectLessonsPage({
  params,
}: {
  params: Promise<{ courseId: string; subjectId: string }>;
}) {
  await getCurrentUser();
  const { courseId, subjectId } = await params;

  const subject = await getSubject(subjectId);

  // The subject must exist and belong to the course in the URL.
  if (!subject || subject.course_id !== courseId) {
    redirect(`/admin/courses/${courseId}/subjects`);
  }

  const [courseTitle, semester, lessons] = await Promise.all([
    getCourseTitle(courseId),
    subject.semester_id ? getSemester(subject.semester_id) : null,
    getLessons(subjectId),
  ]);

  const pluralize = (count: number, noun: string) =>
    `${count} ${noun}${count === 1 ? "" : "s"}`;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeader
        title="Lessons"
        description={`${subject.title} · ${pluralize(lessons.length, "lesson")}`}
        breadcrumbs={getCourseBreadcrumbs({
          courseId,
          courseTitle: courseTitle ?? "Course",
          semesterId: subject.semester_id ?? undefined,
          semesterTitle: semester?.title,
          subjectId,
          subjectTitle: subject.title,
          current: "Lessons",
        })}
        actions={<LessonCreateDialog courseId={courseId} subjectId={subjectId} />}
      />

      {lessons.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No lessons yet"
          description='Add your first lesson with "New Lesson" — include a video URL, description and estimated duration.'
          action={
            <LessonCreateDialog courseId={courseId} subjectId={subjectId} />
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lessons.map((lesson, index) => (
            <Card
              key={lesson.id}
              className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <span className="text-xs text-muted-foreground tabular-nums">
                    #{index + 1}
                  </span>
                  {lesson.duration_minutes ? (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock aria-hidden="true" className="size-3" />
                      {lesson.duration_minutes} min
                    </span>
                  ) : null}
                </div>
                <CardTitle className="text-lg">{lesson.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {lesson.description || "No description"}
                </p>
                {lesson.video_url ? (
                  <p className="text-xs font-medium text-success">Has video</p>
                ) : null}
                <div className="flex items-center justify-end gap-1.5 pt-2">
                  <LessonEditDialog
                    lessonId={lesson.id}
                    courseId={courseId}
                    subjectId={subjectId}
                    initialTitle={lesson.title}
                    initialDescription={lesson.description ?? ""}
                    initialContent={lesson.content}
                    initialVideoUrl={lesson.video_url}
                    initialDuration={lesson.duration_minutes}
                    colorClasses={{
                      numBg: "bg-muted",
                      numText: "text-muted-foreground",
                    }}
                  />
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
