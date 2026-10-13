-- Chat04 (attach-v1/04) PROPOSAL for FM-00 — NOT an applied migration.
-- Backlog: CV-05 (Commercial_Backlog_18.csv:5), A15 / A14 (Master_Backlog_29.csv:15/14, _24.csv:15/14).
-- Owner of the SQL decision: FM-00 (shared migrations). Owner of the callers: Chat04
--   app/api/records/[id]/decision/route.ts, app/api/customer-value-loop/route.ts,
--   lib/record-decisions.ts, lib/customer-value-loop.ts.
-- Adoption: copy unchanged to supabase/migrations/20261013140000_chat04_customer_value_loop_persistence.sql
-- (sorts after FM-00's 20261013100000 and Chat08's held 20261013120000; independent of both).
-- Validated on disposable PGlite only (see 04-status.md, 2026-10-13 A11/CV-05 note). Never applied to production.
-- PRODUCTION: apply only after a verified backup / recovery point (00-proposals/release-and-rollback-plan.md)
-- and a Postgres-17 replay on a disposable Supabase project.
--
-- Additive only: one new table for question-set epochs, one new decision table, nullable columns
-- on runs / run_answers (historical rows stay NULL = unknown; nothing is backfilled or inferred),
-- triggers that stamp provenance from facts the database already has, and two SECURITY DEFINER RPCs.
-- Not included (deliberately): zero-question setup_only in complete_onboarding — FM-00 deferred it
-- "until the founder wants it" (reconciliation-71.csv A28); 1–5 approved questions stays enforced.
--
-- Rollback (before any customer decision is written): drop the two RPCs, the triggers/functions,
-- table public.record_decisions, table public.project_question_set_versions and the four columns.
-- After decisions exist, export them first; dropping record_decisions deletes human decisions.

begin;

