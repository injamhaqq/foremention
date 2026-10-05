\set ON_ERROR_STOP on

begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- Disposable Company OS funding tenants. The surrounding transaction rolls back.
insert into auth.users (id) values
  ('f2600000-0000-4000-8000-000000000001'::uuid),
  ('f2600000-0000-4000-8000-000000000002'::uuid),
  ('f2600000-0000-4000-8000-000000000003'::uuid);

insert into public.organizations (id, name, slug, created_by) values
  ('f2610000-0000-4000-8000-000000000001'::uuid, 'Funding Tenant A', 'funding-tenant-a', 'f2600000-0000-4000-8000-000000000001'::uuid),
  ('f2610000-0000-4000-8000-000000000002'::uuid, 'Funding Tenant B', 'funding-tenant-b', 'f2600000-0000-4000-8000-000000000002'::uuid);

insert into public.organization_members (organization_id, user_id, role) values
  ('f2610000-0000-4000-8000-000000000001'::uuid, 'f2600000-0000-4000-8000-000000000001'::uuid, 'owner'),
  ('f2610000-0000-4000-8000-000000000001'::uuid, 'f2600000-0000-4000-8000-000000000003'::uuid, 'analyst'),
  ('f2610000-0000-4000-8000-000000000002'::uuid, 'f2600000-0000-4000-8000-000000000002'::uuid, 'owner');

insert into public.projects (id, organization_id, name, slug, client_brand, status, created_by) values
  ('f2620000-0000-4000-8000-000000000001'::uuid, 'f2610000-0000-4000-8000-000000000001'::uuid, 'Funding Project A', 'funding-project-a', 'Funding A', 'active', 'f2600000-0000-4000-8000-000000000001'::uuid),
  ('f2620000-0000-4000-8000-000000000002'::uuid, 'f2610000-0000-4000-8000-000000000002'::uuid, 'Funding Project B', 'funding-project-b', 'Funding B', 'active', 'f2600000-0000-4000-8000-000000000002'::uuid);

insert into public.evidence_items (
  id, organization_id, project_id, evidence_type, title, source_url, owner_id,
  verification_status, verified_at, expires_at, usage_rights
) values
  ('f2630000-0000-4000-8000-000000000001'::uuid, 'f2610000-0000-4000-8000-000000000001'::uuid, 'f2620000-0000-4000-8000-000000000001'::uuid, 'funding_program_official', 'Program A', 'https://funding-a.invalid/program', 'f2600000-0000-4000-8000-000000000001'::uuid, 'verified', now(), now() + interval '30 days', 'fixture verification only'),
  ('f2630000-0000-4000-8000-000000000002'::uuid, 'f2610000-0000-4000-8000-000000000001'::uuid, 'f2620000-0000-4000-8000-000000000001'::uuid, 'company_fact', 'Company A fact', 'https://funding-a.invalid/company', 'f2600000-0000-4000-8000-000000000001'::uuid, 'verified', now(), now() + interval '30 days', 'fixture verification only'),
  ('f2630000-0000-4000-8000-000000000003'::uuid, 'f2610000-0000-4000-8000-000000000002'::uuid, 'f2620000-0000-4000-8000-000000000002'::uuid, 'funding_program_official', 'Program B', 'https://funding-b.invalid/program', 'f2600000-0000-4000-8000-000000000002'::uuid, 'verified', now(), now() + interval '30 days', 'fixture verification only'),
  ('f2630000-0000-4000-8000-000000000004'::uuid, 'f2610000-0000-4000-8000-000000000002'::uuid, 'f2620000-0000-4000-8000-000000000002'::uuid, 'company_fact', 'Company B fact', 'https://funding-b.invalid/company', 'f2600000-0000-4000-8000-000000000002'::uuid, 'verified', now(), now() + interval '30 days', 'fixture verification only');

insert into public.company_truth_entities (
  id, organization_id, project_id, entity_type, canonical_key, label, created_by
) values
  ('f2640000-0000-4000-8000-000000000001'::uuid, 'f2610000-0000-4000-8000-000000000001'::uuid, 'f2620000-0000-4000-8000-000000000001'::uuid, 'company', 'company', 'Funding Company A', 'f2600000-0000-4000-8000-000000000001'::uuid),
  ('f2640000-0000-4000-8000-000000000002'::uuid, 'f2610000-0000-4000-8000-000000000002'::uuid, 'f2620000-0000-4000-8000-000000000002'::uuid, 'company', 'company', 'Funding Company B', 'f2600000-0000-4000-8000-000000000002'::uuid);

