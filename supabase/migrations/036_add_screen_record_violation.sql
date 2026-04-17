-- Add is_locked to users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_locked boolean DEFAULT false;

-- Add a new check constraint to login_history allowing 'failed_screen_record'
ALTER TABLE public.login_history DROP CONSTRAINT IF EXISTS login_history_status_check;
ALTER TABLE public.login_history ADD CONSTRAINT login_history_status_check CHECK (status IN ('success', 'failed_credentials', 'failed_device', 'failed_screen_record'));
