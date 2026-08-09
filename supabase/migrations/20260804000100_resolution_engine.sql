-- Durable, evidence-grounded resolution assets and comparable follow-up records.
-- No provider output is generated here: every automatic asset must retain links
-- to evidence a workspace reviewer has already verified.
begin;

create table public.resolution_assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete restrict,
  source_id uuid not null references public.sources(id) on delete restrict,
  baseline_run_id uuid references public.runs(id) on delete set null,
  asset_type text not null check (asset_type in ('comparison_brief','faq_evidence_brief','source_page_brief')),
  title text not null check (char_length(title) between 3 and 200),
  problem_statement text not null check (char_length(problem_statement) between 3 and 1000),
  proposal jsonb not null,
  limitations text[] not null default '{}',
  generation_version text not null default 'resolution-1.0',
  customer_edited_by uuid references auth.users(id) on delete set null,
  customer_edited_at timestamptz,
  status text not null default 'draft' check (status in ('draft','in_review','approved','applied')),
  review_decision text not null default 'pending' check (review_decision in ('pending','approved','changes_requested','rejected')),
  created_by uuid not null references auth.users(id) on delete restrict,
  submitted_by uuid references auth.users(id) on delete set null,
  submitted_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  decision_by uuid references auth.users(id) on delete set null,
  decision_at timestamptz,
  approval_note text,
  applied_by uuid references auth.users(id) on delete set null,
  applied_at timestamptz,
  application_reference text,
  application_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(proposal) = 'object'),
  check (proposal ?& array['schemaVersion','assetType','headline','objective','draftSections','evidenceBoundary','nextStep']),
  check (proposal->>'assetType' = asset_type and jsonb_typeof(proposal->'draftSections') = 'array'),
  check (
    (status = 'draft' and review_decision = 'pending' and submitted_by is null and submitted_at is null and approved_by is null and approved_at is null and decision_by is null and decision_at is null and applied_by is null and applied_at is null)
    or (status = 'in_review' and review_decision = 'pending' and submitted_by is not null and submitted_at is not null and approved_by is null and approved_at is null and decision_by is null and decision_at is null and applied_by is null and applied_at is null)
    or (status = 'in_review' and review_decision in ('changes_requested','rejected') and submitted_by is not null and submitted_at is not null and approved_by is null and approved_at is null and decision_by is not null and decision_at is not null and applied_by is null and applied_at is null)
    or (status = 'approved' and review_decision = 'approved' and submitted_by is not null and submitted_at is not null and approved_by is not null and approved_at is not null and decision_by is not null and decision_at is not null and applied_by is null and applied_at is null)
    or (status = 'applied' and review_decision = 'approved' and submitted_by is not null and submitted_at is not null and approved_by is not null and approved_at is not null and decision_by is not null and decision_at is not null and applied_by is not null and applied_at is not null and nullif(trim(application_reference), '') is not null)
  )
);

create table public.resolution_asset_evidence (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  resolution_asset_id uuid not null references public.resolution_assets(id) on delete cascade,
  evidence_item_id uuid references public.evidence_items(id) on delete restrict,
  source_observation_id uuid references public.source_observations(id) on delete restrict,
  evidence_snapshot jsonb not null,
  created_at timestamptz not null default now(),
  check ((evidence_item_id is not null)::integer + (source_observation_id is not null)::integer = 1),
  check (jsonb_typeof(evidence_snapshot) = 'object' and evidence_snapshot->>'verification' = 'verified')
);

create unique index resolution_asset_evidence_item_unique
  on public.resolution_asset_evidence (resolution_asset_id, evidence_item_id)
  where evidence_item_id is not null;
create unique index resolution_asset_source_observation_unique
  on public.resolution_asset_evidence (resolution_asset_id, source_observation_id)
  where source_observation_id is not null;