-- ---------------------------------------------------------------------------
-- 1. Approved question-set version (epoch) per project.
--    Any change to the ACTIVE question set of a project (add, retire, reactivate, reword,
--    locale/market change, move between projects) bumps the epoch. Runs record the epoch at
--    dispatch, so a later cycle is comparable only against the same approved set.
-- ---------------------------------------------------------------------------
create table public.project_question_set_versions (
  project_id uuid primary key references public.projects(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  version integer not null default 1 check (version > 0),
  changed_at timestamptz not null default now()
);
comment on table public.project_question_set_versions is
  'Chat04/CV-05: monotonically increasing approved buyer-question set epoch per project. Written only by trigger.';

alter table public.project_question_set_versions enable row level security;
create policy project_question_set_versions_select_member on public.project_question_set_versions
  for select to authenticated using ((select private.is_org_member(organization_id)));
revoke all on table public.project_question_set_versions from public, anon, authenticated;
grant select on table public.project_question_set_versions to authenticated;
grant all on table public.project_question_set_versions to service_role;

-- Epoch 1 for every existing project. This is a starting point, not a claim about history:
-- runs created before this migration keep question_set_version NULL (unknown).
insert into public.project_question_set_versions (project_id, organization_id, version)
select project.id, project.organization_id, 1 from public.projects project
on conflict (project_id) do nothing;

create or replace function private.bump_project_question_set_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_scope record;
begin
  if tg_op = 'INSERT' then
    if not new.active then return null; end if;
  elsif tg_op = 'DELETE' then
    if not old.active then return null; end if;
  else
    if old.active is not distinct from new.active
      and old.prompt_text is not distinct from new.prompt_text
      and old.locale is not distinct from new.locale
      and old.market is not distinct from new.market
      and old.project_id is not distinct from new.project_id
      and old.organization_id is not distinct from new.organization_id then
      return null;
    end if;
    -- Editing a question that is inactive before and after does not change the approved set.
    if not (old.active or new.active) then return null; end if;
  end if;

  for v_scope in
    select distinct scope.organization_id, scope.project_id
    from (values
      (case when tg_op <> 'INSERT' then old.organization_id end, case when tg_op <> 'INSERT' then old.project_id end),
      (case when tg_op <> 'DELETE' then new.organization_id end, case when tg_op <> 'DELETE' then new.project_id end)
    ) as scope(organization_id, project_id)
    where scope.project_id is not null
  loop
    update public.project_question_set_versions current_set
       set version = current_set.version + 1, changed_at = now()
     where current_set.project_id = v_scope.project_id;
    if not found then
      -- Only for a project that still exists: a cascading workspace deletion must not resurrect it.
      insert into public.project_question_set_versions as current_set (project_id, organization_id, version, changed_at)
      select v_scope.project_id, v_scope.organization_id, 1, now()
      where exists (select 1 from public.projects project where project.id = v_scope.project_id)
      on conflict (project_id) do update
        set version = current_set.version + 1, changed_at = now();
    end if;
  end loop;
  return null;
end;
$$;
revoke all on function private.bump_project_question_set_version() from public, anon, authenticated;

drop trigger if exists prompts_bump_question_set_version on public.prompts;
create trigger prompts_bump_question_set_version
  after insert or update or delete on public.prompts
  for each row execute function private.bump_project_question_set_version();

-- ---------------------------------------------------------------------------
-- 2. Run cycle identity: approved question-set version + origin.
--    question_set_version is stamped by the database at insert (client value ignored).
--    cycle_origin: 'customer_cycle' when a signed-in member creates the run through the app;
--    service-role writers (workers/schedulers/fixtures) must set it explicitly, otherwise it stays
--    NULL = unknown. Only 'customer_cycle' can ever close customer proof (closesCustomerProof).
-- ---------------------------------------------------------------------------
alter table public.runs
  add column if not exists question_set_version integer
    check (question_set_version is null or question_set_version > 0),
  add column if not exists cycle_origin text
    check (cycle_origin is null or cycle_origin in ('customer_cycle', 'fixture'));
comment on column public.runs.question_set_version is
  'Chat04/CV-05: approved buyer-question set epoch at dispatch (project_question_set_versions). NULL = unknown (pre-migration).';
comment on column public.runs.cycle_origin is
  'Chat04/CV-05: customer_cycle | fixture | NULL (unknown). Fixtures and unknown never close customer proof.';

create or replace function private.stamp_run_cycle_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.question_set_version := (
      select current_set.version
      from public.project_question_set_versions current_set
      where current_set.project_id = new.project_id
        and current_set.organization_id = new.organization_id
    );
    if new.cycle_origin is null and auth.uid() is not null then
      new.cycle_origin := 'customer_cycle';
    end if;
    return new;
  end if;
  if new.question_set_version is distinct from old.question_set_version then
    raise exception 'Run question-set version is immutable';
  end if;
  if old.cycle_origin is not null and new.cycle_origin is distinct from old.cycle_origin then
    raise exception 'Run cycle origin is immutable once recorded';
  end if;
  return new;
end;
$$;
revoke all on function private.stamp_run_cycle_identity() from public, anon, authenticated;

drop trigger if exists runs_stamp_cycle_identity on public.runs;
create trigger runs_stamp_cycle_identity
  before insert or update on public.runs
  for each row execute function private.stamp_run_cycle_identity();

-- ---------------------------------------------------------------------------
-- 3. Per-answer sampling and observation method (comparison context beyond the nine fields
--    already stamped into run_answers.measurement_context_json).
--    Derived ONLY from what the provider adapter recorded in raw_json
--    (raw.observationMethod is written by Chat01 adapters today; raw.sampling is a Chat01 request).
--    Direct writes are overwritten by the derivation, so provenance cannot drift from raw_json.
--    Missing => NULL => assessLaterCycle reports "not comparable", never a guessed value.
-- ---------------------------------------------------------------------------
alter table public.run_answers
  add column if not exists observation_method text
    check (observation_method is null or char_length(observation_method) between 1 and 120),
  add column if not exists sampling_json jsonb
    check (sampling_json is null or jsonb_typeof(sampling_json) = 'object');
comment on column public.run_answers.observation_method is
  'Chat04/CV-05: raw_json.observationMethod as recorded by the provider adapter; NULL = unavailable.';
comment on column public.run_answers.sampling_json is
  'Chat04/CV-05: raw_json.sampling object (temperature/top_p/sample count) as recorded by the adapter; NULL = unavailable.';

create or replace function private.stamp_run_answer_observation_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_method text;
begin
  if tg_op = 'UPDATE' and new.raw_json is not distinct from old.raw_json then
    new.observation_method := old.observation_method;
    new.sampling_json := old.sampling_json;
    return new;
  end if;
  v_method := case
    when jsonb_typeof(new.raw_json) = 'object' and jsonb_typeof(new.raw_json -> 'observationMethod') = 'string'
      then nullif(btrim(new.raw_json ->> 'observationMethod'), '')
  end;
  new.observation_method := case when char_length(v_method) <= 120 then v_method end;
  new.sampling_json := case
    when jsonb_typeof(new.raw_json) = 'object' and jsonb_typeof(new.raw_json -> 'sampling') = 'object'
      then new.raw_json -> 'sampling'
  end;
  return new;
end;
$$;
revoke all on function private.stamp_run_answer_observation_identity() from public, anon, authenticated;

drop trigger if exists stamp_run_answer_observation_identity on public.run_answers;
create trigger stamp_run_answer_observation_identity
  before insert or update on public.run_answers
  for each row execute function private.stamp_run_answer_observation_identity();

-- ---------------------------------------------------------------------------
-- 4. Human decisions on a reviewed Recommendation Record (CV-05 / A15).
--    One row per saved human decision: Change Specification decision, explicit no-action,
--    or reviewer disagreement. save_key gives lost-ACK reconciliation without duplicates.
--    Explicit no-action and disagreement never carry a fabricated owner/action/date.
--    An APPROVED actionable (DO_NOW / TEST_FIRST) Change Specification decision must have an
--    owner (user or role), an action and a due date. Approved decisions are immutable.
-- ---------------------------------------------------------------------------
create table public.record_decisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  baseline_run_id uuid not null references public.runs(id) on delete cascade,
  save_key text not null check (save_key ~ '^[A-Za-z0-9_-]{16,128}$'),
  decision_kind text not null check (decision_kind in ('change_specification', 'no_action', 'reviewer_disagreement')),
  decision_state text not null check (decision_state in ('DO_NOW', 'TEST_FIRST', 'DO_NOT_DO', 'MONITOR_ONLY', 'INSUFFICIENT_EVIDENCE')),
  rationale text not null check (char_length(btrim(rationale)) between 3 and 2000),
  change_specification_id uuid references public.change_specifications(id) on delete set null,
  decided_by uuid not null references auth.users(id) on delete restrict,
  decided_at timestamptz not null default now(),
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  owner_id uuid references auth.users(id) on delete set null,
  owner_role text check (owner_role is null or char_length(btrim(owner_role)) between 2 and 80),
  action_summary text check (action_summary is null or char_length(btrim(action_summary)) between 3 and 2000),
  due_date date,
  updated_at timestamptz not null default now(),
  constraint record_decisions_save_key_unique unique (organization_id, project_id, save_key),
  constraint record_decisions_approval_pair check ((approved_by is null) = (approved_at is null)),
  constraint record_decisions_no_fabricated_owner check (
    decision_kind = 'change_specification'
    or (owner_id is null and owner_role is null and action_summary is null and due_date is null
        and approved_by is null and change_specification_id is null)
  ),
  constraint record_decisions_no_action_state check (
    decision_kind <> 'no_action' or decision_state in ('DO_NOT_DO', 'MONITOR_ONLY', 'INSUFFICIENT_EVIDENCE')
  ),
  constraint record_decisions_approved_action_complete check (
    approved_by is null
    or decision_state not in ('DO_NOW', 'TEST_FIRST')
    or ((owner_id is not null or owner_role is not null) and action_summary is not null and due_date is not null)
  )
);
comment on table public.record_decisions is
  'Chat04/CV-05/A15: saved human decision on a reviewed Record (change_specification | no_action | reviewer_disagreement). Written only via save_record_decision / complete_record_decision_action.';

