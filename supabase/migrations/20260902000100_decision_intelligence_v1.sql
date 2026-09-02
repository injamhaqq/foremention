-- Foremention Decision Intelligence v1
-- Company Truth v1 + Eligibility Engine v1 + Cross-business Evidence v1.
-- Forward-only. No synthetic backfill. No automatic company-decision promotion.

begin;

create table public.company_truth_entities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  entity_type text not null check (entity_type in ('company','product','package','integration','market','policy','proof')),
  canonical_key text not null check (length(trim(canonical_key)) between 1 and 120),
  label text not null check (length(trim(label)) between 1 and 200),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, entity_type, canonical_key)
);

create table public.company_truth_assertions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  entity_id uuid not null references public.company_truth_entities(id) on delete cascade,
  attribute_key text not null check (length(trim(attribute_key)) between 1 and 120),
  asserted_value_json jsonb not null default 'null'::jsonb,
  evidence_item_id uuid references public.evidence_items(id) on delete restrict,
  source_snapshot jsonb not null default '{}'::jsonb,
  verification_state text not null default 'unverified' check (verification_state in ('unverified','verified','rejected','superseded','expired')),
  effective_at timestamptz not null default now(),
  superseded_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  verified_by uuid references auth.users(id) on delete restrict,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((verification_state = 'verified' and verified_by is not null and verified_at is not null) or verification_state <> 'verified'),
  check ((verification_state = 'superseded' and superseded_at is not null) or verification_state <> 'superseded')
);

create table public.eligibility_requirements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  change_specification_id uuid not null references public.change_specifications(id) on delete cascade,
  entity_type text not null check (entity_type in ('company','product','package','integration','market','policy','proof')),
  attribute_key text not null check (length(trim(attribute_key)) between 1 and 120),
  operator text not null check (operator in ('EXISTS','EQUALS','INCLUDES','NOT_EQUALS')),
  expected_value_json jsonb not null default 'null'::jsonb,
  importance text not null check (importance in ('REQUIRED','SUPPORTING')),
  evidence_item_id uuid references public.evidence_items(id) on delete restrict,
  source_observation_id uuid references public.source_observations(id) on delete restrict,
  source_snapshot jsonb not null default '{}'::jsonb,
  review_status text not null default 'draft' check (review_status in ('draft','verified','rejected')),
  created_by uuid not null references auth.users(id) on delete restrict,
  verified_by uuid references auth.users(id) on delete restrict,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((review_status = 'verified' and verified_by is not null and verified_at is not null) or review_status <> 'verified')
);

create table public.eligibility_evaluations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  change_specification_id uuid not null references public.change_specifications(id) on delete cascade,
  state text not null check (state in ('ELIGIBLE','PARTIALLY_ELIGIBLE','STRUCTURALLY_INELIGIBLE','UNKNOWN')),
  reason_codes_json jsonb not null default '[]'::jsonb check (jsonb_typeof(reason_codes_json) = 'array'),
  results_json jsonb not null default '[]'::jsonb check (jsonb_typeof(results_json) = 'array'),
  requirement_count integer not null check (requirement_count >= 0),
  truth_assertion_count integer not null check (truth_assertion_count >= 0),
  engine_version text not null default 'decision-intelligence-v1' check (engine_version = 'decision-intelligence-v1'),
  evaluated_by uuid not null references auth.users(id) on delete restrict,
  evaluated_at timestamptz not null default now()
);

