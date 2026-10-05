\set ON_ERROR_STOP on

begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

insert into auth.users (id) values
  ('f2700000-0000-4000-8000-000000000001'::uuid),
  ('f2700000-0000-4000-8000-000000000002'::uuid),
  ('f2700000-0000-4000-8000-000000000003'::uuid);

insert into public.organizations (id, name, slug, created_by) values
  ('f2710000-0000-4000-8000-000000000001'::uuid, 'Funding Review Tenant A', 'funding-review-tenant-a', 'f2700000-0000-4000-8000-000000000001'::uuid),
  ('f2710000-0000-4000-8000-000000000002'::uuid, 'Funding Review Tenant B', 'funding-review-tenant-b', 'f2700000-0000-4000-8000-000000000002'::uuid);

insert into public.organization_members (organization_id, user_id, role) values
  ('f2710000-0000-4000-8000-000000000001'::uuid, 'f2700000-0000-4000-8000-000000000001'::uuid, 'owner'),
  ('f2710000-0000-4000-8000-000000000001'::uuid, 'f2700000-0000-4000-8000-000000000003'::uuid, 'analyst'),
  ('f2710000-0000-4000-8000-000000000002'::uuid, 'f2700000-0000-4000-8000-000000000002'::uuid, 'owner');

insert into public.projects (id, organization_id, name, slug, client_brand, status, created_by) values
  ('f2720000-0000-4000-8000-000000000001'::uuid, 'f2710000-0000-4000-8000-000000000001'::uuid, 'Funding Review Project A', 'funding-review-project-a', 'Funding Review A', 'active', 'f2700000-0000-4000-8000-000000000001'::uuid),
  ('f2720000-0000-4000-8000-000000000002'::uuid, 'f2710000-0000-4000-8000-000000000002'::uuid, 'Funding Review Project B', 'funding-review-project-b', 'Funding Review B', 'active', 'f2700000-0000-4000-8000-000000000002'::uuid);

insert into public.evidence_items (
  id, organization_id, project_id, evidence_type, title, source_url, owner_id,
  verification_status, verified_at, expires_at, usage_rights
) values
  (
    'f2730000-0000-4000-8000-000000000001'::uuid,
    'f2710000-0000-4000-8000-000000000001'::uuid,
    'f2720000-0000-4000-8000-000000000001'::uuid,
    'funding_program_official',
    'Official Program A',
    'https://funding-review-a.invalid/program',
    'f2700000-0000-4000-8000-000000000001'::uuid,
    'verified',
    '2026-10-05T15:00:00Z'::timestamptz,
    '2026-11-05T15:00:00Z'::timestamptz,
    'fixture verification only'
  ),
  (
    'f2730000-0000-4000-8000-000000000002'::uuid,
    'f2710000-0000-4000-8000-000000000002'::uuid,
    'f2720000-0000-4000-8000-000000000002'::uuid,
    'funding_program_official',
    'Official Program B',
    'https://funding-review-b.invalid/program',
    'f2700000-0000-4000-8000-000000000002'::uuid,
    'verified',
    '2026-10-05T15:00:00Z'::timestamptz,
    '2026-11-05T15:00:00Z'::timestamptz,
    'fixture verification only'
  );

insert into public.sources (id, organization_id, canonical_url, domain, page_title, source_type, crawler_access) values
  (
    'f2740000-0000-4000-8000-000000000001'::uuid,
    'f2710000-0000-4000-8000-000000000001'::uuid,
    'https://funding-review-a.invalid/program',
    'funding-review-a.invalid',
    'Official Program A',
    'funding_program_official',
    'open'
  ),
  (
    'f2740000-0000-4000-8000-000000000002'::uuid,
    'f2710000-0000-4000-8000-000000000002'::uuid,
    'https://funding-review-b.invalid/program',
    'funding-review-b.invalid',
    'Official Program B',
    'funding_program_official',
    'open'
  );

