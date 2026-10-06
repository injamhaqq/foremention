\set ON_ERROR_STOP on

begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

insert into auth.users (id) values
  ('f2800000-0000-4000-8000-000000000001'::uuid),
  ('f2800000-0000-4000-8000-000000000002'::uuid);

insert into public.organizations (id, name, slug, created_by) values
  ('f2810000-0000-4000-8000-000000000001'::uuid, 'Reviewed Funding Tenant A', 'reviewed-funding-a', 'f2800000-0000-4000-8000-000000000001'::uuid),
  ('f2810000-0000-4000-8000-000000000002'::uuid, 'Reviewed Funding Tenant B', 'reviewed-funding-b', 'f2800000-0000-4000-8000-000000000002'::uuid);

insert into public.organization_members (organization_id, user_id, role) values
  ('f2810000-0000-4000-8000-000000000001'::uuid, 'f2800000-0000-4000-8000-000000000001'::uuid, 'owner'),
  ('f2810000-0000-4000-8000-000000000002'::uuid, 'f2800000-0000-4000-8000-000000000002'::uuid, 'owner');

insert into public.projects (id, organization_id, name, slug, client_brand, status, created_by) values
  ('f2820000-0000-4000-8000-000000000001'::uuid, 'f2810000-0000-4000-8000-000000000001'::uuid, 'Reviewed Funding A', 'reviewed-funding-a', 'Reviewed A', 'active', 'f2800000-0000-4000-8000-000000000001'::uuid),
  ('f2820000-0000-4000-8000-000000000002'::uuid, 'f2810000-0000-4000-8000-000000000002'::uuid, 'Reviewed Funding B', 'reviewed-funding-b', 'Reviewed B', 'active', 'f2800000-0000-4000-8000-000000000002'::uuid);

insert into public.evidence_items (
  id, organization_id, project_id, evidence_type, title, source_url, owner_id,
  verification_status, verified_at, expires_at, usage_rights
) values
  ('f2830000-0000-4000-8000-000000000001'::uuid, 'f2810000-0000-4000-8000-000000000001'::uuid, 'f2820000-0000-4000-8000-000000000001'::uuid, 'funding_program_official', 'Current Program A', 'https://reviewed-a.invalid/current', 'f2800000-0000-4000-8000-000000000001'::uuid, 'verified', now() - interval '2 days', now() + interval '30 days', 'fixture verification only'),
  ('f2830000-0000-4000-8000-000000000002'::uuid, 'f2810000-0000-4000-8000-000000000001'::uuid, 'f2820000-0000-4000-8000-000000000001'::uuid, 'funding_program_official', 'Superseded Program A', 'https://reviewed-a.invalid/superseded', 'f2800000-0000-4000-8000-000000000001'::uuid, 'verified', now() - interval '3 days', now() + interval '30 days', 'fixture verification only'),
  ('f2830000-0000-4000-8000-000000000003'::uuid, 'f2810000-0000-4000-8000-000000000001'::uuid, 'f2820000-0000-4000-8000-000000000001'::uuid, 'funding_program_official', 'Stale Program A', 'https://reviewed-a.invalid/stale', 'f2800000-0000-4000-8000-000000000001'::uuid, 'verified', now() - interval '40 days', now() + interval '30 days', 'fixture verification only'),
  ('f2830000-0000-4000-8000-000000000004'::uuid, 'f2810000-0000-4000-8000-000000000002'::uuid, 'f2820000-0000-4000-8000-000000000002'::uuid, 'funding_program_official', 'Program B', 'https://reviewed-b.invalid/current', 'f2800000-0000-4000-8000-000000000002'::uuid, 'verified', now() - interval '2 days', now() + interval '30 days', 'fixture verification only');