create table public.cross_business_evidence (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  evidence_type text not null check (evidence_type in ('sales_win_loss','customer_interview','support','product_analytics','feature_request','churn_retention','review','pricing_commercial','customer_success','revenue')),
  title text not null check (length(trim(title)) between 1 and 240),
  summary text not null check (length(trim(summary)) between 1 and 2000),
  direction text not null default 'unknown' check (direction in ('supports','contradicts','context','unknown')),
  evidence_item_id uuid references public.evidence_items(id) on delete restrict,
  commercial_event_id uuid references public.commercial_events(id) on delete restrict,
  commercial_opportunity_id uuid references public.commercial_opportunities(id) on delete restrict,
  source_system text not null check (length(trim(source_system)) between 1 and 80),
  source_reference text check (source_reference is null or length(source_reference) <= 200),
  source_snapshot jsonb not null default '{}'::jsonb,
  verification_state text not null default 'unverified' check (verification_state in ('unverified','verified','rejected','expired')),
  occurred_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  verified_by uuid references auth.users(id) on delete restrict,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((verification_state = 'verified' and verified_by is not null and verified_at is not null) or verification_state <> 'verified'),
  check (num_nonnulls(evidence_item_id, commercial_event_id, commercial_opportunity_id) <= 1)
);

create table public.change_specification_cross_business_evidence (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  change_specification_id uuid not null references public.change_specifications(id) on delete cascade,
  cross_business_evidence_id uuid not null references public.cross_business_evidence(id) on delete restrict,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (change_specification_id, cross_business_evidence_id)
);

create index company_truth_entities_workspace_idx on public.company_truth_entities (organization_id, project_id, entity_type);
create index company_truth_assertions_workspace_idx on public.company_truth_assertions (organization_id, project_id, verification_state, attribute_key);
create unique index company_truth_assertions_current_unique on public.company_truth_assertions (entity_id, attribute_key) where verification_state = 'verified' and superseded_at is null;
create index eligibility_requirements_change_idx on public.eligibility_requirements (organization_id, project_id, change_specification_id, review_status);
create index eligibility_evaluations_change_idx on public.eligibility_evaluations (organization_id, project_id, change_specification_id, evaluated_at desc);
create index cross_business_evidence_workspace_idx on public.cross_business_evidence (organization_id, project_id, verification_state, evidence_type);
create index change_specification_cross_business_change_idx on public.change_specification_cross_business_evidence (organization_id, project_id, change_specification_id);

create or replace function public.validate_company_truth_entity() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  project_org uuid;
begin
  select organization_id into project_org from public.projects where id = new.project_id;
  if project_org is null or project_org <> new.organization_id then
    raise exception 'Company Truth entity must belong to the same organization and project';
  end if;
  if auth.uid() is not null and new.created_by <> auth.uid() then
    raise exception 'Company Truth entity creator must match authenticated actor';
  end if;
  new.canonical_key := lower(trim(new.canonical_key));
  new.label := trim(new.label);
  if tg_op = 'UPDATE' then
    if new.organization_id <> old.organization_id or new.project_id <> old.project_id or new.entity_type <> old.entity_type or new.canonical_key <> old.canonical_key or new.created_by <> old.created_by or new.created_at <> old.created_at then
      raise exception 'Company Truth entity identity is immutable';
    end if;
    new.updated_at := now();
  end if;
  return new;
end;
$$;

create or replace function public.validate_company_truth_assertion() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  entity_row public.company_truth_entities%rowtype;
  evidence public.evidence_items%rowtype;
  becoming_verified boolean;
