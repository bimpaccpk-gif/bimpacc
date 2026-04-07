-- Migration 034: Add semesters table and semester_id to subjects
-- Restructures hierarchy:
--   Type 1: Course → Semester → Subject → Lesson
--   Type 2: Course → Subject → Lesson
--   Type 3: Course → Lesson

-- ── Semesters Table ──────────────────────────────────────────

create table if not exists public.semesters (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text default '',
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.semesters enable row level security;

-- Semesters RLS policies
create policy "Authenticated users can read semesters"
  on public.semesters for select
  using (auth.uid() is not null);

create policy "Authenticated users can insert semesters"
  on public.semesters for insert
  with check (auth.uid() is not null);

create policy "Authenticated users can update semesters"
  on public.semesters for update
  using (auth.uid() is not null);

create policy "Authenticated users can delete semesters"
  on public.semesters for delete
  using (auth.uid() is not null);

-- Semesters updated_at trigger
create trigger set_semesters_updated_at
  before update on public.semesters
  for each row
  execute function public.handle_updated_at();

-- ── Add semester_id to subjects ──────────────────────────────

alter table public.subjects
  add column if not exists semester_id uuid references public.semesters(id) on delete cascade;

-- Update constraint: subject must have EITHER subject_id on semester_id (not both)
-- For hierarchy type 1: semester_id is set, course_id can be NULL
-- For hierarchy type 2: course_id is set, semester_id is NULL

-- ── Indexes ──────────────────────────────────────────────────

create index if not exists idx_semesters_course_id on public.semesters(course_id);
create index if not exists idx_subjects_semester_id on public.subjects(semester_id);

-- ── Update hierarchy type meanings ───────────────────────────

comment on column public.courses.hierarchy_type is
  '1=Course→Semester→Subject→Lesson, 2=Course→Subject→Lesson, 3=Course→Lesson';

comment on column public.semesters.course_id is
  'Semesters belong to courses (used in hierarchy type 1)';

comment on column public.subjects.semester_id is
  'If set, this subject belongs to a semester (hierarchy type 1). If NULL, belongs directly to course via course_id (hierarchy type 2).';
