\set ON_ERROR_STOP on

-- NON-PRODUCTION ONLY. Issue #351 / FM-08: a DB-finalized Resolution follow-up
-- must not be "complete" (with before/after deltas) unless every verified
-- answer in BOTH runs carries the full material measurement context and the
-- exact prompt/provider/model/measurement-context matrix matches -- the same
-- policy as lib/intelligence-comparability.ts assessExactQuestionComparability().
-- Synthetic fixtures only, no provider calls, everything ROLLBACKs.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

set local lock_timeout = '5s';
set local statement_timeout = '30s';

insert into auth.users (id) values ('f3510000-0000-4000-8000-000000000001');
insert into public.organizations (id,name,slug,created_by) values
 ('f3510000-0000-4000-8000-000000000010','Synthetic Reviewed Cycle','f351-context-isolated','f3510000-0000-4000-8000-000000000001');
insert into public.organization_members (organization_id,user_id,role) values
 ('f3510000-0000-4000-8000-000000000010','f3510000-0000-4000-8000-000000000001','owner');
insert into public.categories (id,organization_id,name) values
 ('f3510000-0000-4000-8000-000000000030','f3510000-0000-4000-8000-000000000010','Synthetic category');
insert into public.projects (id,organization_id,name,slug,client_brand,website,created_by) values
 ('f3510000-0000-4000-8000-000000000020','f3510000-0000-4000-8000-000000000010',
  'Synthetic project','f351-context-project','SyntheticCo','https://fixture.invalid','f3510000-0000-4000-8000-000000000001');

-- Five DISTINCT versioned questions; snapshots prevent later prompt edits
-- from silently changing the meaning of either collection.
insert into public.prompts
 (id,organization_id,project_id,category_id,prompt_key,prompt_text,buyer_stage,locale,market)
select ('f3510000-0000-4000-8000-'||lpad((100+n)::text,12,'0'))::uuid,
 'f3510000-0000-4000-8000-000000000010'::uuid,
 'f3510000-0000-4000-8000-000000000020'::uuid,
 'f3510000-0000-4000-8000-000000000030'::uuid,
 'q'||n::text,
 'Which synthetic evidence standard applies to B2B fixture decision '||n::text||'?',
 'consideration','en-US','fixture-market'
from generate_series(1,5) n;

insert into public.runs
 (id,organization_id,project_id,category_id,status,provider_ids,prompt_count,
  answer_count,citation_count,brand_presence_pct,first_mention_pct,new_source_count,
  requested_units,methodology_version,created_by,created_at,started_at,completed_at)
values
 ('f3510000-0000-4000-8000-000000000041',
  'f3510000-0000-4000-8000-000000000010',
  'f3510000-0000-4000-8000-000000000020',
  'f3510000-0000-4000-8000-000000000030',
  'complete',array['fixture-mock']::text[],5,5,1,20,0,1,5,
  'fixture-methodology-v1','f3510000-0000-4000-8000-000000000001',
  now()-interval '3 days',now()-interval '3 days',now()-interval '2 days');

insert into public.run_prompt_selections
 (organization_id,run_id,prompt_id,prompt_key,prompt_text,locale,market)
select p.organization_id, 'f3510000-0000-4000-8000-000000000041'::uuid,
 p.id,p.prompt_key,p.prompt_text,'en-US','fixture-market'
from public.prompts p where p.organization_id='f3510000-0000-4000-8000-000000000010';

insert into public.run_answers
 (id,organization_id,run_id,prompt_id,prompt_key,prompt_text,provider,model,
  answer_text,citations_json,review_status,collected_at,measurement_context_json)
select ('f3510000-0000-4000-8000-'||lpad((200+row_number() over(order by p.prompt_key))::text,12,'0'))::uuid,
 p.organization_id,'f3510000-0000-4000-8000-000000000041',p.id,p.prompt_key,p.prompt_text,
 'fixture-mock','no-cost-model-v1','Synthetic baseline only, no external observation.',
 case when p.prompt_key='q1'
  then '[{"url":"https://fixture.invalid/source","title":"Fixture only"}]'::jsonb else '[]'::jsonb end,
 'unreviewed',now()-interval '2 days',
 '{"locale":"en-US","market":"fixture-market","retrievalVersion":"fixture-1","policyVersion":"fixture-1"}'::jsonb