begin
  select * into entity_row from public.company_truth_entities where id = new.entity_id;
  if not found or entity_row.organization_id <> new.organization_id or entity_row.project_id <> new.project_id then
    raise exception 'Company Truth assertion must use an entity in the same workspace';
  end if;
  if auth.uid() is not null and new.created_by <> auth.uid() then
    raise exception 'Company Truth assertion creator must match authenticated actor';
  end if;
  new.attribute_key := lower(trim(new.attribute_key));
  becoming_verified := new.verification_state = 'verified' and (tg_op = 'INSERT' or old.verification_state <> 'verified');

  if becoming_verified then
    if new.evidence_item_id is null then
      raise exception 'Verified Company Truth requires a verified evidence item';
    end if;
    select * into evidence
    from public.evidence_items
    where id = new.evidence_item_id
      and organization_id = new.organization_id
      and project_id = new.project_id
      and verification_status = 'verified'
      and source_url is not null
      and nullif(trim(usage_rights), '') is not null
      and (expires_at is null or expires_at > now());
    if not found then
      raise exception 'Verified Company Truth requires current verified same-workspace evidence with source and usage rights';
    end if;
    if auth.uid() is not null and coalesce(new.verified_by, auth.uid()) <> auth.uid() then
      raise exception 'Company Truth verifier must match authenticated actor';
    end if;
    new.verified_by := coalesce(auth.uid(), new.verified_by);
    if new.verified_by is null then
      raise exception 'Verified Company Truth requires a verifier';
    end if;
    new.verified_at := now();
    new.superseded_at := null;
    new.source_snapshot := jsonb_build_object(
      'evidenceItemId', evidence.id,
      'title', evidence.title,
      'sourceUrl', evidence.source_url,
      'verificationStatus', evidence.verification_status,
      'verifiedAt', evidence.verified_at,
      'expiresAt', evidence.expires_at,
      'usageRights', evidence.usage_rights
    );
  end if;

  if tg_op = 'UPDATE' and old.verification_state = 'verified' then
    if new.organization_id <> old.organization_id or new.project_id <> old.project_id or new.entity_id <> old.entity_id or new.attribute_key <> old.attribute_key or new.asserted_value_json <> old.asserted_value_json or new.evidence_item_id is distinct from old.evidence_item_id or new.source_snapshot <> old.source_snapshot or new.created_by <> old.created_by or new.effective_at <> old.effective_at or new.verified_by is distinct from old.verified_by or new.verified_at is distinct from old.verified_at or new.created_at <> old.created_at then
      raise exception 'Company Truth verified assertion body is immutable';
    end if;
    if new.verification_state not in ('verified','superseded','expired') then
      raise exception 'Verified Company Truth may only remain verified or become superseded/expired';
    end if;
    if new.verification_state = 'superseded' and old.verification_state <> 'superseded' then
      new.superseded_at := coalesce(new.superseded_at, now());
    end if;
  end if;
  if tg_op = 'UPDATE' then new.updated_at := now(); end if;
  return new;
end;
$$;

create or replace function public.validate_eligibility_requirement() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  change_row public.change_specifications%rowtype;
  evidence public.evidence_items%rowtype;
  observation public.source_observations%rowtype;
  answer public.run_answers%rowtype;
  becoming_verified boolean;
