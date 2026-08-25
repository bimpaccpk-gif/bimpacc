import { redirect } from "next/navigation";

import { getCourseBreadcrumbs } from "@/components/admin/hierarchy-breadcrumbs";
import { HierarchyIndicator } from "@/components/admin/hierarchy-indicator";
import { InlineSubjectManager } from "@/components/admin/inline-subject-manager";
import { PageHeader } from "@/components/layout/page-header";
import { getCurrentUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import type { HierarchyType } from "@/types";

interface CourseRow {
  id: string;
  title: string;
  hierarchy_type: HierarchyType;
}

interface SemesterRow {
  id: string;
  title: string;
  course_id: string;
}

/** Row shape consumed by InlineSubjectManager's `initialSubjects`. */
interface SubjectRow {
  id: string;
  title: string;
  description: string;
  order_index: number;
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

async function getSemester(semesterId: string): Promise<SemesterRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("semesters")
    .select("id, title, course_id")
    .eq("id", semesterId)
    .single();

  if (error) return null;
  return data as SemesterRow;
}

async function getSubjects(semesterId: string): Promise<SubjectRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subjects")
    .select("id, title, description, order_index")
    .eq("semester_id", semesterId)
    .order("order_index", { ascending: true });

  if (error) {
    console.error("Error fetching semester subjects:", error);
    return [];
  }
  return ((data ?? []) as SubjectRow[]).map((subject) => ({
    ...subject,
    description: subject.description ?? "",
  }));
}

export default async function SemesterSubjectsPage({
  params,
}: {
  params: Promise<{ courseId: string; semesterId: string }>;
}) {
  await getCurrentUser();
  const { courseId, semesterId } = await params;

  const [course, semester] = await Promise.all([
    getCourse(courseId),
    getSemester(semesterId),
  ]);

  // The semester must exist and belong to the course in the URL.
  if (!course || !semester || semester.course_id !== courseId) {
    redirect(`/admin/courses/${courseId}/semesters`);
  }

  const subjects = await getSubjects(semesterId);
  const pluralize = (count: number, noun: string) =>
    `${count} ${noun}${count === 1 ? "" : "s"}`;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeader
        title="Subjects"
        description={`${semester.title} · ${pluralize(subjects.length, "subject")}`}
        breadcrumbs={getCourseBreadcrumbs({
          courseId,
          courseTitle: course.title,
          semesterId,
          semesterTitle: semester.title,
          current: "Subjects",
        })}
        actions={
          <HierarchyIndicator hierarchyType={course.hierarchy_type} compact />
        }
      />

      <InlineSubjectManager
        courseId={courseId}
        semesterId={semesterId}
        initialSubjects={subjects}
      />
    </div>
  );
}
