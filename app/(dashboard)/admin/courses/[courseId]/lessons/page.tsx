import { redirect } from "next/navigation";
import { getCourseBreadcrumbs } from "@/components/admin/hierarchy-breadcrumbs";
import { HierarchyIndicator } from "@/components/admin/hierarchy-indicator";
import { InlineLessonManager } from "@/components/admin/inline-lesson-manager";
import { PageHeader } from "@/components/layout/page-header";
import { getCurrentUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import type { HierarchyType } from "@/types";

async function getCourse(courseId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select("id, title, hierarchy_type")
    .eq("id", courseId)
    .single();
  return data as { id: string; title: string; hierarchy_type: HierarchyType } | null;
}

export default async function AdminCourseLessonsPage({
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

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeader
        title="Lessons"
        description={`${course.title} · Add, edit and reorder lessons`}
        breadcrumbs={getCourseBreadcrumbs({ courseId, courseTitle: course.title, current: "Lessons" })}
        actions={<HierarchyIndicator hierarchyType={course.hierarchy_type} compact />}
      />

      <div className="bg-card ring-foreground/10 rounded-xl p-4 ring-1 sm:p-6">
        <InlineLessonManager courseId={courseId} />
      </div>
    </div>
  );
}
