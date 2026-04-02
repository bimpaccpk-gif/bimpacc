-- Login history table to track all login attempts
CREATE TABLE IF NOT EXISTS public.login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed_credentials', 'failed_device')),
  device_fingerprint TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON public.login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_created_at ON public.login_history(created_at DESC);

-- RLS: admins can read all, users can read their own
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all login history"
  ON public.login_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can read own login history"
  ON public.login_history FOR SELECT
  USING (user_id = auth.uid());

-- Service role can insert (server actions use admin client)
CREATE POLICY "Service role can insert login history"
  ON public.login_history FOR INSERT
  WITH CHECK (true);
