-- Foremention Next Best Company Change v1 + verified design-partner execution + learning refinement.
-- Forward-only. No synthetic partner/customer backfill. No automatic company-decision mutation.

begin;

create table public.next_best_change_batches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  candidate_count integer not null check (candidate_count >= 0),
  engine_version text not null default 'next-best-company-change-v1' check (engine_version = 'next-best-company-change-v1'),
  evaluated_by uuid not null references auth.users(id) on delete restrict,
  evaluated_at timestamptz not null default now()
);

create table public.next_best_change_evaluations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  batch_id uuid not null references public.next_best_change_batches(id) on delete cascade,
  change_specification_id uuid not null references public.change_specifications(id) on delete cascade,
  priority_band text not null check (priority_band in ('NOW','NEXT','WATCH','BLOCKED','INSUFFICIENT_EVIDENCE')),
  ordinal_rank integer not null check (ordinal_rank > 0),
  reason_codes_json jsonb not null default '[]'::jsonb check (jsonb_typeof(reason_codes_json) = 'array'),
  factor_snapshot_json jsonb not null default '{}'::jsonb check (jsonb_typeof(factor_snapshot_json) = 'object'),
  evaluated_at timestamptz not null default now(),
  unique (batch_id, change_specification_id),
  unique (batch_id, ordinal_rank)
);

create table public.design_partner_execution_cycles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  change_specification_id uuid not null references public.change_specifications(id) on delete restrict,
  lifecycle_state text not null default 'planned' check (lifecycle_state in ('planned','active','measurement_due','completed','blocked')),
  objective text not null check (char_length(trim(objective)) between 3 and 1000),
  external_verification_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(external_verification_snapshot) = 'object'),
  created_by uuid not null references auth.users(id) on delete restrict,
  started_at timestamptz,
  measurement_due_at timestamptz,
  completed_at timestamptz,
  blocked_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (change_specification_id),
  check ((lifecycle_state = 'blocked' and nullif(trim(coalesce(blocked_reason, '')), '') is not null) or lifecycle_state <> 'blocked')
);

create table public.change_verification_assessments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  change_specification_id uuid not null references public.change_specifications(id) on delete restrict,
  resolution_asset_id uuid not null references public.resolution_assets(id) on delete restrict,
  follow_up_id uuid not null unique references public.resolution_follow_ups(id) on delete restrict,
  baseline_run_id uuid not null references public.runs(id) on delete restrict,
  follow_up_run_id uuid references public.runs(id) on delete restrict,
  verification_state text not null check (verification_state in ('IMPROVED','UNCHANGED','WORSENED','INSUFFICIENT_EVIDENCE')),
  comparison_eligible boolean not null,
  reason_codes_json jsonb not null default '[]'::jsonb check (jsonb_typeof(reason_codes_json) = 'array'),
  metric_snapshot_json jsonb not null default '{}'::jsonb check (jsonb_typeof(metric_snapshot_json) = 'object'),
  limitations text[] not null default '{}',
  causal_attribution text not null default 'not_claimed' check (causal_attribution = 'not_claimed'),
  assessed_by uuid not null references auth.users(id) on delete restrict,
  assessed_at timestamptz not null default now()
);

create table public.change_verification_cross_business_evidence (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  assessment_id uuid not null references public.change_verification_assessments(id) on delete cascade,
  cross_business_evidence_id uuid not null references public.cross_business_evidence(id) on delete restrict,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (assessment_id, cross_business_evidence_id)
);

create index next_best_change_batches_workspace_idx on public.next_best_change_batches (organization_id, project_id, evaluated_at desc);
create index next_best_change_evaluations_workspace_idx on public.next_best_change_evaluations (organization_id, project_id, batch_id, ordinal_rank);
create index next_best_change_evaluations_change_idx on public.next_best_change_evaluations (change_specification_id, evaluated_at desc);
create index design_partner_execution_cycles_workspace_idx on public.design_partner_execution_cycles (organization_id, project_id, lifecycle_state, created_at desc);
create index change_verification_assessments_workspace_idx on public.change_verification_assessments (organization_id, project_id, assessed_at desc);
create index change_verification_assessments_change_idx on public.change_verification_assessments (change_specification_id, assessed_at desc);
create index change_verification_cross_business_assessment_idx on public.change_verification_cross_business_evidence (assessment_id, created_at);