create table public.resolution_follow_ups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  resolution_asset_id uuid not null references public.resolution_assets(id) on delete cascade,
  baseline_run_id uuid not null references public.runs(id) on delete restrict,
  rerun_id uuid references public.runs(id) on delete restrict,
  status text not null default 'requested' check (status in ('requested','queued','complete','incomparable','failed','cancelled')),
  requested_by uuid not null references auth.users(id) on delete restrict,
  requested_at timestamptz not null default now(),
  recorded_by uuid references auth.users(id) on delete set null,
  completed_at timestamptz,
  outcome jsonb not null default '{}'::jsonb,
  limitation text not null default 'Observed before-and-after association only; Foremention does not claim the applied asset caused the change.',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(outcome) = 'object'),
  check (
    (status = 'requested' and rerun_id is null and completed_at is null and outcome = '{}'::jsonb)
    or (status = 'queued' and rerun_id is not null and completed_at is null and outcome = '{}'::jsonb)
    or (status = 'complete' and rerun_id is not null and completed_at is not null and outcome <> '{}'::jsonb)
    or (status in ('incomparable','failed','cancelled') and rerun_id is not null and completed_at is not null)
  )
);

create index resolution_assets_workspace_idx on public.resolution_assets (organization_id, project_id, created_at desc);
create index resolution_assets_opportunity_idx on public.resolution_assets (opportunity_id, status);
create unique index resolution_assets_opportunity_unique on public.resolution_assets (organization_id, project_id, opportunity_id);
create index resolution_asset_evidence_asset_idx on public.resolution_asset_evidence (resolution_asset_id);
create index resolution_follow_ups_asset_idx on public.resolution_follow_ups (resolution_asset_id, requested_at desc);
create unique index resolution_follow_ups_one_active_idx on public.resolution_follow_ups (resolution_asset_id)
  where status in ('requested','queued');

create trigger resolution_assets_updated_at before update on public.resolution_assets
  for each row execute function public.set_updated_at();
create trigger resolution_follow_ups_updated_at before update on public.resolution_follow_ups
  for each row execute function public.set_updated_at();

create or replace function public.validate_resolution_asset() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  linked_source_id uuid;
  linked_org_id uuid;
  linked_project_id uuid;
begin
  select opportunity.source_id, opportunity.organization_id, opportunity.project_id
    into linked_source_id, linked_org_id, linked_project_id
  from public.opportunities opportunity where opportunity.id = new.opportunity_id;
  if linked_source_id is null or linked_org_id <> new.organization_id or linked_project_id <> new.project_id or linked_source_id <> new.source_id then
    raise exception 'Resolution opportunity must belong to the same workspace and source';
  end if;

  if new.baseline_run_id is not null and not exists (
    select 1 from public.runs run
    where run.id = new.baseline_run_id and run.organization_id = new.organization_id
      and run.project_id = new.project_id and run.status in ('review','complete','partial')
  ) then
    raise exception 'Resolution baseline must be a reviewed workspace run';
  end if;

  if tg_op = 'UPDATE' then
    if old.organization_id is distinct from new.organization_id
      or old.project_id is distinct from new.project_id
      or old.opportunity_id is distinct from new.opportunity_id
      or old.source_id is distinct from new.source_id
      or old.baseline_run_id is distinct from new.baseline_run_id
      or old.created_by is distinct from new.created_by
      or old.created_at is distinct from new.created_at
    then
      raise exception 'Resolution identity and evidence baseline are immutable';
    end if;
    if old.status <> new.status and not (
      (old.status = 'draft' and new.status = 'in_review')
      or (old.status = 'in_review' and new.status = 'approved')
      or (old.status = 'approved' and new.status = 'applied')
    ) then
      raise exception 'Resolution state transitions are forward-only';
    end if;
    if old.status = 'draft' and new.status = 'in_review' and not exists (
      select 1 from public.resolution_asset_evidence linked where linked.resolution_asset_id = new.id
    ) then
      raise exception 'A resolution requires verified linked evidence before review';
    end if;
    if old.status <> 'draft' and not (old.status = 'in_review' and old.review_decision = 'changes_requested' and new.status = 'in_review' and new.review_decision = 'pending') and (
      old.asset_type is distinct from new.asset_type
      or old.title is distinct from new.title
      or old.problem_statement is distinct from new.problem_statement
      or old.proposal is distinct from new.proposal
      or old.limitations is distinct from new.limitations
      or old.opportunity_id is distinct from new.opportunity_id
      or old.source_id is distinct from new.source_id
      or old.baseline_run_id is distinct from new.baseline_run_id
    ) then
      raise exception 'A submitted resolution asset is immutable';
    end if;
    if old.status = 'draft' and new.status = 'in_review' and new.submitted_by is distinct from auth.uid() then
      raise exception 'The submitting actor must match the authenticated user';
    end if;
    if new.decision_at is not null and new.decision_at is distinct from old.decision_at and new.decision_by is distinct from auth.uid() then
      raise exception 'The decision actor must match the authenticated user';
    end if;
    if new.approved_at is not null and new.approved_at is distinct from old.approved_at and new.approved_by is distinct from auth.uid() then
      raise exception 'The approving actor must match the authenticated user';
    end if;
    if new.applied_at is not null and new.applied_at is distinct from old.applied_at and new.applied_by is distinct from auth.uid() then
      raise exception 'The applying actor must match the authenticated user';
    end if;
    if new.customer_edited_at is not null and new.customer_edited_at is distinct from old.customer_edited_at and new.customer_edited_by is distinct from auth.uid() then
      raise exception 'The editing actor must match the authenticated user';
    end if;
    if old.status in ('approved','applied') and (
      old.submitted_by is distinct from new.submitted_by
      or old.submitted_at is distinct from new.submitted_at
      or old.approved_by is distinct from new.approved_by
      or old.approved_at is distinct from new.approved_at
      or old.decision_by is distinct from new.decision_by
      or old.decision_at is distinct from new.decision_at
      or old.approval_note is distinct from new.approval_note
    ) then
      raise exception 'Recorded approval history is immutable';
    end if;
  end if;
  return new;
