-- Recommendation Engineering Core Loop v1 — first-class Change Specification domain.
-- Drafts may remain incomplete. Submission for human review fails closed on
-- verified evidence and explicit company-decision fields. Historical Resolution
-- Assets are not backfilled or reinterpreted by this migration.
begin;

create table public.change_specifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  primary_opportunity_id uuid not null references public.opportunities(id) on delete restrict,
  baseline_run_id uuid references public.runs(id) on delete set null,
  control_class text check (control_class is null or control_class in ('CONTROLLABLE','INFLUENCEABLE','UNCONTROLLABLE')),
  control_surface text,
  eligibility_state text not null default 'UNKNOWN' check (eligibility_state in ('ELIGIBLE','PARTIALLY_ELIGIBLE','STRUCTURALLY_INELIGIBLE','UNKNOWN')),
  decision_state text not null default 'INSUFFICIENT_EVIDENCE' check (decision_state in ('DO_NOW','TEST_FIRST','DO_NOT_DO','MONITOR_ONLY','INSUFFICIENT_EVIDENCE')),
  truth_state text not null default 'HYPOTHESIS' check (truth_state in ('OBSERVED_FACT','LIKELY_EXPLANATION','HYPOTHESIS','RECOMMENDED_EXPERIMENT','VERIFIED_OUTCOME')),
  confidence_state text not null default 'INSUFFICIENT' check (confidence_state in ('HIGH','MEDIUM','LOW','INSUFFICIENT')),
  title text not null check (char_length(title) between 3 and 200),
  problem_statement text not null check (char_length(problem_statement) between 3 and 2000),
  exact_change text,
  scope_json jsonb not null default '{}'::jsonb check (jsonb_typeof(scope_json) = 'object'),
  owner_role text,
  owner_id uuid references auth.users(id) on delete set null,
  priority_rank integer check (priority_rank is null or priority_rank > 0),
  effort text check (effort is null or effort in ('LOW','MEDIUM','HIGH')),
  dependencies_json jsonb not null default '[]'::jsonb check (jsonb_typeof(dependencies_json) = 'array'),
  commercial_relevance_json jsonb not null default '{}'::jsonb check (jsonb_typeof(commercial_relevance_json) = 'object'),
  recommendation_relevance_json jsonb not null default '{}'::jsonb check (jsonb_typeof(recommendation_relevance_json) = 'object'),
  acceptance_criteria_json jsonb not null default '[]'::jsonb check (jsonb_typeof(acceptance_criteria_json) = 'array'),
  verification_plan_json jsonb not null default '{}'::jsonb check (jsonb_typeof(verification_plan_json) = 'object'),
  status text not null default 'draft' check (status in ('draft','in_review','approved','in_execution','completed','rejected')),
  created_by uuid not null references auth.users(id) on delete restrict,
  submitted_by uuid references auth.users(id) on delete set null,
  submitted_at timestamptz,
  decision_by uuid references auth.users(id) on delete set null,
  decision_at timestamptz,
  approval_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'draft' and submitted_by is null and submitted_at is null and decision_by is null and decision_at is null)
    or (status = 'in_review' and submitted_by is not null and submitted_at is not null and decision_by is null and decision_at is null)
    or (status in ('approved','in_execution','completed','rejected') and submitted_by is not null and submitted_at is not null and decision_by is not null and decision_at is not null)
  )
);

create table public.change_specification_evidence (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  change_specification_id uuid not null references public.change_specifications(id) on delete cascade,
  evidence_item_id uuid references public.evidence_items(id) on delete restrict,
  source_observation_id uuid references public.source_observations(id) on delete restrict,
  evidence_snapshot jsonb not null,
  created_at timestamptz not null default now(),
  check ((evidence_item_id is not null)::integer + (source_observation_id is not null)::integer = 1),
  check (jsonb_typeof(evidence_snapshot) = 'object' and evidence_snapshot->>'verification' = 'verified')
);

create table public.change_execution_assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  change_specification_id uuid not null references public.change_specifications(id) on delete cascade,
  resolution_asset_id uuid not null references public.resolution_assets(id) on delete cascade,
  execution_role text not null check (execution_role in ('requirements','documentation','website','comparison','faq','proof','structured_data','other')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (change_specification_id, resolution_asset_id)
);

create index change_specifications_workspace_status_idx
  on public.change_specifications (organization_id, project_id, status, priority_rank asc nulls last, created_at desc);
create index change_specifications_opportunity_idx
  on public.change_specifications (primary_opportunity_id, status, created_at desc);
create index change_specifications_baseline_idx
  on public.change_specifications (baseline_run_id) where baseline_run_id is not null;
