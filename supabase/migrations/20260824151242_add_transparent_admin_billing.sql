create table public.service_billing_settings (
  id smallint primary key default 1 check (id = 1),
  enforcement_enabled boolean not null default false,
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid', 'waived')),
  amount_due numeric(12, 2)
    check (amount_due is null or amount_due >= 0),
  currency text not null default 'PKR'
    check (currency ~ '^[A-Z]{3}$'),
  billing_interval text not null default 'monthly'
    check (billing_interval in ('monthly', 'quarterly', 'yearly', 'custom')),
  service_period_start date,
  service_period_end date,
  payment_due_at timestamptz,
  grace_period_ends_at timestamptz,
  bank_name text,
  account_title text,
  account_number text,
  iban text,
  payment_reference text,
  payment_instructions text,
  support_email text,
  support_phone text,
  notice_title text not null default 'Service billing notice',
  notice_message text not null default
    'Administrative access is managed under the disclosed maintenance agreement. Student and instructor access remains available.',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_billing_period_order
    check (
      service_period_start is null
      or service_period_end is null
      or service_period_end >= service_period_start
    ),
  constraint service_billing_grace_order
    check (
      payment_due_at is null
      or grace_period_ends_at is null
      or grace_period_ends_at >= payment_due_at
    )
);

comment on table public.service_billing_settings is
  'Transparent maintenance billing configuration. Edited by authorized project owners in Supabase Studio; the LMS has no write path.';
comment on column public.service_billing_settings.enforcement_enabled is
  'Fail-open master switch. Admin access can only be limited when true and a valid grace deadline has passed.';
comment on column public.service_billing_settings.payment_status is
  'pending may restrict admin access after the grace deadline; paid and waived always allow access.';

alter table public.service_billing_settings enable row level security;

revoke all on table public.service_billing_settings from anon, authenticated;
grant select on table public.service_billing_settings to authenticated;
grant all on table public.service_billing_settings to service_role;

create policy "Admins can read service billing settings"
  on public.service_billing_settings
  for select
  to authenticated
  using ((select public.is_admin()));

create trigger set_service_billing_settings_updated_at
  before update on public.service_billing_settings
  for each row
  execute function public.handle_updated_at();

insert into public.service_billing_settings (id)
values (1);