end;
$$;

create trigger validate_resolution_asset_before_write
  before insert or update on public.resolution_assets
  for each row execute function public.validate_resolution_asset();

create or replace function public.validate_resolution_asset_evidence() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  asset public.resolution_assets%rowtype;
begin
  select * into asset from public.resolution_assets where id = coalesce(new.resolution_asset_id, old.resolution_asset_id);
  if asset.id is null or asset.status <> 'draft' then raise exception 'Evidence links can change only while a resolution is a draft'; end if;
  if tg_op = 'DELETE' then return old; end if;
  if new.organization_id <> asset.organization_id or new.project_id <> asset.project_id then raise exception 'Resolution evidence must belong to the same workspace'; end if;

  if new.evidence_item_id is not null and not exists (
    select 1 from public.evidence_items evidence
    where evidence.id = new.evidence_item_id and evidence.organization_id = asset.organization_id
      and evidence.project_id = asset.project_id and evidence.verification_status = 'verified'
      and evidence.source_url is not null and nullif(trim(evidence.usage_rights), '') is not null
      and (evidence.expires_at is null or evidence.expires_at > now())
  ) then
    raise exception 'Resolution assets can use only current verified evidence items';
  end if;

  if new.source_observation_id is not null and not exists (
    select 1
    from public.source_observations observation
    join public.run_answers answer on answer.id = observation.run_answer_id and answer.organization_id = observation.organization_id
    join public.runs run on run.id = answer.run_id and run.organization_id = observation.organization_id
    where observation.id = new.source_observation_id and observation.organization_id = asset.organization_id
      and observation.source_id = asset.source_id and observation.review_status = 'verified'
      and answer.review_status = 'verified' and run.project_id = asset.project_id
      and run.status in ('review','complete','partial')
  ) then
    raise exception 'Resolution assets can use only reviewed observations from the same project and opportunity source';
  end if;
  return new;
end;
$$;

create trigger validate_resolution_asset_evidence_before_write
  before insert or update or delete on public.resolution_asset_evidence
  for each row execute function public.validate_resolution_asset_evidence();

create or replace function public.validate_resolution_follow_up() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  asset public.resolution_assets%rowtype;
  baseline_provider_ids text[];
  rerun_provider_ids text[];
  baseline_run public.runs%rowtype;
  follow_up_run public.runs%rowtype;
