-- DRY RUN of supabase/migrations/20261124120000_user_sessions_limit.sql
-- SAFE ON PRODUCTION: applies the migration, tests it, then ALWAYS ends with RAISE EXCEPTION,
-- which rolls back EVERYTHING (DDL and test rows included). Nothing is committed and no real
-- session is touched (the test uses a fake session it creates itself).
-- The result appears as the error: "DRY RUN RESULT: ...".
--
-- Expect: own-row-read: allowed; other-row-read: hidden; client-insert: blocked;
--         client-revoke-rpc: blocked; service-revoke: deleted 1 auth session

do $outer$
declare
  sid   uuid;
  other uuid;
  fake  uuid := gen_random_uuid();
  fake2 uuid := gen_random_uuid();
  n     int;
  res   text := '';
begin
-- ===== migration body =====
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
    on public.user_sessions (user_id, created_at desc) where revoked_at is null;
  alter table public.user_sessions enable row level security;
  revoke all on public.user_sessions from anon, authenticated;
  grant select on public.user_sessions to authenticated;
  drop policy if exists "Users can read own sessions" on public.user_sessions;
  create policy "Users can read own sessions" on public.user_sessions
    for select to authenticated using (user_id = (select auth.uid()));
  create or replace function public.revoke_auth_sessions(p_session_ids uuid[])
  returns integer language plpgsql security definer set search_path = '' as $f$
  declare n integer;
  begin
    delete from auth.sessions where id = any (p_session_ids);
    get diagnostics n = row_count;
    return n;
  end;
  $f$;
  revoke all on function public.revoke_auth_sessions(uuid[]) from public, anon, authenticated;
  grant execute on function public.revoke_auth_sessions(uuid[]) to service_role;
-- ===== end migration body =====

  select id into sid   from public.users where role = 'student' limit 1;
  select id into other from public.users where role = 'student' and id <> sid limit 1;
  if sid is null or other is null then raise exception 'DRY RUN RESULT: need two students'; end if;

  -- test data (as the owner role, like the service role would)
  insert into public.user_sessions (session_id, user_id) values (fake, sid), (fake2, other);
  insert into auth.sessions (id, user_id, created_at, updated_at) values (fake, sid, now(), now());

  -- act as the student
  perform set_config('request.jwt.claims', json_build_object('sub', sid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', sid::text, true);
  set local role authenticated;

  select count(*) into n from public.user_sessions where session_id = fake;
  res := res || case when n = 1 then 'own-row-read: allowed; ' else 'own-row-read: BROKEN; ' end;

  select count(*) into n from public.user_sessions where session_id = fake2;
  res := res || case when n = 0 then 'other-row-read: hidden; ' else 'other-row-read: VISIBLE; ' end;

  begin
    insert into public.user_sessions (session_id, user_id) values (gen_random_uuid(), sid);
    res := res || 'client-insert: ALLOWED; ';
  exception when others then res := res || 'client-insert: blocked; ';
  end;

  begin
    perform public.revoke_auth_sessions(array[fake]);
    res := res || 'client-revoke-rpc: ALLOWED; ';
  exception when others then res := res || 'client-revoke-rpc: blocked; ';
  end;

  reset role;

  -- as the server would: revoke the fake auth session
  begin
    select public.revoke_auth_sessions(array[fake]) into n;
    res := res || 'service-revoke: deleted ' || n || ' auth session; ';
  exception when others then res := res || 'service-revoke: FAILED (' || sqlerrm || '); ';
  end;

  raise exception 'DRY RUN RESULT: %', res;
end
$outer$;
