-- Authenticated Company OS funding draft persistence.
-- Internal drafts only: no discovery, submission, email, payment, or provider execution.
begin;

create table public.company_funding_draft_artifacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  profile_revision text not null check (profile_revision ~ '^company-truth-v1-[0-9a-f]{64}$'),
  package_version text not null check (package_version = '0.1.0'),
  input_digest text not null check (input_digest ~ '^[0-9a-f]{64}$'),
  artifact_digest text not null check (artifact_digest ~ '^[0-9a-f]{64}$'),
  program_evidence_ids uuid[] not null,
  company_truth_assertion_ids uuid[] not null default '{}'::uuid[],
  artifact jsonb not null check (jsonb_typeof(artifact) = 'object'),
  created_at timestamptz not null default now(),
  unique (organization_id, project_id, artifact_digest)
);

create index company_funding_draft_artifacts_scope_created_idx
  on public.company_funding_draft_artifacts (organization_id, project_id, created_at desc);

create or replace function public.validate_company_funding_draft_artifact()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  project_org uuid;
  evidence_row jsonb;
  fact_row jsonb;
  opportunity_row jsonb;
  evidence_uuid uuid;
  assertion_count integer;
begin
  if tg_op = 'UPDATE' then
    raise exception 'Company funding draft revisions are immutable';
  end if;

  select organization_id into project_org
  from public.projects
  where id = new.project_id;

  if project_org is null or project_org <> new.organization_id then
    raise exception 'Company funding draft must belong to one organization/project scope';
  end if;
  if auth.uid() is not null and new.created_by <> auth.uid() then
    raise exception 'Company funding draft creator must match authenticated actor';
  end if;

  if cardinality(new.program_evidence_ids) < 1 or cardinality(new.program_evidence_ids) > 10 then
    raise exception 'Company funding draft requires 1-10 program evidence records';
  end if;
  if cardinality(new.company_truth_assertion_ids) > 100 then
    raise exception 'Company funding draft supports at most 100 Company Truth assertions';
  end if;
  if (select count(distinct value) from unnest(new.program_evidence_ids) as value) <> cardinality(new.program_evidence_ids) then
    raise exception 'Company funding program evidence identifiers must be unique';
  end if;
  if (select count(distinct value) from unnest(new.company_truth_assertion_ids) as value) <> cardinality(new.company_truth_assertion_ids) then
    raise exception 'Company funding truth assertion identifiers must be unique';
  end if;

  if exists (
    select 1
    from unnest(new.program_evidence_ids) as requested(id)
    left join public.evidence_items as evidence
      on evidence.id = requested.id
     and evidence.organization_id = new.organization_id
     and evidence.project_id = new.project_id
     and lower(trim(evidence.evidence_type)) = 'funding_program_official'
     and evidence.verification_status = 'verified'
     and evidence.source_url is not null
     and nullif(trim(evidence.usage_rights), '') is not null
     and evidence.verified_at is not null
     and evidence.verified_at <= now()
     and (evidence.expires_at is null or evidence.expires_at > now())
    where evidence.id is null
  ) then
    raise exception 'Company funding program evidence must be current verified same-project official evidence';
  end if;

  select count(*) into assertion_count
  from public.company_truth_assertions as assertion
  join public.evidence_items as evidence
    on evidence.id = assertion.evidence_item_id
   and evidence.organization_id = new.organization_id
   and evidence.project_id = new.project_id
   and evidence.verification_status = 'verified'
   and evidence.source_url is not null
   and nullif(trim(evidence.usage_rights), '') is not null
   and evidence.verified_at is not null
   and evidence.verified_at <= now()
   and (evidence.expires_at is null or evidence.expires_at > now())
  where assertion.id = any(new.company_truth_assertion_ids)
    and assertion.organization_id = new.organization_id
    and assertion.project_id = new.project_id
    and assertion.verification_state = 'verified'
    and assertion.superseded_at is null;
  if assertion_count <> cardinality(new.company_truth_assertion_ids) then
    raise exception 'Company funding facts must use current verified same-project Company Truth assertions';
  end if;

  if new.artifact ->> 'organizationId' is distinct from new.organization_id::text
     or new.artifact ->> 'projectId' is distinct from new.project_id::text
     or new.artifact ->> 'profileRevision' is distinct from new.profile_revision
     or new.artifact ->> 'packageVersion' is distinct from new.package_version
     or new.artifact ->> 'inputDigest' is distinct from new.input_digest then
    raise exception 'Company funding artifact metadata must match persisted scope and digests';
  end if;
  if new.artifact ->> 'mode' is distinct from 'internal_draft_only'
     or new.artifact -> 'externalEffects' is distinct from 'false'::jsonb
     or new.artifact -> 'submissionAuthorized' is distinct from 'false'::jsonb
     or new.artifact -> 'requiresSubmissionApproval' is distinct from 'true'::jsonb then
    raise exception 'Company funding artifact cannot carry external execution authority';
  end if;
  if jsonb_typeof(new.artifact -> 'evidence') is distinct from 'array'
     or jsonb_typeof(new.artifact -> 'facts') is distinct from 'array'
     or jsonb_typeof(new.artifact -> 'opportunities') is distinct from 'array' then
    raise exception 'Company funding artifact evidence, facts, and opportunities must be arrays';
  end if;
  if jsonb_array_length(new.artifact -> 'opportunities') < 1
     or jsonb_array_length(new.artifact -> 'opportunities') > 10 then
    raise exception 'Company funding artifact requires 1-10 opportunities';
  end if;
  if abs(extract(epoch from ((new.artifact ->> 'asOf')::timestamptz - now()))) > 300 then
    raise exception 'Company funding artifact asOf must come from the current server execution';
  end if;

  for evidence_row in select value from jsonb_array_elements(new.artifact -> 'evidence') loop
    begin
      evidence_uuid := (evidence_row ->> 'id')::uuid;
    exception when others then
      raise exception 'Company funding artifact evidence identifiers must be UUIDs';
    end;

    if evidence_uuid = any(new.program_evidence_ids) then
      if evidence_row ->> 'authority' is distinct from 'official'
         or coalesce((evidence_row ->> 'maxAgeDays')::integer, 0) < 1
         or (evidence_row ->> 'maxAgeDays')::integer > 30
         or not exists (
           select 1 from public.evidence_items as evidence
           where evidence.id = evidence_uuid
             and evidence.organization_id = new.organization_id
             and evidence.project_id = new.project_id
             and evidence.source_url = evidence_row ->> 'url'
             and evidence.verified_at = (evidence_row ->> 'observedAt')::timestamptz
         ) then
        raise exception 'Company funding official evidence snapshot does not match its verified source record';
      end if;
    else
      if evidence_row ->> 'authority' is distinct from 'company_record'
         or coalesce((evidence_row ->> 'maxAgeDays')::integer, 0) < 1
         or (evidence_row ->> 'maxAgeDays')::integer > 365
         or not exists (
           select 1
           from public.company_truth_assertions as assertion
           join public.evidence_items as evidence on evidence.id = assertion.evidence_item_id
           where assertion.id = any(new.company_truth_assertion_ids)
             and assertion.organization_id = new.organization_id
             and assertion.project_id = new.project_id
             and evidence.id = evidence_uuid
             and evidence.source_url = evidence_row ->> 'url'
             and evidence.verified_at = (evidence_row ->> 'observedAt')::timestamptz
         ) then
        raise exception 'Company funding company-record evidence snapshot does not match current Company Truth provenance';
      end if;
    end if;
  end loop;

  for fact_row in select value from jsonb_array_elements(new.artifact -> 'facts') loop
    if fact_row ->> 'verification' is distinct from 'verified' then
      raise exception 'Persisted Company funding facts must come from verified Company Truth';
    end if;
    begin
      evidence_uuid := (fact_row ->> 'evidenceId')::uuid;
    exception when others then
      raise exception 'Persisted Company funding facts require UUID evidence identifiers';
    end;
    if not exists (
      select 1
      from public.company_truth_assertions as assertion
      where assertion.id = any(new.company_truth_assertion_ids)
        and assertion.organization_id = new.organization_id
        and assertion.project_id = new.project_id
        and assertion.verification_state = 'verified'
        and assertion.superseded_at is null
        and assertion.attribute_key = fact_row ->> 'key'
        and assertion.asserted_value_json = fact_row -> 'value'
        and assertion.evidence_item_id = evidence_uuid
    ) then
      raise exception 'Persisted Company funding fact does not match current verified Company Truth';
    end if;
  end loop;

  if exists (
    select 1
    from unnest(new.program_evidence_ids) as requested(id)
    where not exists (
      select 1
      from jsonb_array_elements(new.artifact -> 'evidence') as artifact_evidence(value)
      where artifact_evidence.value ->> 'id' = requested.id::text
        and artifact_evidence.value ->> 'authority' = 'official'
    )
  ) then
    raise exception 'Every persisted funding program evidence identifier must appear in the artifact evidence snapshot';
  end if;

  if exists (
    select 1
    from public.company_truth_assertions as assertion
    where assertion.id = any(new.company_truth_assertion_ids)
      and not exists (
        select 1
        from jsonb_array_elements(new.artifact -> 'facts') as artifact_fact(value)
        where artifact_fact.value ->> 'key' = assertion.attribute_key
          and artifact_fact.value -> 'value' = assertion.asserted_value_json
          and artifact_fact.value ->> 'evidenceId' = assertion.evidence_item_id::text
          and artifact_fact.value ->> 'verification' = 'verified'
      )
  ) then
    raise exception 'Every persisted Company Truth assertion identifier must appear as an exact artifact fact';
  end if;

  for opportunity_row in select value from jsonb_array_elements(new.artifact -> 'opportunities') loop
    begin
      evidence_uuid := (opportunity_row ->> 'sourceEvidenceId')::uuid;
    exception when others then
      raise exception 'Company funding opportunity source evidence identifiers must be UUIDs';
    end;
    if not (evidence_uuid = any(new.program_evidence_ids)) then
      raise exception 'Company funding opportunities must reference persisted official program evidence';
    end if;
  end loop;

  return new;
