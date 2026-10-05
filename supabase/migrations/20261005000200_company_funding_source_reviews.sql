-- Internal Company OS funding-source inspection and human-review receipts.
-- Reuses Foremention native sources/source_snapshots. No submission or spend authority.
begin;

create table public.company_funding_source_checks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  evidence_item_id uuid not null references public.evidence_items(id) on delete cascade,
  source_id uuid not null references public.sources(id) on delete cascade,
  source_snapshot_id uuid not null references public.source_snapshots(id) on delete cascade,
  evidence_verified_at timestamptz not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  checked_at timestamptz not null,
  authority jsonb not null default '{"mode":"internal_review_only","externalEffects":false,"submissionAuthorized":false}'::jsonb
    check (jsonb_typeof(authority) = 'object'),
  created_at timestamptz not null default now(),
  unique (organization_id, project_id, evidence_item_id, source_snapshot_id)
);

create table public.company_funding_source_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  check_id uuid not null references public.company_funding_source_checks(id) on delete cascade,
  decision text not null check (decision in ('accepted','rejected')),
  decision_note text check (decision_note is null or char_length(decision_note) <= 1000),
  decided_by uuid not null references auth.users(id) on delete restrict,
  decided_at timestamptz not null default now(),
  authority jsonb not null default '{"mode":"internal_review_only","externalEffects":false,"submissionAuthorized":false}'::jsonb
    check (jsonb_typeof(authority) = 'object'),
  created_at timestamptz not null default now(),
  unique (check_id)
);

create index company_funding_source_checks_scope_checked_idx
  on public.company_funding_source_checks (organization_id, project_id, checked_at desc);

create index company_funding_source_checks_creator_checked_idx
  on public.company_funding_source_checks (organization_id, project_id, created_by, checked_at desc);

create index company_funding_source_reviews_scope_decided_idx
  on public.company_funding_source_reviews (organization_id, project_id, decided_at desc);

create or replace function public.validate_company_funding_source_check()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  project_org uuid;
  project_status text;
  evidence public.evidence_items%rowtype;
  source public.sources%rowtype;
  snapshot public.source_snapshots%rowtype;
begin
  if tg_op = 'UPDATE' then
    raise exception 'Company funding source checks are immutable';
  end if;

  select organization_id, status into project_org, project_status
  from public.projects
  where id = new.project_id;

  if project_org is null or project_org <> new.organization_id then
    raise exception 'Company funding source check must belong to one organization/project scope';
  end if;
  if project_status is distinct from 'active' then
    raise exception 'Company funding source check requires an active project';
  end if;
  if auth.uid() is not null and new.created_by <> auth.uid() then
    raise exception 'Company funding source check creator must match authenticated actor';
  end if;
  if not exists (
    select 1
    from public.organization_members as membership
    where membership.organization_id = new.organization_id
      and membership.user_id = new.created_by
      and membership.role = any(array['owner','admin']::public.organization_role[])
  ) then
    raise exception 'Company funding source check creator must be an organization owner or admin';
  end if;

  select * into evidence
  from public.evidence_items
  where id = new.evidence_item_id;

  if evidence.id is null
     or evidence.organization_id <> new.organization_id
     or evidence.project_id <> new.project_id
     or lower(trim(evidence.evidence_type)) <> 'funding_program_official'
     or evidence.verification_status <> 'verified'
     or evidence.source_url is null
     or nullif(trim(evidence.usage_rights), '') is null
     or evidence.verified_at is null
     or evidence.verified_at <> new.evidence_verified_at
     or evidence.verified_at > new.checked_at
     or (evidence.expires_at is not null and evidence.expires_at <= new.checked_at) then
    raise exception 'Company funding source check requires current verified same-project official funding evidence';
  end if;

  select * into source
  from public.sources
  where id = new.source_id;

  if source.id is null
     or source.organization_id <> new.organization_id
     or not (source.canonical_url = evidence.source_url) then
    raise exception 'Company funding source check source must match the official evidence URL';
  end if;

  select * into snapshot
  from public.source_snapshots
  where id = new.source_snapshot_id;

  if snapshot.id is null
     or snapshot.organization_id <> new.organization_id
     or not (snapshot.source_id = new.source_id)
     or not (snapshot.canonical_url = evidence.source_url)
     or snapshot.retrieved_at <> new.checked_at then
    raise exception 'Company funding source check must bind the exact native source snapshot';
  end if;

  if new.authority ->> 'mode' is distinct from 'internal_review_only'
     or new.authority -> 'externalEffects' is distinct from 'false'::jsonb
     or new.authority -> 'submissionAuthorized' is distinct from 'false'::jsonb then
    raise exception 'Company funding source check cannot carry external execution authority';
  end if;

  return new;
