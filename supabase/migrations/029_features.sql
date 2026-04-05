-- Migration: lesson resources, notifications, lesson comments
-- Adds attachment support, in-app notifications, and threaded lesson discussions

-- ============================================================
-- Helper function: is_enrolled_in_lesson
-- Checks if a user is enrolled in the course that owns a lesson.
-- Handles both course_id (direct) and subject_id (via subject → course) links.
-- Also grants access to admins and instructors.
-- ============================================================
create or replace function public.is_enrolled_in_lesson(lesson_uuid uuid, user_uuid uuid)
returns boolean
language sql
stable
security definer
as $$
  -- Admins and instructors always have access
  select exists (
    select 1 from public.users
    where users.id = user_uuid
    and users.role in ('admin', 'instructor')
  )
  or
  -- Direct course enrollment (lesson.course_id)
  exists (
    select 1 from public.enrollments
    where enrollments.user_id = user_uuid
    and enrollments.course_id = (
      select lessons.course_id from public.lessons where lessons.id = lesson_uuid
    )
    and (select lessons.course_id from public.lessons where lessons.id = lesson_uuid) is not null
  )
  or
  -- Subject-based enrollment (lesson.subject_id → subjects.course_id → enrollments.course_id)
  exists (
    select 1 from public.enrollments
    join public.subjects on subjects.course_id = enrollments.course_id
    where enrollments.user_id = user_uuid
    and subjects.id = (
      select lessons.subject_id from public.lessons where lessons.id = lesson_uuid
    )
    and (select lessons.subject_id from public.lessons where lessons.id = lesson_uuid) is not null
  );
$$;

-- ============================================================
-- 1. lesson_resources — file attachments for lessons
-- ============================================================
create table if not exists public.lesson_resources (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_size integer,
  file_type text,
  created_at timestamptz not null default now()
);

-- Index on lesson_id for fast lookups
create index idx_lesson_resources_lesson on public.lesson_resources(lesson_id);

-- Enable RLS
alter table public.lesson_resources enable row level security;

-- RLS: Authenticated users enrolled in the lesson's course can read
create policy "Enrolled users can read lesson resources"
  on public.lesson_resources for select
  using (public.is_enrolled_in_lesson(lesson_resources.lesson_id, auth.uid()));

-- RLS: Admins and instructors can insert
create policy "Admins and instructors can insert lesson resources"
  on public.lesson_resources for insert
  with check (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
      and users.role in ('admin', 'instructor')
    )
  );

-- RLS: Admins and instructors can update
create policy "Admins and instructors can update lesson resources"
  on public.lesson_resources for update
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
      and users.role in ('admin', 'instructor')
    )
  );

-- RLS: Admins and instructors can delete
create policy "Admins and instructors can delete lesson resources"
  on public.lesson_resources for delete
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
      and users.role in ('admin', 'instructor')
    )
  );


-- ============================================================
-- 2. notifications — in-app notifications
-- ============================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  message text,
  type text not null default 'info' check (type in ('info', 'success', 'warning', 'error')),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Indexes
create index idx_notifications_user_id on public.notifications(user_id);
create index idx_notifications_created_at on public.notifications(created_at desc);

-- Enable RLS
alter table public.notifications enable row level security;

-- RLS: Users can read their own notifications
create policy "Users can read own notifications"
  on public.notifications for select
  using (auth.uid() = notifications.user_id);

-- RLS: Admins can read all notifications
create policy "Admins can read all notifications"
  on public.notifications for select
  using (public.is_admin());

-- RLS: Admins and instructors can insert notifications (e.g. system broadcasts)
create policy "Admins and instructors can insert notifications"
  on public.notifications for insert
  with check (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
      and users.role in ('admin', 'instructor')
    )
  );

-- RLS: Users can update their own notifications (mark as read)
create policy "Users can update own notifications"
  on public.notifications for update
  using (auth.uid() = notifications.user_id);

-- RLS: Admins can delete any notification
create policy "Admins can delete any notification"
  on public.notifications for delete
  using (public.is_admin());


-- ============================================================
-- 3. lesson_comments — threaded discussions on lessons
-- ============================================================
create table if not exists public.lesson_comments (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  parent_id uuid references public.lesson_comments(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index idx_lesson_comments_lesson on public.lesson_comments(lesson_id);
create index idx_lesson_comments_parent on public.lesson_comments(parent_id);
create index idx_lesson_comments_user on public.lesson_comments(user_id);

-- Enable RLS
alter table public.lesson_comments enable row level security;

-- Updated_at trigger
drop trigger if exists set_lesson_comments_updated_at on public.lesson_comments;
create trigger set_lesson_comments_updated_at
  before update on public.lesson_comments
  for each row
  execute function public.handle_updated_at();

-- RLS: Authenticated users enrolled in the lesson's course can read comments
create policy "Enrolled users can read lesson comments"
  on public.lesson_comments for select
  using (public.is_enrolled_in_lesson(lesson_comments.lesson_id, auth.uid()));

-- RLS: Authenticated users enrolled in the lesson's course can insert comments
create policy "Enrolled users can insert lesson comments"
  on public.lesson_comments for insert
  with check (
    auth.uid() is not null
    and public.is_enrolled_in_lesson(lesson_comments.lesson_id, auth.uid())
  );

-- RLS: Users can update their own comments
create policy "Users can update own comments"
  on public.lesson_comments for update
  using (auth.uid() = lesson_comments.user_id);

-- RLS: Users can delete their own comments
create policy "Users can delete own comments"
  on public.lesson_comments for delete
  using (auth.uid() = lesson_comments.user_id);

-- RLS: Admins can delete any comment
create policy "Admins can delete any comment"
  on public.lesson_comments for delete
  using (public.is_admin());
