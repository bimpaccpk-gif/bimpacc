-- Migration 032: Certificates table
-- Stores certificates for students who complete courses

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  certificate_number text not null unique,
  issued_at timestamptz not null default now()
);

create index idx_certificates_user on public.certificates(user_id);
create index idx_certificates_course on public.certificates(course_id);

alter table public.certificates enable row level security;

drop policy if exists "Users can read own certificates" on public.certificates;
create policy "Users can read own certificates"
  on public.certificates for select
  using (auth.uid() = certificates.user_id);

drop policy if exists "Admins can read all certificates" on public.certificates;
create policy "Admins can read all certificates"
  on public.certificates for select
  using (public.is_admin());

drop policy if exists "Admins can manage certificates" on public.certificates;
create policy "Admins can manage certificates"
  on public.certificates for all
  using (public.is_admin());
