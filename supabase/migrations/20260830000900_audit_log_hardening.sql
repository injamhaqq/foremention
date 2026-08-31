-- Harden both the existing operational audit log and the new enterprise audit
-- trail. Audit history is append-only for application actors, while legitimate
-- owner-controlled organization deletion must still be able to cascade.
begin;

-- The Recommendation Graph migration granted owner/analyst `for all` access to
-- audit_logs through its generic policy loop. Remove that mutation path while
-- preserving tenant-scoped member reads and trusted server append behavior.
drop policy if exists "audit_logs_write_analyst" on public.audit_logs;
revoke insert, update, delete on public.audit_logs from anon, authenticated;
grant select on public.audit_logs to authenticated;
revoke update, delete on public.audit_logs from service_role;
grant select, insert on public.audit_logs to service_role;

create or replace function public.prevent_legacy_audit_log_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'legacy audit logs are append-only';
end;
$$;

drop trigger if exists audit_logs_immutable_update on public.audit_logs;
create trigger audit_logs_immutable_update
  before update on public.audit_logs
  for each row execute function public.prevent_legacy_audit_log_update();

-- Do not install a BEFORE DELETE trigger on an organization-owned audit table:
-- PostgreSQL would fire it during the legitimate tenant deletion cascade and
-- could block the existing owner-controlled GDPR deletion executor. Normal
-- application actors have no DELETE privilege; privileged deletion remains
-- limited to the established organization-deletion path and database operators.
drop trigger if exists audit_logs_immutable_delete on public.audit_logs;
drop trigger if exists audit_events_immutable_delete on public.audit_events;

-- Reinforce the new enterprise log as trusted-append/read-only storage for the
-- application. The UPDATE trigger from the prior migration remains in place.
revoke insert, update, delete on public.audit_events from anon, authenticated;
grant select on public.audit_events to authenticated;
revoke update, delete on public.audit_events from service_role;
grant select, insert on public.audit_events to service_role;

comment on table public.audit_logs is
  'Operational organization audit history. Application members may read tenant-scoped rows but cannot insert, update, or delete them; trusted server processing may append.';
comment on table public.audit_events is
  'Enterprise audit history. Application members with audit.read may read tenant-scoped rows; trusted server processing may append. Tenant deletion cascade is intentionally permitted.';

commit;
