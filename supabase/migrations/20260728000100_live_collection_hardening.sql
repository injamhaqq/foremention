-- Durable, tenant-safe production collection primitives.
-- Enum values are committed before the transaction so they can be used below.
alter type public.run_status add value if not exists 'partial';
alter type public.run_status add value if not exists 'cancelled';

begin;

alter table public.runs
  add column if not exists project_id uuid references public.projects(id) on delete cascade,
  add column if not exists idempotency_key text,
  add column if not exists requested_units integer not null default 0 check (requested_units >= 0),
  add column if not exists estimated_max_cost_usd numeric(12,6) not null default 0 check (estimated_max_cost_usd >= 0),
  add column if not exists actual_cost_usd numeric(12,6) not null default 0 check (actual_cost_usd >= 0),
  add column if not exists queue_event_id text,
  add column if not exists methodology_version text not null default '3.0';

create unique index if not exists runs_organization_idempotency_idx
  on public.runs (organization_id, idempotency_key)
  where idempotency_key is not null;
create index if not exists runs_organization_status_created_idx
  on public.runs (organization_id, status, created_at desc);

create table if not exists public.run_prompt_selections (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  run_id uuid not null references public.runs(id) on delete cascade,
  prompt_id uuid references public.prompts(id) on delete set null,
  prompt_key text not null,
  prompt_text text not null,
  locale text not null default 'en-US',
  created_at timestamptz not null default now(),
  primary key (run_id, prompt_key)
);

alter table public.run_prompt_selections enable row level security;
drop policy if exists "run_prompt_selections_select_member" on public.run_prompt_selections;
drop policy if exists "run_prompt_selections_write_analyst" on public.run_prompt_selections;
create policy "run_prompt_selections_select_member"
  on public.run_prompt_selections for select
  using (public.is_org_member(organization_id));
create policy "run_prompt_selections_write_analyst"
  on public.run_prompt_selections for all
  using (public.has_org_role(organization_id, array['owner','analyst']::public.organization_role[]))
  with check (public.has_org_role(organization_id, array['owner','analyst']::public.organization_role[]));

alter table public.run_answers
  add column if not exists prompt_text text,
  add column if not exists usage_input_tokens integer check (usage_input_tokens is null or usage_input_tokens >= 0),
  add column if not exists usage_output_tokens integer check (usage_output_tokens is null or usage_output_tokens >= 0),
  add column if not exists usage_total_tokens integer check (usage_total_tokens is null or usage_total_tokens >= 0),
  add column if not exists estimated_cost_usd numeric(12,6) check (estimated_cost_usd is null or estimated_cost_usd >= 0),
  add column if not exists cost_source text check (cost_source is null or cost_source in ('estimated','provider_reported')),
  add column if not exists provider_request_id text,
  add column if not exists finish_reason text;

alter table public.run_attempts
  add column if not exists prompt_key text,
  add column if not exists provider_request_id text,
  add column if not exists usage_input_tokens integer check (usage_input_tokens is null or usage_input_tokens >= 0),
  add column if not exists usage_output_tokens integer check (usage_output_tokens is null or usage_output_tokens >= 0),
  add column if not exists usage_total_tokens integer check (usage_total_tokens is null or usage_total_tokens >= 0),
  add column if not exists estimated_cost_usd numeric(12,6) check (estimated_cost_usd is null or estimated_cost_usd >= 0),
  add column if not exists cost_source text check (cost_source is null or cost_source in ('estimated','provider_reported')),
  add column if not exists retryable boolean not null default false;

create table if not exists public.ai_cost_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  run_id uuid not null references public.runs(id) on delete cascade,
  run_attempt_id uuid references public.run_attempts(id) on delete set null,
  provider text not null,
  model text not null,
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  total_tokens integer check (total_tokens is null or total_tokens >= 0),
  estimated_cost_usd numeric(12,6) not null default 0 check (estimated_cost_usd >= 0),
  cost_source text not null default 'estimated' check (cost_source in ('estimated','provider_reported')),
  observed_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (run_attempt_id)
);