insert into public.sources (id, organization_id, canonical_url, domain, page_title, source_type, crawler_access) values
  ('f2840000-0000-4000-8000-000000000001'::uuid, 'f2810000-0000-4000-8000-000000000001'::uuid, 'https://reviewed-a.invalid/current', 'reviewed-a.invalid', 'Current Program A', 'funding_program_official', 'open'),
  ('f2840000-0000-4000-8000-000000000002'::uuid, 'f2810000-0000-4000-8000-000000000001'::uuid, 'https://reviewed-a.invalid/superseded', 'reviewed-a.invalid', 'Superseded Program A', 'funding_program_official', 'open'),
  ('f2840000-0000-4000-8000-000000000003'::uuid, 'f2810000-0000-4000-8000-000000000001'::uuid, 'https://reviewed-a.invalid/stale', 'reviewed-a.invalid', 'Stale Program A', 'funding_program_official', 'open'),
  ('f2840000-0000-4000-8000-000000000004'::uuid, 'f2810000-0000-4000-8000-000000000002'::uuid, 'https://reviewed-b.invalid/current', 'reviewed-b.invalid', 'Program B', 'funding_program_official', 'open');

insert into public.source_snapshots (
  id, organization_id, source_id, snapshot_key, canonical_url, final_url, retrieved_at,
  access, http_status, content_type, page_title, redirect_count, content_length,
  content_signature, content_hash, representation_version, change_state, change_reason,
  created_by, evidence_excerpt
) values
  ('f2850000-0000-4000-8000-000000000001'::uuid, 'f2810000-0000-4000-8000-000000000001'::uuid, 'f2840000-0000-4000-8000-000000000001'::uuid, 'review-valid', 'https://reviewed-a.invalid/current', 'https://reviewed-a.invalid/current', now() - interval '1 hour', 'open', 200, 'text/html', 'Current Program A', 0, 1000,  'aaaabbbb', repeat('a',64), 'visible-text-prefix-24k-v1', 'initial', 'valid current fixture', 'f2800000-0000-4000-8000-000000000001'::uuid, 'Bounded current program evidence.'),
  ('f2850000-0000-4000-8000-000000000002'::uuid, 'f2810000-0000-4000-8000-000000000001'::uuid, 'f2840000-0000-4000-8000-000000000001'::uuid, 'review-rejected', 'https://reviewed-a.invalid/current', 'https://reviewed-a.invalid/current', now() - interval '2 hours', 'open', 200, 'text/html', 'Current Program A', 0, 1000,  'bbbbaaaa', repeat('b',64), 'visible-text-prefix-24k-v1', 'changed', 'rejected review fixture', 'f2800000-0000-4000-8000-000000000001'::uuid, 'Bounded rejected observation.'),
  ('f2850000-0000-4000-8000-000000000003'::uuid, 'f2810000-0000-4000-8000-000000000001'::uuid, 'f2840000-0000-4000-8000-000000000002'::uuid, 'review-superseded', 'https://reviewed-a.invalid/superseded', 'https://reviewed-a.invalid/superseded', now() - interval '2 days', 'open', 200, 'text/html', 'Superseded Program A', 0, 1000,  'ccccdddd', repeat('c',64), 'visible-text-prefix-24k-v1', 'initial', 'superseded evidence fixture', 'f2800000-0000-4000-8000-000000000001'::uuid, 'Bounded superseded observation.'),
  ('f2850000-0000-4000-8000-000000000004'::uuid, 'f2810000-0000-4000-8000-000000000001'::uuid, 'f2840000-0000-4000-8000-000000000003'::uuid, 'review-stale', 'https://reviewed-a.invalid/stale', 'https://reviewed-a.invalid/stale', now() - interval '31 days', 'open', 200, 'text/html', 'Stale Program A', 0, 1000,  'ddddcccc', repeat('d',64), 'visible-text-prefix-24k-v1', 'initial', 'stale review fixture', 'f2800000-0000-4000-8000-000000000001'::uuid, 'Bounded stale observation.'),
  ('f2850000-0000-4000-8000-000000000005'::uuid, 'f2810000-0000-4000-8000-000000000002'::uuid, 'f2840000-0000-4000-8000-000000000004'::uuid, 'review-cross', 'https://reviewed-b.invalid/current', 'https://reviewed-b.invalid/current', now() - interval '1 hour', 'open', 200, 'text/html', 'Program B', 0, 1000,  'eeeeffff', repeat('e',64), 'visible-text-prefix-24k-v1', 'initial', 'cross project fixture', 'f2800000-0000-4000-8000-000000000002'::uuid, 'Bounded project B observation.');

