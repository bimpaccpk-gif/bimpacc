-- Create enum type for user roles
create type public.user_role as enum ('admin', 'instructor', 'student');

-- Drop the check constraint
alter table public.users drop constraint if exists users_role_check;

-- Convert the role column from text to enum
alter table public.users
  alter column role drop default;

alter table public.users
  alter column role type public.user_role
  using role::public.user_role;

alter table public.users
  alter column role set default 'student'::public.user_role;