create index if not exists ai_cost_events_organization_created_idx
  on public.ai_cost_events (organization_id, created_at desc);
alter table public.ai_cost_events enable row level security;
drop policy if exists "ai_cost_events_select_member" on public.ai_cost_events;
create policy "ai_cost_events_select_member"
  on public.ai_cost_events for select
  using (public.is_org_member(organization_id));

alter table public.organization_entitlements
  add column if not exists monthly_ai_spend_cap_usd numeric(12,2) not null default 1.00 check (monthly_ai_spend_cap_usd between 0 and 100000),
  add column if not exists max_prompts_per_run integer not null default 10 check (max_prompts_per_run between 1 and 100),
  add column if not exists max_providers_per_run integer not null default 1 check (max_providers_per_run between 1 and 10),
  add column if not exists max_concurrent_runs integer not null default 1 check (max_concurrent_runs between 1 and 20);

alter table public.source_maps
  add column if not exists run_id uuid references public.runs(id) on delete cascade;
create unique index if not exists source_maps_run_idx
  on public.source_maps (run_id);

alter table public.source_observations
  add column if not exists observation_key text;
create unique index if not exists source_observations_observation_key_idx
  on public.source_observations (observation_key)
  where observation_key is not null;

create or replace function public.reserve_run_budget(
  p_organization_id uuid,
  p_run_id uuid,
  p_estimated_max_cost_usd numeric
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  cycle_start timestamptz := date_trunc('month', now() at time zone 'utc');
  limit_usd numeric(12,2) := 1.00;
  concurrent_limit integer := 1;
  concurrent_count integer := 0;
  reserved_usd numeric(12,6) := 0;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  if p_estimated_max_cost_usd < 0 or p_estimated_max_cost_usd > 100 then
    raise exception 'Invalid run cost reservation';
  end if;
  if not public.has_org_role(p_organization_id, array['owner','analyst']::public.organization_role[]) then
    raise exception 'You do not have permission to reserve collection budget';
  end if;
  if not exists (
    select 1 from public.runs
    where id = p_run_id and organization_id = p_organization_id and status = 'queued'
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

create or replace function public.release_queued_run(
  p_organization_id uuid,
  p_run_id uuid,
  p_reason text
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  if not public.has_org_role(p_organization_id, array['owner','analyst']::public.organization_role[]) then
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

create or replace function public.complete_onboarding(payload jsonb) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  v_organization_id uuid;
  v_project_id uuid;
  v_category_id uuid;
  v_cluster_id uuid;
  v_prompt_id uuid;
  company_name text := left(trim(payload ->> 'companyName'), 120);
  company_domain text := left(trim(payload ->> 'domain'), 500);
  category_name text := left(trim(payload ->> 'category'), 160);
  base_slug text;
  value text;
  item_index integer := 0;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  perform pg_advisory_xact_lock(hashtext('onboarding:' || actor_id::text));

  select member.organization_id into v_organization_id
  from public.organization_members member
  where member.user_id = actor_id
  order by member.created_at asc
  limit 1;
  if v_organization_id is not null then
    select project.id into v_project_id from public.projects project
    where project.organization_id = v_organization_id and project.status = 'active'
    order by project.created_at asc limit 1;
    select category.id into v_category_id from public.categories category
    where category.organization_id = v_organization_id and category.active = true
    order by category.created_at asc limit 1;
    select count(*) into item_index from public.prompts prompt
    where prompt.organization_id = v_organization_id and prompt.active = true;
    if v_project_id is not null and v_category_id is not null then
      return jsonb_build_object(
        'organizationId', v_organization_id,
        'projectId', v_project_id,
        'categoryId', v_category_id,
        'promptCount', item_index,
        'existing', true
      );
    end if;
    raise exception 'An incomplete workspace already exists and requires support review';
  end if;

  v_organization_id := gen_random_uuid();
  v_project_id := gen_random_uuid();
  v_category_id := gen_random_uuid();
  v_cluster_id := gen_random_uuid();
  if length(company_name) < 2 or length(company_domain) < 4 or length(category_name) < 2 then
    raise exception 'Company, domain, and category are required';
  end if;
  if jsonb_array_length(coalesce(payload -> 'prompts', '[]'::jsonb)) < 1 then
    raise exception 'At least one approved prompt is required';
  end if;
  if jsonb_array_length(coalesce(payload -> 'prompts', '[]'::jsonb)) > 10 then
    raise exception 'Prompt limit exceeded';
  end if;
  if jsonb_array_length(coalesce(payload -> 'competitors', '[]'::jsonb)) > 20 then
    raise exception 'Competitor limit exceeded';
  end if;

  base_slug := trim(both '-' from regexp_replace(lower(company_name), '[^a-z0-9]+', '-', 'g'));
  if base_slug = '' then base_slug := 'workspace'; end if;
  insert into public.organizations (id, name, slug, website, created_by)
  values (v_organization_id, company_name, left(base_slug, 48) || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8), company_domain, actor_id);
  insert into public.organization_members (organization_id, user_id, role)
  values (v_organization_id, actor_id, 'owner');
  insert into public.organization_entitlements (organization_id)
  values (v_organization_id)
  on conflict (organization_id) do nothing;
  insert into public.projects (id, organization_id, name, slug, client_brand, website, category, locale, status, created_by)
  values (v_project_id, v_organization_id, company_name || ' Recommendation Graph', 'primary', company_name, company_domain, category_name, coalesce(nullif(payload ->> 'locale',''), 'en-US'), 'active', actor_id);
  insert into public.categories (id, organization_id, name, description, geography)
  values (v_category_id, v_organization_id, category_name, left(payload ->> 'categoryDescription', 2000), left(payload ->> 'market', 120));
  insert into public.prompt_clusters (id, organization_id, project_id, name, intent, buyer_stage, priority)
  values (v_cluster_id, v_organization_id, v_project_id, 'Approved baseline', 'Buyer discovery and comparison', 'evaluation', 1);

  for value in select jsonb_array_elements_text(coalesce(payload -> 'competitors', '[]'::jsonb)) loop
    value := left(trim(value), 120);
    if value <> '' then
      insert into public.competitors (organization_id, project_id, name)
      values (v_organization_id, v_project_id, value)
      on conflict do nothing;
    end if;
  end loop;

  for value in select jsonb_array_elements_text(payload -> 'prompts') loop
    value := left(trim(value), 1000);
    if value <> '' then
      item_index := item_index + 1;
      insert into public.prompts (
        organization_id, project_id, category_id, cluster_id, prompt_key,
        prompt_text, buyer_stage, locale, version, active
      ) values (
        v_organization_id, v_project_id, v_category_id, v_cluster_id,
        'baseline-' || lpad(item_index::text, 3, '0'), value, 'evaluation',
        coalesce(nullif(payload ->> 'locale',''), 'en-US'), 1, true
      ) returning id into v_prompt_id;
      insert into public.prompt_versions (
        organization_id, prompt_id, version, prompt_text, change_reason, created_by
      ) values (
        v_organization_id, v_prompt_id, 1, value, 'Created during onboarding', actor_id
      );
    end if;
  end loop;

  insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, after_state)
  values (
    v_organization_id, actor_id, 'onboarding.completed', 'project', v_project_id,
    jsonb_build_object('goal', left(payload ->> 'goal', 500), 'constraint', left(payload ->> 'constraint', 1000))
  );
  return jsonb_build_object(
    'organizationId', v_organization_id,
    'projectId', v_project_id,
    'categoryId', v_category_id,
    'promptCount', item_index
  );
end;
$$;
grant select, insert, update, delete on public.run_prompt_selections to authenticated;
grant select on public.ai_cost_events to authenticated;
grant execute on function public.reserve_run_budget(uuid, uuid, numeric) to authenticated;
grant execute on function public.release_queued_run(uuid, uuid, text) to authenticated;
grant execute on function public.complete_onboarding(jsonb) to authenticated;

commit;
