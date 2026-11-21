-- DRY RUN of supabase/migrations/20261121120000_harden_users_audit_enrollment_rls.sql
-- SAFE ON PRODUCTION: applies the migration, tests it as a real student, then
-- ALWAYS ends with RAISE EXCEPTION, which rolls back EVERYTHING (DDL included).
-- Nothing is committed. Result appears as the error: "DRY RUN RESULT: ...".
-- Expect: every protection "blocked" and "own-profile-edit: allowed".
-- (Generated from the migration file; regenerate if the migration changes.)

do $outer$
declare
  sid uuid;
  cid uuid;
  n   int;
  res text := '';
  col text;
begin
-- ===== migration body =====

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

DROP POLICY IF EXISTS "Authenticated users can update profiles" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can delete profiles" ON public.users;

CREATE OR REPLACE FUNCTION public.protect_user_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
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

DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.audit_log;
DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.audit_log;
DROP POLICY IF EXISTS "Service role can insert login history" ON public.login_history;
DROP POLICY IF EXISTS "Admins can insert login history" ON public.login_history;

DROP POLICY IF EXISTS "Users can insert own enrollments" ON public.enrollments;

DROP POLICY IF EXISTS "Enrolled users can insert lesson comments" ON public.lesson_comments;
CREATE POLICY "Enrolled users can insert lesson comments"
  ON public.lesson_comments FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND public.is_enrolled_in_lesson(lesson_comments.lesson_id, auth.uid())
  );

-- ===== tests, acting as a real student =====
  select id into sid from public.users where role = 'student' limit 1;
  if sid is null then raise exception 'DRY RUN RESULT: no student found'; end if;

  perform set_config('request.jwt.claims',
    json_build_object('sub', sid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', sid::text, true);
  set local role authenticated;

  begin
    update public.users set role = 'admin' where id = sid;
    get diagnostics n = row_count;
    res := res || case when n = 1 then 'role->admin: VULNERABLE; ' else 'role->admin: blocked(0 rows); ' end;
  exception when others then res := res || 'role->admin: blocked; ';
  end;

  -- Each protected column is tested ALONE (so one existing guard cannot mask another).
  foreach col in array array['is_approved','is_paused','is_locked','onboarding_bypassed'] loop
    begin
      execute format('update public.users set %1$I = not coalesce(%1$I, false) where id = $1', col) using sid;
      get diagnostics n = row_count;
      res := res || col || ': ' || case when n = 1 then 'VULNERABLE' else 'blocked(0 rows)' end || '; ';
    exception when others then res := res || col || ': blocked; ';
    end;
  end loop;

  foreach col in array array['device_fingerprint','hardware_fingerprint','email'] loop
    begin
      execute format('update public.users set %1$I = coalesce(%1$I, %2$L) || %3$L where id = $1', col, '', 'x') using sid;
      get diagnostics n = row_count;
      res := res || col || ': ' || case when n = 1 then 'VULNERABLE' else 'blocked(0 rows)' end || '; ';
    exception when others then res := res || col || ': blocked; ';
    end;
  end loop;

  begin
    update public.users set bank_name = bank_name where id = sid;
    get diagnostics n = row_count;
    res := res || case when n = 1 then 'own-profile-edit: allowed; ' else 'own-profile-edit: BROKEN(0 rows); ' end;
  exception when others then res := res || 'own-profile-edit: BROKEN (' || sqlerrm || '); ';
  end;

  begin
    insert into public.audit_log (admin_id, action) values (sid, 'dry-run-forged');
    res := res || 'forge-audit-log: VULNERABLE; ';
  exception when others then res := res || 'forge-audit-log: blocked; ';
  end;

  begin
    select c.id into cid from public.courses c
    where not exists (select 1 from public.enrollments e where e.user_id = sid and e.course_id = c.id) limit 1;
    if cid is null then
      res := res || 'self-enroll: skipped(no free course); ';
    else
      insert into public.enrollments (user_id, course_id) values (sid, cid);
      res := res || 'self-enroll: VULNERABLE; ';
    end if;
  exception when others then res := res || 'self-enroll: blocked; ';
  end;

  raise exception 'DRY RUN RESULT: %', res;
end
$outer$;
