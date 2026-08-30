-- Foremention Outcome Intelligence + Customer Success
--
-- Extends the existing Recommendation Record -> reviewed resolution -> exact
-- follow-up chain without creating a parallel recommendation domain. Outcome
-- history is append-only, tenant-scoped, actor-aware, and never stores a causal
-- attribution claim. Customer-success records are empty by default: no customer,
-- health, renewal, or economic-value facts are seeded or inferred here.
begin;

create table public.outcome_ledger_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  recommendation_record_run_id uuid references public.runs(id) on delete restrict,
  resolution_asset_id uuid references public.resolution_assets(id) on delete restrict,
  resolution_asset_evidence_id uuid references public.resolution_asset_evidence(id) on delete restrict,
  source_id uuid references public.sources(id) on delete restrict,
  opportunity_id uuid references public.opportunities(id) on delete restrict,
  follow_up_id uuid references public.resolution_follow_ups(id) on delete restrict,
  event_type text not null check (event_type in ('observation','evidence','recommendation','decision','action','ownership','completion','measurement','outcome')),
  event_key text not null unique check (char_length(event_key) between 8 and 240),
  actor_id uuid references auth.users(id) on delete set null,
  actor_type text not null default 'user' check (actor_type in ('user','system')),
  occurred_at timestamptz not null,
  comparison_eligible boolean,
  comparison_reason text,
  confidence numeric(4,3) check (confidence is null or confidence between 0 and 1),
  limitations text[] not null default '{}',
  causal_attribution text not null default 'not_claimed' check (causal_attribution = 'not_claimed'),
  payload jsonb not null default '{}'::jsonb,
  supersedes_event_id uuid references public.outcome_ledger_events(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (jsonb_typeof(payload) = 'object'),
  check (
    recommendation_record_run_id is not null
    or resolution_asset_id is not null
    or source_id is not null
    or opportunity_id is not null
    or follow_up_id is not null
  ),
  check (comparison_eligible is null or event_type in ('measurement','outcome')),
  check (comparison_eligible is null or nullif(trim(comparison_reason), '') is not null)
);

create index outcome_ledger_workspace_idx
  on public.outcome_ledger_events (organization_id, project_id, occurred_at desc, id desc);
create index outcome_ledger_asset_idx
  on public.outcome_ledger_events (resolution_asset_id, occurred_at asc, id asc)
  where resolution_asset_id is not null;
create index outcome_ledger_record_idx
  on public.outcome_ledger_events (recommendation_record_run_id, occurred_at asc, id asc)
  where recommendation_record_run_id is not null;
create index outcome_ledger_attention_idx
  on public.outcome_ledger_events (organization_id, project_id, event_type, occurred_at desc);

create or replace function public.block_outcome_ledger_mutation() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  raise exception 'Outcome ledger events are append-only; record a superseding event instead';
end;
$$;

create trigger outcome_ledger_events_append_only
  before update or delete on public.outcome_ledger_events
  for each row execute function public.block_outcome_ledger_mutation();

create or replace function public.capture_resolution_outcome_event() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  event_actor uuid;
  event_time timestamptz;
  opportunity_owner uuid;
  opportunity_due timestamptz;
  opportunity_action text;
