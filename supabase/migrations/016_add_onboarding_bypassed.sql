-- Add onboarding_bypassed column to users table
-- This allows admins to bypass the onboarding process for students
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS onboarding_bypassed boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.users.onboarding_bypassed IS 'Indicates if an admin has bypassed the onboarding process for this user. Only admins can set this to true.';

-- Create index for faster queries on onboarding status
CREATE INDEX IF NOT EXISTS idx_users_onboarding_status 
  ON public.users (onboarding_completed, onboarding_bypassed, is_approved) 
  WHERE role = 'student';
