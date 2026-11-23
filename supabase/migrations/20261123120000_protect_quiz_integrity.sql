-- Quiz integrity.
--
--  1. Students could read quiz_questions.correct_option straight from the public API: the
--     "Enrolled users can read quiz questions" policy filters ROWS, not columns. Revoke
--     SELECT on that one column for anon/authenticated. The app reads it only with the
--     service role (scoring on the server), which is unaffected.
--  2. Students could INSERT their own quiz_attempts row (with score/passed of their choice)
--     and quiz_answers. A passing attempt feeds certificate issuance, so this allowed forging
--     certificates. Attempts and answers are now written only by server code (service role),
--     after scoring. Reads of one's own attempts are unchanged.
--
-- Idempotent. The two columns lists below are every column of quiz_questions except
-- correct_option (see migration 030).

-- 1. Hide correct answers from client roles
revoke select on public.quiz_questions from anon, authenticated;

grant select (
  id,
  quiz_id,
  question_text,
  option_a,
  option_b,
  option_c,
  option_d,
  points,
  order_index,
  created_at
) on public.quiz_questions to authenticated;

-- 2. Attempts and answers are server-written only
drop policy if exists "Users can insert own quiz attempts" on public.quiz_attempts;
drop policy if exists "Users can insert own quiz answers" on public.quiz_answers;
