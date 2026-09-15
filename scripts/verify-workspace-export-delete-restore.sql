\set ON_ERROR_STOP on

begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- Disposable canonical recovery fixture. The entire script is rolled back.
insert into auth.users (id) values
  ('f1200000-0000-4000-8000-000000000001'::uuid);

insert into public.organizations (id, name, slug, created_by) values
  ('f1200000-0000-4000-8000-000000000010'::uuid, 'F12 Recovery Fixture', 'f12-recovery-fixture', 'f1200000-0000-4000-8000-000000000001'::uuid);

insert into public.organization_members (organization_id, user_id, role) values
  ('f1200000-0000-4000-8000-000000000010'::uuid, 'f1200000-0000-4000-8000-000000000001'::uuid, 'owner');

insert into public.categories (id, organization_id, name) values
  ('f1200000-0000-4000-8000-000000000020'::uuid, 'f1200000-0000-4000-8000-000000000010'::uuid, 'Recovery Category');

insert into public.projects (id, organization_id, name, slug, client_brand, website, created_by) values
  ('f1200000-0000-4000-8000-000000000030'::uuid, 'f1200000-0000-4000-8000-000000000010'::uuid, 'Recovery Project', 'recovery-project', 'FixtureCo', 'https://fixture.example', 'f1200000-0000-4000-8000-000000000001'::uuid);

insert into public.prompts (id, organization_id, project_id, category_id, prompt_key, prompt_text, buyer_stage, locale, market) values
  ('f1200000-0000-4000-8000-000000000040'::uuid, 'f1200000-0000-4000-8000-000000000010'::uuid, 'f1200000-0000-4000-8000-000000000030'::uuid, 'f1200000-0000-4000-8000-000000000020'::uuid, 'fixture-buyer-question', 'Which fixture product fits this buyer?', 'consideration', 'en-US', 'global');

insert into public.runs (
  id, organization_id, project_id, category_id, status, provider_ids,
  prompt_count, answer_count, citation_count, requested_units, actual_cost_usd,
  methodology_version, created_by, started_at, completed_at
) values (
  'f1200000-0000-4000-8000-000000000050'::uuid,
  'f1200000-0000-4000-8000-000000000010'::uuid,
  'f1200000-0000-4000-8000-000000000030'::uuid,
  'f1200000-0000-4000-8000-000000000020'::uuid,
  'complete', array['groq']::text[], 1, 1, 1, 1, 0.012345, '3.0',
  'f1200000-0000-4000-8000-000000000001'::uuid,
  now() - interval '2 hours', now() - interval '1 hour'
);

insert into public.run_prompt_selections (
  organization_id, run_id, prompt_id, prompt_key, prompt_text, locale, market
) values (
  'f1200000-0000-4000-8000-000000000010'::uuid,
  'f1200000-0000-4000-8000-000000000050'::uuid,
  'f1200000-0000-4000-8000-000000000040'::uuid,
  'fixture-buyer-question', 'Which fixture product fits this buyer?', 'en-US', 'global'
);

insert into public.run_answers (
  id, organization_id, run_id, prompt_id, prompt_key, prompt_text, provider, model,
  answer_text, citations_json, brand_present, review_status, collected_at,
  estimated_cost_usd, cost_source
) values (
  'f1200000-0000-4000-8000-000000000060'::uuid,
  'f1200000-0000-4000-8000-000000000010'::uuid,
  'f1200000-0000-4000-8000-000000000050'::uuid,
  'f1200000-0000-4000-8000-000000000040'::uuid,
  'fixture-buyer-question', 'Which fixture product fits this buyer?', 'groq', 'fixture-model',
  'FixtureCo is present in the synthetic recommendation.', '[]'::jsonb, true, 'verified', now() - interval '1 hour',
  0.012345, 'estimated'
);

insert into public.sources (
  id, organization_id, canonical_url, domain, page_title, source_type, crawler_access,
  crawler_checked_at, content_signature, content_length, last_reachable_at
) values (
  'f1200000-0000-4000-8000-000000000070'::uuid,
  'f1200000-0000-4000-8000-000000000010'::uuid,
  'https://fixture.example/evidence', 'fixture.example', 'Fixture Evidence', 'documentation', 'open',
  now() - interval '50 minutes', '0123abcd', 1234, now() - interval '50 minutes'
);