begin
  if tg_op = 'INSERT' then
    if new.baseline_run_id is not null then
      insert into public.outcome_ledger_events (
        organization_id, project_id, recommendation_record_run_id,
        resolution_asset_id, source_id, opportunity_id, event_type, event_key,
        actor_id, actor_type, occurred_at, limitations, payload
      ) values (
        new.organization_id, new.project_id, new.baseline_run_id,
        new.id, new.source_id, new.opportunity_id, 'observation',
        'resolution:' || new.id::text || ':observation',
        new.created_by, 'user', new.created_at, new.limitations,
        jsonb_build_object(
          'recommendationRecordRunId', new.baseline_run_id,
          'boundary', 'Persisted reviewed Recommendation Record baseline; observation is not a causal claim.'
        )
      ) on conflict (event_key) do nothing;
    end if;

    insert into public.outcome_ledger_events (
      organization_id, project_id, recommendation_record_run_id,
      resolution_asset_id, source_id, opportunity_id, event_type, event_key,
      actor_id, actor_type, occurred_at, limitations, payload
    ) values (
      new.organization_id, new.project_id, new.baseline_run_id,
      new.id, new.source_id, new.opportunity_id, 'recommendation',
      'resolution:' || new.id::text || ':recommendation',
      new.created_by, 'user', new.created_at, new.limitations,
      jsonb_build_object(
        'assetType', new.asset_type,
        'title', new.title,
        'problemStatement', new.problem_statement,
        'generationVersion', new.generation_version
      )
    ) on conflict (event_key) do nothing;

    select owner_id, due_at, next_action
      into opportunity_owner, opportunity_due, opportunity_action
    from public.opportunities where id = new.opportunity_id;
    if opportunity_owner is not null then
      insert into public.outcome_ledger_events (
        organization_id, project_id, recommendation_record_run_id,
        resolution_asset_id, source_id, opportunity_id, event_type, event_key,
        actor_id, actor_type, occurred_at, limitations, payload
      ) values (
        new.organization_id, new.project_id, new.baseline_run_id,
        new.id, new.source_id, new.opportunity_id, 'ownership',
        'resolution:' || new.id::text || ':ownership:initial',
        new.created_by, 'user', new.created_at, new.limitations,
        jsonb_build_object('ownerId', opportunity_owner, 'dueAt', opportunity_due, 'nextAction', opportunity_action)
      ) on conflict (event_key) do nothing;
    end if;
    return new;
  end if;

  if new.decision_at is not null and old.decision_at is distinct from new.decision_at then
    event_actor := new.decision_by;
    event_time := new.decision_at;
    insert into public.outcome_ledger_events (
      organization_id, project_id, recommendation_record_run_id,
      resolution_asset_id, source_id, opportunity_id, event_type, event_key,
      actor_id, actor_type, occurred_at, limitations, payload
    ) values (
      new.organization_id, new.project_id, new.baseline_run_id,
      new.id, new.source_id, new.opportunity_id, 'decision',
      'resolution:' || new.id::text || ':decision:' || replace(event_time::text, ' ', 'T'),
      event_actor, 'user', event_time, new.limitations,
      jsonb_build_object('reviewDecision', new.review_decision, 'note', new.approval_note)
    ) on conflict (event_key) do nothing;
  end if;

  if new.approved_at is not null and old.approved_at is distinct from new.approved_at then
    insert into public.outcome_ledger_events (
      organization_id, project_id, recommendation_record_run_id,
      resolution_asset_id, source_id, opportunity_id, event_type, event_key,
      actor_id, actor_type, occurred_at, limitations, payload
    ) values (
      new.organization_id, new.project_id, new.baseline_run_id,
      new.id, new.source_id, new.opportunity_id, 'action',
      'resolution:' || new.id::text || ':action:approved',
      new.approved_by, 'user', new.approved_at, new.limitations,
      jsonb_build_object('action', 'approved', 'title', new.title)
    ) on conflict (event_key) do nothing;
  end if;

  if new.applied_at is not null and old.applied_at is distinct from new.applied_at then
    insert into public.outcome_ledger_events (
      organization_id, project_id, recommendation_record_run_id,
      resolution_asset_id, source_id, opportunity_id, event_type, event_key,
      actor_id, actor_type, occurred_at, limitations, payload
    ) values (
      new.organization_id, new.project_id, new.baseline_run_id,
      new.id, new.source_id, new.opportunity_id, 'completion',
      'resolution:' || new.id::text || ':completion',
      new.applied_by, 'user', new.applied_at, new.limitations,
      jsonb_build_object('applicationReference', new.application_reference, 'applicationNote', new.application_note)
    ) on conflict (event_key) do nothing;
  end if;
  return new;
end;
$$;

create trigger resolution_assets_capture_outcome_event
  after insert or update on public.resolution_assets
  for each row execute function public.capture_resolution_outcome_event();