end;
$$;

create trigger validate_company_funding_draft_artifact_before_write
  before insert or update on public.company_funding_draft_artifacts
  for each row execute function public.validate_company_funding_draft_artifact();

alter table public.company_funding_draft_artifacts enable row level security;

create policy company_funding_draft_artifacts_select_manager
  on public.company_funding_draft_artifacts
  for select
  to authenticated
  using (
    public.has_org_role(
      organization_id,
      array['owner','admin']::public.organization_role[]
    )
  );

create policy company_funding_draft_artifacts_insert_manager
  on public.company_funding_draft_artifacts
  for insert
  to authenticated
  with check (
    created_by = (select auth.uid())
    and public.has_org_role(
      organization_id,
      array['owner','admin']::public.organization_role[]
    )
    and exists (
      select 1
      from public.projects as project
      where project.id = project_id
        and project.organization_id = organization_id
        and project.status = 'active'
    )
  );

revoke all on table public.company_funding_draft_artifacts from public, anon, authenticated;
grant select, insert on table public.company_funding_draft_artifacts to authenticated;
grant select, insert, delete on table public.company_funding_draft_artifacts to service_role;

comment on table public.company_funding_draft_artifacts is
  'Append-only internal Company OS funding draft revisions. Rows never authorize external submission.';

commit;
