-- Migration 037: Allow semester-level student content access overrides
-- Existing app logic supports semester overrides, so update DB constraint accordingly.

DO $$
DECLARE
  v_constraint_name text;
BEGIN
  SELECT con.conname
  INTO v_constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'student_content_access'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) ILIKE '%content_type%';

  IF v_constraint_name IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE public.student_content_access DROP CONSTRAINT %I',
      v_constraint_name
    );
  END IF;
END $$;

ALTER TABLE public.student_content_access
  ADD CONSTRAINT student_content_access_content_type_check
  CHECK (content_type IN ('course', 'semester', 'subject', 'lesson'));
