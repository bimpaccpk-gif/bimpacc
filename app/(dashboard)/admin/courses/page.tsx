import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/dal";
import { CourseCreateDialog } from "@/components/admin/course-create-dialog";
import { CourseList, CourseRow } from "@/components/admin/course-list";

async function getCourses(): Promise<CourseRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .select("id, title, description, batch, status, registration_open, price, hierarchy_type, created_at, order_index")
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching courses:", error);
    return [];
  }
  return data ?? [];
}

async function getCourseItemCounts(courses: CourseRow[]): Promise<Record<string, number>> {
  if (courses.length === 0) return {};
  const supabase = await createClient();
  const counts: Record<string, number> = {};

  const subjectCourseIds = courses.filter((c) => c.hierarchy_type === 1).map((c) => c.id);
  const lessonCourseIds = courses.filter((c) => c.hierarchy_type === 2 || c.hierarchy_type === 3).map((c) => c.id);

  if (subjectCourseIds.length > 0) {
    const { data: subjects } = await supabase
      .from("subjects")
      .select("course_id")
      .in("course_id", subjectCourseIds);
    (subjects ?? []).forEach((s: any) => {
      counts[s.course_id] = (counts[s.course_id] ?? 0) + 1;
    });
  }

  if (lessonCourseIds.length > 0) {
    const { data: lessons } = await supabase
      .from("lessons")
      .select("course_id")
      .in("course_id", lessonCourseIds);
    (lessons ?? []).forEach((l: any) => {
      counts[l.course_id] = (counts[l.course_id] ?? 0) + 1;
    });
  }

  return counts;
}

export default async function AdminCoursesPage() {
  await getCurrentUser();
  const courses = await getCourses();
  const itemCounts = await getCourseItemCounts(courses);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground bg-gradient-to-br from-foreground to-foreground/80 bg-clip-text">
            Courses
          </h1>
          <p className="text-muted-foreground/80">
            Create and manage your courses, subjects, and lessons seamlessly.
          </p>
        </div>
        <CourseCreateDialog />
      </div>

      {/* Course List */}
      <CourseList initialCourses={courses} itemCounts={itemCounts} />
    </div>
  );
}
