-- Add missing foreign key constraint from enrollments.course_id to courses.id
-- Without this, PostgREST cannot infer the join relationship for nested selects
ALTER TABLE public.enrollments
  ADD CONSTRAINT enrollments_course_id_fkey
  FOREIGN KEY (course_id)
  REFERENCES public.courses(id)
  ON DELETE CASCADE;
