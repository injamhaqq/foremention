\set ON_ERROR_STOP on

-- NON-PRODUCTION ONLY. A disposable, synthetic persistence/trigger slice of
-- issue #334. This is NOT a browser/API journey or genuine human review.
-- The CI stack is freshly reset, no provider is called, and all rows ROLLBACK.
begin;
-- This nonproduction P1 test installs the *staged* full-context guard strictly
-- inside its own transaction: ROLLBACK restores the reset-DB trigger function.
\i scripts/staging/resolution-material-context-parity.sql
set local lock_timeout = '5s';
set local statement_timeout = '30s';

insert into auth.users (id) values ('f1400000-0000-4000-8000-000000000001');
insert into public.organizations (id,name,slug,created_by) values
 ('f1400000-0000-4000-8000-000000000010','Synthetic Reviewed Cycle','f14-cycle-isolated','f1400000-0000-4000-8000-000000000001');
insert into public.organization_members (organization_id,user_id,role) values
 ('f1400000-0000-4000-8000-000000000010','f1400000-0000-4000-8000-000000000001','owner');
insert into public.categories (id,organization_id,name) values
 ('f1400000-0000-4000-8000-000000000030','f1400000-0000-4000-8000-000000000010','Synthetic category');
insert into public.projects (id,organization_id,name,slug,client_brand,website,created_by) values
 ('f1400000-0000-4000-8000-000000000020','f1400000-0000-4000-8000-000000000010',
  'Synthetic project','f14-cycle-project','SyntheticCo','https://fixture.invalid','f1400000-0000-4000-8000-000000000001');

-- Five DISTINCT versioned questions; snapshots prevent later prompt edits
-- from silently changing the meaning of either collection.
insert into public.prompts
 (id,organization_id,project_id,category_id,prompt_key,prompt_text,buyer_stage,locale,market)
select ('f1400000-0000-4000-8000-'||lpad((100+n)::text,12,'0'))::uuid,
 'f1400000-0000-4000-8000-000000000010'::uuid,
 'f1400000-0000-4000-8000-000000000020'::uuid,
 'f1400000-0000-4000-8000-000000000030'::uuid,
 'q'||n::text,
 'Which synthetic evidence standard applies to B2B fixture decision '||n::text||'?',
 'consideration','en-US','fixture-market'
from generate_series(1,5) n;

insert into public.runs
 (id,organization_id,project_id,category_id,status,provider_ids,prompt_count,
  answer_count,citation_count,brand_presence_pct,first_mention_pct,new_source_count,
  requested_units,methodology_version,created_by,created_at,started_at,completed_at)
values
 ('f1400000-0000-4000-8000-000000000041',
  'f1400000-0000-4000-8000-000000000010',
  'f1400000-0000-4000-8000-000000000020',
  'f1400000-0000-4000-8000-000000000030',
  'complete',array['fixture-mock']::text[],5,5,1,20,0,1,5,
  'fixture-methodology-v1','f1400000-0000-4000-8000-000000000001',
  now()-interval '3 days',now()-interval '3 days',now()-interval '2 days');

insert into public.run_prompt_selections
 (organization_id,run_id,prompt_id,prompt_key,prompt_text,locale,market)
select p.organization_id, 'f1400000-0000-4000-8000-000000000041'::uuid,
 p.id,p.prompt_key,p.prompt_text,'en-US','fixture-market'
from public.prompts p where p.organization_id='f1400000-0000-4000-8000-000000000010';

insert into public.run_answers
 (id,organization_id,run_id,prompt_id,prompt_key,prompt_text,provider,model,
  answer_text,citations_json,review_status,collected_at,measurement_context_json)
select ('f1400000-0000-4000-8000-'||lpad((200+row_number() over(order by p.prompt_key))::text,12,'0'))::uuid,
 p.organization_id,'f1400000-0000-4000-8000-000000000041',p.id,p.prompt_key,p.prompt_text,
 'fixture-mock','no-cost-model-v1','Synthetic baseline only, no external observation.',
 case when p.prompt_key='q1'
  then '[{"url":"https://fixture.invalid/source","title":"Fixture only"}]'::jsonb else '[]'::jsonb end,
 'unreviewed',now()-interval '2 days',
 '{"locale":"en-US","market":"fixture-market","buyerStage":"consideration","promptVersion":"fixture-1","parserVersion":"fixture-1","retrievalVersion":"fixture-1","policyVersion":"fixture-1","schemaVersion":"fixture-1","evaluationVersion":"fixture-1"}'::jsonb