create or replace function public.block_next_best_change_history_mutation() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  raise exception 'Next Best evaluation history is immutable';
end;
$$;

create trigger next_best_change_batches_immutable
  before update or delete on public.next_best_change_batches
  for each row execute function public.block_next_best_change_history_mutation();

create trigger next_best_change_evaluations_immutable
  before update or delete on public.next_best_change_evaluations
  for each row execute function public.block_next_best_change_history_mutation();

create or replace function public.validate_next_best_change_batch() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  project_org uuid;
begin
  select organization_id into project_org from public.projects where id = new.project_id;
  if project_org is null or project_org <> new.organization_id then
    raise exception 'Next Best batch must belong to the same organization and project';
  end if;
  if auth.uid() is not null and new.evaluated_by <> auth.uid() then
    raise exception 'Next Best evaluator must match authenticated actor';
  end if;
  return new;
end;
$$;

create trigger validate_next_best_change_batch_before_write
  before insert on public.next_best_change_batches
  for each row execute function public.validate_next_best_change_batch();

create or replace function public.validate_next_best_change_evaluation() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  batch_row public.next_best_change_batches%rowtype;
  change_row public.change_specifications%rowtype;
begin
  select * into batch_row from public.next_best_change_batches where id = new.batch_id;
  select * into change_row from public.change_specifications where id = new.change_specification_id;
  if batch_row.id is null or change_row.id is null
    or batch_row.organization_id <> new.organization_id or batch_row.project_id <> new.project_id
    or change_row.organization_id <> new.organization_id or change_row.project_id <> new.project_id
  then
    raise exception 'Next Best evaluation must belong to one workspace batch and Change Specification';
  end if;
  new.evaluated_at := batch_row.evaluated_at;
  return new;
end;
$$;

create trigger validate_next_best_change_evaluation_before_write
  before insert on public.next_best_change_evaluations
  for each row execute function public.validate_next_best_change_evaluation();

create or replace function public.record_next_best_change_batch(
  p_project_id uuid,
  p_evaluations jsonb
) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  workspace_org uuid;
  new_batch_id uuid;
  item jsonb;
  item_change_id uuid;
  item_band text;
  item_rank integer;
begin
  if jsonb_typeof(p_evaluations) <> 'array' then
    raise exception 'Next Best evaluations must be an array';
  end if;
  select project.organization_id into workspace_org
  from public.projects project
  where project.id = p_project_id;
  if workspace_org is null or not public.has_org_role(workspace_org, array['owner','admin','analyst']::public.organization_role[]) then
    raise exception 'Next Best evaluation requires workspace write access';
  end if;

  insert into public.next_best_change_batches (
    organization_id, project_id, candidate_count, evaluated_by
  ) values (
    workspace_org, p_project_id, jsonb_array_length(p_evaluations), auth.uid()
  ) returning id into new_batch_id;

  for item in select value from jsonb_array_elements(p_evaluations)
  loop
    item_change_id := nullif(item->>'changeSpecificationId', '')::uuid;
    item_band := item->>'priorityBand';
    item_rank := nullif(item->>'ordinalRank', '')::integer;
    if not exists (
      select 1 from public.change_specifications specification
      where specification.id = item_change_id
        and specification.organization_id = workspace_org
        and specification.project_id = p_project_id
    ) then
      raise exception 'Next Best candidate must belong to the same workspace';
    end if;
    insert into public.next_best_change_evaluations (
      organization_id, project_id, batch_id, change_specification_id,
      priority_band, ordinal_rank, reason_codes_json, factor_snapshot_json
    ) values (
      workspace_org, p_project_id, new_batch_id, item_change_id,
      item_band, item_rank,
      coalesce(item->'reasonCodes', '[]'::jsonb),
      coalesce(item->'factorSnapshot', '{}'::jsonb)
    );
  end loop;
  return new_batch_id;
end;
$$;

create or replace function public.validate_design_partner_execution_cycle() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  classification_row record;
  change_row public.change_specifications%rowtype;
