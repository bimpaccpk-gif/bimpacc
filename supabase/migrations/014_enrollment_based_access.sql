-- Migration: Enrollment-based access control for courses, subjects, and lessons
-- This ensures students can ONLY view course content if they are enrolled

-- Drop existing overly permissive policies for subjects and lessons
DROP POLICY IF EXISTS "Authenticated users can read subjects" ON public.subjects;
DROP POLICY IF EXISTS "Authenticated users can read lessons" ON public.lessons;

-- Create enrollment-based policy for subjects
-- Students can only read subjects if they are enrolled in the course
CREATE POLICY "Enrolled users can read subjects"
  ON public.subjects FOR SELECT
  USING (
    -- Admins and instructors can read all subjects
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'instructor')
    )
    OR
    -- Students can only read subjects if enrolled in the course
    EXISTS (
      SELECT 1 FROM public.enrollments
      WHERE enrollments.user_id = auth.uid()
      AND enrollments.course_id = subjects.course_id
    )
  );

-- Create enrollment-based policy for lessons
-- Students can only read lessons if they are enrolled in the course
CREATE POLICY "Enrolled users can read lessons"
  ON public.lessons FOR SELECT
  USING (
    -- Admins and instructors can read all lessons
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'instructor')
    )
    OR
    -- Students can only read lessons if enrolled in the course (for direct course lessons)
    EXISTS (
      SELECT 1 FROM public.enrollments
      WHERE enrollments.user_id = auth.uid()
      AND enrollments.course_id = lessons.course_id
    )
    OR
    -- Students can only read lessons if enrolled in the course (for subject-based lessons)
    EXISTS (
      SELECT 1 FROM public.enrollments
      JOIN public.subjects ON subjects.course_id = enrollments.course_id
      WHERE enrollments.user_id = auth.uid()
      AND subjects.id = lessons.subject_id
    )
  );

-- Add comment explaining the policy
COMMENT ON POLICY "Enrolled users can read subjects" ON public.subjects IS 
  'Students can only view subjects for courses they are enrolled in. Admins and instructors can view all subjects.';

COMMENT ON POLICY "Enrolled users can read lessons" ON public.lessons IS 
  'Students can only view lessons for courses they are enrolled in. Admins and instructors can view all lessons.';
