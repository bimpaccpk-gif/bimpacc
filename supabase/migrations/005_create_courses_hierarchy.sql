-- Create courses table
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text default '',
  thumbnail_url text,
  instructor_id uuid references public.users(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  price numeric default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create subjects table
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text default '',
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create lessons table
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  title text not null,
  description text default '',
  video_url text,
  content text,
  order_index integer not null default 0,
  duration_minutes integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.courses enable row level security;
alter table public.subjects enable row level security;
alter table public.lessons enable row level security;

-- Courses policies
create policy "Authenticated users can read courses"
  on public.courses for select
  using (auth.uid() is not null);

create policy "Authenticated users can insert courses"
  on public.courses for insert
  with check (auth.uid() is not null);

create policy "Authenticated users can update courses"
  on public.courses for update
  using (auth.uid() is not null);

create policy "Authenticated users can delete courses"
  on public.courses for delete
  using (auth.uid() is not null);

-- Subjects policies
create policy "Authenticated users can read subjects"
  on public.subjects for select
  using (auth.uid() is not null);

create policy "Authenticated users can insert subjects"
  on public.subjects for insert
  with check (auth.uid() is not null);

create policy "Authenticated users can update subjects"
  on public.subjects for update
  using (auth.uid() is not null);

create policy "Authenticated users can delete subjects"
  on public.subjects for delete
  using (auth.uid() is not null);

-- Lessons policies
create policy "Authenticated users can read lessons"
  on public.lessons for select
  using (auth.uid() is not null);

create policy "Authenticated users can insert lessons"
  on public.lessons for insert
  with check (auth.uid() is not null);

create policy "Authenticated users can update lessons"
  on public.lessons for update
  using (auth.uid() is not null);

create policy "Authenticated users can delete lessons"
  on public.lessons for delete
  using (auth.uid() is not null);

-- Updated at triggers
create trigger set_courses_updated_at
  before update on public.courses
  for each row
  execute function public.handle_updated_at();

create trigger set_subjects_updated_at
  before update on public.subjects
  for each row
  execute function public.handle_updated_at();

create trigger set_lessons_updated_at
  before update on public.lessons
  for each row
  execute function public.handle_updated_at();
