-- Add registration_open boolean to courses
ALTER TABLE courses ADD COLUMN IF NOT EXISTS registration_open boolean DEFAULT false;

-- Allow anyone parsing the registration page to view open courses
DROP POLICY IF EXISTS "Anyone can read open courses" ON public.courses;
CREATE POLICY "Anyone can read open courses"
  ON public.courses FOR SELECT
  USING (registration_open = true);
