\set ON_ERROR_STOP on

begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

insert into auth.users (id) values
  ('f2900000-0000-4000-8000-000000000001'::uuid),
  ('f2900000-0000-4000-8000-000000000002'::uuid),
  ('f2900000-0000-4000-8000-000000000003'::uuid);

insert into public.organizations (id, name, slug, created_by) values
  ('f2910000-0000-4000-8000-000000000001'::uuid, 'Funding Registry A', 'funding-registry-a', 'f2900000-0000-4000-8000-000000000001'::uuid),
  ('f2910000-0000-4000-8000-000000000002'::uuid, 'Funding Registry B', 'funding-registry-b', 'f2900000-0000-4000-8000-000000000002'::uuid);

insert into public.organization_members (organization_id, user_id, role) values
  ('f2910000-0000-4000-8000-000000000001'::uuid, 'f2900000-0000-4000-8000-000000000001'::uuid, 'owner'),
  ('f2910000-0000-4000-8000-000000000001'::uuid, 'f2900000-0000-4000-8000-000000000003'::uuid, 'analyst'),
  ('f2910000-0000-4000-8000-000000000002'::uuid, 'f2900000-0000-4000-8000-000000000002'::uuid, 'owner');

insert into public.projects (id, organization_id, name, slug, client_brand, status, created_by) values
  ('f2920000-0000-4000-8000-000000000001'::uuid, 'f2910000-0000-4000-8000-000000000001'::uuid, 'Funding Registry A', 'funding-registry-a', 'Registry A', 'active', 'f2900000-0000-4000-8000-000000000001'::uuid),
  ('f2920000-0000-4000-8000-000000000002'::uuid, 'f2910000-0000-4000-8000-000000000002'::uuid, 'Funding Registry B', 'funding-registry-b', 'Registry B', 'active', 'f2900000-0000-4000-8000-000000000002'::uuid);

insert into public.evidence_items (
  id, organization_id, project_id, evidence_type, title, source_url, owner_id,
  verification_status, verified_at, expires_at, usage_rights
) values
  ('f2930000-0000-4000-8000-000000000001'::uuid, 'f2910000-0000-4000-8000-000000000001'::uuid, 'f2920000-0000-4000-8000-000000000001'::uuid, 'funding_program_official', 'Current Program A', 'https://registry-a.invalid/program', 'f2900000-0000-4000-8000-000000000001'::uuid, 'verified', now() - interval '2 days', now() + interval '60 days', 'fixture verification only'),
  ('f2930000-0000-4000-8000-000000000002'::uuid, 'f2910000-0000-4000-8000-000000000001'::uuid, 'f2920000-0000-4000-8000-000000000001'::uuid, 'funding_program_official', 'Stale Program A', 'https://registry-a.invalid/stale', 'f2900000-0000-4000-8000-000000000001'::uuid, 'verified', now() - interval '40 days', now() + interval '60 days', 'fixture verification only'),
  ('f2930000-0000-4000-8000-000000000003'::uuid, 'f2910000-0000-4000-8000-000000000001'::uuid, 'f2920000-0000-4000-8000-000000000001'::uuid, 'funding_program_official', 'Second Program A', 'https://registry-a.invalid/second', 'f2900000-0000-4000-8000-000000000001'::uuid, 'verified', now() - interval '2 days', now() + interval '60 days', 'fixture verification only'),
  ('f2930000-0000-4000-8000-000000000004'::uuid, 'f2910000-0000-4000-8000-000000000002'::uuid, 'f2920000-0000-4000-8000-000000000002'::uuid, 'funding_program_official', 'Program B', 'https://registry-b.invalid/program', 'f2900000-0000-4000-8000-000000000002'::uuid, 'verified', now() - interval '2 days', now() + interval '60 days', 'fixture verification only');

