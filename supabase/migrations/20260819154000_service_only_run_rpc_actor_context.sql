begin;

-- Browser sessions must never execute accounting/queue-control RPCs directly.
-- The application server authenticates the viewer, validates the request and
-- provider-spend policy, then calls these service-role-only functions with the
-- authenticated viewer id. PostgreSQL independently re-checks that actor's
-- workspace role so the service credential is not the sole authorization gate.

create or replace function public.reserve_run_quota_server(
  p_organization_id uuid,
  p_units integer,
  p_run_id uuid,
  p_actor_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  cycle_start date := date_trunc('month', now() at time zone 'utc')::date;
  limit_units integer := 20;
  consumed_units integer := 0;
begin
  if p_actor_id is null then raise exception 'Authentication required'; end if;
  if p_units < 1 or p_units > 1000 then raise exception 'Invalid run unit count'; end if;
  if not exists (
    select 1
    from public.organization_members member
    where member.organization_id = p_organization_id
      and member.user_id = p_actor_id
      and member.role in ('owner'::public.organization_role, 'analyst'::public.organization_role)
  ) then
    raise exception 'You do not have permission to start a run for this organization';
  end if;
  if not exists (
    select 1
    from public.runs run
    where run.id = p_run_id
      and run.organization_id = p_organization_id
      and run.created_by = p_actor_id
      and run.status = 'queued'
      and run.requested_units = p_units
  ) then
    raise exception 'Queued run not found';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_organization_id::text));
  insert into public.organization_entitlements (organization_id)
  values (p_organization_id)
  on conflict (organization_id) do nothing;

  select monthly_run_units into limit_units
  from public.organization_entitlements
  where organization_id = p_organization_id and status = 'active';
  if limit_units is null then raise exception 'This workspace is not active'; end if;

  select coalesce(sum(units), 0) into consumed_units
  from public.usage_events
  where organization_id = p_organization_id
    and meter = 'provider_prompt_observation'
    and usage_events.period_start = cycle_start;

  if consumed_units + p_units > limit_units then
    raise exception 'Free beta limit reached: % of % provider-prompt observations used this month', consumed_units, limit_units;
  end if;

  insert into public.usage_events (organization_id, meter, units, period_start, run_id)
  values (p_organization_id, 'provider_prompt_observation', p_units, cycle_start, p_run_id)
  on conflict (organization_id, meter, run_id) do nothing;

  return jsonb_build_object(
    'plan', 'free_beta',
    'limit', limit_units,
    'used', consumed_units + p_units,
    'remaining', limit_units - consumed_units - p_units,
    'periodStart', cycle_start
  );
end;
$$;

create or replace function public.reserve_run_budget_server(
  p_organization_id uuid,
  p_run_id uuid,
  p_estimated_max_cost_usd numeric,
  p_actor_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  cycle_start timestamptz := date_trunc('month', now() at time zone 'utc');
  limit_usd numeric(12,2) := 1.00;
  concurrent_limit integer := 1;
  concurrent_count integer := 0;
  reserved_usd numeric(12,6) := 0;
begin
  if p_actor_id is null then raise exception 'Authentication required'; end if;
  if p_estimated_max_cost_usd < 0 or p_estimated_max_cost_usd > 100 then
    raise exception 'Invalid run cost reservation';
  end if;
  if not exists (
    select 1
    from public.organization_members member
    where member.organization_id = p_organization_id
      and member.user_id = p_actor_id
      and member.role in ('owner'::public.organization_role, 'analyst'::public.organization_role)
  ) then
    raise exception 'You do not have permission to reserve collection budget';
  end if;
  if not exists (
    select 1
    from public.runs run
    where run.id = p_run_id
      and run.organization_id = p_organization_id
      and run.created_by = p_actor_id
      and run.status = 'queued'
  ) then
    raise exception 'Queued run not found';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_organization_id::text || ':ai-budget'));
  insert into public.organization_entitlements (organization_id)
  values (p_organization_id)
  on conflict (organization_id) do nothing;

  select monthly_ai_spend_cap_usd, max_concurrent_runs into limit_usd, concurrent_limit
  from public.organization_entitlements
  where organization_id = p_organization_id and status = 'active';
  if limit_usd is null then raise exception 'This workspace is not active'; end if;

  select count(*) into concurrent_count
  from public.runs
  where organization_id = p_organization_id
    and id <> p_run_id
    and status in ('queued','running');
  if concurrent_count >= concurrent_limit then
    raise exception 'This workspace already has the maximum number of active collection runs';
  end if;

  select coalesce(sum(
    case
      when actual_cost_usd > 0 then actual_cost_usd
      else estimated_max_cost_usd
    end
  ), 0) into reserved_usd
  from public.runs
  where organization_id = p_organization_id
    and id <> p_run_id
    and created_at >= cycle_start
    and (status not in ('failed','cancelled') or started_at is not null);

  if reserved_usd + p_estimated_max_cost_usd > limit_usd then
    raise exception 'Monthly AI spending ceiling reached';
  end if;

  update public.runs
  set estimated_max_cost_usd = p_estimated_max_cost_usd
  where id = p_run_id and organization_id = p_organization_id;

  return jsonb_build_object(
    'limitUsd', limit_usd,
    'reservedUsd', reserved_usd + p_estimated_max_cost_usd,
    'remainingUsd', limit_usd - reserved_usd - p_estimated_max_cost_usd
  );
end;
$$;

create or replace function public.release_queued_run_server(
  p_organization_id uuid,
  p_run_id uuid,
  p_reason text,
  p_actor_id uuid
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_actor_id is null then raise exception 'Authentication required'; end if;
  if not exists (
    select 1
    from public.organization_members member
    where member.organization_id = p_organization_id
      and member.user_id = p_actor_id
      and member.role in ('owner'::public.organization_role, 'analyst'::public.organization_role)
  ) then
    raise exception 'You do not have permission to release this run';
  end if;
  if not exists (
    select 1 from public.runs
    where id = p_run_id
      and organization_id = p_organization_id
      and status = 'queued'
      and started_at is null
  ) then
    return false;
  end if;

  delete from public.usage_events
  where organization_id = p_organization_id and run_id = p_run_id;

  update public.runs
  set status = 'failed',
      completed_at = now(),
      error_summary = left(coalesce(nullif(trim(p_reason), ''), 'The background job could not be queued.'), 500),
      estimated_max_cost_usd = 0
  where id = p_run_id and organization_id = p_organization_id;
  return true;
end;
$$;

revoke all on function public.reserve_run_quota_server(uuid, integer, uuid, uuid) from public, anon, authenticated;
revoke all on function public.reserve_run_budget_server(uuid, uuid, numeric, uuid) from public, anon, authenticated;
revoke all on function public.release_queued_run_server(uuid, uuid, text, uuid) from public, anon, authenticated;

grant execute on function public.reserve_run_quota_server(uuid, integer, uuid, uuid) to service_role;
grant execute on function public.reserve_run_budget_server(uuid, uuid, numeric, uuid) to service_role;
grant execute on function public.release_queued_run_server(uuid, uuid, text, uuid) to service_role;

commit;
