begin;

-- Internal FinOps/SRE facts. This intentionally excludes prompt text, answers,
-- evidence payloads, raw provider responses, contact data and free-form errors.
-- It is service-role only so cross-tenant cost/reliability analysis never
-- becomes a customer-facing data path.
create or replace view public.provider_attempt_operational_facts
with (security_invoker = true)
as
select
  attempt.organization_id,
  run.project_id,
  attempt.run_id,
  attempt.prompt_id,
  attempt.provider,
  attempt.model,
  attempt.attempt_number,
  attempt.status as attempt_status,
  attempt.retryable,
  attempt.latency_ms,
  attempt.started_at as attempt_started_at,
  attempt.completed_at as attempt_completed_at,
  (attempt.attempt_number > 1) as is_retry,
  (attempt.status in ('failed', 'rate_limited')) as provider_failed,
  cost.estimated_cost_usd as recorded_cost_usd,
  cost.cost_source,
  cost.observed_at as cost_observed_at,
  run.status as run_status,
  run.prompt_count as run_prompt_count,
  run.answer_count as run_answer_count,
  run.actual_cost_usd as run_actual_cost_usd,
  run.created_at as run_created_at,
  entitlement.package_key,
  billing.state as billing_state
from public.run_attempts as attempt
join public.runs as run
  on run.id = attempt.run_id
 and run.organization_id = attempt.organization_id
left join public.ai_cost_events as cost
  on cost.run_attempt_id = attempt.id
 and cost.organization_id = attempt.organization_id
left join public.organization_entitlements as entitlement
  on entitlement.organization_id = attempt.organization_id
left join public.billing_accounts as billing
  on billing.organization_id = attempt.organization_id;

comment on view public.provider_attempt_operational_facts is
  'Service-only, customer-content-free provider attempt facts for FinOps and SRE. recorded_cost_usd is observed ai_cost_events spend when present; retry rows are identified by attempt_number > 1 and must not be double-counted outside provider spend.';

revoke all on public.provider_attempt_operational_facts from public, anon, authenticated;
grant select on public.provider_attempt_operational_facts to service_role;

-- Non-AI infrastructure COGS must come from a real meter or invoice. This
-- service-only ledger stores the amount and a non-reversible source reference
-- hash, not invoice/customer contents. organization_id may be null for shared
-- platform cost that has not yet been allocated to a workspace.
create table if not exists public.infrastructure_cost_allocations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  period_start timestamptz not null,
  period_end timestamptz not null,
  cost_category text not null check (cost_category in (
    'edge',
    'database',
    'storage',
    'background_processing',
    'observability',
    'egress',
    'other_cogs'
  )),
  vendor text not null check (char_length(vendor) between 1 and 120),
  amount_usd numeric(14,6) not null check (amount_usd >= 0),
  allocation_method text not null check (allocation_method in ('direct_meter', 'provider_invoice', 'allocated')),
  source_ref_hash text not null check (source_ref_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  check (period_end > period_start)
);

create unique index if not exists infrastructure_cost_allocations_dedupe_idx
  on public.infrastructure_cost_allocations (
    vendor,
    cost_category,
    period_start,
    period_end,
    coalesce(organization_id, '00000000-0000-0000-0000-000000000000'::uuid),
    source_ref_hash
  );
create index if not exists infrastructure_cost_allocations_period_idx
  on public.infrastructure_cost_allocations (period_start, period_end, cost_category);
create index if not exists infrastructure_cost_allocations_org_period_idx
  on public.infrastructure_cost_allocations (organization_id, period_start desc)
  where organization_id is not null;

alter table public.infrastructure_cost_allocations enable row level security;
revoke all on public.infrastructure_cost_allocations from public, anon, authenticated;
grant select, insert, update, delete on public.infrastructure_cost_allocations to service_role;

comment on table public.infrastructure_cost_allocations is
  'Service-only verified infrastructure COGS inputs. Populate only from a real meter or vendor invoice; never synthesize costs or revenue.';

-- Existing tenant/run indexes remain the primary request-path indexes. These
-- two additive indexes support operator-wide provider reliability/cost windows
-- without forcing scans across unrelated provider attempts or cost events.
create index if not exists run_attempts_provider_created_idx
  on public.run_attempts (provider, created_at desc);

create index if not exists ai_cost_events_provider_observed_idx
  on public.ai_cost_events (provider, observed_at desc);

commit;
