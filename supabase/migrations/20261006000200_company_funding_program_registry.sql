-- Append-only Company OS Funding Program Registry.
begin;

create table public.company_funding_program_revisions (
  id uuid primary key,
  program_id uuid not null,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  evidence_item_id uuid not null references public.evidence_items(id) on delete restrict,
  source_check_id uuid not null references public.company_funding_source_checks(id) on delete restrict,
  source_review_id uuid not null references public.company_funding_source_reviews(id) on delete restrict,
  supersedes_revision_id uuid references public.company_funding_program_revisions(id) on delete restrict,
  name text not null check (char_length(trim(name)) between 1 and 240),
  kind text not null check (kind in ('grant','accelerator','fellowship','credit')),
  deadline_at timestamptz,
  criteria jsonb not null default '[]'::jsonb,
  questions jsonb not null default '[]'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict,
  authority jsonb not null default '{"mode":"internal_registry_only","externalEffects":false,"submissionAuthorized":false}'::jsonb,
  created_at timestamptz not null default now(),
  unique (supersedes_revision_id),
  check (jsonb_typeof(criteria) = 'array' and jsonb_array_length(criteria) <= 30),
  check (jsonb_typeof(questions) = 'array' and jsonb_array_length(questions) <= 30),
  check (jsonb_typeof(authority) = 'object')
);

create index company_funding_program_revisions_scope_created_idx
  on public.company_funding_program_revisions (organization_id, project_id, created_at desc);
create index company_funding_program_revisions_program_created_idx
  on public.company_funding_program_revisions (organization_id, project_id, program_id, created_at desc);
create index company_funding_program_revisions_evidence_idx
  on public.company_funding_program_revisions (organization_id, project_id, evidence_item_id);

create or replace function public.validate_company_funding_program_revision()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  project_org uuid;
  project_status text;
  evidence public.evidence_items%rowtype;
  source_check public.company_funding_source_checks%rowtype;
  review public.company_funding_source_reviews%rowtype;
  source public.sources%rowtype;
  snapshot public.source_snapshots%rowtype;
  prior public.company_funding_program_revisions%rowtype;