from public.prompts p where p.organization_id='f3510000-0000-4000-8000-000000000010';

insert into public.sources (id,organization_id,canonical_url,domain,page_title) values
 ('f3510000-0000-4000-8000-000000000060',
  'f3510000-0000-4000-8000-000000000010','https://fixture.invalid/source',
  'fixture.invalid','Synthetic evidence page');
insert into public.source_observations
 (id,organization_id,source_id,run_answer_id,prompt_id,provider,citation_ordinal,
  observed_at,review_status,observation_key)
values
 ('f3510000-0000-4000-8000-000000000061',
  'f3510000-0000-4000-8000-000000000010',
  'f3510000-0000-4000-8000-000000000060',
  'f3510000-0000-4000-8000-000000000201',
  'f3510000-0000-4000-8000-000000000101',
  'fixture-mock',1,now()-interval '2 days','unreviewed','f351-synthetic-evidence');

-- No resolution is created before synthetic reviewer explicitly marks the
-- recorded source and answer reviewed. This is a persistence fixture, NOT
-- proof that a person fetched/read a genuine third-party page.
do $$
begin
 if exists(select 1 from public.resolution_assets where organization_id='f3510000-0000-4000-8000-000000000010')
    or exists(select 1 from public.opportunities where organization_id='f3510000-0000-4000-8000-000000000010')
 then raise exception 'Unreviewed fixture was prematurely actionable'; end if;
end $$;

select set_config('request.jwt.claim.sub','f3510000-0000-4000-8000-000000000001',true);
update public.run_answers set review_status='verified'
 where organization_id='f3510000-0000-4000-8000-000000000010'
 and run_id='f3510000-0000-4000-8000-000000000041';
update public.source_observations set review_status='verified',
 reviewer_id='f3510000-0000-4000-8000-000000000001'
 where id='f3510000-0000-4000-8000-000000000061';

insert into public.opportunities
 (id,organization_id,project_id,source_id,title,owner_id,next_action)
values
 ('f3510000-0000-4000-8000-000000000070',
  'f3510000-0000-4000-8000-000000000010',
  'f3510000-0000-4000-8000-000000000020',
  'f3510000-0000-4000-8000-000000000060',
  'Synthetic documentation opportunity','f3510000-0000-4000-8000-000000000001',
  'Propose fixture-only documentation change');

insert into public.resolution_assets
 (id,organization_id,project_id,opportunity_id,source_id,baseline_run_id,
  asset_type,title,problem_statement,proposal,created_by)
values
 ('f3510000-0000-4000-8000-000000000080',
  'f3510000-0000-4000-8000-000000000010',
  'f3510000-0000-4000-8000-000000000020',
  'f3510000-0000-4000-8000-000000000070',
  'f3510000-0000-4000-8000-000000000060',
  'f3510000-0000-4000-8000-000000000041',
  'source_page_brief','Synthetic documentation brief','Synthetic source missing a fixture comparison.',
  '{"schemaVersion":"1.0","assetType":"source_page_brief","headline":"Fixture only",
   "objective":"Create synthetic documentation.","draftSections":[],
   "evidenceBoundary":"Synthetic, no customer evidence.","nextStep":"Requires test reviewer approval."}'::jsonb,
  'f3510000-0000-4000-8000-000000000001');

-- The existing DB boundary must reject submission without linked verified
-- evidence. DO's exception subtransaction leaves the asset in draft.
do $$
declare rejected boolean:=false;
begin
 begin
  update public.resolution_assets
   set status='in_review',submitted_by='f3510000-0000-4000-8000-000000000001',
    submitted_at=now()
   where id='f3510000-0000-4000-8000-000000000080';
 exception when others then
  if sqlerrm ilike '%verified linked evidence%' then rejected:=true;
  else raise; end if;
 end;
 if not rejected then raise exception 'Resolution submitted without linked reviewed evidence'; end if;
