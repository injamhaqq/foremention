begin;

-- Foremention's zero-cost beta has explicit, enforceable limits.  A provider
-- prompt observation is one buyer question evaluated by one AI provider.
create table public.organization_entitlements (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  plan text not null default 'free_beta' check (plan in ('free_beta')),
  status text not null default 'active' check (status in ('active', 'paused', 'cancelled')),
  monthly_run_units integer not null default 20 check (monthly_run_units between 1 and 100000),
  max_brands integer not null default 1 check (max_brands between 1 and 1000),
  max_prompts integer not null default 10 check (max_prompts between 1 and 100000),
  history_days integer not null default 90 check (history_days between 1 and 3650),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  meter text not null check (meter in ('provider_prompt_observation')),
  units integer not null check (units > 0),
  period_start date not null,
  run_id uuid references public.runs(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, meter, run_id)
);

create index usage_events_organization_period_idx on public.usage_events (organization_id, meter, period_start);
create trigger organization_entitlements_updated_at before update on public.organization_entitlements for each row execute function public.set_updated_at();

alter table public.organization_entitlements enable row level security;
alter table public.usage_events enable row level security;
create policy "organization_entitlements_select_member" on public.organization_entitlements for select using (public.is_org_member(organization_id));
create policy "usage_events_select_member" on public.usage_events for select using (public.is_org_member(organization_id));

create or replace function public.reserve_run_quota(p_organization_id uuid, p_units integer, p_run_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  cycle_start date := date_trunc('month', now() at time zone 'utc')::date;
  limit_units integer := 20;
  consumed_units integer := 0;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  if p_units < 1 or p_units > 1000 then raise exception 'Invalid run unit count'; end if;
  if not public.has_org_role(p_organization_id, array['owner','analyst']::public.organization_role[]) then
    raise exception 'You do not have permission to start a run for this organization';
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

grant select on public.organization_entitlements, public.usage_events to authenticated;
grant execute on function public.reserve_run_quota(uuid, integer, uuid) to authenticated;

commit;