begin
  select classification, included_in_company_kpis, classified_at
    into classification_row
  from public.company_organization_classifications
  where organization_id = new.organization_id
    and classification in ('design_partner','customer')
    and included_in_company_kpis = true;

  if classification_row.classification is null or not exists (
    select 1 from public.commercial_accounts
    where customer_organization_id = new.organization_id
  ) then
    raise exception 'Design-partner execution requires explicit external classification and commercial linkage';
  end if;

  select * into change_row from public.change_specifications where id = new.change_specification_id;
  if change_row.id is null
    or change_row.organization_id <> new.organization_id
    or change_row.project_id <> new.project_id
    or change_row.status not in ('approved','in_execution','completed')
  then
    raise exception 'Design-partner execution requires a reviewed same-workspace Change Specification';
  end if;

  if tg_op = 'INSERT' then
    if auth.uid() is not null and new.created_by <> auth.uid() then
      raise exception 'Design-partner cycle creator must match authenticated actor';
    end if;
    new.external_verification_snapshot := jsonb_build_object(
      'classification', classification_row.classification,
      'includedInCompanyKpis', true,
      'classifiedAt', classification_row.classified_at,
      'commercialLinkVerified', true
    );
  else
    if old.organization_id <> new.organization_id
      or old.project_id <> new.project_id
      or old.change_specification_id <> new.change_specification_id
      or old.objective <> new.objective
      or old.external_verification_snapshot <> new.external_verification_snapshot
      or old.created_by <> new.created_by
      or old.created_at <> new.created_at
    then
      raise exception 'Design-partner cycle identity and verification snapshot are immutable';
    end if;
    if old.lifecycle_state <> new.lifecycle_state and not (
      (old.lifecycle_state = 'planned' and new.lifecycle_state in ('active','measurement_due','completed','blocked'))
      or (old.lifecycle_state = 'active' and new.lifecycle_state in ('measurement_due','completed','blocked'))
      or (old.lifecycle_state = 'measurement_due' and new.lifecycle_state in ('completed','blocked'))
      or (old.lifecycle_state = 'blocked' and new.lifecycle_state in ('active','measurement_due','completed'))
    ) then
      raise exception 'Design-partner cycle state transition is not valid';
    end if;
    new.updated_at := now();
  end if;
  return new;
end;
$$;

create trigger validate_design_partner_execution_cycle_before_write
  before insert or update on public.design_partner_execution_cycles
  for each row execute function public.validate_design_partner_execution_cycle();

create or replace function public.refresh_design_partner_execution_cycle(p_cycle_id uuid) returns text
language plpgsql security invoker set search_path = '' as $$
declare
  cycle_row public.design_partner_execution_cycles%rowtype;
  has_asset boolean := false;
  has_applied boolean := false;
  has_terminal_assessment boolean := false;
  next_state text;
begin
  select * into cycle_row from public.design_partner_execution_cycles where id = p_cycle_id;
  if cycle_row.id is null or not public.has_org_role(cycle_row.organization_id, array['owner','admin','analyst']::public.organization_role[]) then
    raise exception 'Design-partner cycle not found';
  end if;

  select exists (
    select 1 from public.change_execution_assets link
    where link.change_specification_id = cycle_row.change_specification_id
      and link.organization_id = cycle_row.organization_id
      and link.project_id = cycle_row.project_id
  ) into has_asset;

  select exists (
    select 1
    from public.change_execution_assets link
    join public.resolution_assets asset on asset.id = link.resolution_asset_id
    where link.change_specification_id = cycle_row.change_specification_id
      and link.organization_id = cycle_row.organization_id
      and link.project_id = cycle_row.project_id
      and asset.status = 'applied'
      and asset.applied_at is not null
      and nullif(trim(asset.application_reference), '') is not null
  ) into has_applied;

  select exists (
    select 1 from public.change_verification_assessments assessment
    where assessment.change_specification_id = cycle_row.change_specification_id
      and assessment.organization_id = cycle_row.organization_id
      and assessment.project_id = cycle_row.project_id
  ) into has_terminal_assessment;

  next_state := case
    when has_terminal_assessment then 'completed'
    when has_applied then 'measurement_due'
    when has_asset then 'active'
    else 'planned'
  end;

  update public.design_partner_execution_cycles
  set lifecycle_state = next_state,
      started_at = case when next_state in ('active','measurement_due','completed') then coalesce(started_at, now()) else started_at end,
      measurement_due_at = case when next_state in ('measurement_due','completed') then coalesce(measurement_due_at, now()) else measurement_due_at end,
      completed_at = case when next_state = 'completed' then coalesce(completed_at, now()) else completed_at end,
      blocked_reason = case when next_state <> 'blocked' then null else blocked_reason end
  where id = p_cycle_id;

  return next_state;