end $$;

insert into public.resolution_asset_evidence
 (organization_id,project_id,resolution_asset_id,source_observation_id,evidence_snapshot)
values
 ('f3510000-0000-4000-8000-000000000010',
  'f3510000-0000-4000-8000-000000000020',
  'f3510000-0000-4000-8000-000000000080',
  'f3510000-0000-4000-8000-000000000061',
  '{"verification":"verified","id":"fixture-observation","kind":"source_observation","provider":"fixture-mock",
    "excerpt":"Synthetic only; reviewer has NOT confirmed external facts."}'::jsonb);
update public.resolution_assets
 set status='in_review',submitted_by='f3510000-0000-4000-8000-000000000001',
     submitted_at=now()-interval '8 hours'
 where id='f3510000-0000-4000-8000-000000000080';
update public.resolution_assets
 set status='approved',review_decision='approved',
     approved_by='f3510000-0000-4000-8000-000000000001',
     approved_at=now()-interval '7 hours',decision_by='f3510000-0000-4000-8000-000000000001',
     decision_at=now()-interval '7 hours',approval_note='Synthetic approval only'
 where id='f3510000-0000-4000-8000-000000000080';
update public.resolution_assets
 set status='applied',applied_by='f3510000-0000-4000-8000-000000000001',
     applied_at=now()-interval '6 hours',application_reference='fixture-only:approved-change-record'
 where id='f3510000-0000-4000-8000-000000000080';


-- Each case: request a follow-up, create a later rerun with the same frozen
-- questions/provider/model/methodology, stamp its answers, then mutate exactly
-- one material context field (or nothing) and let the real triggers finalize.
create temporary table f351_cases (ord int primary key, label text, mutation text, expected text) on commit drop;
insert into f351_cases values
 (1,'identical context','none','complete'),
 (2,'retrievalVersion changed','retrievalVersion','incomparable'),
 (3,'parserVersion changed','parserVersion','incomparable'),
 (4,'evaluationVersion changed','evaluationVersion','incomparable'),
 (5,'policyVersion changed','policyVersion','incomparable'),
 (6,'schemaVersion changed','schemaVersion','incomparable'),
 (7,'promptVersion changed','promptVersion','incomparable'),
 (8,'buyerStage changed','buyerStage','incomparable'),
 (9,'legacy answer missing retrievalVersion','drop:retrievalVersion','incomparable'),
 (10,'legacy answer with no measurement context','null-context','incomparable'),
 (11,'non-string version value','number:parserVersion','incomparable'),
 (12,'whitespace-only difference (app normalizes)','whitespace:retrievalVersion','complete');

do $$
declare
  c record;
  f record;
  fu uuid;
  rr uuid;
  base_at timestamptz := now() - interval '20 hours';
  org constant uuid := 'f3510000-0000-4000-8000-000000000010';
  proj constant uuid := 'f3510000-0000-4000-8000-000000000020';
  cat constant uuid := 'f3510000-0000-4000-8000-000000000030';
  asset constant uuid := 'f3510000-0000-4000-8000-000000000080';
  baseline constant uuid := 'f3510000-0000-4000-8000-000000000041';
  actor constant uuid := 'f3510000-0000-4000-8000-000000000001';
  failures text := '';
