import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/dal";
import { ArrowLeft, Layers } from "lucide-react";
import Link from "next/link";
import { HierarchyIndicator } from "@/components/admin/hierarchy-indicator";
import { InlineSubjectManager } from "@/components/admin/inline-subject-manager";
import { HierarchyType } from "@/types";

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
  const course = await getCourse(courseId);
  const subjects = await getSubjects(courseId);

  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <h2 className="text-lg font-semibold">Course not found</h2>
        <Link href="/admin/courses" className="mt-2 text-sm text-primary hover:underline">
          Back to courses
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/admin/courses"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Courses
        </Link>
        <div className="mt-4 flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Layers className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {course.title}
            </h1>
            <p className="mt-1 text-muted-foreground">
              Add and manage subjects and lessons
            </p>
          </div>
        </div>
        <div className="mt-5">
          <HierarchyIndicator hierarchyType={course.hierarchy_type} />
        </div>
      </div>

      {/* Content */}
      <InlineSubjectManager courseId={courseId} initialSubjects={subjects} />
    </div>
  );
}