end;
$$;

create or replace function public.block_change_verification_assessment_mutation() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  raise exception 'Change verification assessments are append-only';
end;
$$;

create trigger change_verification_assessments_append_only
  before update or delete on public.change_verification_assessments
  for each row execute function public.block_change_verification_assessment_mutation();

create or replace function public.validate_change_verification_assessment() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  follow_up public.resolution_follow_ups%rowtype;
begin
  select * into follow_up from public.resolution_follow_ups where id = new.follow_up_id;
  if follow_up.id is null
    or follow_up.organization_id <> new.organization_id
    or follow_up.project_id <> new.project_id
    or follow_up.resolution_asset_id <> new.resolution_asset_id
    or follow_up.baseline_run_id <> new.baseline_run_id
    or follow_up.rerun_id is distinct from new.follow_up_run_id
    or follow_up.status not in ('complete','incomparable')
  then
    raise exception 'Verification assessment requires a terminal comparable-measurement record in the same workspace';
  end if;

  if not exists (
    select 1 from public.change_execution_assets link
    where link.organization_id = new.organization_id
      and link.project_id = new.project_id
      and link.change_specification_id = new.change_specification_id
      and link.resolution_asset_id = new.resolution_asset_id
  ) then
    raise exception 'Verification assessment must belong to the Change Specification execution asset';
  end if;

  if new.comparison_eligible and follow_up.status <> 'complete' then
    raise exception 'Comparable verification requires a complete follow-up';
  end if;
  if auth.uid() is not null and new.assessed_by <> auth.uid() then
    raise exception 'Verification assessor must match authenticated actor';
  end if;
  return new;
end;
$$;

create trigger validate_change_verification_assessment_before_write
  before insert on public.change_verification_assessments
  for each row execute function public.validate_change_verification_assessment();

create or replace function public.validate_change_verification_cross_business_link() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  assessment_row public.change_verification_assessments%rowtype;
  evidence_row public.cross_business_evidence%rowtype;
begin
  if tg_op = 'UPDATE' then raise exception 'Verification evidence links are immutable'; end if;
  select * into assessment_row from public.change_verification_assessments where id = new.assessment_id;
  select * into evidence_row from public.cross_business_evidence where id = new.cross_business_evidence_id;
  if assessment_row.id is null or evidence_row.id is null
    or assessment_row.organization_id <> new.organization_id or assessment_row.project_id <> new.project_id
    or evidence_row.organization_id <> new.organization_id or evidence_row.project_id <> new.project_id
    or evidence_row.verification_state = 'verified' is not true
  then
    raise exception 'Verification learning can use only verified cross-business evidence in the same workspace';
  end if;
  if auth.uid() is not null and new.created_by <> auth.uid() then
    raise exception 'Verification evidence link creator must match authenticated actor';
  end if;
  return new;
end;
$$;

create trigger validate_change_verification_cross_business_link_before_write
  before insert or update on public.change_verification_cross_business_evidence
  for each row execute function public.validate_change_verification_cross_business_link();

alter table public.next_best_change_batches enable row level security;
alter table public.next_best_change_evaluations enable row level security;
alter table public.design_partner_execution_cycles enable row level security;
alter table public.change_verification_assessments enable row level security;
alter table public.change_verification_cross_business_evidence enable row level security;