insert into public.sources (id, organization_id, canonical_url, domain, page_title, source_type, crawler_access) values
  ('f2940000-0000-4000-8000-000000000001'::uuid, 'f2910000-0000-4000-8000-000000000001'::uuid, 'https://registry-a.invalid/program', 'registry-a.invalid', 'Current Program A', 'funding_program_official', 'open'),
  ('f2940000-0000-4000-8000-000000000002'::uuid, 'f2910000-0000-4000-8000-000000000001'::uuid, 'https://registry-a.invalid/stale', 'registry-a.invalid', 'Stale Program A', 'funding_program_official', 'open'),
  ('f2940000-0000-4000-8000-000000000003'::uuid, 'f2910000-0000-4000-8000-000000000001'::uuid, 'https://registry-a.invalid/second', 'registry-a.invalid', 'Second Program A', 'funding_program_official', 'open'),
  ('f2940000-0000-4000-8000-000000000004'::uuid, 'f2910000-0000-4000-8000-000000000002'::uuid, 'https://registry-b.invalid/program', 'registry-b.invalid', 'Program B', 'funding_program_official', 'open');

insert into public.source_snapshots (
  id, organization_id, source_id, snapshot_key, canonical_url, final_url, retrieved_at,
  access, http_status, content_type, page_title, redirect_count, content_length,
  content_signature, content_hash, representation_version, change_state, change_reason,
  created_by, evidence_excerpt
) values
  ('f2950000-0000-4000-8000-000000000001'::uuid, 'f2910000-0000-4000-8000-000000000001'::uuid, 'f2940000-0000-4000-8000-000000000001'::uuid, 'a1b2c3d4', 'https://registry-a.invalid/program', 'https://registry-a.invalid/program', now() - interval '1 day', 'open', 200, 'text/html', 'Current Program A', 0, 1000, 'a1b2c3d4', repeat('a',64), 'visible-text-prefix-24k-v1', 'initial', 'Current registry fixture.', 'f2900000-0000-4000-8000-000000000001'::uuid, 'Bounded current registry evidence.'),
  ('f2950000-0000-4000-8000-000000000002'::uuid, 'f2910000-0000-4000-8000-000000000001'::uuid, 'f2940000-0000-4000-8000-000000000001'::uuid, 'b2c3d4e5', 'https://registry-a.invalid/program', 'https://registry-a.invalid/program', now() - interval '20 hours', 'open', 200, 'text/html', 'Current Program A', 0, 1000, 'b2c3d4e5', repeat('b',64), 'visible-text-prefix-24k-v1', 'changed', 'Rejected registry fixture.', 'f2900000-0000-4000-8000-000000000001'::uuid, 'Bounded rejected registry evidence.'),
  ('f2950000-0000-4000-8000-000000000003'::uuid, 'f2910000-0000-4000-8000-000000000001'::uuid, 'f2940000-0000-4000-8000-000000000002'::uuid, 'c3d4e5f6', 'https://registry-a.invalid/stale', 'https://registry-a.invalid/stale', now() - interval '31 days', 'open', 200, 'text/html', 'Stale Program A', 0, 1000, 'c3d4e5f6', repeat('c',64), 'visible-text-prefix-24k-v1', 'initial', 'Stale registry fixture.', 'f2900000-0000-4000-8000-000000000001'::uuid, 'Bounded stale registry evidence.'),
  ('f2950000-0000-4000-8000-000000000004'::uuid, 'f2910000-0000-4000-8000-000000000001'::uuid, 'f2940000-0000-4000-8000-000000000003'::uuid, 'd4e5f6a7', 'https://registry-a.invalid/second', 'https://registry-a.invalid/second', now() - interval '1 day', 'open', 200, 'text/html', 'Second Program A', 0, 1000, 'd4e5f6a7', repeat('d',64), 'visible-text-prefix-24k-v1', 'initial', 'Second registry fixture.', 'f2900000-0000-4000-8000-000000000001'::uuid, 'Bounded second registry evidence.'),
  ('f2950000-0000-4000-8000-000000000005'::uuid, 'f2910000-0000-4000-8000-000000000002'::uuid, 'f2940000-0000-4000-8000-000000000004'::uuid, 'e5f6a7b8', 'https://registry-b.invalid/program', 'https://registry-b.invalid/program', now() - interval '1 day', 'open', 200, 'text/html', 'Program B', 0, 1000, 'e5f6a7b8', repeat('e',64), 'visible-text-prefix-24k-v1', 'initial', 'Cross-project registry fixture.', 'f2900000-0000-4000-8000-000000000002'::uuid, 'Bounded cross-project registry evidence.');

