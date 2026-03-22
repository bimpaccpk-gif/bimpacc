import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/dal";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { SubjectCreateDialog } from "@/components/admin/subject-create-dialog";
import { SubjectDeleteButton } from "@/components/admin/subject-delete-button";

interface SubjectRow {
  id: string;
  title: string;
  description: string;
  order_index: number;
}

async function getCourse(courseId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select("id, title")
    .eq("id", courseId)
    .single();
  return data as { id: string; title: string } | null;
}

async function getSubjects(courseId: string): Promise<SubjectRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subjects")
    .select("id, title, description, order_index")
    .eq("course_id", courseId)
    .order("order_index", { ascending: true });

  if (error) {
    console.error("Error fetching subjects:", error);
    return [];
  }
  return data ?? [];
}

async function getSubjectLessonCount(
  subjectIds: string[]
): Promise<Record<string, number>> {
  if (subjectIds.length === 0) return {};
  const supabase = await createClient();
  const { data } = await supabase.from("lessons").select("subject_id");

  const counts: Record<string, number> = {};
  (data ?? []).forEach((l: any) => {
    if (subjectIds.includes(l.subject_id)) {
      counts[l.subject_id] = (counts[l.subject_id] ?? 0) + 1;
    }
  });
  return counts;
}

export default async function AdminSubjectsPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  await getCurrentUser();
  const { courseId } = await params;
  const course = await getCourse(courseId);
  const subjects = await getSubjects(courseId);
  const lessonCounts = await getSubjectLessonCount(subjects.map((s) => s.id));

  if (!course) {
    return (
      <div className="py-16 text-center">
        <h2 className="text-lg font-semibold">Course not found</h2>
        <Link href="/admin/courses" className="mt-2 text-sm text-primary">
          Back to courses
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/courses"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Courses
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-foreground">
          {course.title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage subjects for this course
        </p>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {subjects.length} subject{subjects.length !== 1 ? "s" : ""}
        </span>
        <SubjectCreateDialog courseId={courseId} />
      </div>

      {subjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <BookOpen className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No subjects yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Add subjects to organize your course content.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((subject) => (
            <Card
              key={subject.id}
              className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{subject.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {subject.description || "No description"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {lessonCounts[subject.id] ?? 0} lessons
                </p>
                <div className="flex items-center gap-2 pt-2">
                  <Link
                    href={`/admin/courses/${courseId}/subjects/${subject.id}/lessons`}
                  >
                    <Button size="sm">Manage Lessons</Button>
                  </Link>
                  <SubjectDeleteButton
                    subjectId={subject.id}
                    subjectTitle={subject.title}
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