insert into public.company_truth_assertions (
  id, organization_id, project_id, entity_id, attribute_key, asserted_value_json,
  evidence_item_id, verification_state, created_by, verified_by, verified_at
) values
  ('f2650000-0000-4000-8000-000000000001'::uuid, 'f2610000-0000-4000-8000-000000000001'::uuid, 'f2620000-0000-4000-8000-000000000001'::uuid, 'f2640000-0000-4000-8000-000000000001'::uuid, 'company.country', '"BD"'::jsonb, 'f2630000-0000-4000-8000-000000000002'::uuid, 'verified', 'f2600000-0000-4000-8000-000000000001'::uuid, 'f2600000-0000-4000-8000-000000000001'::uuid, now()),
  ('f2650000-0000-4000-8000-000000000002'::uuid, 'f2610000-0000-4000-8000-000000000002'::uuid, 'f2620000-0000-4000-8000-000000000002'::uuid, 'f2640000-0000-4000-8000-000000000002'::uuid, 'company.country', '"BD"'::jsonb, 'f2630000-0000-4000-8000-000000000004'::uuid, 'verified', 'f2600000-0000-4000-8000-000000000002'::uuid, 'f2600000-0000-4000-8000-000000000002'::uuid, now());

insert into public.company_funding_draft_artifacts (
  id, organization_id, project_id, created_by, profile_revision, package_version,
  input_digest, artifact_digest, program_evidence_ids, company_truth_assertion_ids, artifact
)
select
  fixture.artifact_id,
  fixture.organization_id,
  fixture.project_id,
  fixture.owner_id,
  fixture.profile_revision,
  '0.1.0',
  fixture.input_digest,
  fixture.artifact_digest,
  array[fixture.program_evidence_id]::uuid[],
  array[fixture.truth_assertion_id]::uuid[],
  jsonb_build_object(
    'schemaVersion', 1,
    'packageVersion', '0.1.0',
    'mode', 'internal_draft_only',
    'externalEffects', false,
    'submissionAuthorized', false,
    'requiresSubmissionApproval', true,
    'organizationId', fixture.organization_id::text,
    'projectId', fixture.project_id::text,
    'profileRevision', fixture.profile_revision,
    'asOf', now(),
    'inputDigest', fixture.input_digest,
    'evidence', jsonb_build_array(
      jsonb_build_object(
        'id', fixture.program_evidence_id::text,
        'url', program.source_url,
        'authority', 'official',
        'observedAt', program.verified_at,
        'maxAgeDays', 30
      ),
      jsonb_build_object(
        'id', fixture.company_evidence_id::text,
        'url', company_evidence.source_url,
        'authority', 'company_record',
        'observedAt', company_evidence.verified_at,
        'maxAgeDays', 365
      )
    ),
    'facts', jsonb_build_array(
      jsonb_build_object(
        'key', 'company.country',
        'value', 'BD',
        'verification', 'verified',
        'evidenceId', fixture.company_evidence_id::text
      )
    ),
    'opportunities', jsonb_build_array(
      jsonb_build_object(
        'id', 'fixture-program',
        'sourceEvidenceId', fixture.program_evidence_id::text
      )
    )
  )
from (
  values
    (
      'f2660000-0000-4000-8000-000000000001'::uuid,
      'f2610000-0000-4000-8000-000000000001'::uuid,
      'f2620000-0000-4000-8000-000000000001'::uuid,
      'f2600000-0000-4000-8000-000000000001'::uuid,
      'f2630000-0000-4000-8000-000000000001'::uuid,
      'f2630000-0000-4000-8000-000000000002'::uuid,
      'f2650000-0000-4000-8000-000000000001'::uuid,
      ('company-truth-v1-' || repeat('a', 64))::text,
      repeat('b', 64)::text,
      repeat('c', 64)::text
    ),
    (
      'f2660000-0000-4000-8000-000000000002'::uuid,
      'f2610000-0000-4000-8000-000000000002'::uuid,
      'f2620000-0000-4000-8000-000000000002'::uuid,
      'f2600000-0000-4000-8000-000000000002'::uuid,
      'f2630000-0000-4000-8000-000000000003'::uuid,
      'f2630000-0000-4000-8000-000000000004'::uuid,
      'f2650000-0000-4000-8000-000000000002'::uuid,
      ('company-truth-v1-' || repeat('d', 64))::text,
      repeat('e', 64)::text,
      repeat('f', 64)::text
    )
) as fixture(
  artifact_id, organization_id, project_id, owner_id, program_evidence_id,
  company_evidence_id, truth_assertion_id, profile_revision, input_digest, artifact_digest
)
join public.evidence_items as program on program.id = fixture.program_evidence_id
join public.evidence_items as company_evidence on company_evidence.id = fixture.company_evidence_id;

