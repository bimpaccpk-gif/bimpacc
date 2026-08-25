-- Migration 038: Admin analytics aggregations
--
-- Read-only RPCs backing app/actions/analytics.ts (getAdminOverview).
--
-- Conventions follow 028_strict_rls.sql / 20260824161700_add_super_admin_billing_controls.sql:
--   * SECURITY DEFINER with `set search_path = ''` and fully qualified relations,
--   * admin membership re-checked on every call through public.is_admin(), so a
--     leaked EXECUTE grant still returns nothing without an admin JWT,
--   * EXECUTE revoked from public/anon and re-granted to authenticated.
--
-- The TypeScript layer treats every function here as OPTIONAL: if the migration
-- has not been applied yet it degrades to plain selects + JS-side grouping.

-- Supports the monthly series / period-delta scans below.
create index if not exists idx_enrollments_enrolled_at
  on public.enrollments (enrolled_at);

-- ─────────────────────────────────────────────────────────────
-- Monthly enrollment counts
-- ─────────────────────────────────────────────────────────────

create or replace function public.get_admin_enrollment_series(p_months integer default 12)
returns table (month_start date, total bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (date_trunc('month', e.enrolled_at))::date as series_month,
    count(*)::bigint as series_total
  from public.enrollments e
  where public.is_admin()
    and e.enrolled_at >= date_trunc('month', now()) - make_interval(months => greatest(p_months, 1) - 1)
  group by 1
  order by 1 asc;
$$;

comment on function public.get_admin_enrollment_series(integer) is
  'Admin-only monthly enrollment counts for the trailing N months (current month included).';

-- ─────────────────────────────────────────────────────────────
-- Monthly attendance rate
-- ─────────────────────────────────────────────────────────────

create or replace function public.get_admin_attendance_series(p_months integer default 12)
returns table (month_start date, present_count bigint, total_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (date_trunc('month', ar.session_date::timestamp))::date as series_month,
    (count(*) filter (where ar.status in ('present', 'late')))::bigint as series_present,
    count(*)::bigint as series_total
  from public.attendance_records ar
  where public.is_admin()
    and ar.session_date >= (
      date_trunc('month', now()) - make_interval(months => greatest(p_months, 1) - 1)
    )::date
  group by 1
  order by 1 asc;
$$;

comment on function public.get_admin_attendance_series(integer) is
  'Admin-only monthly attendance counts. Rate = present_count / total_count; every marked session (present, late, absent, excused) counts towards total_count.';

-- ─────────────────────────────────────────────────────────────
-- Current vs previous period counters
-- ─────────────────────────────────────────────────────────────

create or replace function public.get_admin_period_deltas(p_days integer default 30)
returns table (
  enrollments_current bigint,
  enrollments_previous bigint,
  attendance_present_current bigint,
  attendance_total_current bigint,
  attendance_present_previous bigint,
  attendance_total_previous bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with windows as (
    select
      greatest(coalesce(p_days, 30), 1) as span_days
  ),
  bounds as (
    select
      now() - make_interval(days => w.span_days) as current_from,
      now() as current_to,
      now() - make_interval(days => w.span_days * 2) as previous_from,
      now() - make_interval(days => w.span_days) as previous_to
    from windows w
  ),
  enrollment_counts as (
    select
      (count(*) filter (
        where e.enrolled_at >= b.current_from and e.enrolled_at < b.current_to
      ))::bigint as enrollments_current,
      (count(*) filter (
        where e.enrolled_at >= b.previous_from and e.enrolled_at < b.previous_to
      ))::bigint as enrollments_previous
    from public.enrollments e
    cross join bounds b
    where public.is_admin()
  ),
  attendance_counts as (
    select
      (count(*) filter (
        where ar.status in ('present', 'late')
          and ar.session_date::timestamp >= b.current_from
          and ar.session_date::timestamp < b.current_to
      ))::bigint as attendance_present_current,
      (count(*) filter (
        where ar.session_date::timestamp >= b.current_from
          and ar.session_date::timestamp < b.current_to
      ))::bigint as attendance_total_current,
      (count(*) filter (
        where ar.status in ('present', 'late')
          and ar.session_date::timestamp >= b.previous_from
          and ar.session_date::timestamp < b.previous_to
      ))::bigint as attendance_present_previous,
      (count(*) filter (
        where ar.session_date::timestamp >= b.previous_from
          and ar.session_date::timestamp < b.previous_to
      ))::bigint as attendance_total_previous
    from public.attendance_records ar
    cross join bounds b
    where public.is_admin()
  )
  select
    ec.enrollments_current,
    ec.enrollments_previous,
    ac.attendance_present_current,
    ac.attendance_total_current,
    ac.attendance_present_previous,
    ac.attendance_total_previous
  from enrollment_counts ec
  cross join attendance_counts ac;
$$;

comment on function public.get_admin_period_deltas(integer) is
  'Admin-only counters for the trailing p_days window and the equally long window before it. Day boundaries resolve in the database timezone.';

-- ─────────────────────────────────────────────────────────────
-- Completion funnel
-- ─────────────────────────────────────────────────────────────

create or replace function public.get_admin_completion_funnel()
returns table (enrolled bigint, started bigint, completed bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    -- Enrolled: every enrollment record on file.
    (
      select count(*) from public.enrollments where public.is_admin()
    )::bigint as funnel_enrolled,
    -- Started: the schema records no separate "started" event, so an
    -- enrollment counts once its student produced any learning signal —
    -- a lesson_progress row (created only when a lesson is marked complete)
    -- or a marked attendance session.
    (
      select count(distinct e.id)
      from public.enrollments e
      where public.is_admin()
        and (
          exists (select 1 from public.lesson_progress lp where lp.enrollment_id = e.id)
          or exists (select 1 from public.attendance_records ar where ar.enrollment_id = e.id)
        )
    )::bigint as funnel_started,
    -- Completed: the student has marked every lesson of the course complete.
    -- Courses with zero lessons never count as complete.
    (
      select count(*)
      from public.enrollments e
      where public.is_admin()
        and exists (
          select 1
          from public.lessons l
          left join public.subjects s on s.id = l.subject_id
          where coalesce(l.course_id, s.course_id) = e.course_id
        )
        and (
          select count(distinct lp.lesson_id)
          from public.lesson_progress lp
          where lp.enrollment_id = e.id
            and lp.completed
        ) >= (
          select count(*)
          from public.lessons l
          left join public.subjects s on s.id = l.subject_id
          where coalesce(l.course_id, s.course_id) = e.course_id
        )
    )::bigint as funnel_completed;
$$;

comment on function public.get_admin_completion_funnel() is
  'Admin-only student journey magnitudes: Enrolled (all enrollments), Started (any completed lesson or attendance mark), Completed (every lesson of the course marked complete).';

-- ─────────────────────────────────────────────────────────────
-- Access control
-- ─────────────────────────────────────────────────────────────

revoke all on function public.get_admin_enrollment_series(integer) from public, anon;
revoke all on function public.get_admin_attendance_series(integer) from public, anon;
revoke all on function public.get_admin_period_deltas(integer) from public, anon;
revoke all on function public.get_admin_completion_funnel() from public, anon;

grant execute on function public.get_admin_enrollment_series(integer) to authenticated, service_role;
grant execute on function public.get_admin_attendance_series(integer) to authenticated, service_role;
grant execute on function public.get_admin_period_deltas(integer) to authenticated, service_role;
grant execute on function public.get_admin_completion_funnel() to authenticated, service_role;
