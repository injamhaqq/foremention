-- FM-01 (capacity track): per-call search cost ledger.
--
-- One row per independent web-search request made for grounded evidence
-- (Brave Search API or keyless Bing RSS): provider, units, estimated list-price
-- cost, capacity pool, and the workspace it was spent for. Public-tool and
-- canary calls have no workspace (organization_id is null) and are attributed by
-- capacity_pool.
--
-- NOT APPLIED by the capacity PR. The application writes here only after the
-- operator applies this migration AND sets FOREMENTION_SEARCH_COST_LEDGER=1.
-- Until then every call is still recorded as a `search_cost_recorded`
-- structured log line. Forward-only and idempotent.
begin;

create table if not exists public.search_cost_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  run_id uuid references public.runs(id) on delete set null,
  capacity_pool text not null check (capacity_pool in ('customer','public','canary')),
  provider text not null check (provider in ('brave-search','bing-rss')),
  units integer not null default 1 check (units > 0 and units <= 1000),
  estimated_cost_usd numeric(12,6) not null default 0 check (estimated_cost_usd >= 0),
  cost_source text not null default 'estimated_list_price' check (cost_source in ('estimated_list_price','provider_reported')),
  outcome text not null check (outcome in ('completed','failed')),
  observed_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (capacity_pool <> 'customer' or organization_id is not null)
);

create index if not exists search_cost_events_organization_observed_idx
  on public.search_cost_events (organization_id, observed_at desc);
create index if not exists search_cost_events_run_idx
  on public.search_cost_events (run_id);
create index if not exists search_cost_events_pool_observed_idx
  on public.search_cost_events (capacity_pool, observed_at desc);

alter table public.search_cost_events enable row level security;

-- Workspace members may read their own workspace's search cost; writes are
-- service-role only (no insert/update/delete policy, no grant to anon).
drop policy if exists "search_cost_events_select_member" on public.search_cost_events;
create policy "search_cost_events_select_member"
  on public.search_cost_events for select to authenticated
  using (organization_id is not null and (select private.is_org_member(organization_id)));

revoke all on public.search_cost_events from anon;
revoke all on public.search_cost_events from authenticated;
grant select on public.search_cost_events to authenticated;

commit;
