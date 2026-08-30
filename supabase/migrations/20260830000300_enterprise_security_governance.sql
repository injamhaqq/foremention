-- Enterprise security/governance control plane.
-- This migration adds auditable, tenant-scoped primitives without enabling
-- external SAML/SCIM, service accounts, contractual SLAs, or residency claims.
begin;

create table if not exists public.organization_security_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  sso_enforced boolean not null default false,
  session_max_age_minutes integer not null default 480 check (session_max_age_minutes between 15 and 43200),
  inactivity_timeout_minutes integer not null default 60 check (inactivity_timeout_minutes between 5 and 10080),
  require_reauthentication_for_sensitive_actions boolean not null default true,
  scim_enabled boolean not null default false,
  service_accounts_enabled boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_domains (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  domain text not null check (domain = lower(domain) and domain ~ '^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\\.[a-z]{2,}$'),
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','failed','revoked')),
  verification_method text not null default 'dns_txt' check (verification_method in ('dns_txt')),
  verification_token_hash text,
  verified_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, domain)
);
create unique index if not exists organization_domains_global_domain_idx on public.organization_domains(lower(domain)) where verification_status = 'verified';

create table if not exists public.organization_permission_overrides (
  organization_id uuid not null,
  user_id uuid not null,
  permission text not null check (permission in (
    'org.read','org.admin','members.manage','security.read','security.manage',
    'audit.read','data.export','data.delete','records.publish','evidence.review'
  )),
  effect text not null check (effect in ('allow','deny')),
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id, permission),
  foreign key (organization_id, user_id) references public.organization_members(organization_id, user_id) on delete cascade
);

create table if not exists public.service_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  principal_key text not null unique,
  status text not null default 'disabled' check (status in ('disabled','active','revoked')),
  scopes text[] not null default '{}',
  credential_hash text,
  expires_at timestamptz,
  last_used_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  revoked_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table if not exists public.scim_connections (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  status text not null default 'unconfigured' check (status in ('unconfigured','disabled','configured','error')),
  provider text,
  bearer_token_hash text,
  last_sync_at timestamptz,
  last_error_code text,
  configured_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  category text not null check (category in ('authentication','administration','security','evidence','record','data','system')),
  action text not null check (char_length(action) between 3 and 160),
  actor_type text not null check (actor_type in ('user','service_account','system')),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_service_account_id uuid references public.service_accounts(id) on delete set null,
  target_type text,
  target_id text,
  request_id text,
  ip_hash text,
  user_agent_hash text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check ((actor_type = 'user' and actor_user_id is not null and actor_service_account_id is null)
      or (actor_type = 'service_account' and actor_service_account_id is not null and actor_user_id is null)
      or (actor_type = 'system' and actor_user_id is null and actor_service_account_id is null))
);
create index if not exists audit_events_org_occurred_idx on public.audit_events(organization_id, occurred_at desc);
create index if not exists audit_events_org_action_idx on public.audit_events(organization_id, action, occurred_at desc);

create table if not exists public.data_governance_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  classification_profile text not null default 'standard' check (classification_profile in ('standard','restricted')),
  retention_days integer check (retention_days is null or retention_days between 1 and 3650),
  benchmark_eligible boolean not null default false,
  benchmark_consent_at timestamptz,
  anonymization_required boolean not null default true,
  customer_content_training_allowed boolean not null default false,
  data_residency_region text,
  backup_policy_reference text,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not benchmark_eligible or benchmark_consent_at is not null),
  check (customer_content_training_allowed = false)
);

create table if not exists public.data_governance_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  request_type text not null check (request_type in ('export','deletion','correction','restriction')),
  status text not null default 'requested' check (status in ('requested','approved','processing','completed','rejected','cancelled')),
  requested_by uuid not null references auth.users(id) on delete restrict,
  approved_by uuid references auth.users(id) on delete set null,
  external_reference text,
  reason text,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists data_governance_requests_org_requested_idx on public.data_governance_requests(organization_id, requested_at desc);