from public.prompts p where p.organization_id='f1400000-0000-4000-8000-000000000010';

insert into public.sources (id,organization_id,canonical_url,domain,page_title) values
 ('f1400000-0000-4000-8000-000000000060',
  'f1400000-0000-4000-8000-000000000010','https://fixture.invalid/source',
  'fixture.invalid','Synthetic evidence page');
insert into public.source_observations
 (id,organization_id,source_id,run_answer_id,prompt_id,provider,citation_ordinal,
  observed_at,review_status,observation_key)
values
 ('f1400000-0000-4000-8000-000000000061',
  'f1400000-0000-4000-8000-000000000010',
  'f1400000-0000-4000-8000-000000000060',
  'f1400000-0000-4000-8000-000000000201',
  'f1400000-0000-4000-8000-000000000101',
  'fixture-mock',1,now()-interval '2 days','unreviewed','f14-synthetic-evidence');

-- No resolution is created before synthetic reviewer explicitly marks the
-- recorded source and answer reviewed. This is a persistence fixture, NOT
-- proof that a person fetched/read a genuine third-party page.
do $$
begin
 if exists(select 1 from public.resolution_assets where organization_id='f1400000-0000-4000-8000-000000000010')
    or exists(select 1 from public.opportunities where organization_id='f1400000-0000-4000-8000-000000000010')
 then raise exception 'Unreviewed fixture was prematurely actionable'; end if;
end $$;

select set_config('request.jwt.claim.sub','f1400000-0000-4000-8000-000000000001',true);
update public.run_answers set review_status='verified'
 where organization_id='f1400000-0000-4000-8000-000000000010'
 and run_id='f1400000-0000-4000-8000-000000000041';
update public.source_observations set review_status='verified',
 reviewer_id='f1400000-0000-4000-8000-000000000001'
 where id='f1400000-0000-4000-8000-000000000061';

insert into public.opportunities
 (id,organization_id,project_id,source_id,title,owner_id,next_action)
values
 ('f1400000-0000-4000-8000-000000000070',
  'f1400000-0000-4000-8000-000000000010',
  'f1400000-0000-4000-8000-000000000020',
  'f1400000-0000-4000-8000-000000000060',
  'Synthetic documentation opportunity','f1400000-0000-4000-8000-000000000001',
  'Propose fixture-only documentation change');

insert into public.resolution_assets
 (id,organization_id,project_id,opportunity_id,source_id,baseline_run_id,
  asset_type,title,problem_statement,proposal,created_by)
values
 ('f1400000-0000-4000-8000-000000000080',
  'f1400000-0000-4000-8000-000000000010',
  'f1400000-0000-4000-8000-000000000020',
  'f1400000-0000-4000-8000-000000000070',
  'f1400000-0000-4000-8000-000000000060',
  'f1400000-0000-4000-8000-000000000041',
  'source_page_brief','Synthetic documentation brief','Synthetic source missing a fixture comparison.',
  '{"schemaVersion":"1.0","assetType":"source_page_brief","headline":"Fixture only",
   "objective":"Create synthetic documentation.","draftSections":[],
   "evidenceBoundary":"Synthetic, no customer evidence.","nextStep":"Requires test reviewer approval."}'::jsonb,
  'f1400000-0000-4000-8000-000000000001');

-- The existing DB boundary must reject submission without linked verified
-- evidence. DO's exception subtransaction leaves the asset in draft.
do $$
declare rejected boolean:=false;
begin
 begin
  update public.resolution_assets
   set status='in_review',submitted_by='f1400000-0000-4000-8000-000000000001',
    submitted_at=now()
   where id='f1400000-0000-4000-8000-000000000080';
 exception when others then
  if sqlerrm ilike '%verified linked evidence%' then rejected:=true;
  else raise; end if;
 end;
 if not rejected then raise exception 'Resolution submitted without linked reviewed evidence'; end if;
