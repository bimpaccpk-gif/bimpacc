import Link from "next/link";
import { ArrowLeft, Book, Grid3X3 } from "lucide-react";
import { HierarchyIndicator } from "@/components/admin/hierarchy-indicator";
import { InlineSemesterManager } from "@/components/admin/inline-semester-manager";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { HierarchyType } from "@/types";

async function getCourseById(courseId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .select("id, title, hierarchy_type")
    .eq("id", courseId)
    .single();

  if (error) {
    redirect("/admin/courses");
  }
  return data as { id: string; title: string; hierarchy_type: HierarchyType } | null;
}

interface SemesterWithSubjects {
  id: string;
  title: string;
  description: string;
  order_index: number;
  subjects: { id: string; title: string; order_index: number }[];
}

async function getSemestersWithSubjects(courseId: string): Promise<SemesterWithSubjects[]> {
  const supabase = await createClient();

  const { data: semesters } = await supabase
    .from("semesters")
    .select("id, title, description, order_index")
    .eq("course_id", courseId)
    .order("order_index", { ascending: true });

  if (!semesters || semesters.length === 0) return [];

  const semesterIds = semesters.map((s) => s.id);
  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, title, semester_id, order_index")
    .in("semester_id", semesterIds)
    .order("order_index", { ascending: true });

  const subjectsBySemester = new Map<string, { id: string; title: string; order_index: number }[]>();
  (subjects ?? []).forEach((s: any) => {
    const list = subjectsBySemester.get(s.semester_id) ?? [];
    list.push({ id: s.id, title: s.title, order_index: s.order_index });
    subjectsBySemester.set(s.semester_id, list);
  });

  return semesters.map((s: any) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    order_index: s.order_index,
    subjects: subjectsBySemester.get(s.id) ?? [],
  }));
}

export default async function CourseSemestersPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const course = await getCourseById(courseId);

  if (!course) redirect("/admin/courses");

  const semesters = await getSemestersWithSubjects(courseId);

  const totalSubjectCount = semesters.reduce((sum, s) => sum + s.subjects.length, 0);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Back nav */}
      <Link
        href="/admin/courses"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Courses
      </Link>

      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{course.title}</h1>
          <div className="text-muted-foreground mt-1 flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1">
              <Grid3X3 className="h-4 w-4" />
              {semesters.length} semester{semesters.length !== 1 ? "s" : ""}
              {totalSubjectCount > 0 && (
                <span className="flex items-center gap-0.5">
                  · <Book className="h-3.5 w-3.5" /> {totalSubjectCount} subject{totalSubjectCount !== 1 ? "s" : ""}
                </span>
              )}
            </span>
            <HierarchyIndicator hierarchyType={course.hierarchy_type} compact />
          </div>
        </div>
      </div>

      {/* Semesters Manager */}
      <InlineSemesterManager
        courseId={courseId}
        initialSemesters={semesters.map((s) => ({
          id: s.id,
          title: s.title,
          description: s.description,
          order_index: s.order_index,
        }))}
      />
    </div>
  );
}
