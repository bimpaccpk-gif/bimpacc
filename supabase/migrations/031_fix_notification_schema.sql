-- Migration 031: Fix notification schema
-- Ensure is_read column exists (handle both legacy 'read' and new 'is_read')
-- Add 'read_at' column for tracking when notifications were read

-- Safely rename 'read' to 'is_read' only if 'read' exists
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'notifications'
    and table_schema = 'public'
    and column_name = 'read'
  ) then
    alter table public.notifications rename column "read" to "is_read";
  end if;
end $$;

-- Add read_at if missing
alter table public.notifications
  add column if not exists "read_at" timestamptz;
