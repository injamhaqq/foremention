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

-- Existing tenant/run indexes remain the primary request-path indexes. These
-- two additive indexes support operator-wide provider reliability/cost windows
-- without forcing scans across unrelated provider attempts or cost events.
create index if not exists run_attempts_provider_created_idx
  on public.run_attempts (provider, created_at desc);

create index if not exists ai_cost_events_provider_observed_idx
  on public.ai_cost_events (provider, observed_at desc);

commit;
