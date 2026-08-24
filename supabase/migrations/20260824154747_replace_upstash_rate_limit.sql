create table public.auth_rate_limits (
  key_hash text primary key
    check (key_hash ~ '^[0-9a-f]{64}$'),
  attempt_count integer not null default 1
    check (attempt_count >= 1),
  window_ends_at timestamptz not null,
  updated_at timestamptz not null default now()
);

comment on table public.auth_rate_limits is
  'Distributed authentication throttling state. Identifiers are SHA-256 hashed by trusted server code before storage.';

create index auth_rate_limits_window_ends_at_idx
  on public.auth_rate_limits (window_ends_at);

alter table public.auth_rate_limits enable row level security;

revoke all on table public.auth_rate_limits from anon, authenticated;
grant select, insert, update, delete on table public.auth_rate_limits to service_role;

create function public.consume_auth_rate_limit(
  p_key_hash text,
  p_max_attempts integer,
  p_window_ms integer
)
returns table (
  allowed boolean,
  remaining integer,
  retry_after_ms integer
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_attempt_count integer;
  v_window_ends_at timestamptz;
begin
  if p_key_hash is null or p_key_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid rate-limit key';
  end if;

  if p_max_attempts is null or p_max_attempts < 1 then
    raise exception 'Maximum attempts must be at least 1';
  end if;

  if p_window_ms is null or p_window_ms < 1000 then
    raise exception 'Rate-limit window must be at least 1000 milliseconds';
  end if;

  insert into public.auth_rate_limits as current_limit (
    key_hash,
    attempt_count,
    window_ends_at,
    updated_at
  )
  values (
    p_key_hash,
    1,
    v_now + make_interval(secs => p_window_ms::double precision / 1000.0),
    v_now
  )
  on conflict (key_hash) do update
  set
    attempt_count = case
      when current_limit.window_ends_at <= v_now then 1
      else least(current_limit.attempt_count + 1, p_max_attempts + 1)
    end,
    window_ends_at = case
      when current_limit.window_ends_at <= v_now then excluded.window_ends_at
      else current_limit.window_ends_at
    end,
    updated_at = v_now
  returning current_limit.attempt_count, current_limit.window_ends_at
    into v_attempt_count, v_window_ends_at;

  return query
  select
    v_attempt_count <= p_max_attempts,
    greatest(0, p_max_attempts - v_attempt_count),
    case
      when v_attempt_count <= p_max_attempts then null
      else greatest(
        0,
        ceil(extract(epoch from (v_window_ends_at - v_now)) * 1000)::integer
      )
    end;
end;
$$;

comment on function public.consume_auth_rate_limit(text, integer, integer) is
  'Atomically consumes one authentication attempt. Callable only by trusted service-role server code.';

revoke all on function public.consume_auth_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_auth_rate_limit(text, integer, integer)
  to service_role;