begin
  for c in select * from f351_cases order by ord loop
    fu := ('f3510000-0000-4000-8000-'||lpad((900+c.ord)::text,12,'0'))::uuid;
    rr := ('f3510000-0000-4000-8000-'||lpad((500+c.ord)::text,12,'0'))::uuid;

    insert into public.resolution_follow_ups
      (id,organization_id,project_id,resolution_asset_id,baseline_run_id,status,requested_by,requested_at)
    values (fu,org,proj,asset,baseline,'requested',actor,base_at + make_interval(mins => c.ord*60));

    insert into public.runs
      (id,organization_id,project_id,category_id,status,provider_ids,prompt_count,
       answer_count,citation_count,brand_presence_pct,first_mention_pct,new_source_count,
       requested_units,methodology_version,created_by,created_at)
    values (rr,org,proj,cat,'queued',array['fixture-mock']::text[],5,5,2,40,20,2,5,
       'fixture-methodology-v1',actor,base_at + make_interval(mins => c.ord*60 + 5));

    insert into public.run_prompt_selections (organization_id,run_id,prompt_id,prompt_key,prompt_text,locale,market)
    select p.organization_id, rr, p.id, p.prompt_key, p.prompt_text, 'en-US', 'fixture-market'
    from public.prompts p where p.organization_id = org;

    insert into public.run_answers
      (organization_id,run_id,prompt_id,prompt_key,prompt_text,provider,model,
       answer_text,citations_json,review_status,collected_at)
    select p.organization_id, rr, p.id, p.prompt_key, p.prompt_text,
      'fixture-mock','no-cost-model-v1','Synthetic follow-up only; causality not established.',
      '[]'::jsonb,'verified', base_at + make_interval(mins => c.ord*60 + 10)
    from public.prompts p where p.organization_id = org;

    -- Mutate ONE answer of the rerun after the insert-time stamp.
    if c.mutation = 'null-context' then
      update public.run_answers set measurement_context_json = null
       where run_id = rr and prompt_key = 'q1';
    elsif c.mutation like 'drop:%' then
      update public.run_answers set measurement_context_json = measurement_context_json - split_part(c.mutation,':',2)
       where run_id = rr and prompt_key = 'q1';
    elsif c.mutation like 'number:%' then
      update public.run_answers set measurement_context_json = jsonb_set(measurement_context_json, array[split_part(c.mutation,':',2)], '20260830'::jsonb)
       where run_id = rr and prompt_key = 'q1';
    elsif c.mutation like 'whitespace:%' then
      update public.run_answers set measurement_context_json = jsonb_set(measurement_context_json, array[split_part(c.mutation,':',2)],
         to_jsonb('  ' || (measurement_context_json ->> split_part(c.mutation,':',2)) || ' '))
       where run_id = rr and prompt_key = 'q1';
    elsif c.mutation <> 'none' then
      update public.run_answers set measurement_context_json = jsonb_set(measurement_context_json, array[c.mutation], to_jsonb('changed-'||c.mutation))
       where run_id = rr and prompt_key = 'q1';
    end if;

    update public.resolution_follow_ups set rerun_id = rr, status = 'queued' where id = fu;
    update public.runs set status = 'complete',
      started_at = base_at + make_interval(mins => c.ord*60 + 6),
      completed_at = base_at + make_interval(mins => c.ord*60 + 30)
     where id = rr;

    select status, outcome into f from public.resolution_follow_ups where id = fu;
    if f.status is distinct from c.expected then
      failures := failures || format(E'\n  case %s (%s): expected %s, got %s', c.ord, c.label, c.expected, f.status);
    elsif c.expected = 'incomparable' and (f.outcome ? 'brandPresencePct' or f.outcome ? 'citationCount') then
      failures := failures || format(E'\n  case %s (%s): incomparable outcome still carries directional metrics', c.ord, c.label);
    elsif c.expected = 'complete' and (f.outcome->>'interpretation') not ilike '%does not establish%caused%' then
      failures := failures || format(E'\n  case %s (%s): comparable outcome lost its non-causal interpretation', c.ord, c.label);
    end if;
  end loop;

  if failures <> '' then
    raise exception '#351 follow-up measurement-context parity failed:%', failures;
  end if;
end $$;

-- A terminal (incomparable) follow-up stays immutable after the change.
do $$
declare rejected boolean := false;
begin
  begin
    update public.resolution_follow_ups set status = 'complete'
     where id = 'f3510000-0000-4000-8000-000000000902';
  exception when others then
    if sqlerrm ilike '%terminal follow-up measurement is immutable%' or sqlerrm ilike '%transition%' then rejected := true;
    else raise; end if;
  end;
  if not rejected then raise exception 'Terminal incomparable follow-up was mutated to complete'; end if;
end $$;

rollback;
select '#351 follow-up measurement-context parity passed' as result;