insert into public.company_funding_source_checks (
  id, organization_id, project_id, evidence_item_id, source_id, source_snapshot_id,
  evidence_verified_at, created_by, checked_at
) values
  ('f2960000-0000-4000-8000-000000000001'::uuid, 'f2910000-0000-4000-8000-000000000001'::uuid, 'f2920000-0000-4000-8000-000000000001'::uuid, 'f2930000-0000-4000-8000-000000000001'::uuid, 'f2940000-0000-4000-8000-000000000001'::uuid, 'f2950000-0000-4000-8000-000000000001'::uuid, now() - interval '2 days', 'f2900000-0000-4000-8000-000000000001'::uuid, now() - interval '1 day'),
  ('f2960000-0000-4000-8000-000000000002'::uuid, 'f2910000-0000-4000-8000-000000000001'::uuid, 'f2920000-0000-4000-8000-000000000001'::uuid, 'f2930000-0000-4000-8000-000000000001'::uuid, 'f2940000-0000-4000-8000-000000000001'::uuid, 'f2950000-0000-4000-8000-000000000002'::uuid, now() - interval '2 days', 'f2900000-0000-4000-8000-000000000001'::uuid, now() - interval '20 hours'),
  ('f2960000-0000-4000-8000-000000000003'::uuid, 'f2910000-0000-4000-8000-000000000001'::uuid, 'f2920000-0000-4000-8000-000000000001'::uuid, 'f2930000-0000-4000-8000-000000000002'::uuid, 'f2940000-0000-4000-8000-000000000002'::uuid, 'f2950000-0000-4000-8000-000000000003'::uuid, now() - interval '40 days', 'f2900000-0000-4000-8000-000000000001'::uuid, now() - interval '31 days'),
  ('f2960000-0000-4000-8000-000000000004'::uuid, 'f2910000-0000-4000-8000-000000000001'::uuid, 'f2920000-0000-4000-8000-000000000001'::uuid, 'f2930000-0000-4000-8000-000000000003'::uuid, 'f2940000-0000-4000-8000-000000000003'::uuid, 'f2950000-0000-4000-8000-000000000004'::uuid, now() - interval '2 days', 'f2900000-0000-4000-8000-000000000001'::uuid, now() - interval '1 day'),
  ('f2960000-0000-4000-8000-000000000005'::uuid, 'f2910000-0000-4000-8000-000000000002'::uuid, 'f2920000-0000-4000-8000-000000000002'::uuid, 'f2930000-0000-4000-8000-000000000004'::uuid, 'f2940000-0000-4000-8000-000000000004'::uuid, 'f2950000-0000-4000-8000-000000000005'::uuid, now() - interval '2 days', 'f2900000-0000-4000-8000-000000000002'::uuid, now() - interval '1 day');

insert into public.company_funding_source_reviews (
  id, organization_id, project_id, check_id, decision, decision_note, decided_by, decided_at
) values
  ('f2970000-0000-4000-8000-000000000001'::uuid, 'f2910000-0000-4000-8000-000000000001'::uuid, 'f2920000-0000-4000-8000-000000000001'::uuid, 'f2960000-0000-4000-8000-000000000001'::uuid, 'accepted', 'current', 'f2900000-0000-4000-8000-000000000001'::uuid, now() - interval '12 hours'),
  ('f2970000-0000-4000-8000-000000000002'::uuid, 'f2910000-0000-4000-8000-000000000001'::uuid, 'f2920000-0000-4000-8000-000000000001'::uuid, 'f2960000-0000-4000-8000-000000000002'::uuid, 'rejected', 'rejected', 'f2900000-0000-4000-8000-000000000001'::uuid, now() - interval '10 hours'),
  ('f2970000-0000-4000-8000-000000000003'::uuid, 'f2910000-0000-4000-8000-000000000001'::uuid, 'f2920000-0000-4000-8000-000000000001'::uuid, 'f2960000-0000-4000-8000-000000000003'::uuid, 'accepted', 'stale', 'f2900000-0000-4000-8000-000000000001'::uuid, now() - interval '30 days'),
  ('f2970000-0000-4000-8000-000000000004'::uuid, 'f2910000-0000-4000-8000-000000000001'::uuid, 'f2920000-0000-4000-8000-000000000001'::uuid, 'f2960000-0000-4000-8000-000000000004'::uuid, 'accepted', 'second', 'f2900000-0000-4000-8000-000000000001'::uuid, now() - interval '12 hours'),
  ('f2970000-0000-4000-8000-000000000005'::uuid, 'f2910000-0000-4000-8000-000000000002'::uuid, 'f2920000-0000-4000-8000-000000000002'::uuid, 'f2960000-0000-4000-8000-000000000005'::uuid, 'accepted', 'cross', 'f2900000-0000-4000-8000-000000000002'::uuid, now() - interval '12 hours');