create policy next_best_change_batches_select on public.next_best_change_batches for select using (public.is_org_member(organization_id));
create policy next_best_change_batches_insert on public.next_best_change_batches for insert with check (public.has_org_role(organization_id, array['owner','admin','analyst']::public.organization_role[]) and evaluated_by = auth.uid());
create policy next_best_change_evaluations_select on public.next_best_change_evaluations for select using (public.is_org_member(organization_id));
create policy next_best_change_evaluations_insert on public.next_best_change_evaluations for insert with check (public.has_org_role(organization_id, array['owner','admin','analyst']::public.organization_role[]));

create policy design_partner_execution_cycles_select on public.design_partner_execution_cycles for select using (public.is_org_member(organization_id));
create policy design_partner_execution_cycles_insert on public.design_partner_execution_cycles for insert with check (public.has_org_role(organization_id, array['owner','admin']::public.organization_role[]) and created_by = auth.uid());
create policy design_partner_execution_cycles_update on public.design_partner_execution_cycles for update using (public.has_org_role(organization_id, array['owner','admin','analyst']::public.organization_role[])) with check (public.has_org_role(organization_id, array['owner','admin','analyst']::public.organization_role[]));

create policy change_verification_assessments_select on public.change_verification_assessments for select using (public.is_org_member(organization_id));
create policy change_verification_assessments_insert on public.change_verification_assessments for insert with check (public.has_org_role(organization_id, array['owner','admin','analyst']::public.organization_role[]) and assessed_by = auth.uid());
create policy change_verification_cross_business_select on public.change_verification_cross_business_evidence for select using (public.is_org_member(organization_id));
create policy change_verification_cross_business_insert on public.change_verification_cross_business_evidence for insert with check (public.has_org_role(organization_id, array['owner','admin','analyst']::public.organization_role[]) and created_by = auth.uid());

create or replace view public.design_partner_execution_progress with (security_invoker = true) as
select
  cycle.id as cycle_id,
  cycle.organization_id,
  cycle.project_id,
  cycle.change_specification_id,
  cycle.lifecycle_state,
  specification.title as change_title,
  specification.status as change_status,
  exists (
    select 1 from public.change_execution_assets link
    where link.change_specification_id = cycle.change_specification_id
  ) as has_execution_asset,
  exists (
    select 1 from public.change_execution_assets link
    join public.resolution_assets asset on asset.id = link.resolution_asset_id
    where link.change_specification_id = cycle.change_specification_id
      and asset.status = 'applied' and asset.applied_at is not null
  ) as has_applied_reference,
  exists (
    select 1 from public.change_execution_assets link
    join public.resolution_follow_ups follow_up on follow_up.resolution_asset_id = link.resolution_asset_id
    where link.change_specification_id = cycle.change_specification_id
      and follow_up.status in ('requested','queued','complete','incomparable')
  ) as has_follow_up,
  exists (
    select 1 from public.change_verification_assessments assessment
    where assessment.change_specification_id = cycle.change_specification_id
  ) as has_verification_assessment,
  cycle.started_at,
  cycle.measurement_due_at,
  cycle.completed_at,
  cycle.created_at,
  cycle.updated_at
from public.design_partner_execution_cycles cycle
join public.change_specifications specification on specification.id = cycle.change_specification_id;

create or replace view public.change_learning_summaries with (security_invoker = true) as
select
  assessment.organization_id,
  assessment.project_id,
  coalesce(nullif(trim(specification.control_surface), ''), 'unspecified') as learning_key,
  specification.control_class,
  count(*)::bigint as assessment_count,
  count(*) filter (where assessment.comparison_eligible)::bigint as comparable_assessment_count,
  count(*) filter (where assessment.verification_state = 'IMPROVED')::bigint as improved_count,
  count(*) filter (where assessment.verification_state = 'UNCHANGED')::bigint as unchanged_count,
  count(*) filter (where assessment.verification_state = 'WORSENED')::bigint as worsened_count,
  count(*) filter (where assessment.verification_state = 'INSUFFICIENT_EVIDENCE')::bigint as insufficient_evidence_count,
  count(distinct link.cross_business_evidence_id)::bigint as verified_cross_business_evidence_count,
  min(assessment.assessed_at) as first_assessed_at,
  max(assessment.assessed_at) as latest_assessed_at
