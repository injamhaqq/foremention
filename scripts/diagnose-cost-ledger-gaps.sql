-- READ-ONLY operator diagnostic for issue #329 (historical provider-attempt cost gaps).
--
-- Lists every terminal provider attempt that has a non-NULL attempt-level
-- estimated cost but no matching ai_cost_events row (the exact definition used
-- by public.company_operational_cost_readiness), with the facts acceptance
-- step 1 asks for. It classifies each gap; it does NOT repair anything.
--
-- Run as service_role against production or a staging clone. It never writes:
-- the transaction is READ ONLY and is rolled back. No provider request, no
-- invoice, no backfill, no conversion of `estimated` to `provider_reported`.
-- Any repair must be a separate, owner-approved, idempotent, forward-only
-- migration backed by external billing evidence (see
-- docs/operations/COST-LEDGER-GAP-RECONCILIATION-329.md).
\set ON_ERROR_STOP on

begin transaction read only;
set local statement_timeout = '30s';

with trigger_install as (
  -- When the atomic terminal-attempt ledger trigger reached this database.
  -- NULL means the ledger migration is not recorded here (gaps are then expected).
  select min(to_timestamp(version, 'YYYYMMDDHH24MISS') at time zone 'UTC') as installed_at
  from supabase_migrations.schema_migrations
  where name = 'provider_attempt_cost_ledger'
), gaps as (
  select attempt.*
  from public.run_attempts attempt
  where attempt.status in ('complete', 'failed', 'rate_limited')
    and attempt.estimated_cost_usd is not null
    and not exists (
      select 1 from public.ai_cost_events ace
      where ace.run_attempt_id = attempt.id
        and ace.organization_id = attempt.organization_id
    )
)
select
  gap.id as run_attempt_id,
  gap.organization_id,
  gap.run_id,
  gap.provider,
  gap.model,
  gap.attempt_number,
  gap.status,
  gap.error_code,
  gap.created_at,
  gap.started_at,
  gap.completed_at,
  gap.estimated_cost_usd,
  gap.cost_source,
  trigger_install.installed_at as ledger_trigger_installed_at,
  -- A ledger row for this attempt under a different organization (tenant mismatch, not a missing charge).
  (select count(*) from public.ai_cost_events ace
    where ace.run_attempt_id = gap.id and ace.organization_id <> gap.organization_id) as ledger_rows_other_org,
  -- Ledger rows for sibling attempts of the same run/prompt/provider (possible retry already booked).
  (select count(*) from public.ai_cost_events ace
    join public.run_attempts sibling on sibling.id = ace.run_attempt_id
    where sibling.run_id = gap.run_id and sibling.prompt_id is not distinct from gap.prompt_id
      and sibling.provider = gap.provider and sibling.id <> gap.id) as sibling_attempt_ledger_rows,
  -- Orphaned ledger rows for the same run/provider whose attempt link was nulled.
  (select count(*) from public.ai_cost_events ace
    where ace.run_id = gap.run_id and ace.provider = gap.provider and ace.run_attempt_id is null) as unlinked_run_ledger_rows,
  case
    when trigger_install.installed_at is null then 'ledger_trigger_not_recorded_in_this_database'
    when gap.completed_at is null then 'terminal_without_completed_at_trigger_skips'
    when gap.completed_at < trigger_install.installed_at then 'predates_atomic_ledger_trigger'
    when exists (select 1 from public.ai_cost_events ace
      where ace.run_attempt_id = gap.id and ace.organization_id <> gap.organization_id) then 'ledger_row_under_other_organization'
    when gap.estimated_cost_usd = 0 then 'post_trigger_zero_estimate_unexplained'
    else 'post_trigger_nonzero_estimate_unexplained_investigate'
  end as gap_class,
  -- Never inferred here: whether any provider actually charged for this attempt.
  'unknown_requires_vendor_billing_evidence'::text as incurred_charge_status
from gaps gap cross join trigger_install
order by gap.completed_at nulls first, gap.provider, gap.id;

rollback;
