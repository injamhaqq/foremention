-- Service-only official funding source registry for Company OS Capital workflows.
-- No portal submission, email, payment, or external write authority is introduced.
begin;

create table public.company_funding_program_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  source_id uuid not null references public.sources(id) on delete restrict,
  source_snapshot_id uuid not null references public.source_snapshots(id) on delete restrict,
  evidence_item_id uuid not null unique references public.evidence_items(id) on delete restrict,
  created_by uuid not null references auth.users(id) on delete restrict,
  canonical_url text not null,
  final_url text not null,
  page_title text,
  verification_state text not null default 'unverified'
    check (verification_state in ('unverified','verified','stale','rejected')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  verified_at timestamptz,
  last_observed_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, project_id, canonical_url)
);

create index company_funding_program_sources_scope_state_idx
  on public.company_funding_program_sources
  (organization_id, project_id, verification_state, updated_at desc);

create index company_funding_program_sources_source_idx
  on public.company_funding_program_sources
  (organization_id, source_id, last_observed_at desc);

create or replace function public.validate_company_funding_program_source()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  project_org uuid;
  project_status text;
  source_org uuid;
  source_url text;
  snapshot_org uuid;
  snapshot_source uuid;
  snapshot_final_url text;
  snapshot_retrieved_at timestamptz;
  snapshot_access public.crawler_access;
  evidence_org uuid;
  evidence_project uuid;
  evidence_type text;
  evidence_url text;
  evidence_status text;
  evidence_verified_at timestamptz;
  evidence_expires_at timestamptz;
  evidence_rights text;
begin
  if tg_op = 'UPDATE' and (
    new.organization_id is distinct from old.organization_id
    or new.project_id is distinct from old.project_id
    or new.source_id is distinct from old.source_id
    or new.evidence_item_id is distinct from old.evidence_item_id
    or new.created_by is distinct from old.created_by
    or new.canonical_url is distinct from old.canonical_url
    or new.created_at is distinct from old.created_at
  ) then
    raise exception 'Company funding source identity is immutable';
  end if;

  select organization_id, status
  into project_org, project_status
  from public.projects
  where id = new.project_id;

  if project_org is null or project_org <> new.organization_id then
    raise exception 'Company funding source must belong to one organization/project scope';
  end if;
  if project_status is distinct from 'active' then
    raise exception 'Company funding source requires an active project';
  end if;

  if not exists (
    select 1
    from public.organization_members as membership
    where membership.organization_id = new.organization_id
      and membership.user_id = new.created_by
      and membership.role = any(array['owner','admin']::public.organization_role[])
  ) then
    raise exception 'Company funding source creator must be an organization owner or admin';
  end if;

  select organization_id, canonical_url
  into source_org, source_url
  from public.sources
  where id = new.source_id;

  if source_org is null or source_org <> new.organization_id or source_url is distinct from new.canonical_url then
    raise exception 'Company funding source must reference the matching organization source';
  end if;

  select organization_id, source_id, final_url, retrieved_at, access
  into snapshot_org, snapshot_source, snapshot_final_url, snapshot_retrieved_at, snapshot_access
  from public.source_snapshots
  where id = new.source_snapshot_id;

  if snapshot_org is null
     or snapshot_org <> new.organization_id
     or snapshot_source <> new.source_id
     or snapshot_final_url is distinct from new.final_url
     or snapshot_retrieved_at is distinct from new.last_observed_at then
    raise exception 'Company funding source snapshot does not match its source observation';
  end if;

  select organization_id, project_id, evidence_type, source_url, verification_status, verified_at, expires_at, usage_rights
  into evidence_org, evidence_project, evidence_type, evidence_url, evidence_status, evidence_verified_at, evidence_expires_at, evidence_rights
  from public.evidence_items
  where id = new.evidence_item_id;

  if evidence_org is null
     or evidence_org <> new.organization_id
     or evidence_project <> new.project_id
     or lower(trim(evidence_type)) <> 'funding_program_official'
     or evidence_url is distinct from new.final_url then
    raise exception 'Company funding source evidence must be matching same-project official-program evidence';
  end if;

  if new.verification_state = 'verified' then
    if snapshot_access not in ('open'::public.crawler_access, 'partial'::public.crawler_access) then
      raise exception 'Verified Company funding sources must have a reachable reviewed snapshot';
    end if;
    if new.reviewed_by is null or new.reviewed_at is null or new.verified_at is null then
      raise exception 'Verified Company funding sources require an explicit reviewer and verification time';
    end if;
    if not exists (
      select 1
      from public.organization_members as membership
      where membership.organization_id = new.organization_id
        and membership.user_id = new.reviewed_by
        and membership.role = any(array['owner','admin']::public.organization_role[])
    ) then
      raise exception 'Company funding source reviewer must be an organization owner or admin';
    end if;
    if evidence_status <> 'verified'
       or evidence_verified_at is distinct from new.verified_at
       or evidence_expires_at is null
       or evidence_expires_at <= now()
       or nullif(trim(evidence_rights), '') is null then
      raise exception 'Verified Company funding source evidence is not current and reviewable';
    end if;
  elsif new.verification_state = 'stale' then
    if evidence_status <> 'expired' or new.verified_at is not null then
      raise exception 'Stale Company funding source evidence must be expired';
    end if;
  elsif new.verification_state = 'rejected' then
    if evidence_status <> 'rejected' or new.reviewed_by is null or new.reviewed_at is null or new.verified_at is not null then
      raise exception 'Rejected Company funding sources require a recorded review';
    end if;
  else
    if evidence_status <> 'unverified' or new.verified_at is not null then
      raise exception 'Unverified Company funding source evidence must remain unverified';
    end if;
  end if;

  return new;