-- Browser roles cannot read or write the internal registry directly.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'f2900000-0000-4000-8000-000000000001', true);
do $$
declare denied boolean := false;
begin
  begin
    perform 1 from public.company_funding_program_revisions limit 1;
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'Authenticated owner received direct funding program registry access'; end if;

  denied := false;
  begin
    insert into public.company_funding_program_revisions (
      id, program_id, organization_id, project_id, evidence_item_id, source_check_id, source_review_id,
      name, kind, criteria, questions, created_by
    ) values (
      gen_random_uuid(), gen_random_uuid(),
      'f2910000-0000-4000-8000-000000000001'::uuid,
      'f2920000-0000-4000-8000-000000000001'::uuid,
      'f2930000-0000-4000-8000-000000000001'::uuid,
      'f2960000-0000-4000-8000-000000000001'::uuid,
      'f2970000-0000-4000-8000-000000000001'::uuid,
      'Browser write attempt', 'grant', '[]'::jsonb, '[]'::jsonb,
      'f2900000-0000-4000-8000-000000000001'::uuid
    );
  exception when insufficient_privilege then
    denied := true;
  end;
  if not denied then raise exception 'Authenticated owner bypassed trusted funding program registry write path'; end if;
end
$;
reset role;
set local role service_role;

-- Non-owner/admin creator cannot persist a revision even through the trusted role.
select set_config('request.jwt.claim.sub', 'f2900000-0000-4000-8000-000000000003', true);
do $$
declare denied boolean := false;
begin
  begin
    insert into public.company_funding_program_revisions (
      id, program_id, organization_id, project_id, evidence_item_id, source_check_id, source_review_id,
      name, kind, criteria, questions, created_by
    ) values (
      'f2980000-0000-4000-8000-000000000010'::uuid, 'f2980000-0000-4000-8000-000000000010'::uuid,
      'f2910000-0000-4000-8000-000000000001'::uuid, 'f2920000-0000-4000-8000-000000000001'::uuid,
      'f2930000-0000-4000-8000-000000000001'::uuid, 'f2960000-0000-4000-8000-000000000001'::uuid,
      'f2970000-0000-4000-8000-000000000001'::uuid, 'Analyst attempt', 'grant', '[]'::jsonb, '[]'::jsonb,
      'f2900000-0000-4000-8000-000000000003'::uuid
    );
  exception when raise_exception then denied := true;
  end;
  if not denied then raise exception 'non-owner/admin funding program revision creator was accepted'; end if;
end
$$;

select set_config('request.jwt.claim.sub', 'f2900000-0000-4000-8000-000000000001', true);

do $$
declare denied boolean := false;
begin
  begin
    insert into public.company_funding_program_revisions (
      id, program_id, organization_id, project_id, evidence_item_id, source_check_id, source_review_id,
      name, kind, criteria, questions, created_by
    ) values (
      'f2980000-0000-4000-8000-000000000011'::uuid, 'f2980000-0000-4000-8000-000000000011'::uuid,
      'f2910000-0000-4000-8000-000000000001'::uuid, 'f2920000-0000-4000-8000-000000000001'::uuid,
      'f2930000-0000-4000-8000-000000000002'::uuid, 'f2960000-0000-4000-8000-000000000003'::uuid,
      'f2970000-0000-4000-8000-000000000003'::uuid, 'Stale attempt', 'grant', '[]'::jsonb, '[]'::jsonb,
      'f2900000-0000-4000-8000-000000000001'::uuid
    );
  exception when raise_exception then denied := true;
  end;
  if not denied then raise exception 'stale funding source review was accepted into registry'; end if;