create index change_specification_evidence_spec_idx
  on public.change_specification_evidence (change_specification_id, created_at);
create unique index change_specification_evidence_item_unique
  on public.change_specification_evidence (change_specification_id, evidence_item_id)
  where evidence_item_id is not null;
create unique index change_specification_observation_unique
  on public.change_specification_evidence (change_specification_id, source_observation_id)
  where source_observation_id is not null;
create index change_execution_assets_spec_idx
  on public.change_execution_assets (change_specification_id, created_at);
create index change_execution_assets_asset_idx
  on public.change_execution_assets (resolution_asset_id);

create trigger change_specifications_updated_at
  before update on public.change_specifications
  for each row execute function public.set_updated_at();

create or replace function public.validate_change_specification() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if not exists (
    select 1 from public.opportunities opportunity
    where opportunity.id = new.primary_opportunity_id
      and opportunity.organization_id = new.organization_id
      and opportunity.project_id = new.project_id
  ) then
    raise exception 'Change Specification opportunity must belong to the same workspace';
  end if;

  if new.baseline_run_id is not null and not exists (
    select 1 from public.runs run
    where run.id = new.baseline_run_id
      and run.organization_id = new.organization_id
      and run.project_id = new.project_id
      and run.status in ('review','complete','partial')
  ) then
    raise exception 'Change Specification baseline must be a reviewed workspace run';
  end if;

  if tg_op = 'UPDATE' then
    if old.organization_id is distinct from new.organization_id
      or old.project_id is distinct from new.project_id
      or old.primary_opportunity_id is distinct from new.primary_opportunity_id
      or old.baseline_run_id is distinct from new.baseline_run_id
      or old.created_by is distinct from new.created_by
      or old.created_at is distinct from new.created_at
    then
      raise exception 'Change Specification identity and evidence baseline are immutable';
    end if;

    if old.status <> new.status and not (
      (old.status = 'draft' and new.status = 'in_review')
      or (old.status = 'in_review' and new.status in ('approved','rejected'))
      or (old.status = 'approved' and new.status = 'in_execution')
      or (old.status = 'in_execution' and new.status = 'completed')
    ) then
      raise exception 'Change Specification state transition is not valid';
    end if;

    if old.status <> 'draft' and (
      old.control_class is distinct from new.control_class
      or old.control_surface is distinct from new.control_surface
      or old.eligibility_state is distinct from new.eligibility_state
      or old.decision_state is distinct from new.decision_state
      or old.truth_state is distinct from new.truth_state
      or old.confidence_state is distinct from new.confidence_state
      or old.title is distinct from new.title
      or old.problem_statement is distinct from new.problem_statement
      or old.exact_change is distinct from new.exact_change
      or old.scope_json is distinct from new.scope_json
      or old.owner_role is distinct from new.owner_role
      or old.owner_id is distinct from new.owner_id
      or old.priority_rank is distinct from new.priority_rank
      or old.effort is distinct from new.effort
      or old.dependencies_json is distinct from new.dependencies_json
      or old.commercial_relevance_json is distinct from new.commercial_relevance_json
      or old.recommendation_relevance_json is distinct from new.recommendation_relevance_json
      or old.acceptance_criteria_json is distinct from new.acceptance_criteria_json
      or old.verification_plan_json is distinct from new.verification_plan_json
    ) then
      raise exception 'A submitted Change Specification decision body is immutable';
    end if;

    if old.submitted_by is not null and (
      old.submitted_by is distinct from new.submitted_by
      or old.submitted_at is distinct from new.submitted_at
    ) then
      raise exception 'Recorded Change Specification submission history is immutable';
    end if;

    if old.decision_by is not null and (
      old.decision_by is distinct from new.decision_by
      or old.decision_at is distinct from new.decision_at
      or old.approval_note is distinct from new.approval_note
    ) then
      raise exception 'Recorded Change Specification decision history is immutable';
    end if;

    if old.status = 'draft' and new.status = 'in_review' then
      if not exists (
        select 1 from public.change_specification_evidence linked
        where linked.change_specification_id = new.id
      ) then
        raise exception 'Change Specification requires verified linked evidence before review';
      end if;
      if new.control_class is null then
        raise exception 'Change Specification requires a control classification before review';
      end if;
      if new.control_class = 'CONTROLLABLE' and nullif(trim(coalesce(new.control_surface, '')), '') is null then
        raise exception 'Change Specification requires a controllable surface before review';
      end if;
      if nullif(trim(coalesce(new.exact_change, '')), '') is null then
        raise exception 'Change Specification requires an exact company change before review';
      end if;
      if nullif(trim(coalesce(new.owner_role, '')), '') is null then
        raise exception 'Change Specification requires an owner role before review';
      end if;
      if new.effort is null then
        raise exception 'Change Specification requires effort before review';
      end if;
      if jsonb_array_length(new.acceptance_criteria_json) = 0 then
        raise exception 'Change Specification requires acceptance criteria before review';
      end if;
      if new.verification_plan_json = '{}'::jsonb
        or nullif(trim(coalesce(new.verification_plan_json->>'intent', '')), '') is null
      then
        raise exception 'Change Specification requires a verification plan before review';
      end if;
      if new.submitted_by is distinct from auth.uid() or new.submitted_at is null then
        raise exception 'The Change Specification submitting actor must match the authenticated user';
      end if;
      if new.control_class = 'UNCONTROLLABLE' and new.decision_state = 'DO_NOW' then
        raise exception 'An uncontrollable factor cannot be submitted as DO_NOW';
      end if;
    end if;

    if old.status = 'in_review' and new.status in ('approved','rejected') then
      if new.decision_by is distinct from auth.uid() or new.decision_at is null then
        raise exception 'The Change Specification decision actor must match the authenticated user';
      end if;
    end if;
  end if;

  return new;
