-- Create users table
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null default '',
  role text not null default 'student' check (role in ('admin', 'instructor', 'student')),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.users enable row level security;

-- Policy: users can read their own profile
create policy "Users can read own profile"
  on public.users for select
  using (auth.uid() = id);

-- Policy: users can update their own profile
create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

-- Policy: allow insert on signup
create policy "Users can insert on signup"
  on public.users for insert
  with check (auth.uid() = id);

-- Function to auto-update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to auto-update updated_at
create trigger set_updated_at
  before update on public.users
  for each row
  execute function public.handle_updated_at();

-- Create enrollments table
create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  course_id uuid not null,
  enrolled_at timestamptz not null default now(),
  progress numeric not null default 0
);

alter table public.enrollments enable row level security;

create policy "Users can read own enrollments"
  on public.enrollments for select
  using (auth.uid() = user_id);

create policy "Users can insert own enrollments"
  on public.enrollments for insert
  with check (auth.uid() = user_id);