end;
$$;

create trigger validate_company_funding_program_source_before_write
  before insert or update on public.company_funding_program_sources
  for each row execute function public.validate_company_funding_program_source();

alter table public.company_funding_program_sources enable row level security;

revoke all on table public.company_funding_program_sources from public, anon, authenticated;
grant select, insert, update on table public.company_funding_program_sources to service_role;

comment on table public.company_funding_program_sources is
  'Service-only Company OS registry binding reviewed official funding pages to immutable source snapshots and project evidence.';

create or replace function public.validate_company_funding_artifact_program_sources()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if exists (
    select 1
    from unnest(new.program_evidence_ids) as requested(evidence_id)
    where not exists (
      select 1
      from public.company_funding_program_sources as program_source
      join public.source_snapshots as reviewed_snapshot
        on reviewed_snapshot.id = program_source.source_snapshot_id
       and reviewed_snapshot.organization_id = new.organization_id
       and reviewed_snapshot.source_id = program_source.source_id
      where program_source.organization_id = new.organization_id
        and program_source.project_id = new.project_id
        and program_source.evidence_item_id = requested.evidence_id
        and program_source.verification_state = 'verified'
        and program_source.verified_at is not null
        and reviewed_snapshot.access in ('open'::public.crawler_access, 'partial'::public.crawler_access)
        and program_source.source_snapshot_id = (
          select latest.id
          from public.source_snapshots as latest
          where latest.organization_id = new.organization_id
            and latest.source_id = program_source.source_id
          order by latest.retrieved_at desc, latest.created_at desc
          limit 1
        )
    )
  ) then
    raise exception 'Company funding draft requires current reviewed official-program source evidence';
  end if;
  return new;
end;
$$;

create trigger validate_company_funding_artifact_program_sources_before_write
  before insert or update on public.company_funding_draft_artifacts
  for each row execute function public.validate_company_funding_artifact_program_sources();

create or replace function public.review_company_funding_program_source(
  p_source_id uuid,
  p_organization_id uuid,
  p_project_id uuid,
  p_actor_id uuid,
  p_decision text
)
returns setof public.company_funding_program_sources
language plpgsql
security invoker
set search_path = ''
as $$
declare
  item public.company_funding_program_sources%rowtype;
  latest_snapshot_id uuid;
  snapshot_access public.crawler_access;
  snapshot_url text;
  snapshot_retrieved_at timestamptz;
  reviewed_at timestamptz := now();
begin
  if p_decision not in ('verify','reject') then
    raise exception 'Unsupported Company funding source review decision';
  end if;

  select *
  into item
  from public.company_funding_program_sources
  where id = p_source_id
    and organization_id = p_organization_id
    and project_id = p_project_id
  for update;

  if item.id is null then
    raise exception 'Company funding source was not found in the configured scope';
  end if;

  if not exists (
    select 1
    from public.organization_members as membership
    where membership.organization_id = p_organization_id
      and membership.user_id = p_actor_id
      and membership.role = any(array['owner','admin']::public.organization_role[])
  ) then
    raise exception 'Company funding source reviewer must be an organization owner or admin';
  end if;

  if p_decision = 'verify' then
    select id
    into latest_snapshot_id
    from public.source_snapshots
    where organization_id = p_organization_id
      and source_id = item.source_id
    order by retrieved_at desc, created_at desc
    limit 1;

    if latest_snapshot_id is null or latest_snapshot_id <> item.source_snapshot_id then
      raise exception 'Company funding source has a newer page observation and must be reviewed again';
    end if;

    select access, final_url, retrieved_at
    into snapshot_access, snapshot_url, snapshot_retrieved_at
    from public.source_snapshots
    where id = item.source_snapshot_id
      and organization_id = p_organization_id
      and source_id = item.source_id;

    if snapshot_access not in ('open'::public.crawler_access, 'partial'::public.crawler_access) then
      raise exception 'Company funding source is not currently reachable for review';
    end if;
    if snapshot_retrieved_at < reviewed_at - interval '30 days' then
      raise exception 'Company funding source observation is stale and must be inspected again';
    end if;
    if lower(snapshot_url) not like 'https://%' then
      raise exception 'Verified Company funding source must resolve to HTTPS';
    end if;

    update public.evidence_items
    set verification_status = 'verified',
        verified_at = reviewed_at,
        expires_at = reviewed_at + interval '30 days',
        usage_rights = 'public_web_internal_research',
        updated_at = reviewed_at
    where id = item.evidence_item_id
      and organization_id = p_organization_id
      and project_id = p_project_id;

    update public.company_funding_program_sources
    set verification_state = 'verified',
        reviewed_by = p_actor_id,
        reviewed_at = reviewed_at,
        verified_at = reviewed_at,
        updated_at = reviewed_at
    where id = item.id;
  else
    update public.evidence_items
    set verification_status = 'rejected',
        verified_at = null,
        expires_at = null,
        usage_rights = null,
        updated_at = reviewed_at
    where id = item.evidence_item_id
      and organization_id = p_organization_id
      and project_id = p_project_id;

    update public.company_funding_program_sources
    set verification_state = 'rejected',
        reviewed_by = p_actor_id,
        reviewed_at = reviewed_at,
        verified_at = null,
        updated_at = reviewed_at
    where id = item.id;
  end if;

  return query
  select *
  from public.company_funding_program_sources
  where id = item.id;
end;
$$;

revoke all on function public.review_company_funding_program_source(uuid,uuid,uuid,uuid,text)
  from public, anon, authenticated;
grant execute on function public.review_company_funding_program_source(uuid,uuid,uuid,uuid,text)
  to service_role;

commit;
