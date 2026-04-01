-- Add enrolled_by to track which admin enrolled a student
ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS enrolled_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- Create audit_log table for tracking admin actions
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  target_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
CREATE POLICY "Admins can read audit logs"
  ON public.audit_log FOR SELECT
  USING (public.is_admin());

-- Only service role can insert (server-side actions use admin client)
CREATE POLICY "Service role can insert audit logs"
  ON public.audit_log FOR INSERT
  WITH CHECK (true);

-- Index for querying by target user
CREATE INDEX IF NOT EXISTS idx_audit_log_target_user
  ON public.audit_log (target_user_id, created_at DESC);

-- Index for querying by admin
CREATE INDEX IF NOT EXISTS idx_audit_log_admin
  ON public.audit_log (admin_id, created_at DESC);