end;
$$;

create or replace function public.validate_company_funding_source_review()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  project_org uuid;
  project_status text;
  source_check public.company_funding_source_checks%rowtype;
  evidence public.evidence_items%rowtype;
  source public.sources%rowtype;
  snapshot public.source_snapshots%rowtype;
begin
  if tg_op = 'UPDATE' then
    raise exception 'Company funding source reviews are immutable';
  end if;

  select organization_id, status into project_org, project_status
  from public.projects
  where id = new.project_id;

  if project_org is null or project_org <> new.organization_id then
    raise exception 'Company funding source review must belong to one organization/project scope';
  end if;
  if project_status is distinct from 'active' then
    raise exception 'Company funding source review requires an active project';
  end if;
  if auth.uid() is not null and new.decided_by <> auth.uid() then
    raise exception 'Company funding source review actor must match authenticated actor';
  end if;
  if not exists (
    select 1
    from public.organization_members as membership
    where membership.organization_id = new.organization_id
      and membership.user_id = new.decided_by
      and membership.role = any(array['owner','admin']::public.organization_role[])
  ) then
    raise exception 'Company funding source review actor must be an organization owner or admin';
  end if;

  select * into source_check
  from public.company_funding_source_checks
  where id = new.check_id;

  if source_check.id is null
     or source_check.organization_id <> new.organization_id
     or source_check.project_id <> new.project_id then
    raise exception 'Company funding source review must reference a same-project check';
  end if;

  select * into evidence
  from public.evidence_items
  where id = source_check.evidence_item_id;

  if evidence.id is null
     or evidence.organization_id <> new.organization_id
     or evidence.project_id <> new.project_id
     or lower(trim(evidence.evidence_type)) <> 'funding_program_official'
     or evidence.verification_status <> 'verified'
     or evidence.source_url is null
     or nullif(trim(evidence.usage_rights), '') is null
     or evidence.verified_at is null
     or evidence.verified_at <> source_check.evidence_verified_at
     or (evidence.expires_at is not null and evidence.expires_at <= new.decided_at) then
    raise exception 'Company funding source review requires the still-current official evidence record';
  end if;

  select * into source
  from public.sources
  where id = source_check.source_id;

  if source.id is null
     or source.organization_id <> new.organization_id
     or not (source.canonical_url = evidence.source_url) then
    raise exception 'Company funding source review evidence URL changed after inspection';
  end if;

  select * into snapshot
  from public.source_snapshots
  where id = source_check.source_snapshot_id;

  if snapshot.id is null
     or snapshot.organization_id <> new.organization_id
     or not (snapshot.source_id = source_check.source_id)
     or not (snapshot.canonical_url = evidence.source_url) then
    raise exception 'Company funding source review lost its exact native snapshot provenance';
  end if;

  if new.decision = 'accepted' and snapshot.access not in ('open','partial') then
    raise exception 'An unreachable funding source check cannot be accepted';
  end if;

  if new.authority ->> 'mode' is distinct from 'internal_review_only'
     or new.authority -> 'externalEffects' is distinct from 'false'::jsonb
     or new.authority -> 'submissionAuthorized' is distinct from 'false'::jsonb then
    raise exception 'Company funding source review cannot carry external execution authority';
  end if;

  return new;
end;
$$;

create trigger validate_company_funding_source_check_before_write
  before insert or update on public.company_funding_source_checks
  for each row execute function public.validate_company_funding_source_check();

create trigger validate_company_funding_source_review_before_write
  before insert or update on public.company_funding_source_reviews
  for each row execute function public.validate_company_funding_source_review();

alter table public.company_funding_source_checks enable row level security;
alter table public.company_funding_source_reviews enable row level security;

revoke all on table public.company_funding_source_checks, public.company_funding_source_reviews from public, anon, authenticated;
grant select, insert, delete on table public.company_funding_source_checks, public.company_funding_source_reviews to service_role;

comment on table public.company_funding_source_checks is
  'Immutable internal Company OS receipts binding official funding evidence to bounded native source snapshots.';
comment on table public.company_funding_source_reviews is
  'Append-only human review receipts for funding source checks. Reviews never authorize external submission.';

commit;