insert into public.source_observations (
  id, organization_id, source_id, run_answer_id, prompt_id, provider,
  citation_ordinal, observed_at, review_status, reviewer_id, observation_key
) values (
  'f1200000-0000-4000-8000-000000000080'::uuid,
  'f1200000-0000-4000-8000-000000000010'::uuid,
  'f1200000-0000-4000-8000-000000000070'::uuid,
  'f1200000-0000-4000-8000-000000000060'::uuid,
  'f1200000-0000-4000-8000-000000000040'::uuid,
  'groq', 1, now() - interval '1 hour', 'verified',
  'f1200000-0000-4000-8000-000000000001'::uuid,
  'f12-fixture-observation'
);

insert into public.source_snapshots (
  id, organization_id, source_id, run_id, snapshot_key, canonical_url, final_url,
  retrieved_at, access, http_status, content_type, page_title, redirect_count,
  content_length, content_signature, content_hash, representation_version,
  change_state, change_reason, created_by, evidence_excerpt
) values (
  'f1200000-0000-4000-8000-000000000090'::uuid,
  'f1200000-0000-4000-8000-000000000010'::uuid,
  'f1200000-0000-4000-8000-000000000070'::uuid,
  'f1200000-0000-4000-8000-000000000050'::uuid,
  'f12-fixture-snapshot', 'https://fixture.example/evidence', 'https://fixture.example/evidence',
  now() - interval '50 minutes', 'open', 200, 'text/html', 'Fixture Evidence', 0,
  1234, '0123abcd', repeat('a', 64), 'visible-text-prefix-24k-v1',
  'initial', 'First saved page observation for the recovery fixture.',
  'f1200000-0000-4000-8000-000000000001'::uuid,
  'FixtureCo historical evidence excerpt retained for recovery verification.'
);

insert into public.source_snapshot_observations (source_snapshot_id, source_observation_id) values (
  'f1200000-0000-4000-8000-000000000090'::uuid,
  'f1200000-0000-4000-8000-000000000080'::uuid
);

insert into public.evidence_items (
  id, organization_id, project_id, evidence_type, title, source_url, owner_id, verification_status, verified_at
) values (
  'f1200000-0000-4000-8000-0000000000a0'::uuid,
  'f1200000-0000-4000-8000-000000000010'::uuid,
  'f1200000-0000-4000-8000-000000000030'::uuid,
  'source', 'Fixture evidence item', 'https://fixture.example/evidence',
  'f1200000-0000-4000-8000-000000000001'::uuid, 'verified', now() - interval '45 minutes'
);

insert into public.verified_claims (
  id, organization_id, project_id, evidence_item_id, claim_text, approved_wording,
  public_use, verified_by, verified_at, verification_status
) values (
  'f1200000-0000-4000-8000-0000000000b0'::uuid,
  'f1200000-0000-4000-8000-000000000010'::uuid,
  'f1200000-0000-4000-8000-000000000030'::uuid,
  'f1200000-0000-4000-8000-0000000000a0'::uuid,
  'FixtureCo has synthetic evidence.', 'FixtureCo has synthetic evidence.', false,
  'f1200000-0000-4000-8000-000000000001'::uuid, now() - interval '40 minutes', 'verified'
);

insert into public.placements (
  id, organization_id, source_id, source_url, page_title, entry_route,
  stage, owner_id, created_by, priority, baseline_run_id
) values (
  'f1200000-0000-4000-8000-0000000000c0'::uuid,
  'f1200000-0000-4000-8000-000000000010'::uuid,
  'f1200000-0000-4000-8000-000000000070'::uuid,
  'https://fixture.example/evidence', 'Fixture Evidence', 'documentation',
  'identified', 'f1200000-0000-4000-8000-000000000001'::uuid,
  'f1200000-0000-4000-8000-000000000001'::uuid, 'normal',
  'f1200000-0000-4000-8000-000000000050'::uuid
);

