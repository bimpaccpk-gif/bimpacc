import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/dal";
import { ArrowLeft, BookOpen } from "lucide-react";
import Link from "next/link";
import { HierarchyIndicator } from "@/components/admin/hierarchy-indicator";
import { InlineLessonManager } from "@/components/admin/inline-lesson-manager";
import { getHierarchyConfig } from "@/lib/hierarchy-config";
import { HierarchyType } from "@/types";

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
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <h2 className="text-lg font-semibold">Course not found</h2>
        <Link href="/admin/courses" className="mt-2 text-sm text-primary hover:underline">
          Back to courses
        </Link>
      </div>
    );
  }

  const hierarchyConfig = getHierarchyConfig(course.hierarchy_type);

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
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {course.title}
            </h1>
            <p className="mt-1 text-muted-foreground">
              Add and manage lessons
            </p>
          </div>
        </div>
        <div className="mt-5">
          <HierarchyIndicator hierarchyType={course.hierarchy_type} />
        </div>
      </div>

      {/* Content */}
      <div className="rounded-xl border bg-card p-6">
        <InlineLessonManager courseId={courseId} />
      </div>
    </div>
  );
}
