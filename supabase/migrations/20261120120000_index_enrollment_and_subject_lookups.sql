-- Hot-path indexes for enrollment and course-content lookups.
--
-- Every student read of lessons, subjects and semesters goes through RLS
-- policies of the form
--   EXISTS (SELECT 1 FROM enrollments e WHERE e.user_id = auth.uid() AND e.course_id = ...)
-- and the app checks enrollment the same way on every course and lesson page.
-- The repo migrations never index enrollments (user_id / course_id), so each
-- of those checks scans the whole table, once per row being checked.
--
-- subjects(course_id) is the main filter for the course and lesson pages and
-- is also unindexed.
--
-- All statements are additive and idempotent (IF NOT EXISTS), so they are safe
-- even if an equivalent index was already created outside of migrations.

create index if not exists idx_enrollments_user_course
  on public.enrollments (user_id, course_id);

create index if not exists idx_enrollments_course_id
  on public.enrollments (course_id);

create index if not exists idx_subjects_course_order
  on public.subjects (course_id, order_index);

analyze public.enrollments;
analyze public.subjects;
