-- F15: let an operator diagnose one run from one identifier without joining
-- customer/account, failure and cost ledgers by hand. This is read-only and
-- service-role-only; it does not alter run accounting.
begin;

create or replace function public.operator_run_diagnostic(p_run_id uuid) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  run_row record;
  attempt_count bigint := 0;
  attempts_total numeric(14,6) := 0;
  cost_events_total numeric(14,6) := 0;
  provider_reported_total numeric(14,6) := 0;
  estimated_total numeric(14,6) := 0;
  reconciled boolean := false;
begin
  select
    run.id,
    run.organization_id,
    org.name as organization_name,
    run.project_id,
    run.status,
    run.error_summary,
    run.estimated_max_cost_usd,
    run.actual_cost_usd,
    run.created_at,
    run.started_at,
    run.completed_at
  into run_row
  from public.runs run
  join public.organizations org on org.id = run.organization_id
  where run.id = p_run_id;

  if run_row.id is null then
    raise exception 'Run not found';
  end if;

  select
    count(*),
    coalesce(sum(coalesce(attempt.estimated_cost_usd, 0)), 0)
  into attempt_count, attempts_total
  from public.run_attempts attempt
  where attempt.run_id = p_run_id;

  select
    coalesce(sum(event.estimated_cost_usd), 0),
    coalesce(sum(event.estimated_cost_usd) filter (where event.cost_source = 'provider_reported'), 0),
    coalesce(sum(event.estimated_cost_usd) filter (where event.cost_source = 'estimated'), 0)
  into cost_events_total, provider_reported_total, estimated_total
  from public.ai_cost_events event
  where event.run_id = p_run_id;

  reconciled := abs(coalesce(run_row.actual_cost_usd, 0) - cost_events_total) < 0.000001;

  return jsonb_build_object(
    'runId', run_row.id,
    'organizationId', run_row.organization_id,
    'organizationName', run_row.organization_name,
    'projectId', run_row.project_id,
    'status', run_row.status,
    'errorSummary', run_row.error_summary,
    'createdAt', run_row.created_at,
    'startedAt', run_row.started_at,
    'completedAt', run_row.completed_at,
    'estimatedMaxCostUsd', run_row.estimated_max_cost_usd,
    'actualCostUsd', run_row.actual_cost_usd,
    'attemptCount', attempt_count,
    'attemptsEstimatedCostUsd', attempts_total,
    'costEventsTotalUsd', cost_events_total,
    'providerReportedCostUsd', provider_reported_total,
    'estimatedCostUsd', estimated_total,
    'accountingReconciled', reconciled
  );
end;
$$;

revoke all on function public.operator_run_diagnostic(uuid) from public, anon, authenticated;
grant execute on function public.operator_run_diagnostic(uuid) to service_role;

commit;