end $$;

insert into public.resolution_asset_evidence
 (organization_id,project_id,resolution_asset_id,source_observation_id,evidence_snapshot)
values
 ('f1400000-0000-4000-8000-000000000010',
  'f1400000-0000-4000-8000-000000000020',
  'f1400000-0000-4000-8000-000000000080',
  'f1400000-0000-4000-8000-000000000061',
  '{"verification":"verified","id":"fixture-observation","kind":"source_observation","provider":"fixture-mock",
    "excerpt":"Synthetic only; reviewer has NOT confirmed external facts."}'::jsonb);
update public.resolution_assets
 set status='in_review',submitted_by='f1400000-0000-4000-8000-000000000001',
     submitted_at=now()-interval '8 hours'
 where id='f1400000-0000-4000-8000-000000000080';
update public.resolution_assets
 set status='approved',review_decision='approved',
     approved_by='f1400000-0000-4000-8000-000000000001',
     approved_at=now()-interval '7 hours',decision_by='f1400000-0000-4000-8000-000000000001',
     decision_at=now()-interval '7 hours',approval_note='Synthetic approval only'
 where id='f1400000-0000-4000-8000-000000000080';
update public.resolution_assets
 set status='applied',applied_by='f1400000-0000-4000-8000-000000000001',
     applied_at=now()-interval '6 hours',application_reference='fixture-only:approved-change-record'
 where id='f1400000-0000-4000-8000-000000000080';

-- Change Specification has a *separate* manager decision and cannot be
-- submitted merely because the linked Resolution brief was applied.
insert into public.change_specifications
 (id,organization_id,project_id,primary_opportunity_id,baseline_run_id,
  title,problem_statement,created_by,control_class,control_surface,
  eligibility_state,decision_state,truth_state,confidence_state,exact_change,
  owner_role,effort,acceptance_criteria_json,verification_plan_json)
values
 ('f1400000-0000-4000-8000-000000000081',
  'f1400000-0000-4000-8000-000000000010',
  'f1400000-0000-4000-8000-000000000020',
  'f1400000-0000-4000-8000-000000000070',
  'f1400000-0000-4000-8000-000000000041',
  'Synthetic source improvement','Synthetic documentation gap.',
  'f1400000-0000-4000-8000-000000000001',
  'CONTROLLABLE','Fixture-only documentation','ELIGIBLE','TEST_FIRST',
  'HYPOTHESIS','LOW','Add a synthetic example to fixture documentation',
  'fixture-owner','LOW','["Fixture-only review of the synthetic change"]'::jsonb,
  '{"intent":"repeat exactly comparable synthetic measurements"}'::jsonb);

do $$
declare rejected boolean:=false;
begin
 begin
  update public.change_specifications
   set status='in_review',submitted_by='f1400000-0000-4000-8000-000000000001',
   submitted_at=now()
   where id='f1400000-0000-4000-8000-000000000081';
 exception when others then
  if sqlerrm ilike '%requires verified linked evidence%' then rejected:=true;
  else raise; end if;
 end;
 if not rejected then raise exception 'Change Specification submitted without evidence'; end if;
end $$;

insert into public.change_specification_evidence
 (organization_id,project_id,change_specification_id,source_observation_id,evidence_snapshot)
values
 ('f1400000-0000-4000-8000-000000000010',
  'f1400000-0000-4000-8000-000000000020',
  'f1400000-0000-4000-8000-000000000081',
  'f1400000-0000-4000-8000-000000000061',
  '{"verification":"verified","id":"fixture-source","kind":"source_observation","provider":"fixture-mock"}'::jsonb);
update public.change_specifications
 set status='in_review',submitted_by='f1400000-0000-4000-8000-000000000001',submitted_at=now()-interval '7 hours'
 where id='f1400000-0000-4000-8000-000000000081';
update public.change_specifications
 set status='approved',decision_by='f1400000-0000-4000-8000-000000000001',
  decision_at=now()-interval '6 hours',approval_note='Fixture-only approval'
 where id='f1400000-0000-4000-8000-000000000081';