begin
  select * into change_row from public.change_specifications where id = new.change_specification_id;
  if not found or change_row.organization_id <> new.organization_id or change_row.project_id <> new.project_id then
    raise exception 'Eligibility requirement must belong to the same Change Specification workspace';
  end if;
  if auth.uid() is not null and new.created_by <> auth.uid() then
    raise exception 'Eligibility requirement creator must match authenticated actor';
  end if;
  new.attribute_key := lower(trim(new.attribute_key));
  becoming_verified := new.review_status = 'verified' and (tg_op = 'INSERT' or old.review_status <> 'verified');

  if becoming_verified then
    if num_nonnulls(new.evidence_item_id, new.source_observation_id) <> 1 then
      raise exception 'Verified eligibility requirement requires exactly one evidence source';
    end if;
    if new.evidence_item_id is not null then
      select * into evidence
      from public.evidence_items
      where id = new.evidence_item_id
        and organization_id = new.organization_id
        and project_id = new.project_id
        and verification_status = 'verified'
        and source_url is not null
        and nullif(trim(usage_rights), '') is not null
        and (expires_at is null or expires_at > now());
      if not found then
        raise exception 'Verified eligibility requirement requires current verified same-workspace evidence';
      end if;
      new.source_snapshot := jsonb_build_object(
        'kind', 'evidence_item', 'evidenceItemId', evidence.id, 'title', evidence.title,
        'sourceUrl', evidence.source_url, 'verifiedAt', evidence.verified_at, 'expiresAt', evidence.expires_at
      );
    else
      select * into observation
      from public.source_observations
      where id = new.source_observation_id
        and organization_id = new.organization_id
        and review_status = 'verified';
      if not found or observation.run_answer_id is null then
        raise exception 'Verified eligibility requirement requires a verified source observation';
      end if;
      select answer_row.* into answer
      from public.run_answers as answer_row
      join public.collection_runs as run on run.id = answer_row.run_id
      where answer_row.id = observation.run_answer_id
        and answer_row.organization_id = new.organization_id
        and answer_row.review_status = 'verified'
        and run.organization_id = new.organization_id
        and run.project_id = new.project_id
        and nullif(trim(answer_row.prompt_text), '') is not null
        and nullif(trim(answer_row.provider), '') is not null
        and nullif(trim(answer_row.model), '') is not null;
      if not found then
        raise exception 'Verified eligibility requirement source observation must preserve reviewed answer provider, model, prompt text, and run provenance';
      end if;
      new.source_snapshot := jsonb_build_object(
        'kind', 'source_observation', 'sourceObservationId', observation.id,
        'observedAt', observation.observed_at, 'provider', answer.provider, 'model', answer.model,
        'promptText', answer.prompt_text, 'runId', answer.run_id
      );
    end if;
    if auth.uid() is not null and coalesce(new.verified_by, auth.uid()) <> auth.uid() then
      raise exception 'Eligibility requirement verifier must match authenticated actor';
    end if;
    new.verified_by := coalesce(auth.uid(), new.verified_by);
    if new.verified_by is null then raise exception 'Verified eligibility requirement requires a verifier'; end if;
    new.verified_at := now();
  end if;

  if tg_op = 'UPDATE' and old.review_status = 'verified' then
    if new.organization_id <> old.organization_id or new.project_id <> old.project_id or new.change_specification_id <> old.change_specification_id or new.entity_type <> old.entity_type or new.attribute_key <> old.attribute_key or new.operator <> old.operator or new.expected_value_json <> old.expected_value_json or new.importance <> old.importance or new.evidence_item_id is distinct from old.evidence_item_id or new.source_observation_id is distinct from old.source_observation_id or new.source_snapshot <> old.source_snapshot or new.created_by <> old.created_by or new.verified_by is distinct from old.verified_by or new.verified_at is distinct from old.verified_at or new.created_at <> old.created_at then
      raise exception 'Verified eligibility requirement is immutable';
    end if;
    if new.review_status <> 'verified' then raise exception 'Verified eligibility requirement cannot be rewritten'; end if;
  end if;
  if tg_op = 'UPDATE' then new.updated_at := now(); end if;
  return new;
end;
$$;

create or replace function public.validate_eligibility_evaluation() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  change_row public.change_specifications%rowtype;
begin
  if tg_op = 'UPDATE' or tg_op = 'DELETE' then
    raise exception 'Eligibility evaluations are immutable';
  end if;
  select * into change_row from public.change_specifications where id = new.change_specification_id;
  if not found or change_row.organization_id <> new.organization_id or change_row.project_id <> new.project_id then
    raise exception 'Eligibility evaluation must belong to the same Change Specification workspace';
  end if;
  if auth.uid() is not null and new.evaluated_by <> auth.uid() then
    raise exception 'Eligibility evaluator must match authenticated actor';
  end if;
  return new;
end;
$$;

create or replace function public.validate_cross_business_evidence() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  project_org uuid;
  evidence public.evidence_items%rowtype;
  commercial_account_id uuid;
  customer_org uuid;
  event_record record;
  opportunity_record record;
  becoming_verified boolean;
