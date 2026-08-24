create table public.super_admins (
  user_id uuid primary key,
  granted_at timestamptz not null default now(),
  granted_by uuid,
  note text,
  constraint super_admins_user_id_fkey
    foreign key (user_id) references public.users(id) on update cascade on delete restrict,
  constraint super_admins_granted_by_fkey
    foreign key (granted_by) references public.users(id) on update cascade on delete set null,
  constraint super_admins_note_length
    check (note is null or char_length(note) <= 500)
);

comment on table public.super_admins is
  'Transparent super-admin capability assignments. Membership is managed outside the LMS billing form and can be viewed by administrators.';

alter table public.super_admins enable row level security;

revoke all on table public.super_admins from anon, authenticated;
grant select on table public.super_admins to authenticated;
grant all on table public.super_admins to service_role;

create policy "Admins can view super admin assignments"
  on public.super_admins
  for select
  to authenticated
  using ((select public.is_admin()));

alter table public.service_billing_settings
  add column updated_by uuid,
  add constraint service_billing_settings_updated_by_fkey
    foreign key (updated_by) references public.users(id) on update cascade on delete set null;

comment on table public.service_billing_settings is
  'Transparent maintenance billing configuration. Super administrators can update it through the protected LMS dashboard; administrators can read it.';

comment on column public.service_billing_settings.updated_by is
  'The authenticated super administrator who last saved the billing configuration.';

grant update on table public.service_billing_settings to authenticated;

create policy "Super admins can update service billing settings"
  on public.service_billing_settings
  for update
  to authenticated
  using (
    id = 1
    and (select public.is_admin())
    and exists (
      select 1
      from public.super_admins as super_admin
      where super_admin.user_id = (select auth.uid())
    )
  )
  with check (
    id = 1
    and updated_by = (select auth.uid())
    and (select public.is_admin())
    and exists (
      select 1
      from public.super_admins as super_admin
      where super_admin.user_id = (select auth.uid())
    )
  );

create table public.service_billing_audit_log (
  id bigint generated always as identity primary key,
  settings_id smallint not null default 1
    check (settings_id = 1),
  changed_by uuid,
  old_values jsonb not null,
  new_values jsonb not null,
  changed_at timestamptz not null default now(),
  constraint service_billing_audit_log_changed_by_fkey
    foreign key (changed_by) references public.users(id) on delete set null
);

comment on table public.service_billing_audit_log is
  'Immutable audit history for changes to the transparent service billing configuration.';

create index service_billing_audit_log_changed_at_idx
  on public.service_billing_audit_log (changed_at desc);

alter table public.service_billing_audit_log enable row level security;

revoke all on table public.service_billing_audit_log from anon, authenticated;
grant select on table public.service_billing_audit_log to authenticated;
grant all on table public.service_billing_audit_log to service_role;
grant usage, select on sequence public.service_billing_audit_log_id_seq to service_role;

create policy "Super admins can read service billing audit history"
  on public.service_billing_audit_log
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.super_admins as super_admin
      where super_admin.user_id = (select auth.uid())
    )
  );

create function private.log_service_billing_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.service_billing_audit_log (
    settings_id,
    changed_by,
    old_values,
    new_values
  )
  values (
    new.id,
    auth.uid(),
    to_jsonb(old),
    to_jsonb(new)
  );

  return new;
end;
$$;

comment on function private.log_service_billing_change() is
  'Writes an immutable billing audit record after each settings update.';

revoke all on function private.log_service_billing_change()
  from public, anon, authenticated;

create trigger audit_service_billing_settings_update
  after update on public.service_billing_settings
  for each row
  execute function private.log_service_billing_change();

create policy "Protect super admin profiles from ordinary admin updates"
  on public.users
  as restrictive
  for update
  to authenticated
  using (
    not exists (
      select 1
      from public.super_admins as target_super_admin
      where target_super_admin.user_id = users.id
    )
    or exists (
      select 1
      from public.super_admins as current_super_admin
      where current_super_admin.user_id = (select auth.uid())
    )
  )
  with check (
    not exists (
      select 1
      from public.super_admins as target_super_admin
      where target_super_admin.user_id = users.id
    )
    or exists (
      select 1
      from public.super_admins as current_super_admin
      where current_super_admin.user_id = (select auth.uid())
    )
  );

create policy "Protect super admin profiles from ordinary admin deletion"
  on public.users
  as restrictive
  for delete
  to authenticated
  using (
    not exists (
      select 1
      from public.super_admins as target_super_admin
      where target_super_admin.user_id = users.id
    )
    or exists (
      select 1
      from public.super_admins as current_super_admin
      where current_super_admin.user_id = (select auth.uid())
    )
  );