begin
  select * into asset from public.resolution_assets where id = new.resolution_asset_id;
  if asset.id is null or asset.status <> 'applied' or asset.organization_id <> new.organization_id or asset.project_id <> new.project_id then
    raise exception 'Follow-up measurement requires an applied resolution in the same workspace';
  end if;
  if new.baseline_run_id <> asset.baseline_run_id then raise exception 'Follow-up baseline must match the resolution evidence baseline'; end if;

  if tg_op = 'UPDATE' then
    if old.organization_id is distinct from new.organization_id
      or old.project_id is distinct from new.project_id
      or old.resolution_asset_id is distinct from new.resolution_asset_id
      or old.baseline_run_id is distinct from new.baseline_run_id
      or old.requested_by is distinct from new.requested_by
      or old.requested_at is distinct from new.requested_at
      or (old.rerun_id is not null and old.rerun_id is distinct from new.rerun_id)
    then
      raise exception 'Follow-up identity, baseline, requester, and attached run are immutable';
    end if;
    if old.status in ('complete','incomparable','failed','cancelled') and (
      old.status is distinct from new.status
      or old.completed_at is distinct from new.completed_at
      or old.outcome is distinct from new.outcome
      or old.recorded_by is distinct from new.recorded_by
    ) then
      raise exception 'A terminal follow-up measurement is immutable';
    end if;
  end if;
  select provider_ids into baseline_provider_ids from public.runs
    where id = new.baseline_run_id and organization_id = new.organization_id and project_id = new.project_id and status in ('review','complete','partial');
  if baseline_provider_ids is null then raise exception 'Follow-up baseline must be a reviewed workspace run'; end if;

  if new.rerun_id is not null then
    select * into follow_up_run from public.runs
      where id = new.rerun_id and organization_id = new.organization_id and project_id = new.project_id;
    rerun_provider_ids := follow_up_run.provider_ids;
    if rerun_provider_ids is null or rerun_provider_ids <> baseline_provider_ids then raise exception 'Follow-up run must use the baseline providers'; end if;
    if follow_up_run.id = new.baseline_run_id or follow_up_run.created_at < new.requested_at then
      raise exception 'Follow-up run must be created after the comparable measurement request';
    end if;
    if exists (
      (select prompt_id from public.run_prompt_selections where run_id = new.baseline_run_id
       except select prompt_id from public.run_prompt_selections where run_id = new.rerun_id)
      union all
      (select prompt_id from public.run_prompt_selections where run_id = new.rerun_id
       except select prompt_id from public.run_prompt_selections where run_id = new.baseline_run_id)
    ) then raise exception 'Follow-up run must use the baseline buyer questions'; end if;
  end if;

  if new.status = 'complete' then
    select * into baseline_run from public.runs where id = new.baseline_run_id;
    select * into follow_up_run from public.runs where id = new.rerun_id;
    if follow_up_run.status not in ('complete','partial') then raise exception 'Follow-up outcome requires a completed comparable run'; end if;
    if not exists (select 1 from public.run_answers where run_id = baseline_run.id)
      or not exists (select 1 from public.run_answers where run_id = follow_up_run.id)
      or exists (select 1 from public.run_answers where run_id in (baseline_run.id, follow_up_run.id) and nullif(trim(model), '') is null)
      or exists (
      (select distinct provider, coalesce(model, '') from public.run_answers where run_id = baseline_run.id
       except select distinct provider, coalesce(model, '') from public.run_answers where run_id = follow_up_run.id)
      union all
      (select distinct provider, coalesce(model, '') from public.run_answers where run_id = follow_up_run.id
       except select distinct provider, coalesce(model, '') from public.run_answers where run_id = baseline_run.id)
    ) then
      new.status := 'incomparable';
      new.outcome := jsonb_build_object(
        'baselineRunId', baseline_run.id,
        'followUpRunId', follow_up_run.id,
        'interpretation', 'Foremention could not verify the same explicit provider model across both runs, so it did not calculate a comparable before-and-after result.'
      );
    else
      new.outcome := jsonb_build_object(
        'baselineRunId', baseline_run.id,
        'followUpRunId', follow_up_run.id,
        'baselineCompletedAt', baseline_run.completed_at,
        'followUpCompletedAt', follow_up_run.completed_at,
        'brandPresencePct', jsonb_build_object('before', baseline_run.brand_presence_pct, 'after', follow_up_run.brand_presence_pct, 'delta', follow_up_run.brand_presence_pct - baseline_run.brand_presence_pct),
        'firstMentionPct', jsonb_build_object('before', baseline_run.first_mention_pct, 'after', follow_up_run.first_mention_pct, 'delta', follow_up_run.first_mention_pct - baseline_run.first_mention_pct),
        'citationCount', jsonb_build_object('before', baseline_run.citation_count, 'after', follow_up_run.citation_count, 'delta', follow_up_run.citation_count - baseline_run.citation_count),
        'newSourceCount', jsonb_build_object('before', baseline_run.new_source_count, 'after', follow_up_run.new_source_count, 'delta', follow_up_run.new_source_count - baseline_run.new_source_count),
        'interpretation', 'Observed before-and-after association only. This record does not establish that the applied resolution caused the change.'
      );
    end if;
    new.completed_at := coalesce(new.completed_at, now());
  elsif new.status in ('failed','cancelled') and new.rerun_id is not null and not exists (
    select 1 from public.runs run where run.id = new.rerun_id and run.status::text = new.status
  ) then
    raise exception 'Follow-up failure state must match the recorded run';
  end if;

  if tg_op = 'UPDATE' and old.status <> new.status and not (
    (old.status = 'requested' and new.status in ('queued','failed','cancelled'))
    or (old.status = 'queued' and new.status in ('complete','incomparable','failed','cancelled'))
  ) then raise exception 'Follow-up state transition is not valid'; end if;
  return new;
