-- Company-only, read-only operational cost coverage. No seeded expenses,
-- customer classifications, causal attributions, or implied invoice amounts.
-- Both the provider diagnostic population and KPI-eligible customer population
-- are reported independently: internal synthetic traffic is never customer value.
begin;

create or replace view public.company_operational_cost_readiness
with (security_invoker = true)
as
with period as (
  select date_trunc('month', now()) as period_start, now() as observed_through
), eligible_orgs as (
  select organization_id from public.company_organization_classifications
  where classification in ('design_partner', 'customer')
    and included_in_company_kpis = true
), ai_events as (
  select count(*) as event_count,
    count(*) filter (where cost_source = 'provider_reported') as provider_reported_event_count,
    count(*) filter (where cost_source <> 'provider_reported' or cost_source is null) as estimated_or_unknown_event_count,
    coalesce(sum(estimated_cost_usd), 0)::numeric(14,6) as recorded_ai_cost_usd
  from public.ai_cost_events cross join period
  where observed_at >= period.period_start
    and observed_at <= period.observed_through
), eligible_ai as (
  select coalesce(sum(ace.estimated_cost_usd), 0)::numeric(14,6) as recorded_external_ai_cost_usd
  from public.ai_cost_events ace
  join eligible_orgs eo on eo.organization_id = ace.organization_id
  cross join period
  where ace.observed_at >= period.period_start
    and ace.observed_at <= period.observed_through
), allocations as (
  select count(*) as allocation_count,
    coalesce(sum(ica.amount_usd), 0)::numeric(14,6) as period_allocated_infrastructure_usd,
    coalesce(sum(ica.amount_usd) filter (
      where ica.organization_id in (select organization_id from eligible_orgs)
    ), 0)::numeric(14,6) as period_external_allocated_infrastructure_usd
  from public.infrastructure_cost_allocations ica cross join period
  where ica.period_start >= period.period_start
    and ica.period_end <= period.observed_through
), review_events as (
  select count(*) as external_reviewed_decisions
  from public.outcome_ledger_events oe
  join eligible_orgs eo on eo.organization_id = oe.organization_id
  cross join period
  where oe.event_type = 'decision'
    and oe.actor_type = 'user'
    and oe.occurred_at >= period.period_start
    and oe.occurred_at <= period.observed_through
), gaps as (
  select count(*) as terminal_attempts_missing_a_cost_ledger_entry
  from public.run_attempts attempt cross join period
  where attempt.completed_at >= period.period_start
    and attempt.completed_at <= period.observed_through
    and attempt.status in ('complete', 'failed', 'rate_limited')
    and attempt.estimated_cost_usd is not null
    and not exists (
      select 1 from public.ai_cost_events ace
      where ace.run_attempt_id = attempt.id
        and ace.organization_id = attempt.organization_id
    )
), classified as (
  select count(*) as unclassified_organizations
  from public.organizations org
  where not exists (
    select 1 from public.company_organization_classifications coc
    where coc.organization_id = org.id
  )
)
select period.period_start, period.observed_through,
  ai_events.event_count, ai_events.provider_reported_event_count,
  ai_events.estimated_or_unknown_event_count, ai_events.recorded_ai_cost_usd,
  eligible_ai.recorded_external_ai_cost_usd,
  allocations.allocation_count, allocations.period_allocated_infrastructure_usd,
  allocations.period_external_allocated_infrastructure_usd,
  review_events.external_reviewed_decisions,
  gaps.terminal_attempts_missing_a_cost_ledger_entry,
  classified.unclassified_organizations,
  case when review_events.external_reviewed_decisions > 0
    then round(
      eligible_ai.recorded_external_ai_cost_usd / review_events.external_reviewed_decisions, 6
    )
    else null
  end as recorded_external_ai_cost_per_reviewed_decision_usd,
  -- Always UNKNOWN: provider-reported usage is not an invoice, allocations
  -- may be incomplete, and no reconciled all-in delivery-cost ledger exists yet.
  -- Never coerce unverified or missing direct costs to zero margin.
  null::numeric(14,6) as verified_total_cost_per_reviewed_decision_usd
from period cross join ai_events cross join eligible_ai cross join allocations
  cross join review_events cross join gaps cross join classified;

-- SECURITY: no browser or anonymous access to cross-organization financial data.
revoke all on table public.company_operational_cost_readiness from public, anon, authenticated;
grant select on table public.company_operational_cost_readiness to service_role;

comment on view public.company_operational_cost_readiness is
  'Service-only monthly, as-of cost-coverage diagnostics. Includes internal and synthetic provider traffic separately from KPI-eligible external decision counts; never represents estimated charges as invoiced expense or claims complete cost per decision.';

commit;
