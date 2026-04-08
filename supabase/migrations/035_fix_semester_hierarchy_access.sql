-- Migration 035: Fix enrollment access for semester-linked hierarchy data
-- Ensures students can read subjects/lessons when type-1 subjects rely on semester_id.

-- ------------------------------------------------------------
-- SEMESTER POLICIES (HARDENING)
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "Authenticated users can read semesters" ON public.semesters;
DROP POLICY IF EXISTS "Authenticated users can insert semesters" ON public.semesters;
DROP POLICY IF EXISTS "Authenticated users can update semesters" ON public.semesters;
DROP POLICY IF EXISTS "Authenticated users can delete semesters" ON public.semesters;
DROP POLICY IF EXISTS "Enrolled students can read semesters" ON public.semesters;
DROP POLICY IF EXISTS "Admins and instructors can read semesters" ON public.semesters;
DROP POLICY IF EXISTS "Instructors and admins can insert semesters" ON public.semesters;
DROP POLICY IF EXISTS "Instructors and admins can update semesters" ON public.semesters;
DROP POLICY IF EXISTS "Admins can delete semesters" ON public.semesters;

CREATE POLICY "Enrolled students can read semesters"
  ON public.semesters FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.enrollments e
      WHERE e.user_id = auth.uid()
        AND e.course_id = semesters.course_id
    )
  );

CREATE POLICY "Admins and instructors can read semesters"
  ON public.semesters FOR SELECT
  USING (public.is_instructor());

CREATE POLICY "Instructors and admins can insert semesters"
  ON public.semesters FOR INSERT
  WITH CHECK (public.is_instructor());

CREATE POLICY "Instructors and admins can update semesters"
  ON public.semesters FOR UPDATE
  USING (public.is_instructor());

CREATE POLICY "Admins can delete semesters"
  ON public.semesters FOR DELETE
  USING (public.is_admin());

-- ------------------------------------------------------------
-- SUBJECT READ POLICY
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "Enrolled students can read subjects" ON public.subjects;
DROP POLICY IF EXISTS "Enrolled users can read subjects" ON public.subjects;

CREATE POLICY "Enrolled students can read subjects"
  ON public.subjects FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.enrollments e
      WHERE e.user_id = auth.uid()
        AND e.course_id = COALESCE(
          subjects.course_id,
          (
            SELECT sem.course_id
            FROM public.semesters sem
            WHERE sem.id = subjects.semester_id
          )
        )
    )
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'subjects'
      AND policyname = 'Admins and instructors can read subjects'
  ) THEN
    CREATE POLICY "Admins and instructors can read subjects"
      ON public.subjects FOR SELECT
      USING (public.is_instructor());
  END IF;
END;
$$;

-- ------------------------------------------------------------
-- LESSON READ POLICY
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "Enrolled students can read lessons" ON public.lessons;
DROP POLICY IF EXISTS "Enrolled users can read lessons" ON public.lessons;

CREATE POLICY "Enrolled students can read lessons"
  ON public.lessons FOR SELECT
  USING (
    -- Subject-based lessons (type 1/2)
    (
      subject_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.enrollments e
        WHERE e.user_id = auth.uid()
          AND e.course_id = COALESCE(
            (
              SELECT s.course_id
              FROM public.subjects s
              WHERE s.id = lessons.subject_id
            ),
            (
              SELECT sem.course_id
              FROM public.subjects s
              JOIN public.semesters sem ON sem.id = s.semester_id
              WHERE s.id = lessons.subject_id
            )
          )
      )
    )
    OR
    -- Direct course lessons (type 3)
    (
      course_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.enrollments e
        WHERE e.user_id = auth.uid()
          AND e.course_id = lessons.course_id
      )
    )
  );

-- Keep admin/instructor read policy; if already present this is a no-op.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lessons'
      AND policyname = 'Admins and instructors can read lessons'
  ) THEN
    CREATE POLICY "Admins and instructors can read lessons"
      ON public.lessons FOR SELECT
      USING (public.is_instructor());
  END IF;
END;
$$;

-- ------------------------------------------------------------
-- HELPER FUNCTION FOR DEPENDENT POLICIES
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_enrolled_in_lesson(lesson_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE users.id = user_uuid
      AND users.role IN ('admin', 'instructor')
  )
  OR EXISTS (
    -- Direct course enrollment
    SELECT 1
    FROM public.enrollments
    WHERE enrollments.user_id = user_uuid
      AND enrollments.course_id = (
        SELECT l.course_id FROM public.lessons l WHERE l.id = lesson_uuid
      )
      AND (
        SELECT l.course_id FROM public.lessons l WHERE l.id = lesson_uuid
      ) IS NOT NULL
  )
  OR EXISTS (
    -- Subject/semester enrollment
    SELECT 1
    FROM public.enrollments e
    WHERE e.user_id = user_uuid
      AND e.course_id = COALESCE(
        (
          SELECT s.course_id
          FROM public.lessons l
          JOIN public.subjects s ON s.id = l.subject_id
          WHERE l.id = lesson_uuid
        ),
        (
          SELECT sem.course_id
          FROM public.lessons l
          JOIN public.subjects s ON s.id = l.subject_id
          JOIN public.semesters sem ON sem.id = s.semester_id
          WHERE l.id = lesson_uuid
        )
      )
  );
$$;
