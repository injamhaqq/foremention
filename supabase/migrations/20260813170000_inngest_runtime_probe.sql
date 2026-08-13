-- Durable, service-only evidence that Inngest executed a production heartbeat.
-- This table intentionally stores no organization, user, prompt, provider, or
-- customer payload data. One row represents one service probe for one build.
begin;

create table if not exists public.runtime_service_probes (
  service text not null check (service = 'inngest'),
  build_commit text not null check (build_commit ~ '^[0-9a-f]{40}$'),
  requested_at timestamptz not null default now(),
  executed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (service, build_commit)
);

alter table public.runtime_service_probes enable row level security;

revoke all on public.runtime_service_probes from anon, authenticated;
grant select, insert, update, delete on public.runtime_service_probes to service_role;

drop policy if exists "runtime_service_probes_service_role" on public.runtime_service_probes;
create policy "runtime_service_probes_service_role"
  on public.runtime_service_probes
  for all
  to service_role
  using (true)
  with check (true);

comment on table public.runtime_service_probes is
  'Service-only production heartbeat evidence keyed by exact deployed build SHA. Contains no customer or workspace data.';

commit;