end
$$;

do $$
declare denied boolean := false;
begin
  begin
    insert into public.company_funding_program_revisions (
      id, program_id, organization_id, project_id, evidence_item_id, source_check_id, source_review_id,
      name, kind, criteria, questions, created_by
    ) values (
      'f2980000-0000-4000-8000-000000000012'::uuid, 'f2980000-0000-4000-8000-000000000012'::uuid,
      'f2910000-0000-4000-8000-000000000001'::uuid, 'f2920000-0000-4000-8000-000000000001'::uuid,
      'f2930000-0000-4000-8000-000000000001'::uuid, 'f2960000-0000-4000-8000-000000000002'::uuid,
      'f2970000-0000-4000-8000-000000000002'::uuid, 'Rejected attempt', 'grant', '[]'::jsonb, '[]'::jsonb,
      'f2900000-0000-4000-8000-000000000001'::uuid
    );
  exception when raise_exception then denied := true;
  end;
  if not denied then raise exception 'rejected funding source review was accepted into registry'; end if;
end
$$;

do $$
declare denied boolean := false;
begin
  begin
    insert into public.company_funding_program_revisions (
      id, program_id, organization_id, project_id, evidence_item_id, source_check_id, source_review_id,
      name, kind, criteria, questions, created_by
    ) values (
      'f2980000-0000-4000-8000-000000000013'::uuid, 'f2980000-0000-4000-8000-000000000013'::uuid,
      'f2910000-0000-4000-8000-000000000001'::uuid, 'f2920000-0000-4000-8000-000000000001'::uuid,
      'f2930000-0000-4000-8000-000000000004'::uuid, 'f2960000-0000-4000-8000-000000000005'::uuid,
      'f2970000-0000-4000-8000-000000000005'::uuid, 'Cross attempt', 'grant', '[]'::jsonb, '[]'::jsonb,
      'f2900000-0000-4000-8000-000000000001'::uuid
    );
  exception when raise_exception then denied := true;
  end;
  if not denied then raise exception 'cross-project funding source review was accepted into registry'; end if;
end
$$;

-- Valid first revisions for two logical programs.
insert into public.company_funding_program_revisions (
  id, program_id, organization_id, project_id, evidence_item_id, source_check_id, source_review_id,
  name, kind, deadline_at, criteria, questions, created_by
) values
  (
    'f2980000-0000-4000-8000-000000000001'::uuid, 'f2980000-0000-4000-8000-000000000001'::uuid,
    'f2910000-0000-4000-8000-000000000001'::uuid, 'f2920000-0000-4000-8000-000000000001'::uuid,
    'f2930000-0000-4000-8000-000000000001'::uuid, 'f2960000-0000-4000-8000-000000000001'::uuid,
    'f2970000-0000-4000-8000-000000000001'::uuid, 'Program A', 'accelerator', now() + interval '20 days',
    '[{"id":"country","factKey":"company.country","operator":"eq","expected":"BD"}]'::jsonb,
    '[{"id":"pitch","prompt":"Describe the company.","factKey":"company.name","maxChars":500,"required":true}]'::jsonb,
    'f2900000-0000-4000-8000-000000000001'::uuid
  ),
  (
    'f2980000-0000-4000-8000-000000000002'::uuid, 'f2980000-0000-4000-8000-000000000002'::uuid,
    'f2910000-0000-4000-8000-000000000001'::uuid, 'f2920000-0000-4000-8000-000000000001'::uuid,
    'f2930000-0000-4000-8000-000000000003'::uuid, 'f2960000-0000-4000-8000-000000000004'::uuid,
    'f2970000-0000-4000-8000-000000000004'::uuid, 'Second Program A', 'grant', null,
    '[]'::jsonb, '[]'::jsonb,
    'f2900000-0000-4000-8000-000000000001'::uuid
  );