create index record_decisions_workspace_idx
  on public.record_decisions (organization_id, project_id, decided_at desc);
create index record_decisions_baseline_idx
  on public.record_decisions (baseline_run_id, decided_at desc);
create index record_decisions_change_specification_idx
  on public.record_decisions (change_specification_id) where change_specification_id is not null;
create index record_decisions_owner_idx
  on public.record_decisions (owner_id) where owner_id is not null;
create index record_decisions_decided_by_idx on public.record_decisions (decided_by);
create index record_decisions_approved_by_idx on public.record_decisions (approved_by) where approved_by is not null;

alter table public.record_decisions enable row level security;
create policy record_decisions_select_member on public.record_decisions
  for select to authenticated using ((select private.is_org_member(organization_id)));
revoke all on table public.record_decisions from public, anon, authenticated;
grant select on table public.record_decisions to authenticated;
grant all on table public.record_decisions to service_role;

create or replace function private.guard_record_decision()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.runs run
    where run.id = new.baseline_run_id
      and run.organization_id = new.organization_id
      and run.project_id = new.project_id
      and run.status in ('review', 'complete', 'partial')
  ) then
    raise exception 'Decision baseline must be a reviewed Record in the same project' using errcode = 'PT404';
  end if;
  if new.change_specification_id is not null and not exists (
    select 1 from public.change_specifications spec
    where spec.id = new.change_specification_id
      and spec.organization_id = new.organization_id
      and spec.project_id = new.project_id
  ) then
    raise exception 'Linked Change Specification must belong to the same project' using errcode = 'PT404';
  end if;
  if tg_op = 'UPDATE' then
    if old.organization_id is distinct from new.organization_id
      or old.project_id is distinct from new.project_id
      or old.baseline_run_id is distinct from new.baseline_run_id
      or old.save_key is distinct from new.save_key
      or old.decision_kind is distinct from new.decision_kind
      or old.decision_state is distinct from new.decision_state
      or old.rationale is distinct from new.rationale
      or old.decided_by is distinct from new.decided_by
      or old.decided_at is distinct from new.decided_at then
      raise exception 'A saved decision''s identity and body are immutable' using errcode = 'PT409';
    end if;
    if old.approved_by is not null and (
      old.approved_by is distinct from new.approved_by
      or old.approved_at is distinct from new.approved_at
      or old.owner_id is distinct from new.owner_id
      or old.owner_role is distinct from new.owner_role
      or old.action_summary is distinct from new.action_summary
      or old.due_date is distinct from new.due_date
      or old.change_specification_id is distinct from new.change_specification_id
    ) then
      raise exception 'An approved decision is immutable' using errcode = 'PT409';
    end if;
    new.updated_at := now();
  end if;
  return new;