begin
  select organization_id into project_org from public.projects where id = new.project_id;
  if project_org is null or project_org <> new.organization_id then
    raise exception 'Cross-business evidence must belong to the same organization and project';
  end if;
  if auth.uid() is not null and new.created_by <> auth.uid() then
    raise exception 'Cross-business evidence creator must match authenticated actor';
  end if;
  becoming_verified := new.verification_state = 'verified' and (tg_op = 'INSERT' or old.verification_state <> 'verified');

  if becoming_verified then
    if num_nonnulls(new.evidence_item_id, new.commercial_event_id, new.commercial_opportunity_id) <> 1 then
      raise exception 'Verified cross-business evidence requires exactly one source';
    end if;
    if new.evidence_item_id is not null then
      select * into evidence
      from public.evidence_items
      where id = new.evidence_item_id
        and organization_id = new.organization_id
        and project_id = new.project_id
        and verification_status = 'verified'
        and source_url is not null
        and nullif(trim(usage_rights), '') is not null
        and (expires_at is null or expires_at > now());
      if not found then raise exception 'Verified cross-business evidence requires current verified same-workspace evidence'; end if;
      new.source_snapshot := jsonb_build_object(
        'kind', 'evidence_item', 'evidenceItemId', evidence.id, 'title', evidence.title,
        'sourceUrl', evidence.source_url, 'verifiedAt', evidence.verified_at, 'expiresAt', evidence.expires_at
      );
    elsif new.commercial_event_id is not null then
      select ce.id, ce.account_id, ce.event_type, ce.occurred_at
        into event_record
      from public.commercial_events ce where ce.id = new.commercial_event_id;
      if not found then raise exception 'Commercial event not found'; end if;
      commercial_account_id := event_record.account_id;
      select customer_organization_id into customer_org from public.commercial_accounts where id = commercial_account_id;
      if customer_org is null or customer_org <> new.organization_id then
        raise exception 'Commercial evidence requires explicit customer organization linkage';
      end if;
      new.source_system := 'foremention_commercial';
      new.source_reference := event_record.id::text;
      new.source_snapshot := jsonb_build_object(
        'kind', 'commercial_event', 'eventId', event_record.id, 'eventType', event_record.event_type,
        'occurredAt', event_record.occurred_at
      );
      new.occurred_at := coalesce(new.occurred_at, event_record.occurred_at);
    else
      select co.id, co.account_id, co.stage, co.commercial_model, co.currency, co.accepted_value_usd, co.paid_value_usd, co.mrr_usd, co.arr_usd, co.closed_at, co.revenue_source
        into opportunity_record
      from public.commercial_opportunities co where co.id = new.commercial_opportunity_id;
      if not found then raise exception 'Commercial opportunity not found'; end if;
      commercial_account_id := opportunity_record.account_id;
      select customer_organization_id into customer_org from public.commercial_accounts where id = commercial_account_id;
      if customer_org is null or customer_org <> new.organization_id then
        raise exception 'Commercial evidence requires explicit customer organization linkage';
      end if;
      new.source_system := 'foremention_commercial';
      new.source_reference := opportunity_record.id::text;
      new.source_snapshot := jsonb_strip_nulls(jsonb_build_object(
        'kind', 'commercial_opportunity', 'opportunityId', opportunity_record.id,
        'stage', opportunity_record.stage, 'commercialModel', opportunity_record.commercial_model,
        'currency', opportunity_record.currency, 'acceptedValueUsd', opportunity_record.accepted_value_usd,
        'paidValueUsd', opportunity_record.paid_value_usd, 'mrrUsd', opportunity_record.mrr_usd,
        'arrUsd', opportunity_record.arr_usd, 'revenueSource', opportunity_record.revenue_source,
        'closedAt', opportunity_record.closed_at
      ));
      new.occurred_at := coalesce(new.occurred_at, opportunity_record.closed_at);
    end if;
    if auth.uid() is not null and coalesce(new.verified_by, auth.uid()) <> auth.uid() then
      raise exception 'Cross-business verifier must match authenticated actor';
    end if;
    new.verified_by := coalesce(auth.uid(), new.verified_by, new.created_by);
    new.verified_at := now();
  end if;

  if tg_op = 'UPDATE' and old.verification_state = 'verified' then
    if new.organization_id <> old.organization_id or new.project_id <> old.project_id or new.evidence_type <> old.evidence_type or new.title <> old.title or new.summary <> old.summary or new.direction <> old.direction or new.evidence_item_id is distinct from old.evidence_item_id or new.commercial_event_id is distinct from old.commercial_event_id or new.commercial_opportunity_id is distinct from old.commercial_opportunity_id or new.source_system <> old.source_system or new.source_reference is distinct from old.source_reference or new.source_snapshot <> old.source_snapshot or new.occurred_at is distinct from old.occurred_at or new.created_by <> old.created_by or new.verified_by is distinct from old.verified_by or new.verified_at is distinct from old.verified_at or new.created_at <> old.created_at then
      raise exception 'Verified cross-business evidence body is immutable';
    end if;
    if new.verification_state not in ('verified','expired') then raise exception 'Verified cross-business evidence may only remain verified or expire'; end if;
  end if;
  if tg_op = 'UPDATE' then new.updated_at := now(); end if;
  return new;
