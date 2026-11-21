-- Harden RLS gaps found in the Phase 1 security audit.
--
-- Fixes (all idempotent):
--  1. users: drop the legacy "Authenticated users can update/delete profiles"
--     policies (001/003/004). 018 tried to drop them under different names, so
--     they could still let ANY logged-in user update or delete ANY profile.
--  2. users: stop owners from changing privileged columns (role, is_approved,
--     is_paused, is_locked, onboarding_bypassed, fingerprints, email, id) via a
--     trigger. The "Users can update own profile" policy had no column limit,
--     so a student could promote themselves to admin with the public anon key.
--  3. users: constrain self-INSERT so a new auth user cannot create their own
--     row as admin / approved.
--  4. audit_log + login_history: remove every INSERT policy. All writers use the
--     service-role client (which bypasses RLS). "WITH CHECK (true)" let anyone
--     forge rows, and is_instructor() let instructors forge audit entries.
--  5. enrollments: remove self-enrollment. Enrollment is admin-controlled and
--     every application write goes through the service-role client.
--  6. is_admin()/is_instructor(): pin search_path on SECURITY DEFINER functions.
--  7. lesson_comments: inserted comments must belong to the caller. The old
--     check never compared user_id, so an enrolled user could post as anyone.
--
-- NOT changed here (needs staging verification first): the legacy broad SELECT
-- policy "Authenticated users can read profiles" on users, which lets any
-- logged-in user read other users' profile data. See supabase/diagnostics.

-- ─── 6. Pin search_path on role helpers ─────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_instructor()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('admin', 'instructor')
  );
$$;

-- ─── 1. Legacy permissive users policies ────────────────────
DROP POLICY IF EXISTS "Authenticated users can update profiles" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can delete profiles" ON public.users;

-- ─── 2. Protect privileged columns from non-admin owners ────
CREATE OR REPLACE FUNCTION public.protect_user_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- Columns an ordinary user may change on their own row.
  allowed text[] := ARRAY[
    'full_name', 'avatar_url', 'avatar_file_path',
    'father_name', 'cnic_number', 'cnic_file_path', 'dob',
    'education_level', 'degree_title', 'degree_file_path', 'profession',
    'whatsapp_number', 'postal_address',
    'fee_transaction_id', 'fee_submission_date', 'fee_receipt_file_path',
    'bank_name', 'declaration_accepted', 'onboarding_completed',
    'selected_course_id', 'updated_at'
  ];
BEGIN
  -- Service role / migrations / SQL editor have no auth.uid(); admins may edit
  -- anything (super-admin rows are protected by the restrictive policies).
  IF auth.uid() IS NULL OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF (to_jsonb(NEW) - allowed) IS DISTINCT FROM (to_jsonb(OLD) - allowed) THEN
    RAISE EXCEPTION 'Not allowed to modify protected profile fields'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_user_privileged_columns ON public.users;
CREATE TRIGGER protect_user_privileged_columns
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_user_privileged_columns();

-- ─── 3. Constrain self-insert ───────────────────────────────
DROP POLICY IF EXISTS "Users can insert on signup" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

CREATE POLICY "Users can insert own student profile"
  ON public.users FOR INSERT
  WITH CHECK (
    auth.uid() = id
    AND role = 'student'
    AND COALESCE(is_approved, false) = false
    AND COALESCE(is_paused, false) = false
    AND COALESCE(is_locked, false) = false
    AND COALESCE(onboarding_bypassed, false) = false
  );

-- ─── 4. audit_log + login_history: service-role writes only ─
DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.audit_log;
DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.audit_log;
DROP POLICY IF EXISTS "Service role can insert login history" ON public.login_history;
DROP POLICY IF EXISTS "Admins can insert login history" ON public.login_history;

-- ─── 5. enrollments: no self-enrollment ─────────────────────
DROP POLICY IF EXISTS "Users can insert own enrollments" ON public.enrollments;

-- ─── 7. lesson_comments: no posting as someone else ─────────
DROP POLICY IF EXISTS "Enrolled users can insert lesson comments" ON public.lesson_comments;
CREATE POLICY "Enrolled users can insert lesson comments"
  ON public.lesson_comments FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND public.is_enrolled_in_lesson(lesson_comments.lesson_id, auth.uid())
  );
