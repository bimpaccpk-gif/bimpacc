import { redirect } from "next/navigation";

import { getCourseBreadcrumbs } from "@/components/admin/hierarchy-breadcrumbs";
import { HierarchyIndicator } from "@/components/admin/hierarchy-indicator";
import { InlineSemesterManager } from "@/components/admin/inline-semester-manager";
import { PageHeader } from "@/components/layout/page-header";
import { getCurrentUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import type { HierarchyType } from "@/types";

interface CourseRow {
  id: string;
  title: string;
  hierarchy_type: HierarchyType;
}

interface SemesterWithSubjects {
  id: string;
  title: string;
  description: string;
  order_index: number;
  subjects: { id: string; title: string; order_index: number }[];
}

async function getCourse(courseId: string): Promise<CourseRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .select("id, title, hierarchy_type")
    .eq("id", courseId)
    .single();

  if (error) return null;
  return data as CourseRow;
}

async function getSemestersWithSubjects(
  courseId: string
): Promise<SemesterWithSubjects[]> {
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

  const subjectsBySemester = new Map<
    string,
    { id: string; title: string; order_index: number }[]
  >();
  for (const subject of (subjects ?? []) as {
    id: string;
    title: string;
    semester_id: string;
    order_index: number;
  }[]) {
    const list = subjectsBySemester.get(subject.semester_id) ?? [];
    list.push({
      id: subject.id,
      title: subject.title,
      order_index: subject.order_index,
    });
    subjectsBySemester.set(subject.semester_id, list);
  }

  return semesters.map((s) => ({
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
  await getCurrentUser();
  const { courseId } = await params;

  const course = await getCourse(courseId);
  if (!course) {
    redirect("/admin/courses");
  }

  const semesters = await getSemestersWithSubjects(courseId);
  const totalSubjectCount = semesters.reduce(
    (sum, semester) => sum + semester.subjects.length,
    0
  );

  const pluralize = (count: number, noun: string) =>
    `${count} ${noun}${count === 1 ? "" : "s"}`;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeader
        title="Semesters"
        description={`${course.title} · ${pluralize(semesters.length, "semester")} · ${pluralize(totalSubjectCount, "subject")}`}
        breadcrumbs={getCourseBreadcrumbs({
          courseId,
          courseTitle: course.title,
          current: "Semesters",
        })}
        actions={
          <HierarchyIndicator hierarchyType={course.hierarchy_type} compact />
        }
      />

      <InlineSemesterManager
        courseId={courseId}
        initialSemesters={semesters.map((semester) => ({
          id: semester.id,
          title: semester.title,
          description: semester.description,
          order_index: semester.order_index,
        }))}
      />
    </div>
  );
}
