-- Add is_paused to users for account-level pause/ban
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT false;

-- Add is_paused to courses for course-level access pause
ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT false;

-- Add is_paused to subjects for subject-level access pause
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT false;

-- Add is_paused to lessons for lesson-level access pause
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT false;

-- Update RLS policies to allow admins to update is_paused on users
CREATE POLICY "Admins can update user pause status"
  ON users FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
