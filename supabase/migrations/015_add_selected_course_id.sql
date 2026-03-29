-- Add selected_course_id column to users table
-- This stores the course the user selected during registration
-- The user will be enrolled in this course when admin approves

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS selected_course_id uuid REFERENCES public.courses(id);

-- Add comment explaining the column
COMMENT ON COLUMN public.users.selected_course_id IS 'The course the user selected during registration. User will be enrolled in this course when admin approves.';