-- Valid superseding revision of Program A.
insert into public.company_funding_program_revisions (
  id, program_id, organization_id, project_id, evidence_item_id, source_check_id, source_review_id,
  supersedes_revision_id, name, kind, deadline_at, criteria, questions, created_by
) values (
  'f2980000-0000-4000-8000-000000000003'::uuid, 'f2980000-0000-4000-8000-000000000001'::uuid,
  'f2910000-0000-4000-8000-000000000001'::uuid, 'f2920000-0000-4000-8000-000000000001'::uuid,
  'f2930000-0000-4000-8000-000000000001'::uuid, 'f2960000-0000-4000-8000-000000000001'::uuid,
  'f2970000-0000-4000-8000-000000000001'::uuid, 'f2980000-0000-4000-8000-000000000001'::uuid,
  'Program A — revised', 'accelerator', now() + interval '25 days',
  '[{"id":"country","factKey":"company.country","operator":"eq","expected":"BD"}]'::jsonb,
  '[]'::jsonb, 'f2900000-0000-4000-8000-000000000001'::uuid
);

do $$
declare denied boolean := false;
begin
  begin
    insert into public.company_funding_program_revisions (
      id, program_id, organization_id, project_id, evidence_item_id, source_check_id, source_review_id,
      supersedes_revision_id, name, kind, criteria, questions, created_by
    ) values (
      'f2980000-0000-4000-8000-000000000004'::uuid, 'f2980000-0000-4000-8000-000000000001'::uuid,
      'f2910000-0000-4000-8000-000000000001'::uuid, 'f2920000-0000-4000-8000-000000000001'::uuid,
      'f2930000-0000-4000-8000-000000000001'::uuid, 'f2960000-0000-4000-8000-000000000001'::uuid,
      'f2970000-0000-4000-8000-000000000001'::uuid, 'f2980000-0000-4000-8000-000000000001'::uuid,
      'Fork', 'accelerator', '[]'::jsonb, '[]'::jsonb, 'f2900000-0000-4000-8000-000000000001'::uuid
    );
  exception when unique_violation or raise_exception then denied := true;
  end;
  if not denied then raise exception 'funding program supersession fork was accepted'; end if;
end
$$;

do $$
declare denied boolean := false;
begin
  begin
    insert into public.company_funding_program_revisions (
      id, program_id, organization_id, project_id, evidence_item_id, source_check_id, source_review_id,
      supersedes_revision_id, name, kind, criteria, questions, created_by
    ) values (
      'f2980000-0000-4000-8000-000000000005'::uuid, 'f2980000-0000-4000-8000-000000000002'::uuid,
      'f2910000-0000-4000-8000-000000000001'::uuid, 'f2920000-0000-4000-8000-000000000001'::uuid,
      'f2930000-0000-4000-8000-000000000001'::uuid, 'f2960000-0000-4000-8000-000000000001'::uuid,
      'f2970000-0000-4000-8000-000000000001'::uuid, 'f2980000-0000-4000-8000-000000000003'::uuid,
      'Cross program', 'grant', '[]'::jsonb, '[]'::jsonb, 'f2900000-0000-4000-8000-000000000001'::uuid
    );
  exception when raise_exception then denied := true;
  end;
  if not denied then raise exception 'cross-program supersession was accepted'; end if;
end
$$;

create or replace function pg_temp.insert_registry_draft(
  p_id uuid,
  p_revision_id uuid,
  p_program_id uuid,
  p_evidence_id uuid,
  p_check_id uuid,
  p_review_id uuid,
  p_observed_at timestamptz,
  p_digest_char text
)
returns void
language plpgsql
as $$
declare
  v_url text;
  v_input text := repeat(p_digest_char, 64);