create or replace function public.capture_resolution_evidence_outcome_event() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  asset public.resolution_assets%rowtype;
begin
  select * into asset from public.resolution_assets where id = new.resolution_asset_id;
  if asset.id is null then return new; end if;
  insert into public.outcome_ledger_events (
    organization_id, project_id, recommendation_record_run_id,
    resolution_asset_id, resolution_asset_evidence_id, source_id, opportunity_id,
    event_type, event_key, actor_id, actor_type, occurred_at, limitations, payload
  ) values (
    new.organization_id, new.project_id, asset.baseline_run_id,
    asset.id, new.id, asset.source_id, asset.opportunity_id,
    'evidence', 'resolution-evidence:' || new.id::text,
    asset.created_by, 'user', new.created_at, asset.limitations,
    jsonb_build_object(
      'verification', new.evidence_snapshot ->> 'verification',
      'evidenceItemId', new.evidence_item_id,
      'sourceObservationId', new.source_observation_id,
      'evidenceLinkId', new.id
    )
  ) on conflict (event_key) do nothing;
  return new;
end;
$$;

create trigger resolution_asset_evidence_capture_outcome_event
  after insert on public.resolution_asset_evidence
  for each row execute function public.capture_resolution_evidence_outcome_event();

create or replace function public.capture_opportunity_ownership_outcome_event() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  asset record;
  event_stamp text;
begin
  if old.owner_id is not distinct from new.owner_id
    and old.due_at is not distinct from new.due_at
    and old.next_action is not distinct from new.next_action
  then return new; end if;
  event_stamp := replace(clock_timestamp()::text, ' ', 'T');
  for asset in
    select id, baseline_run_id, source_id, limitations
    from public.resolution_assets
    where opportunity_id = new.id and organization_id = new.organization_id and project_id = new.project_id
  loop
    insert into public.outcome_ledger_events (
      organization_id, project_id, recommendation_record_run_id,
      resolution_asset_id, source_id, opportunity_id, event_type, event_key,
      actor_id, actor_type, occurred_at, limitations, payload
    ) values (
      new.organization_id, new.project_id, asset.baseline_run_id,
      asset.id, asset.source_id, new.id, 'ownership',
      'opportunity:' || new.id::text || ':ownership:' || event_stamp || ':' || asset.id::text,
      auth.uid(), case when auth.uid() is null then 'system' else 'user' end,
      clock_timestamp(), asset.limitations,
      jsonb_build_object('ownerId', new.owner_id, 'dueAt', new.due_at, 'nextAction', new.next_action)
    ) on conflict (event_key) do nothing;
  end loop;
  return new;
end;
$$;

create trigger opportunities_capture_outcome_ownership
  after update of owner_id, due_at, next_action on public.opportunities
  for each row execute function public.capture_opportunity_ownership_outcome_event();

create or replace function public.capture_resolution_follow_up_outcome_event() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  asset public.resolution_assets%rowtype;
  eligible boolean;
  reason text;
  event_actor uuid;