end;
$$;
revoke all on function private.guard_record_decision() from public, anon, authenticated;

create trigger record_decisions_guard
  before insert or update on public.record_decisions
  for each row execute function private.guard_record_decision();

-- Idempotent save. Returns {id, outcome: created|existing}. Same key + same Record/kind is
-- the lost-ACK replay and returns the stored row; same key for a different Record or kind is
-- a conflict (PT409). Caller identity always comes from auth.uid(), never from the client.
create or replace function public.save_record_decision(
  p_organization_id uuid,
  p_project_id uuid,
  p_baseline_run_id uuid,
  p_save_key text,
  p_decision_kind text,
  p_decision_state text,
  p_rationale text,
  p_owner_id uuid default null,
  p_owner_role text default null,
  p_action_summary text default null,
  p_due_date date default null,
  p_change_specification_id uuid default null,
  p_approve boolean default false
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_existing public.record_decisions%rowtype;
  v_id uuid;
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = 'PT401';
  end if;
  if not private.has_org_role(p_organization_id, array['owner','admin','analyst']::public.organization_role[]) then
    raise exception 'Your workspace role cannot save decisions' using errcode = 'PT403';
  end if;
  if coalesce(p_approve, false)
    and not private.has_org_role(p_organization_id, array['owner','admin']::public.organization_role[]) then
    raise exception 'Only owners and admins can approve decisions' using errcode = 'PT403';
  end if;
  if not exists (
    select 1 from public.projects project
    where project.id = p_project_id and project.organization_id = p_organization_id and project.status = 'active'
  ) then
    raise exception 'Project not found in this workspace' using errcode = 'PT404';
  end if;
  if p_owner_id is not null and not exists (
    select 1 from public.organization_members member
    where member.organization_id = p_organization_id and member.user_id = p_owner_id
  ) then
    raise exception 'Decision owner must be a workspace member' using errcode = 'PT400';
  end if;

  select * into v_existing from public.record_decisions decision
  where decision.organization_id = p_organization_id
    and decision.project_id = p_project_id
    and decision.save_key = p_save_key;
  if found then
    if v_existing.baseline_run_id <> p_baseline_run_id or v_existing.decision_kind <> p_decision_kind then
      raise exception 'This save key belongs to a different decision' using errcode = 'PT409';
    end if;
    return jsonb_build_object('id', v_existing.id, 'outcome', 'existing');
  end if;

  insert into public.record_decisions (
    organization_id, project_id, baseline_run_id, save_key, decision_kind, decision_state, rationale,
    change_specification_id, decided_by, decided_at, approved_by, approved_at,
    owner_id, owner_role, action_summary, due_date
  ) values (
    p_organization_id, p_project_id, p_baseline_run_id, p_save_key, p_decision_kind, p_decision_state, btrim(p_rationale),
    p_change_specification_id, v_actor, now(),
    case when coalesce(p_approve, false) and p_decision_kind = 'change_specification' then v_actor end,
    case when coalesce(p_approve, false) and p_decision_kind = 'change_specification' then now() end,
    p_owner_id, nullif(btrim(p_owner_role), ''), nullif(btrim(p_action_summary), ''), p_due_date
  )
  on conflict (organization_id, project_id, save_key) do nothing
  returning id into v_id;

  if v_id is null then
    -- Concurrent replay with the same key won the insert; return it if it is the same decision.
    select * into v_existing from public.record_decisions decision
    where decision.organization_id = p_organization_id
      and decision.project_id = p_project_id
      and decision.save_key = p_save_key;
    if v_existing.baseline_run_id <> p_baseline_run_id or v_existing.decision_kind <> p_decision_kind then
      raise exception 'This save key belongs to a different decision' using errcode = 'PT409';
    end if;
    return jsonb_build_object('id', v_existing.id, 'outcome', 'existing');
  end if;
  return jsonb_build_object('id', v_id, 'outcome', 'created');
end;
$$;
revoke all on function public.save_record_decision(uuid, uuid, uuid, text, text, text, text, uuid, text, text, date, uuid, boolean) from public, anon, authenticated;
grant execute on function public.save_record_decision(uuid, uuid, uuid, text, text, text, text, uuid, text, text, date, uuid, boolean) to authenticated, service_role;

-- Owner / action / due date (and optional approval) for a not-yet-approved Change Specification decision.
create or replace function public.complete_record_decision_action(
  p_decision_id uuid,
  p_organization_id uuid,
  p_project_id uuid,
  p_owner_id uuid,
  p_owner_role text,
  p_action_summary text,
  p_due_date date,
  p_approve boolean default false
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_decision public.record_decisions%rowtype;
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = 'PT401';
  end if;
  if not private.has_org_role(p_organization_id, array['owner','admin','analyst']::public.organization_role[]) then
    raise exception 'Your workspace role cannot change decisions' using errcode = 'PT403';
  end if;
  if coalesce(p_approve, false)
    and not private.has_org_role(p_organization_id, array['owner','admin']::public.organization_role[]) then
    raise exception 'Only owners and admins can approve decisions' using errcode = 'PT403';
  end if;
  select decision.* into v_decision from public.record_decisions decision
  join public.projects project on project.id = decision.project_id and project.organization_id = decision.organization_id
  where decision.id = p_decision_id
    and decision.organization_id = p_organization_id
    and decision.project_id = p_project_id
    and project.status = 'active'
  for update of decision;
  if not found then
    raise exception 'Decision not found in this project' using errcode = 'PT404';
  end if;
  if v_decision.decision_kind <> 'change_specification' then
    raise exception 'Explicit no-action and reviewer disagreement decisions do not take an owner' using errcode = 'PT400';
  end if;
  if v_decision.approved_by is not null then
    raise exception 'An approved decision is immutable' using errcode = 'PT409';
  end if;
  if p_owner_id is not null and not exists (
    select 1 from public.organization_members member
    where member.organization_id = p_organization_id and member.user_id = p_owner_id
  ) then
    raise exception 'Decision owner must be a workspace member' using errcode = 'PT400';
  end if;
  update public.record_decisions decision
     set owner_id = p_owner_id,
         owner_role = nullif(btrim(p_owner_role), ''),
         action_summary = nullif(btrim(p_action_summary), ''),
         due_date = p_due_date,
         approved_by = case when coalesce(p_approve, false) then v_actor end,
         approved_at = case when coalesce(p_approve, false) then now() end
   where decision.id = p_decision_id;
  return jsonb_build_object('id', p_decision_id, 'approved', coalesce(p_approve, false));
end;
$$;
revoke all on function public.complete_record_decision_action(uuid, uuid, uuid, uuid, text, text, date, boolean) from public, anon, authenticated;
grant execute on function public.complete_record_decision_action(uuid, uuid, uuid, uuid, text, text, date, boolean) to authenticated, service_role;

commit;