insert into public.company_funding_source_checks (
  id, organization_id, project_id, evidence_item_id, source_id, source_snapshot_id,
  evidence_verified_at, created_by, checked_at
) values
  ('f2860000-0000-4000-8000-000000000001'::uuid, 'f2810000-0000-4000-8000-000000000001'::uuid, 'f2820000-0000-4000-8000-000000000001'::uuid, 'f2830000-0000-4000-8000-000000000001'::uuid, 'f2840000-0000-4000-8000-000000000001'::uuid, 'f2850000-0000-4000-8000-000000000001'::uuid, now() - interval '2 days', 'f2800000-0000-4000-8000-000000000001'::uuid, now() - interval '1 hour'),
  ('f2860000-0000-4000-8000-000000000002'::uuid, 'f2810000-0000-4000-8000-000000000001'::uuid, 'f2820000-0000-4000-8000-000000000001'::uuid, 'f2830000-0000-4000-8000-000000000001'::uuid, 'f2840000-0000-4000-8000-000000000001'::uuid, 'f2850000-0000-4000-8000-000000000002'::uuid, now() - interval '2 days', 'f2800000-0000-4000-8000-000000000001'::uuid, now() - interval '2 hours'),
  ('f2860000-0000-4000-8000-000000000003'::uuid, 'f2810000-0000-4000-8000-000000000001'::uuid, 'f2820000-0000-4000-8000-000000000001'::uuid, 'f2830000-0000-4000-8000-000000000002'::uuid, 'f2840000-0000-4000-8000-000000000002'::uuid, 'f2850000-0000-4000-8000-000000000003'::uuid, now() - interval '3 days', 'f2800000-0000-4000-8000-000000000001'::uuid, now() - interval '2 days'),
  ('f2860000-0000-4000-8000-000000000004'::uuid, 'f2810000-0000-4000-8000-000000000001'::uuid, 'f2820000-0000-4000-8000-000000000001'::uuid, 'f2830000-0000-4000-8000-000000000003'::uuid, 'f2840000-0000-4000-8000-000000000003'::uuid, 'f2850000-0000-4000-8000-000000000004'::uuid, now() - interval '40 days', 'f2800000-0000-4000-8000-000000000001'::uuid, now() - interval '31 days'),
  ('f2860000-0000-4000-8000-000000000005'::uuid, 'f2810000-0000-4000-8000-000000000002'::uuid, 'f2820000-0000-4000-8000-000000000002'::uuid, 'f2830000-0000-4000-8000-000000000004'::uuid, 'f2840000-0000-4000-8000-000000000004'::uuid, 'f2850000-0000-4000-8000-000000000005'::uuid, now() - interval '2 days', 'f2800000-0000-4000-8000-000000000002'::uuid, now() - interval '1 hour');

