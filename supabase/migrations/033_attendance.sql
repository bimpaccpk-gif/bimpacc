-- Migration 033: Attendance records
-- Tracks student attendance per course session with CSV import and manual marking support

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  session_date date not null,
  status text not null check (status in ('present', 'absent', 'late', 'excused')),
  watch_time_minutes numeric(6, 2),
  session_duration_minutes numeric(6, 2),
  source text not null check (source in ('csv', 'manual')),
  marked_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(enrollment_id, session_date)
);

create index idx_attendance_enrollment on public.attendance_records(enrollment_id);
create index idx_attendance_session_date on public.attendance_records(session_date);

alter table public.attendance_records enable row level security;

-- Trigger for updated_at
drop trigger if exists set_attendance_records_updated_at on public.attendance_records;
create trigger set_attendance_records_updated_at
  before update on public.attendance_records
  for each row
  execute function public.handle_updated_at();

-- ============================================================
-- RLS Policies
-- ============================================================

drop policy if exists "Authenticated users can read attendance" on public.attendance_records;
create policy "Authenticated users can read attendance"
  on public.attendance_records for select
  using (
    -- Admins and instructors can read all attendance records
    exists (
      select 1 from public.users
      where users.id = auth.uid()
      and users.role in ('admin', 'instructor')
    )
    -- Students can read their own attendance (via enrollment)
    or exists (
      select 1 from public.enrollments
      where enrollments.id = attendance_records.enrollment_id
      and enrollments.user_id = auth.uid()
    )
  );

drop policy if exists "Admins can manage all attendance records" on public.attendance_records;
create policy "Admins can manage all attendance records"
  on public.attendance_records for all
  using (public.is_admin());

drop policy if exists "Instructors can manage attendance for their courses" on public.attendance_records;
create policy "Instructors can manage attendance for their courses"
  on public.attendance_records for all
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
      and users.role = 'instructor'
    )
    and exists (
      select 1 from public.enrollments e
      join public.courses c on c.id = e.course_id
      where e.id = attendance_records.enrollment_id
      and c.instructor_id = (
        select users.id from public.users where users.id = auth.uid()
      )
    )
  );

comment on table public.attendance_records is 'Student attendance per course session, via CSV import or manual marking';
