-- Migration: Role-based RLS policies
-- Replaces overly permissive policies that allowed any authenticated user to do anything

-- ─── Helper function: Check if current user is admin ──────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ─── Helper function: Check if current user is instructor ─
CREATE OR REPLACE FUNCTION public.is_instructor()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('admin', 'instructor')
  );
$$;

-- ═══════════════════════════════════════════════════════════
-- USERS TABLE
-- ═══════════════════════════════════════════════════════════

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Authenticated users can read users" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can update users" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can delete users" ON public.users;
DROP POLICY IF EXISTS "Allow insert for authenticated" ON public.users;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- Admins can read all users
CREATE POLICY "Admins can read all users"
  ON public.users FOR SELECT
  USING (public.is_admin());

-- Users can update their own profile (limited fields enforced by app)
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Admins can update any user
CREATE POLICY "Admins can update any user"
  ON public.users FOR UPDATE
  USING (public.is_admin());

-- Only admins can delete users
CREATE POLICY "Admins can delete users"
  ON public.users FOR DELETE
  USING (public.is_admin());

-- Allow insert during signup (user inserts own record)
CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ═══════════════════════════════════════════════════════════
-- COURSES TABLE
-- ═══════════════════════════════════════════════════════════

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Authenticated users can read courses" ON public.courses;
DROP POLICY IF EXISTS "Authenticated users can insert courses" ON public.courses;
DROP POLICY IF EXISTS "Authenticated users can update courses" ON public.courses;
DROP POLICY IF EXISTS "Authenticated users can delete courses" ON public.courses;

-- All authenticated users can read courses
CREATE POLICY "Authenticated users can read courses"
  ON public.courses FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only admins and instructors can create courses
CREATE POLICY "Instructors and admins can insert courses"
  ON public.courses FOR INSERT
  WITH CHECK (public.is_instructor());

-- Only admins and instructors can update courses
CREATE POLICY "Instructors and admins can update courses"
  ON public.courses FOR UPDATE
  USING (public.is_instructor());

-- Only admins can delete courses
CREATE POLICY "Admins can delete courses"
  ON public.courses FOR DELETE
  USING (public.is_admin());

-- ═══════════════════════════════════════════════════════════
-- SUBJECTS TABLE
-- ═══════════════════════════════════════════════════════════

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Enrolled students can read subjects" ON public.subjects;
DROP POLICY IF EXISTS "Authenticated users can insert subjects" ON public.subjects;
DROP POLICY IF EXISTS "Authenticated users can update subjects" ON public.subjects;
DROP POLICY IF EXISTS "Authenticated users can delete subjects" ON public.subjects;

-- Enrolled students can read subjects
CREATE POLICY "Enrolled students can read subjects"
  ON public.subjects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.enrollments
      WHERE user_id = auth.uid() AND course_id = subjects.course_id
    )
  );

-- Admins/instructors can read all subjects
CREATE POLICY "Admins and instructors can read subjects"
  ON public.subjects FOR SELECT
  USING (public.is_instructor());

-- Only admins and instructors can manage subjects
CREATE POLICY "Instructors and admins can insert subjects"
  ON public.subjects FOR INSERT
  WITH CHECK (public.is_instructor());

CREATE POLICY "Instructors and admins can update subjects"
  ON public.subjects FOR UPDATE
  USING (public.is_instructor());

CREATE POLICY "Admins can delete subjects"
  ON public.subjects FOR DELETE
  USING (public.is_admin());

-- ═══════════════════════════════════════════════════════════
-- LESSONS TABLE
-- ═══════════════════════════════════════════════════════════

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Enrolled students can read lessons" ON public.lessons;
DROP POLICY IF EXISTS "Authenticated users can insert lessons" ON public.lessons;
DROP POLICY IF EXISTS "Authenticated users can update lessons" ON public.lessons;
DROP POLICY IF EXISTS "Authenticated users can delete lessons" ON public.lessons;

-- Enrolled students can read lessons
CREATE POLICY "Enrolled students can read lessons"
  ON public.lessons FOR SELECT
  USING (
    -- Lesson belongs to a subject (hierarchy 1)
    (subject_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.subjects s
      JOIN public.enrollments e ON e.course_id = s.course_id
      WHERE s.id = lessons.subject_id AND e.user_id = auth.uid()
    ))
    OR
    -- Lesson belongs directly to a course (hierarchy 2/3)
    (course_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.enrollments
      WHERE user_id = auth.uid() AND course_id = lessons.course_id
    ))
  );

-- Admins/instructors can read all lessons
CREATE POLICY "Admins and instructors can read lessons"
  ON public.lessons FOR SELECT
  USING (public.is_instructor());

-- Only admins and instructors can manage lessons
CREATE POLICY "Instructors and admins can insert lessons"
  ON public.lessons FOR INSERT
  WITH CHECK (public.is_instructor());

CREATE POLICY "Instructors and admins can update lessons"
  ON public.lessons FOR UPDATE
  USING (public.is_instructor());

CREATE POLICY "Admins can delete lessons"
  ON public.lessons FOR DELETE
  USING (public.is_admin());

-- ═══════════════════════════════════════════════════════════
-- ENROLLMENTS TABLE
-- ═══════════════════════════════════════════════════════════

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Authenticated users can read enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Users can insert own enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Authenticated users can update enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Authenticated users can delete enrollments" ON public.enrollments;

-- Users can read their own enrollments
CREATE POLICY "Users can read own enrollments"
  ON public.enrollments FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can read all enrollments
CREATE POLICY "Admins can read all enrollments"
  ON public.enrollments FOR SELECT
  USING (public.is_admin());

-- Admins can insert enrollments (for approving students)
CREATE POLICY "Admins can insert enrollments"
  ON public.enrollments FOR INSERT
  WITH CHECK (public.is_admin());

-- Users can insert their own enrollments (self-enrollment)
CREATE POLICY "Users can insert own enrollments"
  ON public.enrollments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can delete enrollments
CREATE POLICY "Admins can delete enrollments"
  ON public.enrollments FOR DELETE
  USING (public.is_admin());
