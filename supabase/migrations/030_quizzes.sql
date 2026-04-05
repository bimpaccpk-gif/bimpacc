-- Migration 030: Quizzes and Quiz Attempts
-- Adds MCQ quizzes per lesson with quiz_answers tracking

-- ============================================================
-- 1. quizzes — one quiz per lesson
-- ============================================================
create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  title text not null default 'Lesson Quiz',
  description text,
  passing_score integer not null default 70 check (passing_score >= 0 and passing_score <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_quizzes_lesson on public.quizzes(lesson_id);

alter table public.quizzes enable row level security;

drop policy if exists "Admins and instructors can manage quizzes" on public.quizzes;
create policy "Admins and instructors can manage quizzes"
  on public.quizzes for all
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
      and users.role in ('admin', 'instructor')
    )
  );

drop policy if exists "Enrolled users can read quizzes" on public.quizzes;
create policy "Enrolled users can read quizzes"
  on public.quizzes for select
  using (public.is_enrolled_in_lesson(quizzes.lesson_id, auth.uid()));

-- Trigger for updated_at
drop trigger if exists set_quizzes_updated_at on public.quizzes;
create trigger set_quizzes_updated_at
  before update on public.quizzes
  for each row
  execute function public.handle_updated_at();

-- ============================================================
-- 2. quiz_questions — MCQ questions within a quiz
-- ============================================================
create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  question_text text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_option text not null check (correct_option in ('a', 'b', 'c', 'd')),
  points integer not null default 1,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_quiz_questions_quiz on public.quiz_questions(quiz_id);

alter table public.quiz_questions enable row level security;

drop policy if exists "Admins and instructors can manage quiz questions" on public.quiz_questions;
create policy "Admins and instructors can manage quiz questions"
  on public.quiz_questions for all
  using (
    exists (
      select 1 from public.quizzes
      join public.users on users.id = auth.uid()
      where quizzes.id = quiz_questions.quiz_id
      and users.role in ('admin', 'instructor')
    )
  );

drop policy if exists "Enrolled users can read quiz questions" on public.quiz_questions;
create policy "Enrolled users can read quiz questions"
  on public.quiz_questions for select
  using (
    exists (
      select 1 from public.quizzes
      where quizzes.id = quiz_questions.quiz_id
      and public.is_enrolled_in_lesson(quizzes.lesson_id, auth.uid())
    )
  );

-- ============================================================
-- 3. quiz_attempts — user attempts at a quiz
-- ============================================================
create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  score integer not null,
  passed boolean not null,
  created_at timestamptz not null default now()
);

create index idx_quiz_attempts_quiz on public.quiz_attempts(quiz_id);
create index idx_quiz_attempts_user on public.quiz_attempts(user_id);

alter table public.quiz_attempts enable row level security;

drop policy if exists "Users can read own quiz attempts" on public.quiz_attempts;
create policy "Users can read own quiz attempts"
  on public.quiz_attempts for select
  using (auth.uid() = quiz_attempts.user_id);

drop policy if exists "Users can insert own quiz attempts" on public.quiz_attempts;
create policy "Users can insert own quiz attempts"
  on public.quiz_attempts for insert
  with check (auth.uid() = quiz_attempts.user_id);

drop policy if exists "Admins and instructors can read all quiz attempts" on public.quiz_attempts;
create policy "Admins and instructors can read all quiz attempts"
  on public.quiz_attempts for select
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
      and users.role in ('admin', 'instructor')
    )
  );

-- ============================================================
-- 4. quiz_answers — individual answers per attempt
-- ============================================================
create table if not exists public.quiz_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.quiz_attempts(id) on delete cascade,
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  selected_option text not null check (selected_option in ('a', 'b', 'c', 'd')),
  created_at timestamptz not null default now()
);

create index idx_quiz_answers_attempt on public.quiz_answers(attempt_id);

alter table public.quiz_answers enable row level security;

drop policy if exists "Users can read own quiz answers" on public.quiz_answers;
create policy "Users can read own quiz answers"
  on public.quiz_answers for select
  using (
    exists (
      select 1 from public.quiz_attempts
      where quiz_attempts.id = quiz_answers.attempt_id
      and quiz_attempts.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert own quiz answers" on public.quiz_answers;
create policy "Users can insert own quiz answers"
  on public.quiz_answers for insert
  with check (
    exists (
      select 1 from public.quiz_attempts
      where quiz_attempts.id = quiz_answers.attempt_id
      and quiz_attempts.user_id = auth.uid()
    )
  );

drop policy if exists "Admins and instructors can read all quiz answers" on public.quiz_answers;
create policy "Admins and instructors can read all quiz answers"
  on public.quiz_answers for select
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
      and users.role in ('admin', 'instructor')
    )
  );
