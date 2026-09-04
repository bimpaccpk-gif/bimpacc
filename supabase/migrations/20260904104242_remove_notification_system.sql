-- Retire the in-app notification system.
-- Deploy the application removal before applying this migration so older
-- dashboard code no longer fetches from public.notifications.
-- The production inventory on 2026-09-04 found this table empty, with no
-- referencing functions or Realtime publications. Preserve historical migrations.

do $migration$
begin
  perform pg_catalog.set_config('lock_timeout', '5s', true);

  if pg_catalog.to_regclass('public.notifications') is not null then
    -- Keep the emptiness check and drop atomic with respect to new writes.
    lock table public.notifications in access exclusive mode;

    if exists (select 1 from public.notifications) then
      raise exception 'Notification removal stopped: public.notifications contains rows.'
        using hint = 'Export and explicitly resolve retained notifications before retrying this migration.';
    end if;

    -- Intentionally omit CASCADE: unexpected external dependencies must stop
    -- removal. The table's own policies, indexes, and constraints are removed.
    drop table public.notifications;
  end if;
end;
$migration$;