begin
  select * into asset from public.resolution_assets where id = new.resolution_asset_id;
  if asset.id is null then return new; end if;

  if tg_op = 'INSERT' then
    insert into public.outcome_ledger_events (
      organization_id, project_id, recommendation_record_run_id,
      resolution_asset_id, source_id, opportunity_id, follow_up_id,
      event_type, event_key, actor_id, actor_type, occurred_at, limitations, payload
    ) values (
      new.organization_id, new.project_id, new.baseline_run_id,
      asset.id, asset.source_id, asset.opportunity_id, new.id,
      'measurement', 'follow-up:' || new.id::text || ':requested',
      new.requested_by, 'user', new.requested_at, array[new.limitation],
      jsonb_build_object('status', new.status, 'baselineRunId', new.baseline_run_id, 'followUpRunId', new.rerun_id)
    ) on conflict (event_key) do nothing;
    return new;
  end if;

  if old.status is distinct from new.status and new.status in ('complete','incomparable','failed','cancelled') then
    eligible := case when new.status = 'complete' then true when new.status = 'incomparable' then false else null end;
    reason := case
      when new.status in ('complete','incomparable') then coalesce(nullif(trim(new.outcome ->> 'interpretation'), ''), new.limitation)
      else 'Measurement ended with status ' || new.status || '; no observed outcome is reported.'
    end;
    event_actor := coalesce(new.recorded_by, new.requested_by);

    insert into public.outcome_ledger_events (
      organization_id, project_id, recommendation_record_run_id,
      resolution_asset_id, source_id, opportunity_id, follow_up_id,
      event_type, event_key, actor_id, actor_type, occurred_at,
      comparison_eligible, comparison_reason, limitations, payload
    ) values (
      new.organization_id, new.project_id, new.baseline_run_id,
      asset.id, asset.source_id, asset.opportunity_id, new.id,
      'measurement', 'follow-up:' || new.id::text || ':measurement:' || new.status,
      event_actor, case when event_actor is null then 'system' else 'user' end,
      coalesce(new.completed_at, clock_timestamp()), eligible, reason, array[new.limitation],
      jsonb_build_object('status', new.status, 'baselineRunId', new.baseline_run_id, 'followUpRunId', new.rerun_id)
    ) on conflict (event_key) do nothing;

    if new.status in ('complete','incomparable') then
      insert into public.outcome_ledger_events (
        organization_id, project_id, recommendation_record_run_id,
        resolution_asset_id, source_id, opportunity_id, follow_up_id,
        event_type, event_key, actor_id, actor_type, occurred_at,
        comparison_eligible, comparison_reason, limitations, payload
      ) values (
        new.organization_id, new.project_id, new.baseline_run_id,
        asset.id, asset.source_id, asset.opportunity_id, new.id,
        'outcome', 'follow-up:' || new.id::text || ':outcome:' || new.status,
        event_actor, case when event_actor is null then 'system' else 'user' end,
        coalesce(new.completed_at, clock_timestamp()), eligible, reason, array[new.limitation],
        jsonb_build_object(
          'status', new.status,
          'baselineRunId', new.baseline_run_id,
          'followUpRunId', new.rerun_id,
          'outcome', new.outcome
        )
      ) on conflict (event_key) do nothing;
    end if;
  end if;
  return new;
end;
$$;

create trigger resolution_follow_ups_capture_outcome_event
  after insert or update on public.resolution_follow_ups
  for each row execute function public.capture_resolution_follow_up_outcome_event();

create table public.customer_success_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  onboarding_plan jsonb not null default '{}'::jsonb,
  success_plan jsonb not null default '{}'::jsonb,
  account_goal text,
  champion_name text,
  champion_role text,
  executive_sponsor_name text,
  executive_sponsor_role text,
  activation_state text not null default 'not_started' check (activation_state in ('not_started','setup','baseline_ready','active','value_review_ready')),
  adoption_state text not null default 'unknown' check (adoption_state in ('unknown','low','developing','established')),
  adoption_basis text,
  health_score numeric(5,2) check (health_score is null or health_score between 0 and 100),
  health_score_basis text,
  health_score_updated_at timestamptz,
  renewal_risk text not null default 'unknown' check (renewal_risk in ('unknown','low','medium','high')),
  renewal_risk_basis text,
  next_qbr_at timestamptz,
  renewal_at timestamptz,
  expansion_opportunity text,
  advocate_readiness text not null default 'unknown' check (advocate_readiness in ('unknown','not_ready','candidate','ready')),
  notification_preferences jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, project_id),
  check (jsonb_typeof(onboarding_plan) in ('object','array')),
  check (jsonb_typeof(success_plan) in ('object','array')),
  check (jsonb_typeof(notification_preferences) = 'object'),
  check (health_score is null or nullif(trim(health_score_basis), '') is not null),
  check (health_score is not null or health_score_updated_at is null),
  check (adoption_state = 'unknown' or nullif(trim(adoption_basis), '') is not null),
  check (renewal_risk = 'unknown' or nullif(trim(renewal_risk_basis), '') is not null)
);

create index customer_success_profiles_workspace_idx
  on public.customer_success_profiles (organization_id, project_id);
create index customer_success_profiles_renewal_idx
  on public.customer_success_profiles (organization_id, renewal_at)
  where renewal_at is not null;

