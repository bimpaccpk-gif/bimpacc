import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/dal";
import { CourseCreateDialog } from "@/components/admin/course-create-dialog";
import { CourseList, CourseRow } from "@/components/admin/course-list";
import { PageHeader } from "@/components/layout/page-header";

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

  (semesters ?? []).forEach((s: { course_id: string }) => {
    if (counts[s.course_id]) counts[s.course_id].semesters += 1;
  });

  const subjectIdToCourseId: Record<string, string> = {};
  (subjects ?? []).forEach((s: { id: string; course_id: string }) => {
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

  (courseLessons ?? []).forEach((l: { course_id: string | null }) => {
    if (l.course_id && counts[l.course_id]) {
      counts[l.course_id].lessons += 1;
    }
  });

  (subjectLessons ?? []).forEach((l: { subject_id: string | null }) => {
    if (l.subject_id) {
      const cId = subjectIdToCourseId[l.subject_id];
      if (cId && counts[cId]) {
        counts[cId].lessons += 1;
      }
    }
  });

  return counts;
}

async function getEnrollmentCounts(courseIds: string[]): Promise<Record<string, number>> {
  if (courseIds.length === 0) return {};
  const supabase = await createClient();
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("course_id")
    .in("course_id", courseIds);

  const counts: Record<string, number> = {};
  courseIds.forEach((id) => { counts[id] = 0; });
  (enrollments ?? []).forEach((e: { course_id: string }) => {
    if (counts[e.course_id] !== undefined) counts[e.course_id] += 1;
  });
  return counts;
}

export default async function AdminCoursesPage() {
  const [, courses] = await Promise.all([getCurrentUser(), getCourses()]);
  const [itemCounts, enrollmentCounts] = await Promise.all([
    getCourseItemCounts(courses),
    getEnrollmentCounts(courses.map((c) => c.id)),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Courses"
        description="Create and organize courses, then manage their content hierarchy."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin" },
          { label: "Content" },
          { label: "Courses" },
        ]}
        actions={<CourseCreateDialog />}
      />

      <CourseList initialCourses={courses} itemCounts={itemCounts} enrollmentCounts={enrollmentCounts} />
    </div>
  );
}