update public.change_specifications set status='in_execution'
 where id='f1400000-0000-4000-8000-000000000081';
insert into public.change_execution_assets
 (organization_id,project_id,change_specification_id,resolution_asset_id,execution_role,created_by)
values
 ('f1400000-0000-4000-8000-000000000010',
  'f1400000-0000-4000-8000-000000000020',
  'f1400000-0000-4000-8000-000000000081',
  'f1400000-0000-4000-8000-000000000080','documentation',
  'f1400000-0000-4000-8000-000000000001');
update public.change_specifications set status='completed'
 where id='f1400000-0000-4000-8000-000000000081';

-- Comparable second cycle: request is recorded BEFORE the rerun is created.
insert into public.resolution_follow_ups
 (id,organization_id,project_id,resolution_asset_id,baseline_run_id,status,requested_by,requested_at)
values
 ('f1400000-0000-4000-8000-000000000090',
  'f1400000-0000-4000-8000-000000000010',
  'f1400000-0000-4000-8000-000000000020',
  'f1400000-0000-4000-8000-000000000080',
  'f1400000-0000-4000-8000-000000000041',
  'requested','f1400000-0000-4000-8000-000000000001',now()-interval '4 hours');

insert into public.runs
 (id,organization_id,project_id,category_id,status,provider_ids,prompt_count,
  answer_count,citation_count,brand_presence_pct,first_mention_pct,new_source_count,
  requested_units,methodology_version,created_by,created_at)
values
 ('f1400000-0000-4000-8000-000000000042',
  'f1400000-0000-4000-8000-000000000010',
  'f1400000-0000-4000-8000-000000000020',
  'f1400000-0000-4000-8000-000000000030',
  'queued',array['fixture-mock']::text[],5,5,2,40,20,2,5,
  'fixture-methodology-v1','f1400000-0000-4000-8000-000000000001',
  now()-interval '3 hours');
insert into public.run_prompt_selections
 (organization_id,run_id,prompt_id,prompt_key,prompt_text,locale,market)
select p.organization_id,'f1400000-0000-4000-8000-000000000042',
 p.id,p.prompt_key,p.prompt_text,'en-US','fixture-market'
from public.prompts p where p.organization_id='f1400000-0000-4000-8000-000000000010';
insert into public.run_answers
 (id,organization_id,run_id,prompt_id,prompt_key,prompt_text,provider,model,
  answer_text,citations_json,review_status,collected_at,measurement_context_json)
select ('f1400000-0000-4000-8000-'||lpad((300+row_number() over(order by p.prompt_key))::text,12,'0'))::uuid,
 p.organization_id,'f1400000-0000-4000-8000-000000000042',p.id,p.prompt_key,p.prompt_text,
 'fixture-mock','no-cost-model-v1','Synthetic second-cycle association, causality not established.',
 '[]'::jsonb,'verified',now()-interval '2 hours',
 '{"locale":"en-US","market":"fixture-market","buyerStage":"consideration","promptVersion":"fixture-1","parserVersion":"fixture-1","retrievalVersion":"fixture-1","policyVersion":"fixture-1","schemaVersion":"fixture-1","evaluationVersion":"fixture-1"}'::jsonb
from public.prompts p where p.organization_id='f1400000-0000-4000-8000-000000000010';

update public.resolution_follow_ups set rerun_id='f1400000-0000-4000-8000-000000000042',status='queued'
 where id='f1400000-0000-4000-8000-000000000090';
update public.runs
 set status='complete',started_at=now()-interval '2 hours',
     completed_at=now()-interval '1 hour'
 where id='f1400000-0000-4000-8000-000000000042';