-- Capture the representative canonical graph in JSON, matching workspace.json
-- record shapes closely enough to exercise typed JSON restore without CSV loss.
create temp table f12_export_bundle (
  dataset text primary key,
  rows jsonb not null
) on commit drop;

insert into f12_export_bundle values
  ('organization', (select jsonb_agg(to_jsonb(t) order by id) from public.organizations t where id='f1200000-0000-4000-8000-000000000010'::uuid)),
  ('organization_members', (select jsonb_agg(to_jsonb(t) order by organization_id,user_id) from public.organization_members t where organization_id='f1200000-0000-4000-8000-000000000010'::uuid)),
  ('categories', (select jsonb_agg(to_jsonb(t) order by id) from public.categories t where organization_id='f1200000-0000-4000-8000-000000000010'::uuid)),
  ('projects', (select jsonb_agg(to_jsonb(t) order by id) from public.projects t where organization_id='f1200000-0000-4000-8000-000000000010'::uuid)),
  ('prompts', (select jsonb_agg(to_jsonb(t) order by id) from public.prompts t where organization_id='f1200000-0000-4000-8000-000000000010'::uuid)),
  ('runs', (select jsonb_agg(to_jsonb(t) order by id) from public.runs t where organization_id='f1200000-0000-4000-8000-000000000010'::uuid)),
  ('run_prompt_selections', (select jsonb_agg(to_jsonb(t) order by run_id,prompt_key) from public.run_prompt_selections t where organization_id='f1200000-0000-4000-8000-000000000010'::uuid)),
  ('run_answers', (select jsonb_agg(to_jsonb(t) order by id) from public.run_answers t where organization_id='f1200000-0000-4000-8000-000000000010'::uuid)),
  ('sources', (select jsonb_agg(to_jsonb(t) order by id) from public.sources t where organization_id='f1200000-0000-4000-8000-000000000010'::uuid)),
  ('source_observations', (select jsonb_agg(to_jsonb(t) order by id) from public.source_observations t where organization_id='f1200000-0000-4000-8000-000000000010'::uuid)),
  ('source_snapshots', (select jsonb_agg(to_jsonb(t) order by id) from public.source_snapshots t where organization_id='f1200000-0000-4000-8000-000000000010'::uuid)),
  ('source_snapshot_observations', (select jsonb_agg(to_jsonb(link) order by source_snapshot_id,source_observation_id) from public.source_snapshot_observations link where source_snapshot_id='f1200000-0000-4000-8000-000000000090'::uuid)),
  ('evidence_items', (select jsonb_agg(to_jsonb(t) order by id) from public.evidence_items t where organization_id='f1200000-0000-4000-8000-000000000010'::uuid)),
  ('verified_claims', (select jsonb_agg(to_jsonb(t) order by id) from public.verified_claims t where organization_id='f1200000-0000-4000-8000-000000000010'::uuid)),
  ('placements', (select jsonb_agg(to_jsonb(t) order by id) from public.placements t where organization_id='f1200000-0000-4000-8000-000000000010'::uuid));

do $$
begin
  if exists (select 1 from f12_export_bundle where rows is null or jsonb_array_length(rows) <> 1) then
    raise exception 'Canonical workspace fixture did not export exactly one representative row per dataset';
  end if;
end
$$;

insert into public.account_deletion_requests (
  id, organization_id, requested_by, status, scheduled_for, reason
) values (
  'f1200000-0000-4000-8000-0000000000d0'::uuid,
  'f1200000-0000-4000-8000-000000000010'::uuid,
  'f1200000-0000-4000-8000-000000000001'::uuid,
  'pending', now() - interval '8 days', 'Disposable F12 delete/restore verification'
);

select * from public.execute_foremention_account_deletion(
  'f1200000-0000-4000-8000-0000000000d0'::uuid,
  'f1200000-0000-4000-8000-000000000001'::uuid
);

