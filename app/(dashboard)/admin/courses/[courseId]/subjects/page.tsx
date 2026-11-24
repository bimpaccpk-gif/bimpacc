import { redirect } from "next/navigation";
import { getCourseBreadcrumbs } from "@/components/admin/hierarchy-breadcrumbs";
import { HierarchyIndicator } from "@/components/admin/hierarchy-indicator";
import { InlineSubjectManager } from "@/components/admin/inline-subject-manager";
import { PageHeader } from "@/components/layout/page-header";
import { getCurrentUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import type { HierarchyType } from "@/types";

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
    .select("id, title, hierarchy_type")
    .eq("id", courseId)
    .single();
  return data as { id: string; title: string; hierarchy_type: HierarchyType } | null;
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

export default async function AdminSubjectsPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  await getCurrentUser();
  const { courseId } = await params;
  const [course, subjects] = await Promise.all([getCourse(courseId), getSubjects(courseId)]);

  if (!course) {
    redirect("/admin/courses");
  }

  // Type 1 courses manage subjects through semesters — redirect there
  if (course.hierarchy_type === 1) {
    redirect(`/admin/courses/${courseId}/semesters`);
  }

  const count = `${subjects.length} subject${subjects.length === 1 ? "" : "s"}`;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeader
        title="Subjects"
        description={`${course.title} · ${count}`}
        breadcrumbs={getCourseBreadcrumbs({ courseId, courseTitle: course.title, current: "Subjects" })}
        actions={<HierarchyIndicator hierarchyType={course.hierarchy_type} compact />}
      />

      <InlineSubjectManager courseId={courseId} initialSubjects={subjects} />
    </div>
  );
}
