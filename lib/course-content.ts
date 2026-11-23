import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { cachedShared } from "@/lib/cache";

/**
 * Course content that is identical for every student (the ordered lesson list of a course).
 * Safe to cache and share. It must only be RETURNED to a user after enrollment / pause checks pass.
 */

export interface CourseLessonRow {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  content: string | null;
  order_index: number;
  duration_minutes: number | null;
  subject_id?: string | null;
  subject_title?: string | null;
}

interface SubjectRow {
  id: string;
  title: string;
  semester_id?: string | null;
  order_index?: number | null;
}

function fail(what: string, error: { message: string } | null): void {
  if (error) throw new Error(`${what}: ${error.message}`);
}

/** Reads the ordered lesson list from the database. Throws on any query error (so errors are never cached). */
async function loadCourseLessons(courseId: string, hierarchyType: number): Promise<CourseLessonRow[]> {
  const admin = createAdminClient();

  if (hierarchyType === 3) {
    const { data, error } = await admin
      .from("lessons")
      .select("id, title, description, video_url, content, order_index, duration_minutes")
      .eq("course_id", courseId)
      .order("order_index", { ascending: true });
    fail("lessons", error);
    return (data ?? []) as CourseLessonRow[];
  }

  // Hierarchy 1 and 2 are subject-based; keep loading compatible with both
  // semester-linked and legacy direct-to-course subjects.
  const semesterOrder = new Map<string, number>();
  let subjects: SubjectRow[] = [];

  if (hierarchyType === 1) {
    const [semestersRes, legacyRes] = await Promise.all([
      admin
        .from("semesters")
        .select("id, order_index")
        .eq("course_id", courseId)
        .order("order_index", { ascending: true }),
      admin
        .from("subjects")
        .select("id, title, semester_id, order_index")
        .eq("course_id", courseId)
        .is("semester_id", null)
        .order("order_index", { ascending: true }),
    ]);
    fail("semesters", semestersRes.error);
    fail("legacy subjects", legacyRes.error);

    const semesters = semestersRes.data ?? [];
    semesters.forEach((s) => semesterOrder.set(s.id, s.order_index ?? 0));

    let semesterSubjects: SubjectRow[] = [];
    if (semesters.length > 0) {
      const { data, error } = await admin
        .from("subjects")
        .select("id, title, semester_id, order_index")
        .in(
          "semester_id",
          semesters.map((s) => s.id)
        )
        .order("order_index", { ascending: true });
      fail("semester subjects", error);
      semesterSubjects = data ?? [];
    }

    subjects = [...semesterSubjects, ...(legacyRes.data ?? [])];
  } else {
    const { data, error } = await admin
      .from("subjects")
      .select("id, title, semester_id, order_index")
      .eq("course_id", courseId)
      .order("order_index", { ascending: true });
    fail("subjects", error);
    subjects = data ?? [];
  }

  if (subjects.length === 0) return [];

  const { data: rawLessons, error } = await admin
    .from("lessons")
    .select("id, title, description, video_url, content, order_index, duration_minutes, subject_id")
    .in(
      "subject_id",
      subjects.map((s) => s.id)
    )
    .order("order_index", { ascending: true });
  fail("lessons", error);

  const subjectMeta = new Map<string, { title: string; order_index: number; semester_id?: string | null }>();
  subjects.forEach((s) =>
    subjectMeta.set(s.id, { title: s.title, order_index: s.order_index ?? 0, semester_id: s.semester_id })
  );

  return (rawLessons ?? [])
    .map((l) => ({
      id: l.id,
      title: l.title,
      description: l.description,
      video_url: l.video_url,
      content: l.content,
      order_index: l.order_index,
      duration_minutes: l.duration_minutes,
      subject_id: l.subject_id,
      subject_title: subjectMeta.get(l.subject_id)?.title ?? null,
    }))
    .sort((a, b) => {
      const aMeta = a.subject_id ? subjectMeta.get(a.subject_id) : undefined;
      const bMeta = b.subject_id ? subjectMeta.get(b.subject_id) : undefined;

      if (hierarchyType === 1) {
        const aSem = aMeta?.semester_id
          ? (semesterOrder.get(aMeta.semester_id) ?? Number.MAX_SAFE_INTEGER)
          : Number.MAX_SAFE_INTEGER;
        const bSem = bMeta?.semester_id
          ? (semesterOrder.get(bMeta.semester_id) ?? Number.MAX_SAFE_INTEGER)
          : Number.MAX_SAFE_INTEGER;
        if (aSem !== bSem) return aSem - bSem;
      }

      const aSub = aMeta?.order_index ?? Number.MAX_SAFE_INTEGER;
      const bSub = bMeta?.order_index ?? Number.MAX_SAFE_INTEGER;
      if (aSub !== bSub) return aSub - bSub;

      return (a.order_index ?? 0) - (b.order_index ?? 0);
    });
}

/** The ordered lesson list of a course, served from the shared cache when possible. */
export function getCourseLessons(courseId: string, hierarchyType: number): Promise<CourseLessonRow[]> {
  return cachedShared("course-lessons", [courseId, String(hierarchyType)], () =>
    loadCourseLessons(courseId, hierarchyType)
  );
}