end;
$$;

create trigger validate_change_specification_before_write
  before insert or update on public.change_specifications
  for each row execute function public.validate_change_specification();

create or replace function public.validate_change_specification_evidence() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  specification public.change_specifications%rowtype;
  specification_id uuid;
  item_title text;
  item_url text;
  item_verified_at timestamptz;
  source_title text;
  source_url text;
  observation_at timestamptz;
  answer_provider text;
  answer_model text;
  historical_question text;
  answer_excerpt text;
  answer_run_id uuid;
begin
  specification_id := case when tg_op = 'DELETE' then old.change_specification_id else new.change_specification_id end;
  select * into specification from public.change_specifications where id = specification_id;

  if specification.id is null or specification.status <> 'draft' then
    raise exception 'Evidence links can change only while a Change Specification is a draft';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  if new.organization_id <> specification.organization_id or new.project_id <> specification.project_id then
    raise exception 'Change Specification evidence must belong to the same workspace';
  end if;

  if new.evidence_item_id is not null then
    select evidence.title, evidence.source_url, evidence.verified_at
      into item_title, item_url, item_verified_at
    from public.evidence_items evidence
    where evidence.id = new.evidence_item_id
      and evidence.organization_id = specification.organization_id
      and evidence.project_id = specification.project_id
      and evidence.verification_status = 'verified'
      and evidence.source_url is not null
      and nullif(trim(evidence.usage_rights), '') is not null
      and (evidence.expires_at is null or evidence.expires_at > now());

    if item_url is null then
      raise exception 'Change Specifications can use only current verified evidence items';
    end if;

    new.evidence_snapshot := jsonb_build_object(
      'id', new.evidence_item_id,
      'kind', 'evidence_item',
      'title', item_title,
      'url', item_url,
      'observedAt', item_verified_at,
      'provider', null,
      'model', null,
      'question', null,
      'excerpt', null,
      'runId', null,
      'verification', 'verified'
    );
  end if;

  if new.source_observation_id is not null then
    select
      coalesce(nullif(trim(source.page_title), ''), source.canonical_url),
      source.canonical_url,
      observation.observed_at,
      answer.provider,
      answer.model,
      answer.prompt_text,
      answer.answer_text,
      answer.run_id
    into
      source_title,
      source_url,
      observation_at,
      answer_provider,
      answer_model,
      historical_question,
      answer_excerpt,
      answer_run_id
    from public.source_observations observation
    join public.run_answers answer
      on answer.id = observation.run_answer_id
      and answer.organization_id = observation.organization_id
    join public.runs run
      on run.id = answer.run_id
      and run.organization_id = observation.organization_id
    join public.sources source
      on source.id = observation.source_id
      and source.organization_id = observation.organization_id
    where observation.id = new.source_observation_id
      and observation.organization_id = specification.organization_id
      and observation.review_status = 'verified'
      and answer.review_status = 'verified'
      and nullif(trim(answer.prompt_text), '') is not null
      and nullif(trim(answer.provider), '') is not null
      and nullif(trim(answer.model), '') is not null
      and run.project_id = specification.project_id
      and run.status in ('review','complete','partial');

    if answer_run_id is null then
      raise exception 'Change Specifications can use only reviewed observations with persisted buyer-question, provider, and model provenance from the same project';
    end if;

    new.evidence_snapshot := jsonb_build_object(
      'id', new.source_observation_id,
      'kind', 'source_observation',
      'title', source_title,
      'url', source_url,
      'observedAt', observation_at,
      'provider', answer_provider,
      'model', answer_model,
      'question', historical_question,
      'excerpt', left(coalesce(answer_excerpt, ''), 500),
      'runId', answer_run_id,
      'verification', 'verified'
    );
  end if;

  return new;