insert into public.source_snapshots (
  id, organization_id, source_id, snapshot_key, canonical_url, final_url, retrieved_at,
  access, http_status, content_type, page_title, redirect_count, content_length,
  content_signature, content_hash, representation_version, change_state, change_reason,
  created_by, evidence_excerpt
) values
  (
    'f2750000-0000-4000-8000-000000000001'::uuid,
    'f2710000-0000-4000-8000-000000000001'::uuid,
    'f2740000-0000-4000-8000-000000000001'::uuid,
    'funding-review-a-open',
    'https://funding-review-a.invalid/program',
    'https://funding-review-a.invalid/program',
    '2026-10-05T15:10:00Z'::timestamptz,
    'open',
    200,
    'text/html',
    'Official Program A',
    0,
    1000,
    'deadbeef',
    repeat('a', 64),
    'visible-text-prefix-24k-v1',
    'initial',
    'Fixture open source observation.',
    'f2700000-0000-4000-8000-000000000001'::uuid,
    'Fixture bounded evidence excerpt.'
  ),
  (
    'f2750000-0000-4000-8000-000000000002'::uuid,
    'f2710000-0000-4000-8000-000000000001'::uuid,
    'f2740000-0000-4000-8000-000000000001'::uuid,
    'funding-review-a-blocked',
    'https://funding-review-a.invalid/program',
    'https://funding-review-a.invalid/program',
    '2026-10-05T15:20:00Z'::timestamptz,
    'blocked',
    403,
    'text/html',
    'Official Program A',
    0,
    0,
    null,
    null,
    'visible-text-prefix-24k-v1',
    'unreachable',
    'Fixture blocked source observation.',
    'f2700000-0000-4000-8000-000000000001'::uuid,
    null
  ),
  (
    'f2750000-0000-4000-8000-000000000003'::uuid,
    'f2710000-0000-4000-8000-000000000002'::uuid,
    'f2740000-0000-4000-8000-000000000002'::uuid,
    'funding-review-b-open',
    'https://funding-review-b.invalid/program',
    'https://funding-review-b.invalid/program',
    '2026-10-05T15:10:00Z'::timestamptz,
    'open',
    200,
    'text/html',
    'Official Program B',
    0,
    1000,
    'feedface',
    repeat('b', 64),
    'visible-text-prefix-24k-v1',
    'initial',
    'Fixture open source observation.',
    'f2700000-0000-4000-8000-000000000002'::uuid,
    'Fixture bounded evidence excerpt.'
  );

insert into public.company_funding_source_checks (
  id, organization_id, project_id, evidence_item_id, source_id, source_snapshot_id,
  evidence_verified_at, created_by, checked_at
) values
  (
    'f2760000-0000-4000-8000-000000000001'::uuid,
    'f2710000-0000-4000-8000-000000000001'::uuid,
    'f2720000-0000-4000-8000-000000000001'::uuid,
    'f2730000-0000-4000-8000-000000000001'::uuid,
    'f2740000-0000-4000-8000-000000000001'::uuid,
    'f2750000-0000-4000-8000-000000000001'::uuid,
    '2026-10-05T15:00:00Z'::timestamptz,
    'f2700000-0000-4000-8000-000000000001'::uuid,
    '2026-10-05T15:10:00Z'::timestamptz
  ),
  (
    'f2760000-0000-4000-8000-000000000002'::uuid,
    'f2710000-0000-4000-8000-000000000001'::uuid,
    'f2720000-0000-4000-8000-000000000001'::uuid,
    'f2730000-0000-4000-8000-000000000001'::uuid,
    'f2740000-0000-4000-8000-000000000001'::uuid,
    'f2750000-0000-4000-8000-000000000002'::uuid,
    '2026-10-05T15:00:00Z'::timestamptz,
    'f2700000-0000-4000-8000-000000000001'::uuid,
    '2026-10-05T15:20:00Z'::timestamptz
  );

-- Browser roles cannot inspect or forge the internal ledger directly.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'f2700000-0000-4000-8000-000000000001', true);

do $$
declare
  denied boolean := false;
begin
  begin
    perform 1 from public.company_funding_source_checks limit 1;
  exception when insufficient_privilege then
    denied := true;
  end;
  if not denied then raise exception 'Authenticated owner received direct funding source check access'; end if;

  denied := false;
  begin
    insert into public.company_funding_source_checks (
      organization_id, project_id, evidence_item_id, source_id, source_snapshot_id,
      evidence_verified_at, created_by, checked_at
    ) values (
      'f2710000-0000-4000-8000-000000000001'::uuid,
      'f2720000-0000-4000-8000-000000000001'::uuid,
      'f2730000-0000-4000-8000-000000000001'::uuid,
      'f2740000-0000-4000-8000-000000000001'::uuid,
      'f2750000-0000-4000-8000-000000000001'::uuid,
      '2026-10-05T15:00:00Z'::timestamptz,
      'f2700000-0000-4000-8000-000000000001'::uuid,
      '2026-10-05T15:10:00Z'::timestamptz
    );
  exception when insufficient_privilege then
    denied := true;
  end;
  if not denied then raise exception 'Authenticated owner bypassed trusted funding source check write path'; end if;