-- Funding artifacts are internal Company OS records. Browser roles receive no
-- direct table access; the authenticated route establishes operator/project
-- authority before trusted server reads or writes.
set local role authenticated;

select set_config('request.jwt.claim.sub', 'f2600000-0000-4000-8000-000000000001', true);
do $$
declare
  denied boolean := false;
begin
  begin
    perform 1 from public.company_funding_draft_artifacts limit 1;
  exception when insufficient_privilege then
    denied := true;
  end;
  if not denied then raise exception 'Authenticated owner received direct funding artifact read access'; end if;

  denied := false;
  begin
    insert into public.company_funding_draft_artifacts (
      id, organization_id, project_id, created_by, profile_revision, package_version,
      input_digest, artifact_digest, program_evidence_ids, company_truth_assertion_ids, artifact
    ) values (
      gen_random_uuid(),
      'f2610000-0000-4000-8000-000000000001'::uuid,
      'f2620000-0000-4000-8000-000000000001'::uuid,
      'f2600000-0000-4000-8000-000000000001'::uuid,
      'company-truth-v1-' || repeat('1', 64),
      '0.1.0',
      repeat('2', 64),
      repeat('3', 64),
      array['f2630000-0000-4000-8000-000000000001'::uuid],
      array['f2650000-0000-4000-8000-000000000001'::uuid],
      '{}'::jsonb
    );
  exception when insufficient_privilege then
    denied := true;
  end;
  if not denied then raise exception 'Authenticated owner bypassed the trusted funding artifact write path'; end if;
end
$$;

select set_config('request.jwt.claim.sub', 'f2600000-0000-4000-8000-000000000003', true);
do $$
declare
  denied boolean := false;
begin
  begin
    perform 1 from public.company_funding_draft_artifacts limit 1;
  exception when insufficient_privilege then
    denied := true;
  end;
  if not denied then raise exception 'Authenticated analyst received direct funding artifact read access'; end if;
end
$$;

reset role;
set local role service_role;

-- The trusted server role can read the fixture store, but the validation trigger
-- still rejects a creator who is not an owner/admin of the persisted organization.
do $$
declare
  denied boolean := false;
begin
  if (select count(*) from public.company_funding_draft_artifacts) <> 2 then
    raise exception 'Trusted funding artifact fixture count changed unexpectedly';
  end if;

  begin
    insert into public.company_funding_draft_artifacts (
      organization_id, project_id, created_by, profile_revision, package_version,
      input_digest, artifact_digest, program_evidence_ids, company_truth_assertion_ids, artifact
    ) values (
      'f2610000-0000-4000-8000-000000000002'::uuid,
      'f2620000-0000-4000-8000-000000000002'::uuid,
      'f2600000-0000-4000-8000-000000000001'::uuid,
      'company-truth-v1-' || repeat('4', 64),
      '0.1.0',
      repeat('5', 64),
      repeat('6', 64),
      array['f2630000-0000-4000-8000-000000000003'::uuid],
      array['f2650000-0000-4000-8000-000000000002'::uuid],
      jsonb_build_object(
        'schemaVersion', 1,
        'packageVersion', '0.1.0',
        'mode', 'internal_draft_only',
        'externalEffects', false,
        'submissionAuthorized', false,
        'requiresSubmissionApproval', true,
        'organizationId', 'f2610000-0000-4000-8000-000000000002',
        'projectId', 'f2620000-0000-4000-8000-000000000002',
        'profileRevision', 'company-truth-v1-' || repeat('4', 64),
        'asOf', now(),
        'inputDigest', repeat('5', 64),
        'evidence', '[]'::jsonb,
        'facts', '[]'::jsonb,
        'opportunities', jsonb_build_array(
          jsonb_build_object(
            'id', 'cross-tenant',
            'sourceEvidenceId', 'f2630000-0000-4000-8000-000000000003'
          )
        )
      )
    );
  exception when raise_exception then
    denied := true;
  end;
  if not denied then raise exception 'Trusted funding write accepted a creator outside the persisted organization'; end if;
end
$$;

rollback;