insert into public.company_funding_source_reviews (
  id, organization_id, project_id, check_id, decision, decision_note, decided_by, decided_at
) values
  ('f2870000-0000-4000-8000-000000000001'::uuid, 'f2810000-0000-4000-8000-000000000001'::uuid, 'f2820000-0000-4000-8000-000000000001'::uuid, 'f2860000-0000-4000-8000-000000000001'::uuid, 'accepted', 'valid', 'f2800000-0000-4000-8000-000000000001'::uuid, now() - interval '30 minutes'),
  ('f2870000-0000-4000-8000-000000000002'::uuid, 'f2810000-0000-4000-8000-000000000001'::uuid, 'f2820000-0000-4000-8000-000000000001'::uuid, 'f2860000-0000-4000-8000-000000000002'::uuid, 'rejected', 'rejected fixture', 'f2800000-0000-4000-8000-000000000001'::uuid, now() - interval '90 minutes'),
  ('f2870000-0000-4000-8000-000000000003'::uuid, 'f2810000-0000-4000-8000-000000000001'::uuid, 'f2820000-0000-4000-8000-000000000001'::uuid, 'f2860000-0000-4000-8000-000000000003'::uuid, 'accepted', 'before reverification', 'f2800000-0000-4000-8000-000000000001'::uuid, now() - interval '36 hours'),
  ('f2870000-0000-4000-8000-000000000004'::uuid, 'f2810000-0000-4000-8000-000000000001'::uuid, 'f2820000-0000-4000-8000-000000000001'::uuid, 'f2860000-0000-4000-8000-000000000004'::uuid, 'accepted', 'stale fixture', 'f2800000-0000-4000-8000-000000000001'::uuid, now() - interval '30 days'),
  ('f2870000-0000-4000-8000-000000000005'::uuid, 'f2810000-0000-4000-8000-000000000002'::uuid, 'f2820000-0000-4000-8000-000000000002'::uuid, 'f2860000-0000-4000-8000-000000000005'::uuid, 'accepted', 'cross fixture', 'f2800000-0000-4000-8000-000000000002'::uuid, now() - interval '30 minutes');

-- Reverification after an accepted review invalidates that review chain.
update public.evidence_items
set verified_at = now() - interval '1 day'
where id = 'f2830000-0000-4000-8000-000000000002'::uuid;

create or replace function pg_temp.insert_review_gate_draft(
  p_artifact_id uuid,
  p_organization_id uuid,
  p_project_id uuid,
  p_owner_id uuid,
  p_evidence_id uuid,
  p_check_ids uuid[],
  p_review_ids uuid[],
  p_observed_at timestamptz,
  p_digest_char text
)
returns void
language plpgsql
as $$
declare
  v_source_url text;
  v_profile_revision text := 'company-truth-v1-' || repeat('a', 64);
  v_input_digest text := repeat(p_digest_char, 64);
  v_artifact_digest text := repeat(p_digest_char, 64);
begin
  select source_url into v_source_url from public.evidence_items where id = p_evidence_id;
  insert into public.company_funding_draft_artifacts (
    id, organization_id, project_id, created_by, profile_revision, package_version,
    input_digest, artifact_digest, program_evidence_ids, program_source_check_ids,
    program_source_review_ids, company_truth_assertion_ids, artifact
  ) values (
    p_artifact_id, p_organization_id, p_project_id, p_owner_id, v_profile_revision, '0.1.0',
    v_input_digest, v_artifact_digest, array[p_evidence_id], p_check_ids, p_review_ids, '{}'::uuid[],
    jsonb_build_object(
      'schemaVersion', 1,
      'packageVersion', '0.1.0',
      'mode', 'internal_draft_only',
      'externalEffects', false,
      'submissionAuthorized', false,
      'requiresSubmissionApproval', true,
      'organizationId', p_organization_id::text,
      'projectId', p_project_id::text,
      'profileRevision', v_profile_revision,
      'asOf', now(),
      'inputDigest', v_input_digest,
      'evidence', jsonb_build_array(
        jsonb_build_object(
          'id', p_evidence_id::text,
          'url', v_source_url,
          'authority', 'official',
          'observedAt', p_observed_at,
          'maxAgeDays', 30
        )
      ),
      'facts', '[]'::jsonb,
      'opportunities', jsonb_build_array(
        jsonb_build_object('id', 'fixture-program', 'sourceEvidenceId', p_evidence_id::text)
      )
    )
  );
end;
$$;

do $$
declare denied boolean := false;
begin
  begin
    perform pg_temp.insert_review_gate_draft(
      'f2880000-0000-4000-8000-000000000001'::uuid,
      'f2810000-0000-4000-8000-000000000001'::uuid,
      'f2820000-0000-4000-8000-000000000001'::uuid,
      'f2800000-0000-4000-8000-000000000001'::uuid,
      'f2830000-0000-4000-8000-000000000001'::uuid,
      '{}'::uuid[], '{}'::uuid[], now() - interval '1 hour', '1'
    );
  exception when raise_exception then denied := true;
  end;
  if not denied then raise exception 'funding draft without accepted source review was accepted'; end if;