begin
  if tg_op = 'UPDATE' then
    raise exception 'Funding program revisions are append-only; create a superseding revision instead';
  end if;

  select organization_id, status into project_org, project_status
  from public.projects
  where id = new.project_id;

  if project_org is null or project_org <> new.organization_id then
    raise exception 'Funding program revision must belong to one organization/project scope';
  end if;
  if project_status is distinct from 'active' then
    raise exception 'Funding program revision requires an active project';
  end if;
  if auth.uid() is not null and new.created_by <> auth.uid() then
    raise exception 'Funding program revision creator must match authenticated actor';
  end if;
  if not exists (
    select 1
    from public.organization_members as membership
    where membership.organization_id = new.organization_id
      and membership.user_id = new.created_by
      and membership.role = any(array['owner','admin']::public.organization_role[])
  ) then
    raise exception 'Funding program revision creator must be an organization owner or admin';
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
     or evidence.verified_at > now()
     or (evidence.expires_at is not null and evidence.expires_at <= now()) then
    raise exception 'Funding program revision requires current verified same-project official funding evidence';
  end if;

  select * into source_check
  from public.company_funding_source_checks
  where id = new.source_check_id;

  if source_check.id is null
     or source_check.organization_id <> new.organization_id
     or source_check.project_id <> new.project_id
     or source_check.evidence_item_id <> new.evidence_item_id
     or source_check.evidence_verified_at <> evidence.verified_at
     or source_check.checked_at < evidence.verified_at
     or source_check.checked_at < now() - interval '30 days'
     or source_check.checked_at > now() then
    raise exception 'Funding program revision requires a current same-project source check';
  end if;

  select * into review
  from public.company_funding_source_reviews
  where id = new.source_review_id;

  if review.id is null
     or review.organization_id <> new.organization_id
     or review.project_id <> new.project_id
     or review.check_id <> new.source_check_id
     or review.decision <> 'accepted'
     or review.decided_at < source_check.checked_at
     or review.decided_at > now() then
    raise exception 'Funding program revision requires the exact accepted source review';
  end if;

  select * into source
  from public.sources
  where id = source_check.source_id;

  if source.id is null
     or source.organization_id <> new.organization_id
     or source.canonical_url <> evidence.source_url then
    raise exception 'Funding program revision source URL no longer matches official evidence';
  end if;

  select * into snapshot
  from public.source_snapshots
  where id = source_check.source_snapshot_id;

  if snapshot.id is null
     or snapshot.organization_id <> new.organization_id
     or snapshot.source_id <> source.id
     or snapshot.canonical_url <> evidence.source_url
     or snapshot.access not in ('open','partial')
     or snapshot.content_hash is null
     or nullif(trim(snapshot.evidence_excerpt), '') is null then
    raise exception 'Funding program revision requires bounded reviewable source evidence';
  end if;

  if new.supersedes_revision_id is null then
    if new.program_id <> new.id then
      raise exception 'First funding program revision must use program_id = id';
    end if;
  else
    select * into prior
    from public.company_funding_program_revisions
    where id = new.supersedes_revision_id;

    if prior.id is null
       or prior.organization_id <> new.organization_id
       or prior.project_id <> new.project_id
       or prior.program_id <> new.program_id then
      raise exception 'Funding program supersession must remain in the same program and project';
    end if;
    if exists (
      select 1 from public.company_funding_program_revisions as child
      where child.supersedes_revision_id = prior.id
    ) then
      raise exception 'Funding program supersession cannot fork an already superseded revision';
    end if;
  end if;

  if new.authority ->> 'mode' is distinct from 'internal_registry_only'
     or new.authority -> 'externalEffects' is distinct from 'false'::jsonb
     or new.authority -> 'submissionAuthorized' is distinct from 'false'::jsonb then
    raise exception 'Funding program revision cannot carry external execution authority';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(new.criteria) as criterion(value)
    where jsonb_typeof(criterion.value) <> 'object'
       or nullif(trim(criterion.value ->> 'id'), '') is null
       or nullif(trim(criterion.value ->> 'factKey'), '') is null
       or criterion.value ->> 'operator' not in ('eq','in','gte','lte')
       or not (criterion.value ? 'expected')
  ) then
    raise exception 'Funding program criteria must use the bounded deterministic criterion shape';
  end if;
  if (
    select count(distinct criterion.value ->> 'id')
    from jsonb_array_elements(new.criteria) as criterion(value)
  ) <> jsonb_array_length(new.criteria) then
    raise exception 'Funding program criterion identifiers must be unique';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(new.questions) as question(value)
    where jsonb_typeof(question.value) <> 'object'
       or nullif(trim(question.value ->> 'id'), '') is null
       or nullif(trim(question.value ->> 'prompt'), '') is null
       or coalesce((question.value ->> 'maxChars')::integer, 0) not between 1 and 2000
       or jsonb_typeof(question.value -> 'required') <> 'boolean'
  ) then
    raise exception 'Funding program questions must use the bounded deterministic question shape';
  end if;
  if (
    select count(distinct question.value ->> 'id')
    from jsonb_array_elements(new.questions) as question(value)
  ) <> jsonb_array_length(new.questions) then
    raise exception 'Funding program question identifiers must be unique';
  end if;

  return new;
end;
$$;

create trigger validate_company_funding_program_revision_before_write
  before insert or update on public.company_funding_program_revisions
  for each row execute function public.validate_company_funding_program_revision();

alter table public.company_funding_program_revisions enable row level security;

revoke all on table public.company_funding_program_revisions from public, anon, authenticated;
grant select, insert, delete on table public.company_funding_program_revisions to service_role;

comment on table public.company_funding_program_revisions is
  'Append-only internal Company OS funding-program registry. Each revision is operator-confirmed and bound to current accepted reviewed-source provenance.';

commit;