end;
$$;

create trigger validate_change_specification_evidence_before_write
  before insert or update or delete on public.change_specification_evidence
  for each row execute function public.validate_change_specification_evidence();

create or replace function public.validate_change_execution_asset() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  specification public.change_specifications%rowtype;
  asset public.resolution_assets%rowtype;
begin
  select * into specification from public.change_specifications where id = new.change_specification_id;
  select * into asset from public.resolution_assets where id = new.resolution_asset_id;

  if specification.id is null
    or specification.organization_id <> new.organization_id
    or specification.project_id <> new.project_id
    or specification.status not in ('in_review','approved','in_execution','completed')
  then
    raise exception 'Execution assets require a reviewed Change Specification in the same workspace';
  end if;
  if asset.id is null or asset.organization_id <> new.organization_id or asset.project_id <> new.project_id then
    raise exception 'Execution asset must belong to the same workspace as its Change Specification';
  end if;
  if new.created_by is distinct from auth.uid() then
    raise exception 'The execution-link actor must match the authenticated user';
  end if;

  if tg_op = 'UPDATE' and (
    old.organization_id is distinct from new.organization_id
    or old.project_id is distinct from new.project_id
    or old.change_specification_id is distinct from new.change_specification_id
    or old.resolution_asset_id is distinct from new.resolution_asset_id
    or old.created_by is distinct from new.created_by
    or old.created_at is distinct from new.created_at
  ) then
    raise exception 'Change Specification execution links are immutable';
  end if;

  return new;
end;
$$;

create trigger validate_change_execution_asset_before_write
  before insert or update on public.change_execution_assets
  for each row execute function public.validate_change_execution_asset();

alter table public.change_specifications enable row level security;
alter table public.change_specification_evidence enable row level security;
alter table public.change_execution_assets enable row level security;

create policy "change_specifications_select_member" on public.change_specifications for select
  using (public.is_org_member(organization_id));
create policy "change_specifications_insert_analyst" on public.change_specifications for insert
  with check (
    status = 'draft' and created_by = auth.uid()
    and public.has_org_role(organization_id, array['owner','admin','analyst']::public.organization_role[])
  );
create policy "change_specifications_update_analyst_draft" on public.change_specifications for update
  using (status = 'draft' and public.has_org_role(organization_id, array['owner','admin','analyst']::public.organization_role[]))
  with check (status in ('draft','in_review') and public.has_org_role(organization_id, array['owner','admin','analyst']::public.organization_role[]));
create policy "change_specifications_update_manager" on public.change_specifications for update
  using (public.has_org_role(organization_id, array['owner','admin']::public.organization_role[]))
  with check (public.has_org_role(organization_id, array['owner','admin']::public.organization_role[]));
create policy "change_specifications_delete_creator_draft" on public.change_specifications for delete
  using (status = 'draft' and created_by = auth.uid() and public.has_org_role(organization_id, array['owner','admin','analyst']::public.organization_role[]));
create policy "change_specifications_delete_manager_draft" on public.change_specifications for delete
  using (status = 'draft' and public.has_org_role(organization_id, array['owner','admin']::public.organization_role[]));

create policy "change_specification_evidence_select_member" on public.change_specification_evidence for select
  using (public.is_org_member(organization_id));
create policy "change_specification_evidence_write_analyst" on public.change_specification_evidence for all
  using (public.has_org_role(organization_id, array['owner','admin','analyst']::public.organization_role[]))
  with check (public.has_org_role(organization_id, array['owner','admin','analyst']::public.organization_role[]));

create policy "change_execution_assets_select_member" on public.change_execution_assets for select
  using (public.is_org_member(organization_id));
create policy "change_execution_assets_write_analyst" on public.change_execution_assets for all
  using (public.has_org_role(organization_id, array['owner','admin','analyst']::public.organization_role[]))
  with check (created_by = auth.uid() and public.has_org_role(organization_id, array['owner','admin','analyst']::public.organization_role[]));

grant select, insert, update, delete on public.change_specifications to authenticated;
grant select, insert, update, delete on public.change_specification_evidence to authenticated;
grant select, insert, update, delete on public.change_execution_assets to authenticated;

commit;