from public.change_verification_assessments assessment
join public.change_specifications specification on specification.id = assessment.change_specification_id
left join public.change_verification_cross_business_evidence link on link.assessment_id = assessment.id
group by assessment.organization_id, assessment.project_id, coalesce(nullif(trim(specification.control_surface), ''), 'unspecified'), specification.control_class;

create or replace view public.design_partner_program_scorecard as
with verified_external as (
  select classification.organization_id
  from public.company_organization_classifications classification
  where classification.classification in ('design_partner','customer')
    and classification.included_in_company_kpis = true
    and exists (
      select 1 from public.commercial_accounts account
      where account.customer_organization_id = classification.organization_id
    )
),
cycle_progress as (
  select cycle.*, progress.has_applied_reference, progress.has_verification_assessment
  from public.design_partner_execution_cycles cycle
  join public.design_partner_execution_progress progress on progress.cycle_id = cycle.id
  join verified_external external on external.organization_id = cycle.organization_id
),
assessments as (
  select assessment.*
  from public.change_verification_assessments assessment
  join verified_external external on external.organization_id = assessment.organization_id
)
select
  (select count(*) from verified_external)::bigint as verified_external_organizations,
  (select count(distinct organization_id) from cycle_progress)::bigint as started_cycle_organizations,
  (select count(*) from cycle_progress where lifecycle_state = 'completed')::bigint as completed_execution_cycles,
  (select count(distinct change_specification_id) from cycle_progress where has_applied_reference)::bigint as distinct_executed_company_changes,
  (select count(*) from assessments where comparison_eligible)::bigint as comparable_verified_cycles,
  (select count(*) from assessments where verification_state = 'IMPROVED')::bigint as improved_count,
  (select count(*) from assessments where verification_state = 'UNCHANGED')::bigint as unchanged_count,
  (select count(*) from assessments where verification_state = 'WORSENED')::bigint as worsened_count,
  (select count(*) from assessments where verification_state = 'INSUFFICIENT_EVIDENCE')::bigint as insufficient_evidence_count;

revoke all on table public.next_best_change_batches, public.next_best_change_evaluations, public.design_partner_execution_cycles, public.change_verification_assessments, public.change_verification_cross_business_evidence from public, anon;
grant select on table public.next_best_change_batches, public.next_best_change_evaluations, public.design_partner_execution_cycles, public.change_verification_assessments, public.change_verification_cross_business_evidence to authenticated;
grant insert on table public.next_best_change_batches, public.next_best_change_evaluations, public.design_partner_execution_cycles, public.change_verification_assessments, public.change_verification_cross_business_evidence to authenticated;
grant update on table public.design_partner_execution_cycles to authenticated;
grant select, insert, update, delete on table public.next_best_change_batches, public.next_best_change_evaluations, public.design_partner_execution_cycles, public.change_verification_assessments, public.change_verification_cross_business_evidence to service_role;

grant execute on function public.record_next_best_change_batch(uuid, jsonb) to authenticated, service_role;
grant execute on function public.refresh_design_partner_execution_cycle(uuid) to authenticated, service_role;

grant select on table public.design_partner_execution_progress, public.change_learning_summaries to authenticated, service_role;
revoke all on table public.design_partner_program_scorecard from public;
revoke all on table public.design_partner_program_scorecard from anon, authenticated;
grant select on table public.design_partner_program_scorecard to service_role;

comment on table public.next_best_change_batches is 'Immutable explainable Next Best Company Change evaluation batches. Ordering aid only; no company decision or approval mutation.';
comment on table public.next_best_change_evaluations is 'Explainable ordinal priority bands and factor snapshots. No composite numeric prioritization metric.';
comment on table public.design_partner_execution_cycles is 'Execution-cycle tracker available only after explicit external design-partner/customer classification and first-party commercial linkage. No synthetic backfill.';
comment on table public.change_verification_assessments is 'Append-only verification assessments over persisted comparable follow-ups. Observed association only; causal attribution is not claimed.';
comment on view public.change_learning_summaries is 'Descriptive distribution of persisted verification assessments by company change surface. No success probability or causal effect estimate.';
comment on view public.design_partner_program_scorecard is 'Service-role-only aggregate of explicitly verified external design-partner/customer execution. Zero remains zero.';

commit;