end;
$$;

create trigger validate_resolution_follow_up_before_write
  before insert or update on public.resolution_follow_ups
  for each row execute function public.validate_resolution_follow_up();

-- Keep comparable measurements in sync for every run-completion path (manual
-- review, background failure, or cancellation). This is authoritative; the
-- application helper also reconciles a run that was already terminal when it
-- was attached to a follow-up request.
create or replace function public.finalize_resolution_follow_up_from_run() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status in ('complete','partial','failed','cancelled') and old.status is distinct from new.status then
    update public.resolution_follow_ups
      set status = case when new.status in ('complete','partial') then 'complete' else new.status::text end,
          completed_at = coalesce(new.completed_at, now())
      where organization_id = new.organization_id and rerun_id = new.id and status = 'queued';
  end if;
  return new;
end;
$$;

revoke all on function public.finalize_resolution_follow_up_from_run() from public;

create trigger finalize_resolution_follow_up_after_run
  after update of status on public.runs
  for each row execute function public.finalize_resolution_follow_up_from_run();

alter table public.resolution_assets enable row level security;
alter table public.resolution_asset_evidence enable row level security;
alter table public.resolution_follow_ups enable row level security;

create policy "resolution_assets_select_member" on public.resolution_assets for select
  using (public.is_org_member(organization_id));
create policy "resolution_assets_insert_analyst" on public.resolution_assets for insert
  with check (status = 'draft' and created_by = auth.uid() and public.has_org_role(organization_id, array['owner','admin','analyst']::public.organization_role[]));
create policy "resolution_assets_update_analyst_draft" on public.resolution_assets for update
  using ((status = 'draft' or (status = 'in_review' and review_decision = 'changes_requested')) and public.has_org_role(organization_id, array['analyst']::public.organization_role[]))
  with check ((status = 'draft' or (status = 'in_review' and review_decision = 'pending')) and public.has_org_role(organization_id, array['analyst']::public.organization_role[]));
create policy "resolution_assets_update_manager" on public.resolution_assets for update
  using (public.has_org_role(organization_id, array['owner','admin']::public.organization_role[]))
  with check (public.has_org_role(organization_id, array['owner','admin']::public.organization_role[]));
create policy "resolution_assets_delete_manager_draft" on public.resolution_assets for delete
  using (status = 'draft' and public.has_org_role(organization_id, array['owner','admin']::public.organization_role[]));

create policy "resolution_asset_evidence_select_member" on public.resolution_asset_evidence for select
  using (public.is_org_member(organization_id));
create policy "resolution_asset_evidence_write_analyst" on public.resolution_asset_evidence for all
  using (public.has_org_role(organization_id, array['owner','admin','analyst']::public.organization_role[]))
  with check (public.has_org_role(organization_id, array['owner','admin','analyst']::public.organization_role[]));

create policy "resolution_follow_ups_select_member" on public.resolution_follow_ups for select
  using (public.is_org_member(organization_id));
create policy "resolution_follow_ups_insert_analyst" on public.resolution_follow_ups for insert
  with check (status = 'requested' and requested_by = auth.uid() and public.has_org_role(organization_id, array['owner','admin','analyst']::public.organization_role[]));
create policy "resolution_follow_ups_update_analyst" on public.resolution_follow_ups for update
  using (public.has_org_role(organization_id, array['owner','admin','analyst']::public.organization_role[]))
  with check ((recorded_by is null or recorded_by = auth.uid()) and public.has_org_role(organization_id, array['owner','admin','analyst']::public.organization_role[]));

grant select, insert, update, delete on public.resolution_assets to authenticated;
grant select, insert, update, delete on public.resolution_asset_evidence to authenticated;
grant select, insert, update on public.resolution_follow_ups to authenticated;

commit;