end
$$;

reset role;
set local role service_role;

-- Keep auth.uid aligned with the analyst creator so the independent membership
-- guard, not actor mismatch, proves the non-owner/admin boundary.
select set_config('request.jwt.claim.sub', 'f2700000-0000-4000-8000-000000000003', true);
do $$
declare
  denied boolean := false;
begin
  begin
    insert into public.company_funding_source_checks (
      organization_id, project_id, evidence_item_id, source_id, source_snapshot_id,
      evidence_verified_at, created_by, checked_at
    ) values (
      'f2710000-0000-4000-8000-000000000001'::uuid,
      'f2720000-0000-4000-8000-000000000001'::uuid,
      'f2730000-0000-4000-8000-000000000001'::uuid,
      'f2740000-0000-4000-8000-000000000001'::uuid,
      'f2750000-0000-4000-8000-000000000001'::uuid,
      '2026-10-05T15:00:00Z'::timestamptz,
      'f2700000-0000-4000-8000-000000000003'::uuid,
      '2026-10-05T15:10:00Z'::timestamptz
    );
  exception when raise_exception then
    denied := true;
  end;
  if not denied then raise exception 'non-owner/admin funding source check creator was accepted'; end if;
end
$$;

-- Cross-project evidence cannot be rebound into Tenant A.
select set_config('request.jwt.claim.sub', 'f2700000-0000-4000-8000-000000000001', true);
do $$
declare
  denied boolean := false;
begin
  begin
    insert into public.company_funding_source_checks (
      organization_id, project_id, evidence_item_id, source_id, source_snapshot_id,
      evidence_verified_at, created_by, checked_at
    ) values (
      'f2710000-0000-4000-8000-000000000001'::uuid,
      'f2720000-0000-4000-8000-000000000001'::uuid,
      'f2730000-0000-4000-8000-000000000002'::uuid,
      'f2740000-0000-4000-8000-000000000002'::uuid,
      'f2750000-0000-4000-8000-000000000003'::uuid,
      '2026-10-05T15:00:00Z'::timestamptz,
      'f2700000-0000-4000-8000-000000000001'::uuid,
      '2026-10-05T15:10:00Z'::timestamptz
    );
  exception when raise_exception then
    denied := true;
  end;
  if not denied then raise exception 'cross-project funding evidence was accepted'; end if;
end
$$;

-- A reachable exact snapshot can receive one accepted human review.
insert into public.company_funding_source_reviews (
  id, organization_id, project_id, check_id, decision, decision_note, decided_by, decided_at
) values (
  'f2770000-0000-4000-8000-000000000001'::uuid,
  'f2710000-0000-4000-8000-000000000001'::uuid,
  'f2720000-0000-4000-8000-000000000001'::uuid,
  'f2760000-0000-4000-8000-000000000001'::uuid,
  'accepted',
  'Fixture operator accepted the bounded source observation.',
  'f2700000-0000-4000-8000-000000000001'::uuid,
  '2026-10-05T15:30:00Z'::timestamptz
);

-- The same check cannot be reviewed twice.
do $$
declare
  denied boolean := false;
begin
  begin
    insert into public.company_funding_source_reviews (
      organization_id, project_id, check_id, decision, decided_by, decided_at
    ) values (
      'f2710000-0000-4000-8000-000000000001'::uuid,
      'f2720000-0000-4000-8000-000000000001'::uuid,
      'f2760000-0000-4000-8000-000000000001'::uuid,
      'rejected',
      'f2700000-0000-4000-8000-000000000001'::uuid,
      '2026-10-05T15:31:00Z'::timestamptz
    );
  exception when unique_violation then
    denied := true;
  end;
  if not denied then raise exception 'duplicate funding source review was accepted'; end if;
end
$$;

-- A blocked/unreachable exact snapshot can never be accepted.
do $$
declare
  denied boolean := false;
begin
  begin
    insert into public.company_funding_source_reviews (
      organization_id, project_id, check_id, decision, decided_by, decided_at
    ) values (
      'f2710000-0000-4000-8000-000000000001'::uuid,
      'f2720000-0000-4000-8000-000000000001'::uuid,
      'f2760000-0000-4000-8000-000000000002'::uuid,
      'accepted',
      'f2700000-0000-4000-8000-000000000001'::uuid,
      '2026-10-05T15:32:00Z'::timestamptz
    );
  exception when raise_exception then
    denied := true;
  end;
  if not denied then raise exception 'unreachable funding source check was accepted'; end if;
end
$$;

rollback;
