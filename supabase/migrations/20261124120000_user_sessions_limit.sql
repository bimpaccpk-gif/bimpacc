-- Server-side session tracking for the device / session limit.
--
-- Each successful sign-in registers its Supabase session id (the JWT `session_id` claim).
-- When a student has more active sessions than allowed, the oldest are revoked:
--   1. user_sessions.revoked_at is set; the proxy checks it on every request and signs that
--      device out immediately;
--   2. the matching auth.sessions row is deleted, so its refresh token stops working too.
--
-- Writes happen only through the service role (server code). Users may read their own rows.

create table if not exists public.user_sessions (
  session_id     uuid primary key,
  user_id        uuid not null references auth.users (id) on delete cascade,
  created_at     timestamptz not null default now(),
  user_agent     text,
  ip_address     text,
  revoked_at     timestamptz,
  revoked_reason text check (revoked_reason in ('limit', 'admin', 'signed_out'))
);

create index if not exists user_sessions_user_active_idx
  on public.user_sessions (user_id, created_at desc)
  where revoked_at is null;

alter table public.user_sessions enable row level security;

revoke all on public.user_sessions from anon, authenticated;
grant select on public.user_sessions to authenticated;

drop policy if exists "Users can read own sessions" on public.user_sessions;
create policy "Users can read own sessions"
  on public.user_sessions
  for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Ends Supabase sessions (refresh tokens) by id. Service role only.
create or replace function public.revoke_auth_sessions(p_session_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  delete from auth.sessions where id = any (p_session_ids);
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.revoke_auth_sessions(uuid[]) from public, anon, authenticated;
grant execute on function public.revoke_auth_sessions(uuid[]) to service_role;