end;
$$;

create or replace function public.validate_change_specification_cross_business_link() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  change_row public.change_specifications%rowtype;
  evidence_row public.cross_business_evidence%rowtype;
begin
  if tg_op = 'UPDATE' then
    raise exception 'Cross-business evidence links are immutable';
  end if;
  select * into change_row from public.change_specifications where id = new.change_specification_id;
  select * into evidence_row from public.cross_business_evidence where id = new.cross_business_evidence_id;
  if not found or change_row.id is null or evidence_row.id is null
     or change_row.organization_id <> new.organization_id or change_row.project_id <> new.project_id
     or evidence_row.organization_id <> new.organization_id or evidence_row.project_id <> new.project_id
     or evidence_row.verification_state <> 'verified' then
    raise exception 'Cross-business evidence links require verified evidence in the same workspace';
  end if;
  if auth.uid() is not null and new.created_by <> auth.uid() then
    raise exception 'Cross-business evidence link creator must match authenticated actor';
  end if;
  return new;
end;
$$;

create trigger validate_company_truth_entity_before_write before insert or update on public.company_truth_entities for each row execute function public.validate_company_truth_entity();
create trigger validate_company_truth_assertion_before_write before insert or update on public.company_truth_assertions for each row execute function public.validate_company_truth_assertion();
create trigger validate_eligibility_requirement_before_write before insert or update on public.eligibility_requirements for each row execute function public.validate_eligibility_requirement();
create trigger validate_eligibility_evaluation_before_write before insert or update or delete on public.eligibility_evaluations for each row execute function public.validate_eligibility_evaluation();
create trigger validate_cross_business_evidence_before_write before insert or update on public.cross_business_evidence for each row execute function public.validate_cross_business_evidence();
create trigger validate_change_specification_cross_business_link_before_write before insert or update on public.change_specification_cross_business_evidence for each row execute function public.validate_change_specification_cross_business_link();

alter table public.company_truth_entities enable row level security;
alter table public.company_truth_assertions enable row level security;
alter table public.eligibility_requirements enable row level security;
alter table public.eligibility_evaluations enable row level security;
alter table public.cross_business_evidence enable row level security;
alter table public.change_specification_cross_business_evidence enable row level security;

create policy company_truth_entities_select on public.company_truth_entities for select using (public.is_org_member(organization_id));
create policy company_truth_entities_insert on public.company_truth_entities for insert with check (public.has_org_role(organization_id, array['owner','admin','analyst']::public.organization_role[]) and created_by = auth.uid());
create policy company_truth_entities_update on public.company_truth_entities for update using (public.has_org_role(organization_id, array['owner','admin','analyst']::public.organization_role[])) with check (public.has_org_role(organization_id, array['owner','admin','analyst']::public.organization_role[]));