create or replace function public.default_org_permission(
  member_role public.organization_role,
  requested_permission text
)
returns boolean
language sql
immutable
security invoker
set search_path = ''
as $$
  select case
    when requested_permission not in (
      'org.read','org.admin','members.manage','security.read','security.manage',
      'audit.read','data.export','data.delete','records.publish','evidence.review'
    ) then false
    when member_role = 'owner' then true
    when member_role = 'analyst' then requested_permission in ('org.read','security.read','records.publish','evidence.review')
    when member_role = 'viewer' then requested_permission = 'org.read'
    else false
  end;
$$;

create or replace function public.has_org_permission(check_org_id uuid, requested_permission text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  member_role public.organization_role;
  override_effect text;
begin
  if auth.uid() is null then return false; end if;
  if requested_permission not in (
    'org.read','org.admin','members.manage','security.read','security.manage',
    'audit.read','data.export','data.delete','records.publish','evidence.review'
  ) then return false; end if;

  select m.role into member_role
  from public.organization_members m
  where m.organization_id = check_org_id and m.user_id = auth.uid();
  if member_role is null then return false; end if;

  select p.effect into override_effect
  from public.organization_permission_overrides p
  where p.organization_id = check_org_id and p.user_id = auth.uid() and p.permission = requested_permission;

  if override_effect = 'deny' then return false; end if;
  if override_effect = 'allow' then return true; end if;
  return public.default_org_permission(member_role, requested_permission);
end;
$$;

create or replace function public.append_audit_event(
  p_organization_id uuid,
  p_category text,
  p_action text,
  p_actor_type text,
  p_actor_user_id uuid default null,
  p_actor_service_account_id uuid default null,
  p_target_type text default null,
  p_target_id text default null,
  p_request_id text default null,
  p_ip_hash text default null,
  p_user_agent_hash text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_occurred_at timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_id uuid;
begin
  insert into public.audit_events (
    organization_id, category, action, actor_type, actor_user_id, actor_service_account_id,
    target_type, target_id, request_id, ip_hash, user_agent_hash, metadata, occurred_at
  ) values (
    p_organization_id, p_category, p_action, p_actor_type, p_actor_user_id, p_actor_service_account_id,
    p_target_type, p_target_id, p_request_id, p_ip_hash, p_user_agent_hash, coalesce(p_metadata, '{}'::jsonb), p_occurred_at
  ) returning id into event_id;
  return event_id;
end;
$$;

create or replace function public.prevent_audit_event_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'audit events are immutable';
end;
$$;

drop trigger if exists audit_events_immutable_update on public.audit_events;
create trigger audit_events_immutable_update before update on public.audit_events for each row execute function public.prevent_audit_event_mutation();
drop trigger if exists audit_events_immutable_delete on public.audit_events;
create trigger audit_events_immutable_delete before delete on public.audit_events for each row execute function public.prevent_audit_event_mutation();

create trigger organization_security_settings_updated_at before update on public.organization_security_settings for each row execute function public.set_updated_at();
create trigger organization_domains_updated_at before update on public.organization_domains for each row execute function public.set_updated_at();
create trigger organization_permission_overrides_updated_at before update on public.organization_permission_overrides for each row execute function public.set_updated_at();
create trigger service_accounts_updated_at before update on public.service_accounts for each row execute function public.set_updated_at();
create trigger scim_connections_updated_at before update on public.scim_connections for each row execute function public.set_updated_at();
create trigger data_governance_settings_updated_at before update on public.data_governance_settings for each row execute function public.set_updated_at();
create trigger data_governance_requests_updated_at before update on public.data_governance_requests for each row execute function public.set_updated_at();

alter table public.organization_security_settings enable row level security;
alter table public.organization_domains enable row level security;
alter table public.organization_permission_overrides enable row level security;
alter table public.service_accounts enable row level security;
alter table public.scim_connections enable row level security;
alter table public.audit_events enable row level security;
alter table public.data_governance_settings enable row level security;
alter table public.data_governance_requests enable row level security;

create policy "org_security_select" on public.organization_security_settings for select using (public.has_org_permission(organization_id, 'security.read'));
create policy "org_security_owner_write" on public.organization_security_settings for all using (public.has_org_permission(organization_id, 'security.manage')) with check (public.has_org_permission(organization_id, 'security.manage'));
create policy "org_domains_select" on public.organization_domains for select using (public.has_org_permission(organization_id, 'security.read'));
create policy "org_domains_owner_write" on public.organization_domains for all using (public.has_org_permission(organization_id, 'security.manage')) with check (public.has_org_permission(organization_id, 'security.manage'));
create policy "permission_overrides_select" on public.organization_permission_overrides for select using (public.has_org_permission(organization_id, 'members.manage'));
create policy "permission_overrides_owner_write" on public.organization_permission_overrides for all using (public.has_org_role(organization_id, array['owner']::public.organization_role[])) with check (public.has_org_role(organization_id, array['owner']::public.organization_role[]));
create policy "service_accounts_owner_select" on public.service_accounts for select using (public.has_org_permission(organization_id, 'security.manage'));
create policy "scim_connections_owner_select" on public.scim_connections for select using (public.has_org_permission(organization_id, 'security.manage'));
create policy "audit_events_owner_select" on public.audit_events for select using (public.has_org_permission(organization_id, 'audit.read'));
create policy "data_governance_select" on public.data_governance_settings for select using (public.has_org_permission(organization_id, 'security.read'));
create policy "data_governance_owner_write" on public.data_governance_settings for all using (public.has_org_permission(organization_id, 'security.manage')) with check (public.has_org_permission(organization_id, 'security.manage'));
create policy "data_requests_select" on public.data_governance_requests for select using (public.has_org_permission(organization_id, 'security.read') or requested_by = auth.uid());
create policy "data_requests_insert" on public.data_governance_requests for insert with check (requested_by = auth.uid() and public.is_org_member(organization_id));
create policy "data_requests_owner_update" on public.data_governance_requests for update using (public.has_org_permission(organization_id, 'data.delete') or public.has_org_permission(organization_id, 'data.export')) with check (public.is_org_member(organization_id));

revoke all on public.organization_security_settings from anon;
revoke all on public.organization_domains from anon;
revoke all on public.organization_permission_overrides from anon;
revoke all on public.service_accounts from anon;
revoke all on public.scim_connections from anon;
revoke all on public.audit_events from anon, authenticated;
revoke all on public.data_governance_settings from anon;
revoke all on public.data_governance_requests from anon;

grant select, insert, update on public.organization_security_settings to authenticated;
grant select, insert, update, delete on public.organization_domains to authenticated;
grant select, insert, update, delete on public.organization_permission_overrides to authenticated;
grant select on public.service_accounts to authenticated;
grant select on public.scim_connections to authenticated;
grant select on public.audit_events to authenticated;
grant select, insert, update on public.data_governance_settings to authenticated;
grant select, insert, update on public.data_governance_requests to authenticated;

grant select, insert, update, delete on public.organization_security_settings to service_role;
grant select, insert, update, delete on public.organization_domains to service_role;
grant select, insert, update, delete on public.organization_permission_overrides to service_role;
grant select, insert, update, delete on public.service_accounts to service_role;
grant select, insert, update, delete on public.scim_connections to service_role;
grant select, insert on public.audit_events to service_role;
grant select, insert, update, delete on public.data_governance_settings to service_role;
grant select, insert, update, delete on public.data_governance_requests to service_role;

grant execute on function public.default_org_permission(public.organization_role, text) to authenticated, service_role;
grant execute on function public.has_org_permission(uuid, text) to authenticated, service_role;
revoke all on function public.append_audit_event(uuid,text,text,text,uuid,uuid,text,text,text,text,text,jsonb,timestamptz) from public, anon, authenticated;
grant execute on function public.append_audit_event(uuid,text,text,text,uuid,uuid,text,text,text,text,text,jsonb,timestamptz) to service_role;

commit;
