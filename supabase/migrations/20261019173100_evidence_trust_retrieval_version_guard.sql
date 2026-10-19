-- Evidence trust (fix track "evidence", 2026-10-19). Additive; repo only.
-- NOT applied to production by this change. Apply through the normal reviewed
-- migration path. The application code that ships with it works whether or not
-- this migration has been applied (it writes only into the existing raw_json).
--
-- 1. Retrieval method identity. Until now every new run answer was stamped
--    retrievalVersion = 'returned-references.2026-08-30.1', whether the hosted
--    model was grounded on Bing RSS or on Brave Search results, so a Brave
--    answer could be compared with a Bing answer as if nothing changed.
--    New answers now derive retrievalVersion from raw_json.retrievalProvider
--    (written by the Cloudflare grounded adapter). The values must match
--    RETRIEVAL_VERSIONS in lib/evidence-trust.mjs. Native-citation providers
--    keep the legacy value. Historical rows are NOT rewritten or backfilled.
--
-- 2. Abstention guard. An answer whose collection-time support check recorded
--    raw_json.evidenceSupport.verificationBlocked = true (it refused, or said
--    it cannot verify) can never be set to review_status = 'verified', and
--    neither can a source observation attached to it. The app withholds such
--    answers first (lib/official-source-relevance.mjs); this is the backstop.

begin;

create or replace function public.stamp_run_answer_measurement_context()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  prompt_locale text;
  prompt_market text;
  prompt_buyer_stage text;
  retrieval_provider text;
begin
  select p.locale, p.market, p.buyer_stage
    into prompt_locale, prompt_market, prompt_buyer_stage
  from public.prompts p
  where p.id = new.prompt_id
    and p.organization_id = new.organization_id;

  retrieval_provider := case
    when jsonb_typeof(new.raw_json) = 'object' and jsonb_typeof(new.raw_json -> 'retrievalProvider') = 'string'
      then new.raw_json ->> 'retrievalProvider'
  end;

  new.measurement_context_json := jsonb_build_object(
    'locale', prompt_locale,
    'market', prompt_market,
    'buyerStage', prompt_buyer_stage,
    'promptVersion', 'provider-prompts.2026-08-30.1',
    'parserVersion', 'provider-adapters.2026-08-30.1',
    'provider', new.provider,
    'model', new.model,
    'modelVersion', 'unreported',
    'retrievalVersion', case retrieval_provider
      when 'brave-search' then 'independent-retrieval.brave-search.2026-10-19.1'
      when 'bing-rss' then 'independent-retrieval.bing-rss.2026-10-19.1'
      else 'returned-references.2026-08-30.1'
    end,
    'policyVersion', 'recommendation-quality.2026-08-30.1',
    'schemaVersion', 'recommendation-record.2026-08-30.1',
    'evaluationVersion', 'ai-evaluation.2026-08-30.1'
  );
  return new;
end;
$$;

comment on function public.stamp_run_answer_measurement_context() is
  'Stamps new run answers with persisted prompt locale/market/buyer-stage and version identity. retrievalVersion is derived from raw_json.retrievalProvider (evidence trust, 2026-10-19). Historical answers are not rewritten or backfilled.';

revoke all on function public.stamp_run_answer_measurement_context() from public, anon, authenticated;

-- The blocked check is inlined in each trigger (no helper function call), so
-- it never depends on the invoking role's EXECUTE grant or private-schema usage.

create or replace function private.guard_run_answer_unverifiable_review()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.review_status = 'verified'
     and (tg_op = 'INSERT' or old.review_status is distinct from new.review_status or old.raw_json is distinct from new.raw_json)
     and jsonb_typeof(new.raw_json) = 'object'
     and jsonb_typeof(new.raw_json -> 'evidenceSupport') = 'object'
     and (new.raw_json -> 'evidenceSupport' -> 'verificationBlocked') = 'true'::jsonb then
    raise exception 'A run answer that refuses or says it cannot verify cannot be marked verified.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function private.guard_run_answer_unverifiable_review() from public, anon, authenticated;

drop trigger if exists guard_run_answer_unverifiable_review on public.run_answers;
create trigger guard_run_answer_unverifiable_review
  before insert or update on public.run_answers
  for each row execute function private.guard_run_answer_unverifiable_review();

create or replace function private.guard_source_observation_unverifiable_review()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.review_status = 'verified'
     and new.run_answer_id is not null
     and (tg_op = 'INSERT' or old.review_status is distinct from new.review_status)
     and exists (
       select 1 from public.run_answers a
       where a.id = new.run_answer_id
         and jsonb_typeof(a.raw_json) = 'object'
         and jsonb_typeof(a.raw_json -> 'evidenceSupport') = 'object'
         and (a.raw_json -> 'evidenceSupport' -> 'verificationBlocked') = 'true'::jsonb
     ) then
    raise exception 'A source observation attached to an answer that refuses or says it cannot verify cannot be marked verified.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function private.guard_source_observation_unverifiable_review() from public, anon, authenticated;

drop trigger if exists guard_source_observation_unverifiable_review on public.source_observations;
create trigger guard_source_observation_unverifiable_review
  before insert or update on public.source_observations
  for each row execute function private.guard_source_observation_unverifiable_review();

commit;