do $$
begin
  if exists (select 1 from public.organizations where id='f1200000-0000-4000-8000-000000000010'::uuid) then
    raise exception 'Permanent deletion left the organization present';
  end if;
  if exists (select 1 from public.source_snapshots where organization_id='f1200000-0000-4000-8000-000000000010'::uuid) then
    raise exception 'Permanent deletion left tenant source snapshots present';
  end if;
  if not exists (select 1 from public.data_deletion_receipts where request_id='f1200000-0000-4000-8000-0000000000d0'::uuid) then
    raise exception 'Permanent deletion did not preserve a non-identifying receipt';
  end if;
end
$$;

-- Restore directly from captured JSON in parent-before-child dependency order.
insert into public.organizations select * from jsonb_populate_recordset(null::public.organizations, (select rows from f12_export_bundle where dataset='organization'));
insert into public.organization_members select * from jsonb_populate_recordset(null::public.organization_members, (select rows from f12_export_bundle where dataset='organization_members'));
insert into public.categories select * from jsonb_populate_recordset(null::public.categories, (select rows from f12_export_bundle where dataset='categories'));
insert into public.projects select * from jsonb_populate_recordset(null::public.projects, (select rows from f12_export_bundle where dataset='projects'));
insert into public.prompts select * from jsonb_populate_recordset(null::public.prompts, (select rows from f12_export_bundle where dataset='prompts'));
insert into public.runs select * from jsonb_populate_recordset(null::public.runs, (select rows from f12_export_bundle where dataset='runs'));
insert into public.run_prompt_selections select * from jsonb_populate_recordset(null::public.run_prompt_selections, (select rows from f12_export_bundle where dataset='run_prompt_selections'));
insert into public.run_answers select * from jsonb_populate_recordset(null::public.run_answers, (select rows from f12_export_bundle where dataset='run_answers'));
insert into public.sources select * from jsonb_populate_recordset(null::public.sources, (select rows from f12_export_bundle where dataset='sources'));
insert into public.source_observations select * from jsonb_populate_recordset(null::public.source_observations, (select rows from f12_export_bundle where dataset='source_observations'));
insert into public.source_snapshots select * from jsonb_populate_recordset(null::public.source_snapshots, (select rows from f12_export_bundle where dataset='source_snapshots'));
insert into public.source_snapshot_observations select * from jsonb_populate_recordset(null::public.source_snapshot_observations, (select rows from f12_export_bundle where dataset='source_snapshot_observations'));
insert into public.evidence_items select * from jsonb_populate_recordset(null::public.evidence_items, (select rows from f12_export_bundle where dataset='evidence_items'));
insert into public.verified_claims select * from jsonb_populate_recordset(null::public.verified_claims, (select rows from f12_export_bundle where dataset='verified_claims'));
insert into public.placements select * from jsonb_populate_recordset(null::public.placements, (select rows from f12_export_bundle where dataset='placements'));

do $$
begin
  if not exists (
    select 1 from public.organization_members
    where organization_id='f1200000-0000-4000-8000-000000000010'::uuid
      and user_id='f1200000-0000-4000-8000-000000000001'::uuid
      and role='owner'
  ) then raise exception 'Restored workspace lost owner identity'; end if;

  if not exists (
    select 1 from public.run_prompt_selections
    where run_id='f1200000-0000-4000-8000-000000000050'::uuid
      and prompt_key='fixture-buyer-question'
  ) then raise exception 'Restored workspace lost persisted buyer-question identity'; end if;

  if not exists (
    select 1 from public.source_snapshots snapshot
    join public.source_snapshot_observations link on link.source_snapshot_id=snapshot.id
    join public.source_observations observation on observation.id=link.source_observation_id
    where snapshot.id='f1200000-0000-4000-8000-000000000090'::uuid
      and snapshot.evidence_excerpt='FixtureCo historical evidence excerpt retained for recovery verification.'
      and observation.id='f1200000-0000-4000-8000-000000000080'::uuid
  ) then raise exception 'Restored workspace lost retained historical evidence provenance'; end if;

  if not exists (
    select 1 from public.verified_claims
    where id='f1200000-0000-4000-8000-0000000000b0'::uuid
      and verification_status='verified'
  ) then raise exception 'Restored workspace lost reviewed evidence decision state'; end if;
end
$$;

rollback;
