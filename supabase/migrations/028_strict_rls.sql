-- Migration: Strict RLS for remaining tables
-- Tightens access for audit_log, login_history, and instructor read access

-- ═══════════════════════════════════════════════════════════
-- AUDIT_LOG TABLE
-- ═══════════════════════════════════════════════════════════

-- Enable RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

drop policy if exists "Admins can read all audit logs" on public.audit_log;
CREATE POLICY "Admins can read all audit logs"
  ON public.audit_log FOR SELECT
  USING (public.is_admin());

drop policy if exists "Admins can insert audit logs" on public.audit_log;
CREATE POLICY "Admins can insert audit logs"
  ON public.audit_log FOR INSERT
  WITH CHECK (public.is_instructor());

-- ═══════════════════════════════════════════════════════════
-- LOGIN_HISTORY TABLE
-- ═══════════════════════════════════════════════════════════

-- Enable RLS
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

drop policy if exists "Users can read own login history" on public.login_history;
CREATE POLICY "Users can read own login history"
  ON public.login_history FOR SELECT
  USING (auth.uid() = user_id);

drop policy if exists "Admins can read all login history" on public.login_history;
CREATE POLICY "Admins can read all login history"
  ON public.login_history FOR SELECT
  USING (public.is_admin());

-- System (service role) can insert login history — no user-level insert
-- Admin can also insert (for manual tracking)
drop policy if exists "Admins can insert login history" on public.login_history;
CREATE POLICY "Admins can insert login history"
  ON public.login_history FOR INSERT
  WITH CHECK (public.is_instructor());

-- ═══════════════════════════════════════════════════════════
-- INSTRUCTOR READ ACCESS
-- ═══════════════════════════════════════════════════════════

drop policy if exists "Instructors can read enrollments" on public.enrollments;
CREATE POLICY "Instructors can read enrollments"
  ON public.enrollments FOR SELECT
  USING (public.is_instructor());

drop policy if exists "Instructors can read lesson progress" on public.lesson_progress;
CREATE POLICY "Instructors can read lesson progress"
  ON public.lesson_progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.enrollments
      WHERE enrollments.id = lesson_progress.enrollment_id
    )
    AND public.is_instructor()
  );