-- The real DB trigger, not manually prepared outcome JSON, must finalize the
-- comparable record. Observed deltas explicitly do not claim causality.
do $$
declare f record;
begin
 select status, outcome into f from public.resolution_follow_ups
 where id='f1400000-0000-4000-8000-000000000090';
 if f.status <> 'complete'
  or (f.outcome#>>'{brandPresencePct,delta}')::numeric <> 20
  or (f.outcome#>>'{citationCount,delta}')::numeric <> 1
  or f.outcome->>'interpretation' not ilike '%does not establish%caused%'
 then raise exception 'Exact second-cycle comparable noncausal outcome was not finalized'; end if;
 if (select count(*) from public.run_prompt_selections
   where run_id='f1400000-0000-4000-8000-000000000041') <> 5
  or (select count(*) from public.run_prompt_selections
   where run_id='f1400000-0000-4000-8000-000000000042') <> 5
 then raise exception 'Second cycle lost one or more frozen buyer-question snapshots'; end if;
 if not exists (select 1 from public.change_execution_assets a
   join public.change_specifications s on s.id=a.change_specification_id
   where s.status='completed' and a.resolution_asset_id='f1400000-0000-4000-8000-000000000080')
 then raise exception 'Approved synthetic execution did not preserve its resolution link'; end if;
end $$;

-- The third mock run changes the market on one snapshotted question. Even with
-- matching prompt IDs/provider, the DB must reject the incongruent pairing.
insert into public.resolution_follow_ups
 (id,organization_id,project_id,resolution_asset_id,baseline_run_id,status,requested_by,requested_at)
values
 ('f1400000-0000-4000-8000-000000000091',
  'f1400000-0000-4000-8000-000000000010',
  'f1400000-0000-4000-8000-000000000020',
  'f1400000-0000-4000-8000-000000000080',
  'f1400000-0000-4000-8000-000000000041',
  'requested','f1400000-0000-4000-8000-000000000001',now()-interval '2 hours');
insert into public.runs
 (id,organization_id,project_id,category_id,status,provider_ids,prompt_count,requested_units,
  methodology_version,created_by,created_at)
values
 ('f1400000-0000-4000-8000-000000000043',
  'f1400000-0000-4000-8000-000000000010',
  'f1400000-0000-4000-8000-000000000020',
  'f1400000-0000-4000-8000-000000000030',
  'queued',array['fixture-mock']::text[],5,5,
  'fixture-methodology-v1','f1400000-0000-4000-8000-000000000001',
  now()-interval '1 hour');
insert into public.run_prompt_selections
 (organization_id,run_id,prompt_id,prompt_key,prompt_text,locale,market)
select p.organization_id,'f1400000-0000-4000-8000-000000000043',
 p.id,p.prompt_key,p.prompt_text,'en-US',
 case when p.prompt_key='q1' then 'incompatible-market' else 'fixture-market' end
from public.prompts p where p.organization_id='f1400000-0000-4000-8000-000000000010';
do $$
declare rejected boolean:=false;
begin
 begin
  update public.resolution_follow_ups
   set rerun_id='f1400000-0000-4000-8000-000000000043',status='queued'
   where id='f1400000-0000-4000-8000-000000000091';
 exception when others then
  if sqlerrm ilike '%locale or market context%' then rejected:=true;
  else raise; end if;
 end;
 if not rejected then raise exception 'Changed market incorrectly accepted as comparable'; end if;
 if (select status from public.resolution_follow_ups
    where id='f1400000-0000-4000-8000-000000000091') <> 'requested'
 then raise exception 'Rejected incompatible run mutated a pending follow-up'; end if;
end $$;


-- Each one of nine material context properties is independently required.
-- Change one of the five synthetic answer slots while leaving exact persisted
-- prompts, provider, model, locale/market snapshots and methodology identical.
-- The existing run-status trigger must write INCOMPARABLE without any delta.
do $fm_context_cases$
declare
  names text[] := array['locale','market','buyerStage','promptVersion',
    'parserVersion','retrievalVersion','policyVersion','schemaVersion','evaluationVersion'];
  n integer;
  case_number integer;
  field_name text;
  bad_run uuid;
  measurement uuid;
  observed record;
  modified_context jsonb;
begin
  for case_number in 1..10 loop
    field_name := case when case_number=10 then 'evaluationVersion'
                       else names[case_number] end;
    n := 500+case_number;
    bad_run := ('f1400000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid;
    measurement := ('f1400000-0000-4000-8000-'||lpad((700+case_number)::text,12,'0'))::uuid;

    insert into public.resolution_follow_ups
      (id,organization_id,project_id,resolution_asset_id,baseline_run_id,status,requested_by,requested_at)
    values
      (measurement,'f1400000-0000-4000-8000-000000000010',
       'f1400000-0000-4000-8000-000000000020',
       'f1400000-0000-4000-8000-000000000080',
       'f1400000-0000-4000-8000-000000000041',
       'requested','f1400000-0000-4000-8000-000000000001',now()-interval '2 hours');

    insert into public.runs
      (id,organization_id,project_id,category_id,status,provider_ids,prompt_count,
       answer_count,citation_count,brand_presence_pct,first_mention_pct,new_source_count,
       requested_units,methodology_version,created_by,created_at)
    values
      (bad_run,'f1400000-0000-4000-8000-000000000010',
       'f1400000-0000-4000-8000-000000000020',
       'f1400000-0000-4000-8000-000000000030',
       'queued',array['fixture-mock']::text[],5,5,2,40,20,2,5,
       'fixture-methodology-v1','f1400000-0000-4000-8000-000000000001',
       now()-interval '1 hour');

    insert into public.run_prompt_selections
      (organization_id,run_id,prompt_id,prompt_key,prompt_text,locale,market)
    select p.organization_id,bad_run,p.id,p.prompt_key,p.prompt_text,'en-US','fixture-market'
    from public.prompts p where p.organization_id='f1400000-0000-4000-8000-000000000010';

    insert into public.run_answers
      (organization_id,run_id,prompt_id,prompt_key,prompt_text,provider,model,
       answer_text,citations_json,review_status,collected_at,measurement_context_json)
    select p.organization_id,bad_run,p.id,p.prompt_key,p.prompt_text,
      'fixture-mock','no-cost-model-v1','Synthetic isolated negative fixture only.',
      '[]'::jsonb,'verified',now()-interval '45 minutes',
      case when p.prompt_key='q1'
        then case when case_number=10 then
           ('{"locale":"en-US","market":"fixture-market","buyerStage":"consideration",
              "promptVersion":"fixture-1","parserVersion":"fixture-1","retrievalVersion":"fixture-1",
              "policyVersion":"fixture-1","schemaVersion":"fixture-1","evaluationVersion":"fixture-1"}'::jsonb - field_name)
         else jsonb_set(
          '{"locale":"en-US","market":"fixture-market","buyerStage":"consideration",
             "promptVersion":"fixture-1","parserVersion":"fixture-1","retrievalVersion":"fixture-1",
             "policyVersion":"fixture-1","schemaVersion":"fixture-1","evaluationVersion":"fixture-1"}'::jsonb,
             array[field_name],'"fixture-other"'::jsonb) end
        else '{"locale":"en-US","market":"fixture-market","buyerStage":"consideration",
               "promptVersion":"fixture-1","parserVersion":"fixture-1","retrievalVersion":"fixture-1",
               "policyVersion":"fixture-1","schemaVersion":"fixture-1","evaluationVersion":"fixture-1"}'::jsonb
      end
    from public.prompts p
    where p.organization_id='f1400000-0000-4000-8000-000000000010';

    update public.resolution_follow_ups
      set rerun_id=bad_run,status='queued' where id=measurement;
    update public.runs
      set status='complete',started_at=now()-interval '1 hour',completed_at=now()
      where id=bad_run;
    select status,outcome into observed from public.resolution_follow_ups where id=measurement;
    if observed.status <> 'incomparable'
      or observed.outcome ? 'brandPresencePct'
      or observed.outcome->>'interpretation' not ilike '%did not calculate%'
    then
      raise exception 'Material-context case % incorrectly yielded a directional outcome',case_number;
    end if;
    -- Terminal outcome must be idempotent and immutable even with repeated
    -- service worker completion or stale client attempts.
    begin
      update public.resolution_follow_ups
         set status='complete',outcome='{"brandPresencePct":{"delta":100}}'::jsonb
       where id=measurement;
      raise exception 'Terminal incomparable state was writable in case %',case_number;
    exception when others then
      if sqlerrm not ilike '%immutable%' then raise; end if;
    end;
  end loop;
end $fm_context_cases$;

rollback;
select 'isolated nine-field material-context follow-up parity passed' AS result;
