create index service_billing_audit_log_changed_by_idx
  on public.service_billing_audit_log (changed_by);

create index service_billing_settings_updated_by_idx
  on public.service_billing_settings (updated_by);

create index super_admins_granted_by_idx
  on public.super_admins (granted_by);
