-- Require current accepted reviewed-source provenance for every new Company OS funding draft.
begin;

alter table public.company_funding_draft_artifacts
  add column program_source_check_ids uuid[] not null default '{}'::uuid[],
  add column program_source_review_ids uuid[] not null default '{}'::uuid[];

create or replace function public.validate_company_funding_draft_review_provenance()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if cardinality(new.program_source_check_ids) <> cardinality(new.program_evidence_ids)
     or cardinality(new.program_source_review_ids) <> cardinality(new.program_evidence_ids) then
    raise exception 'Company funding draft requires one reviewed source provenance chain per program evidence record';
  end if;

  if (select count(distinct value) from unnest(new.program_source_check_ids) as value)
       <> cardinality(new.program_source_check_ids)
     or (select count(distinct value) from unnest(new.program_source_review_ids) as value)
       <> cardinality(new.program_source_review_ids) then
    raise exception 'Company funding reviewed source provenance identifiers must be unique';
  end if;

  if exists (
    select 1
    from unnest(
      new.program_evidence_ids,
      new.program_source_check_ids,
      new.program_source_review_ids
    ) with ordinality as requested(evidence_id, check_id, review_id, ordinal)
    left join public.evidence_items as evidence
      on evidence.id = requested.evidence_id
     and evidence.organization_id = new.organization_id
     and evidence.project_id = new.project_id
    left join public.company_funding_source_checks as source_check
      on source_check.id = requested.check_id
     and source_check.organization_id = new.organization_id
     and source_check.project_id = new.project_id
     and source_check.evidence_item_id = requested.evidence_id
    left join public.company_funding_source_reviews as review
      on review.id = requested.review_id
     and review.organization_id = new.organization_id
     and review.project_id = new.project_id
     and review.check_id = requested.check_id
    left join public.sources as source
      on source.id = source_check.source_id
     and source.organization_id = new.organization_id
    left join public.source_snapshots as snapshot
      on snapshot.id = source_check.source_snapshot_id
     and snapshot.organization_id = new.organization_id
    where evidence.id is null
       or lower(trim(evidence.evidence_type)) <> 'funding_program_official'
       or evidence.verification_status <> 'verified'
       or evidence.source_url is null
       or nullif(trim(evidence.usage_rights), '') is null
       or evidence.verified_at is null
       or evidence.verified_at > now()
       or (evidence.expires_at is not null and evidence.expires_at <= now())
       or source_check.id is null
       or source_check.evidence_verified_at is distinct from evidence.verified_at
       or source_check.checked_at < evidence.verified_at
       or source_check.checked_at < now() - interval '30 days'
       or source_check.checked_at > now()
       or review.id is null
       or review.decision <> 'accepted'
       or review.decided_at < source_check.checked_at
       or review.decided_at > now()
       or source.id is null
       or source.canonical_url is distinct from evidence.source_url
       or snapshot.id is null
       or snapshot.source_id is distinct from source.id
       or snapshot.canonical_url is distinct from evidence.source_url
       or snapshot.access not in ('open','partial')
       or snapshot.content_hash is null
       or nullif(trim(snapshot.evidence_excerpt), '') is null
  ) then
    raise exception 'Company funding draft requires a current accepted reviewed source chain for every program evidence record';
  end if;

  return new;
end;
$$;


create or replace function public.validate_company_funding_draft_artifact()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  project_org uuid;
  project_status text;
  evidence_row jsonb;
  fact_row jsonb;
  opportunity_row jsonb;
  evidence_uuid uuid;
  assertion_count integer;
begin
  if tg_op = 'UPDATE' then
    raise exception 'Company funding draft revisions are immutable';
  end if;

  select organization_id, status into project_org, project_status
  from public.projects
  where id = new.project_id;

  if project_org is null or project_org <> new.organization_id then
    raise exception 'Company funding draft must belong to one organization/project scope';
  end if;
  if project_status is distinct from 'active' then
    raise exception 'Company funding draft requires an active project';
  end if;
  if auth.uid() is not null and new.created_by <> auth.uid() then
    raise exception 'Company funding draft creator must match authenticated actor';
  end if;
  if not exists (
    select 1
    from public.organization_members as membership
    where membership.organization_id = new.organization_id
      and membership.user_id = new.created_by
      and membership.role = any(array['owner','admin']::public.organization_role[])
  ) then
    raise exception 'Company funding draft creator must be an organization owner or admin';
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
           select 1
           from unnest(new.program_evidence_ids, new.program_source_check_ids)
             as requested(evidence_id, check_id)
           join public.evidence_items as evidence
             on evidence.id = requested.evidence_id
            and evidence.organization_id = new.organization_id
            and evidence.project_id = new.project_id
           join public.company_funding_source_checks as source_check
             on source_check.id = requested.check_id
            and source_check.organization_id = new.organization_id
            and source_check.project_id = new.project_id
            and source_check.evidence_item_id = requested.evidence_id
           where requested.evidence_id = evidence_uuid
             and evidence.source_url = evidence_row ->> 'url'
             and source_check.checked_at = (evidence_row ->> 'observedAt')::timestamptz
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
    if evidence_uuid is null or not (evidence_uuid = any(new.program_evidence_ids)) then
      raise exception 'Company funding opportunities must reference persisted official program evidence';
    end if;
  end loop;

  return new;
end;
$$;


create trigger validate_company_funding_draft_review_provenance_before_write
  before insert or update on public.company_funding_draft_artifacts
  for each row execute function public.validate_company_funding_draft_review_provenance();

comment on column public.company_funding_draft_artifacts.program_source_check_ids is
  'Ordinally aligned immutable source-check provenance for program_evidence_ids. Required for new inserts after the reviewed-evidence gate migration.';
comment on column public.company_funding_draft_artifacts.program_source_review_ids is
  'Ordinally aligned accepted human source-review provenance for program_evidence_ids. Required for new inserts after the reviewed-evidence gate migration.';

commit;
