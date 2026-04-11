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

export interface CourseItemCounts {
  semesters: number;
  subjects: number;
  lessons: number;
}

async function getCourseItemCounts(courses: CourseRow[]): Promise<Record<string, CourseItemCounts>> {
  if (courses.length === 0) return {};
  const supabase = await createClient();
  const counts: Record<string, CourseItemCounts> = {};

  const courseIds = courses.map((c) => c.id);
  courseIds.forEach(id => {
    counts[id] = { semesters: 0, subjects: 0, lessons: 0 };
  });

  const [
    { data: semesters },
    { data: subjects },
  ] = await Promise.all([
    supabase.from("semesters").select("course_id").in("course_id", courseIds),
    supabase.from("subjects").select("id, course_id").in("course_id", courseIds),
  ]);

  (semesters ?? []).forEach((s: any) => {
    if (counts[s.course_id]) counts[s.course_id].semesters += 1;
  });

  const subjectIdToCourseId: Record<string, string> = {};
  (subjects ?? []).forEach((s: any) => {
    if (counts[s.course_id]) {
      counts[s.course_id].subjects += 1;
      subjectIdToCourseId[s.id] = s.course_id;
    }
  });

  const subjectIds = Object.keys(subjectIdToCourseId);

  const [
    { data: courseLessons },
    { data: subjectLessons },
  ] = await Promise.all([
    supabase.from("lessons").select("course_id").in("course_id", courseIds),
    subjectIds.length > 0 
      ? supabase.from("lessons").select("subject_id").in("subject_id", subjectIds)
      : Promise.resolve({ data: [] }),
  ]);

  (courseLessons ?? []).forEach((l: any) => {
    if (l.course_id && counts[l.course_id]) {
      counts[l.course_id].lessons += 1;
    }
  });

  (subjectLessons ?? []).forEach((l: any) => {
    if (l.subject_id) {
      const cId = subjectIdToCourseId[l.subject_id];
      if (cId && counts[cId]) {
        counts[cId].lessons += 1;
      }
    }
  });

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