create trigger customer_success_profiles_updated_at
  before update on public.customer_success_profiles
  for each row execute function public.set_updated_at();

create table public.customer_success_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  customer_success_profile_id uuid not null references public.customer_success_profiles(id) on delete cascade,
  review_type text not null check (review_type in ('onboarding','success_review','qbr','business_value','renewal','expansion','advocacy')),
  period_start date,
  period_end date,
  summary text not null check (char_length(trim(summary)) between 3 and 5000),
  operational_value jsonb not null default '{}'::jsonb,
  economic_value_status text not null default 'not_demonstrated' check (economic_value_status in ('not_demonstrated','verified')),
  economic_value_amount numeric(16,2),
  economic_value_currency text,
  economic_value_basis text,
  health_score_snapshot numeric(5,2) check (health_score_snapshot is null or health_score_snapshot between 0 and 100),
  renewal_risk_snapshot text check (renewal_risk_snapshot is null or renewal_risk_snapshot in ('unknown','low','medium','high')),
  actor_id uuid not null references auth.users(id) on delete restrict,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (period_start is null or period_end is null or period_start <= period_end),
  check (jsonb_typeof(operational_value) = 'object'),
  check (
    (economic_value_status = 'not_demonstrated'
      and economic_value_amount is null
      and economic_value_currency is null)
    or
    (economic_value_status = 'verified'
      and economic_value_amount is not null
      and economic_value_amount >= 0
      and economic_value_currency ~ '^[A-Z]{3}$'
      and nullif(trim(economic_value_basis), '') is not null)
  )
);

create index customer_success_reviews_profile_idx
  on public.customer_success_reviews (customer_success_profile_id, occurred_at desc, id desc);
create index customer_success_reviews_workspace_idx
  on public.customer_success_reviews (organization_id, project_id, occurred_at desc);

create or replace function public.validate_customer_success_review() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.actor_id is distinct from auth.uid() then
    raise exception 'Customer-success review actor must match the authenticated user';
  end if;
  if not exists (
    select 1 from public.customer_success_profiles profile
    where profile.id = new.customer_success_profile_id
      and profile.organization_id = new.organization_id
      and profile.project_id = new.project_id
  ) then
    raise exception 'Customer-success review must belong to the same workspace profile';
  end if;
  return new;
end;
$$;

create trigger customer_success_reviews_validate
  before insert on public.customer_success_reviews
  for each row execute function public.validate_customer_success_review();

create or replace function public.block_customer_success_review_mutation() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  raise exception 'Customer-success reviews are historical records; add a new review instead of rewriting history';
end;
$$;

create trigger customer_success_reviews_append_only
  before update or delete on public.customer_success_reviews
  for each row execute function public.block_customer_success_review_mutation();

alter table public.outcome_ledger_events enable row level security;
alter table public.customer_success_profiles enable row level security;
alter table public.customer_success_reviews enable row level security;

create policy "outcome_ledger_events_select_member" on public.outcome_ledger_events
  for select using (public.is_org_member(organization_id));

create policy "customer_success_profiles_select_member" on public.customer_success_profiles
  for select using (public.is_org_member(organization_id));
create policy "customer_success_profiles_write_analyst" on public.customer_success_profiles
  for all using (public.has_org_role(organization_id, array['owner','analyst']::public.organization_role[]))
  with check (public.has_org_role(organization_id, array['owner','analyst']::public.organization_role[]));

create policy "customer_success_reviews_select_member" on public.customer_success_reviews
  for select using (public.is_org_member(organization_id));
create policy "customer_success_reviews_insert_analyst" on public.customer_success_reviews
  for insert with check (
    public.has_org_role(organization_id, array['owner','analyst']::public.organization_role[])
    and actor_id = auth.uid()
  );

revoke insert, update, delete on public.outcome_ledger_events from authenticated;
grant select on public.outcome_ledger_events to authenticated;
grant select, insert, update on public.customer_success_profiles to authenticated;
grant select, insert on public.customer_success_reviews to authenticated;

commit;
