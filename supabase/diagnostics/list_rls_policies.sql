-- Read-only. Run in the Supabase SQL editor (staging first) to see the policies
-- that are ACTUALLY live; the migration files may not match the dashboard.

-- 1. Every policy, with command and expressions
select tablename, policyname, permissive, roles, cmd, qual as using_expr, with_check
from pg_policies
where schemaname in ('public', 'storage')
order by tablename, cmd, policyname;

-- 2. Tables in public WITHOUT row level security (should be empty)
select c.relname as table_without_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;

-- 3. Write policies that look unconditionally open (should be empty after the hardening migration)
select tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  and permissive = 'PERMISSIVE'
  and (
    with_check ~* '^\(?true\)?$'
    or qual ~* '^\(?true\)?$'
    or qual ~* 'auth\.uid\(\) IS NOT NULL'
    or with_check ~* 'auth\.uid\(\) IS NOT NULL'
  );

-- 4. Is the privileged-column trigger installed?
select tgname, tgrelid::regclass from pg_trigger where tgname = 'protect_user_privileged_columns';
