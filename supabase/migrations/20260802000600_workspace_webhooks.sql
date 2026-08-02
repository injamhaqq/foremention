begin;

create table if not exists public.workspace_webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 80),
  destination_url text not null check (char_length(destination_url) between 12 and 2048),
  event_types text[] not null default '{}',
  active boolean not null default true,
  secret_hint text not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists workspace_webhook_endpoints_org_idx on public.workspace_webhook_endpoints (organization_id, created_at desc);

create table if not exists public.workspace_webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  endpoint_id uuid not null references public.workspace_webhook_endpoints(id) on delete cascade,
  event_key text not null,
  event_type text not null,
  status text not null default 'pending' check (status in ('pending','delivered','failed')),
  attempt_count integer not null default 0 check (attempt_count between 0 and 10),
  response_status integer,
  error_code text,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (endpoint_id, event_key)
);
create index if not exists workspace_webhook_deliveries_org_idx on public.workspace_webhook_deliveries (organization_id, created_at desc);

alter table public.workspace_webhook_endpoints enable row level security;
alter table public.workspace_webhook_deliveries enable row level security;
create policy "workspace_webhook_endpoints_select_member" on public.workspace_webhook_endpoints for select using (public.is_org_member(organization_id));
create policy "workspace_webhook_endpoints_write_admin" on public.workspace_webhook_endpoints for all using (public.has_org_role(organization_id, array['owner','admin']::public.organization_role[])) with check (public.has_org_role(organization_id, array['owner','admin']::public.organization_role[]));
create policy "workspace_webhook_deliveries_select_member" on public.workspace_webhook_deliveries for select using (public.is_org_member(organization_id));
grant select, insert, update, delete on public.workspace_webhook_endpoints to authenticated;
grant select on public.workspace_webhook_deliveries to authenticated;

commit;
