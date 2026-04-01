-- Migration: Per-student content access control
-- Allows admins to pause/resume courses, subjects, and lessons for specific students

CREATE TABLE IF NOT EXISTS public.student_content_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('course', 'subject', 'lesson')),
  content_id UUID NOT NULL,
  is_paused BOOLEAN NOT NULL DEFAULT true,
  paused_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reason TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, content_type, content_id)
);

-- Indexes for fast lookups
CREATE INDEX idx_sca_user_content ON public.student_content_access(user_id, content_type, content_id);
CREATE INDEX idx_sca_content ON public.student_content_access(content_type, content_id);
CREATE INDEX idx_sca_user ON public.student_content_access(user_id);

-- Enable RLS
ALTER TABLE public.student_content_access ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage student content access"
  ON public.student_content_access FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Students can read their own content access overrides
CREATE POLICY "Students can read own content access"
  ON public.student_content_access FOR SELECT
  USING (auth.uid() = user_id);

-- Updated at trigger
CREATE TRIGGER set_student_content_access_updated_at
  BEFORE UPDATE ON public.student_content_access
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