create policy company_truth_assertions_select on public.company_truth_assertions for select using (public.is_org_member(organization_id));
create policy company_truth_assertions_insert on public.company_truth_assertions for insert with check (public.has_org_role(organization_id, array['owner','admin','analyst']::public.organization_role[]) and created_by = auth.uid() and verification_state = 'unverified');
create policy company_truth_assertions_update on public.company_truth_assertions for update using (public.has_org_role(organization_id, array['owner','admin']::public.organization_role[])) with check (public.has_org_role(organization_id, array['owner','admin']::public.organization_role[]));

create policy eligibility_requirements_select on public.eligibility_requirements for select using (public.is_org_member(organization_id));
create policy eligibility_requirements_insert on public.eligibility_requirements for insert with check (public.has_org_role(organization_id, array['owner','admin','analyst']::public.organization_role[]) and created_by = auth.uid() and review_status = 'draft');
create policy eligibility_requirements_update on public.eligibility_requirements for update using (public.has_org_role(organization_id, array['owner','admin']::public.organization_role[])) with check (public.has_org_role(organization_id, array['owner','admin']::public.organization_role[]));

create policy eligibility_evaluations_select on public.eligibility_evaluations for select using (public.is_org_member(organization_id));
create policy eligibility_evaluations_insert on public.eligibility_evaluations for insert with check (public.has_org_role(organization_id, array['owner','admin','analyst']::public.organization_role[]) and evaluated_by = auth.uid());

create policy cross_business_evidence_select on public.cross_business_evidence for select using (public.is_org_member(organization_id));
create policy cross_business_evidence_insert on public.cross_business_evidence for insert with check (public.has_org_role(organization_id, array['owner','admin','analyst']::public.organization_role[]) and created_by = auth.uid() and verification_state = 'unverified');
create policy cross_business_evidence_update on public.cross_business_evidence for update using (public.has_org_role(organization_id, array['owner','admin']::public.organization_role[])) with check (public.has_org_role(organization_id, array['owner','admin']::public.organization_role[]));

create policy change_specification_cross_business_select on public.change_specification_cross_business_evidence for select using (public.is_org_member(organization_id));
create policy change_specification_cross_business_insert on public.change_specification_cross_business_evidence for insert with check (public.has_org_role(organization_id, array['owner','admin','analyst']::public.organization_role[]) and created_by = auth.uid());

revoke all on table public.company_truth_entities, public.company_truth_assertions, public.eligibility_requirements, public.eligibility_evaluations, public.cross_business_evidence, public.change_specification_cross_business_evidence from public, anon;
grant select on table public.company_truth_entities, public.company_truth_assertions, public.eligibility_requirements, public.eligibility_evaluations, public.cross_business_evidence, public.change_specification_cross_business_evidence to authenticated;
grant insert, update on table public.company_truth_entities, public.company_truth_assertions, public.eligibility_requirements, public.cross_business_evidence to authenticated;
grant insert on table public.eligibility_evaluations, public.change_specification_cross_business_evidence to authenticated;
grant select, insert, update, delete on table public.company_truth_entities, public.company_truth_assertions, public.eligibility_requirements, public.eligibility_evaluations, public.cross_business_evidence, public.change_specification_cross_business_evidence to service_role;

comment on table public.company_truth_entities is 'Tenant-scoped subjects for evidence-backed Company Truth v1. No AI-generated entity backfill.';
comment on table public.company_truth_assertions is 'Append-oriented Company Truth assertions. Verified assertions require current verified evidence and retain immutable source provenance.';
comment on table public.eligibility_requirements is 'Explicit evidence-backed requirements used by Eligibility Engine v1. Eligibility is not a company decision.';
comment on table public.eligibility_evaluations is 'Immutable deterministic Eligibility Engine v1 snapshots. No recommendation probability or decision-state output.';
comment on table public.cross_business_evidence is 'Normalized non-causal evidence from first-party business systems. Commercial imports require explicit customer organization linkage and exclude contact PII.';
comment on table public.change_specification_cross_business_evidence is 'Immutable links from verified cross-business evidence to Change Specifications.';

commit;