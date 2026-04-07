import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { HierarchyIndicator } from "@/components/admin/hierarchy-indicator";
import { InlineSubjectManager } from "@/components/admin/inline-subject-manager";
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

  if (error) redirect("/admin/courses");
  return data as { id: string; title: string; hierarchy_type: HierarchyType } | null;
}

export default async function SemesterSubjectsPage({
  params,
}: {
  params: Promise<{ courseId: string; semesterId: string }>;
}) {
  const { courseId, semesterId } = await params;
  const course = await getCourseById(courseId);

  if (!course) redirect("/admin/courses");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Back nav */}
      <Link
        href={`/admin/courses/${courseId}/semesters`}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Semesters
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{course.title}</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage subjects for this semester
        </p>
        <div className="text-muted-foreground mt-1">
          <HierarchyIndicator hierarchyType={course.hierarchy_type} compact />
        </div>
      </div>

      {/* Subjects Manager */}
      <InlineSubjectManager courseId={courseId} semesterId={semesterId} />
    </div>
  );
}