end
$$;

do $$
declare denied boolean := false;
begin
  begin
    perform pg_temp.insert_review_gate_draft(
      'f2880000-0000-4000-8000-000000000002'::uuid,
      'f2810000-0000-4000-8000-000000000001'::uuid,
      'f2820000-0000-4000-8000-000000000001'::uuid,
      'f2800000-0000-4000-8000-000000000001'::uuid,
      'f2830000-0000-4000-8000-000000000001'::uuid,
      array['f2860000-0000-4000-8000-000000000002'::uuid],
      array['f2870000-0000-4000-8000-000000000002'::uuid],
      now() - interval '2 hours', '2'
    );
  exception when raise_exception then denied := true;
  end;
  if not denied then raise exception 'funding draft with rejected source review was accepted'; end if;
end
$$;

do $$
declare denied boolean := false;
begin
  begin
    perform pg_temp.insert_review_gate_draft(
      'f2880000-0000-4000-8000-000000000003'::uuid,
      'f2810000-0000-4000-8000-000000000001'::uuid,
      'f2820000-0000-4000-8000-000000000001'::uuid,
      'f2800000-0000-4000-8000-000000000001'::uuid,
      'f2830000-0000-4000-8000-000000000003'::uuid,
      array['f2860000-0000-4000-8000-000000000004'::uuid],
      array['f2870000-0000-4000-8000-000000000004'::uuid],
      now() - interval '31 days', '3'
    );
  exception when raise_exception then denied := true;
  end;
  if not denied then raise exception 'funding draft with stale source check was accepted'; end if;
end
$$;

do $$
declare denied boolean := false;
begin
  begin
    perform pg_temp.insert_review_gate_draft(
      'f2880000-0000-4000-8000-000000000004'::uuid,
      'f2810000-0000-4000-8000-000000000001'::uuid,
      'f2820000-0000-4000-8000-000000000001'::uuid,
      'f2800000-0000-4000-8000-000000000001'::uuid,
      'f2830000-0000-4000-8000-000000000002'::uuid,
      array['f2860000-0000-4000-8000-000000000003'::uuid],
      array['f2870000-0000-4000-8000-000000000003'::uuid],
      now() - interval '2 days', '4'
    );
  exception when raise_exception then denied := true;
  end;
  if not denied then raise exception 'funding draft with superseded evidence review was accepted'; end if;
end
$$;

do $$
declare denied boolean := false;
begin
  begin
    perform pg_temp.insert_review_gate_draft(
      'f2880000-0000-4000-8000-000000000005'::uuid,
      'f2810000-0000-4000-8000-000000000001'::uuid,
      'f2820000-0000-4000-8000-000000000001'::uuid,
      'f2800000-0000-4000-8000-000000000001'::uuid,
      'f2830000-0000-4000-8000-000000000001'::uuid,
      array['f2860000-0000-4000-8000-000000000005'::uuid],
      array['f2870000-0000-4000-8000-000000000005'::uuid],
      now() - interval '1 hour', '5'
    );
  exception when raise_exception then denied := true;
  end;
  if not denied then raise exception 'cross-project source review was accepted'; end if;
end
$$;

do $$
begin
  begin
    perform pg_temp.insert_review_gate_draft(
      'f2880000-0000-4000-8000-000000000006'::uuid,
      'f2810000-0000-4000-8000-000000000001'::uuid,
      'f2820000-0000-4000-8000-000000000001'::uuid,
      'f2800000-0000-4000-8000-000000000001'::uuid,
      'f2830000-0000-4000-8000-000000000001'::uuid,
      array['f2860000-0000-4000-8000-000000000001'::uuid],
      array['f2870000-0000-4000-8000-000000000001'::uuid],
      now() - interval '1 hour', '6'
    );
  exception when others then
    raise exception 'valid reviewed funding draft was rejected: %', sqlerrm;
  end;
end
$$;

rollback;
