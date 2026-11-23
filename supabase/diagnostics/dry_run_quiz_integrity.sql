-- DRY RUN of supabase/migrations/20261123120000_protect_quiz_integrity.sql
-- SAFE ON PRODUCTION: applies the migration, tests it as a real student, then ALWAYS ends with
-- RAISE EXCEPTION, which rolls back EVERYTHING (DDL included). Nothing is committed.
-- The result appears as the error: "DRY RUN RESULT: ...".
--
-- Run it BEFORE the migration to see the current exposure too: delete the "migration body" section
-- below and run again; you should see "read-correct-answer: VULNERABLE" and
-- "forge-attempt: VULNERABLE" if the live database matches the migration files.
--
-- Expect AFTER the migration: read-correct-answer: blocked, read-question-text: allowed,
-- forge-attempt: blocked (or skipped when there is no quiz yet).

do $outer$
declare
  sid uuid;
  n   int;
  res text := '';
begin
-- ===== migration body =====
  revoke select on public.quiz_questions from anon, authenticated;

  grant select (
    id, quiz_id, question_text, option_a, option_b, option_c, option_d,
    points, order_index, created_at
  ) on public.quiz_questions to authenticated;

  drop policy if exists "Users can insert own quiz attempts" on public.quiz_attempts;
  drop policy if exists "Users can insert own quiz answers" on public.quiz_answers;
-- ===== end migration body =====

  select id into sid from public.users where role = 'student' limit 1;
  if sid is null then raise exception 'DRY RUN RESULT: no student found'; end if;

  perform set_config('request.jwt.claims',
    json_build_object('sub', sid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', sid::text, true);
  set local role authenticated;

  begin
    perform correct_option from public.quiz_questions limit 1;
    res := res || 'read-correct-answer: VULNERABLE; ';
  exception when others then res := res || 'read-correct-answer: blocked; ';
  end;

  begin
    perform question_text, option_a from public.quiz_questions limit 1;
    res := res || 'read-question-text: allowed; ';
  exception when others then res := res || 'read-question-text: BROKEN (' || sqlerrm || '); ';
  end;

  begin
    insert into public.quiz_attempts (quiz_id, user_id, score, passed)
    select id, sid, 100, true from public.quizzes limit 1;
    get diagnostics n = row_count;
    res := res || case when n = 1 then 'forge-attempt: VULNERABLE; ' else 'forge-attempt: skipped(no quiz); ' end;
  exception when others then res := res || 'forge-attempt: blocked; ';
  end;

  raise exception 'DRY RUN RESULT: %', res;
end
$outer$;
