-- Fail-closed hardening for enterprise controls that must not become active
-- merely because an authenticated administrator can write a row.
begin;

-- Domain verification is security-sensitive external state. Members may inspect
-- it, but only trusted server-side verification processing may create/change it.
drop policy if exists "org_domains_owner_write" on public.organization_domains;
revoke insert, update, delete on public.organization_domains from authenticated;
grant select on public.organization_domains to authenticated;
grant select, insert, update, delete on public.organization_domains to service_role;

-- SCIM is explicitly unavailable and service-account issuance is not yet a live
-- product surface. Keep the organization-level enable flags impossible to turn
-- on until a future migration deliberately removes these constraints alongside
-- the real protocol/credential lifecycle implementation.
alter table public.organization_security_settings
  drop constraint if exists organization_security_scim_disabled_check;
alter table public.organization_security_settings
  add constraint organization_security_scim_disabled_check
  check (scim_enabled = false);

alter table public.organization_security_settings
  drop constraint if exists organization_security_service_accounts_disabled_check;
alter table public.organization_security_settings
  add constraint organization_security_service_accounts_disabled_check
  check (service_accounts_enabled = false);

-- Request administration is type-aware. Workspace deletion remains owner-only;
-- administrators with data.export must never gain authority over deletion simply
-- because both request types share one table.
drop policy if exists "data_requests_owner_update" on public.data_governance_requests;
create policy "data_requests_governed_update" on public.data_governance_requests
  for update using (
    (
      request_type = 'deletion'
      and public.has_org_permission(organization_id, 'data.delete')
    )
    or (
      request_type <> 'deletion'
      and public.has_org_permission(organization_id, 'data.export')
    )
  )
  with check (
    public.is_org_member(organization_id)
    and (
      (
        request_type = 'deletion'
        and public.has_org_permission(organization_id, 'data.delete')
      )
      or (
        request_type <> 'deletion'
        and public.has_org_permission(organization_id, 'data.export')
      )
    )
  );

commit;