begin
  select source_url into v_url from public.evidence_items where id = p_evidence_id;
  insert into public.company_funding_draft_artifacts (
    id, organization_id, project_id, created_by, profile_revision, package_version,
    input_digest, artifact_digest, program_evidence_ids, program_source_check_ids,
    program_source_review_ids, program_revision_ids, company_truth_assertion_ids, artifact
  ) values (
    p_id,
    'f2910000-0000-4000-8000-000000000001'::uuid,
    'f2920000-0000-4000-8000-000000000001'::uuid,
    'f2900000-0000-4000-8000-000000000001'::uuid,
    'company-truth-v1-' || repeat('a', 64),
    '0.1.0', v_input, repeat(p_digest_char, 64),
    array[p_evidence_id], array[p_check_id], array[p_review_id], array[p_revision_id], '{}'::uuid[],
    jsonb_build_object(
      'schemaVersion',1,'packageVersion','0.1.0','mode','internal_draft_only',
      'externalEffects',false,'submissionAuthorized',false,'requiresSubmissionApproval',true,
      'organizationId','f2910000-0000-4000-8000-000000000001',
      'projectId','f2920000-0000-4000-8000-000000000001',
      'profileRevision','company-truth-v1-' || repeat('a',64),
      'asOf',now(),'inputDigest',v_input,
      'evidence',jsonb_build_array(jsonb_build_object(
        'id',p_evidence_id::text,'url',v_url,'authority','official',
        'observedAt',p_observed_at,'maxAgeDays',30
      )),
      'facts','[]'::jsonb,
      'opportunities',jsonb_build_array(jsonb_build_object(
        'id',p_program_id::text,'name','Program A','kind','accelerator',
        'eligibility','unknown','readiness','blocked','criteria','[]'::jsonb,'answers','[]'::jsonb,
        'blockers',jsonb_build_array('criteria_missing'),'sourceEvidenceId',p_evidence_id::text,
        'deadlineAt',null,'reviewDigest',repeat('f',64)
      ))
    )
  );
end;
$$;

-- Missing registry provenance is rejected.
do $$
declare denied boolean := false;
begin
  begin
    insert into public.company_funding_draft_artifacts (
      id, organization_id, project_id, created_by, profile_revision, package_version,
      input_digest, artifact_digest, program_evidence_ids, program_source_check_ids,
      program_source_review_ids, company_truth_assertion_ids, artifact
    ) values (
      'f2990000-0000-4000-8000-000000000001'::uuid,
      'f2910000-0000-4000-8000-000000000001'::uuid,
      'f2920000-0000-4000-8000-000000000001'::uuid,
      'f2900000-0000-4000-8000-000000000001'::uuid,
      'company-truth-v1-' || repeat('a',64),'0.1.0',repeat('1',64),repeat('1',64),
      array['f2930000-0000-4000-8000-000000000001'::uuid],
      array['f2960000-0000-4000-8000-000000000001'::uuid],
      array['f2970000-0000-4000-8000-000000000001'::uuid],
      '{}'::uuid[], '{}'::jsonb
    );
  exception when raise_exception then denied := true;
  end;
  if not denied then raise exception 'draft without program revision provenance was accepted'; end if;
end
$$;

-- Superseded first revision cannot create a new draft.
do $$
declare denied boolean := false;
begin
  begin
    perform pg_temp.insert_registry_draft(
      'f2990000-0000-4000-8000-000000000002'::uuid,
      'f2980000-0000-4000-8000-000000000001'::uuid,
      'f2980000-0000-4000-8000-000000000001'::uuid,
      'f2930000-0000-4000-8000-000000000001'::uuid,
      'f2960000-0000-4000-8000-000000000001'::uuid,
      'f2970000-0000-4000-8000-000000000001'::uuid,
      now() - interval '1 day', '2'
    );
  exception when raise_exception then denied := true;
  end;
  if not denied then raise exception 'superseded funding program revision created a draft'; end if;
end
$$;

-- Current superseding revision can create a draft.
do $$
begin
  begin
    perform pg_temp.insert_registry_draft(
      'f2990000-0000-4000-8000-000000000003'::uuid,
      'f2980000-0000-4000-8000-000000000003'::uuid,
      'f2980000-0000-4000-8000-000000000001'::uuid,
      'f2930000-0000-4000-8000-000000000001'::uuid,
      'f2960000-0000-4000-8000-000000000001'::uuid,
      'f2970000-0000-4000-8000-000000000001'::uuid,
      now() - interval '1 day', '3'
    );
  exception when others then
    raise exception 'current funding program revision draft was rejected: %', sqlerrm;
  end;
end
$$;

rollback;
