create table if not exists public.integration_credentials (
  integration_id uuid primary key references public.integrations(id) on delete cascade,
  encrypted_access_token text not null,
  encrypted_refresh_token text not null,
  updated_at timestamptz not null default now()
);

alter table public.integration_credentials enable row level security;
revoke all on public.integration_credentials from anon, authenticated;

create table if not exists public.integration_activity_deliveries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  integration_id uuid not null references public.integrations(id) on delete cascade,
  provider text not null,
  event_key text not null,
  status text not null check (status in ('pending','delivered','failed')),
  external_id text,
  error_summary text,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider, event_key)
);

alter table public.integration_activity_deliveries enable row level security;
create policy "integration_activity_deliveries_read_member" on public.integration_activity_deliveries for select using (public.is_org_member(organization_id));
revoke insert, update, delete on public.integration_activity_deliveries from authenticated, anon;

grant select on public.integration_activity_deliveries to authenticated;
grant select, insert, update, delete on public.integration_credentials, public.integration_activity_deliveries to service_role;
