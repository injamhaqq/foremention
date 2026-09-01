-- Foremention Measurement Moat Foundation.
--
-- Persists exact measurement identity for new AI observations and exposes only
-- privacy-minimized, service-only operational facts. Historical run answers are
-- intentionally not backfilled: missing provenance stays unknown rather than
-- receiving invented locale, market, buyer-stage, or version metadata.
--
-- Cross-tenant benchmark candidates remain internal, consent-gated, anonymized,
-- and suppressed until at least ten distinct organizations share the exact same
-- question matrix and measurement protocol. This migration publishes no public
-- benchmark surface and seeds no customer or benchmark facts.

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
begin
  select p.locale, p.market, p.buyer_stage
    into prompt_locale, prompt_market, prompt_buyer_stage
  from public.prompts p
  where p.id = new.prompt_id
    and p.organization_id = new.organization_id;

  new.measurement_context_json := jsonb_build_object(
    'locale', prompt_locale,
    'market', prompt_market,
    'buyerStage', prompt_buyer_stage,
    'promptVersion', 'provider-prompts.2026-08-30.1',
    'parserVersion', 'provider-adapters.2026-08-30.1',
    'provider', new.provider,
    'model', new.model,
    'modelVersion', 'unreported',
    'retrievalVersion', 'returned-references.2026-08-30.1',
    'policyVersion', 'recommendation-quality.2026-08-30.1',
    'schemaVersion', 'recommendation-record.2026-08-30.1',
    'evaluationVersion', 'ai-evaluation.2026-08-30.1'
  );
  return new;
end;
$$;

comment on function public.stamp_run_answer_measurement_context() is
  'Stamps new run answers with persisted prompt locale/market/buyer-stage and version identity. Historical answers are not rewritten or backfilled.';

revoke all on function public.stamp_run_answer_measurement_context() from public, anon, authenticated;

drop trigger if exists stamp_run_answer_measurement_context on public.run_answers;
create trigger stamp_run_answer_measurement_context
before insert on public.run_answers
for each row
execute function public.stamp_run_answer_measurement_context();

-- Service-only verified measurement facts. Raw prompt text is used only as a
-- one-way hash input; raw prompt/answer/citation/review content is never exposed
-- by this view.
create or replace view public.measurement_observation_facts
with (security_invoker = true)
as
select
  a.organization_id,
  r.project_id,
  a.run_id,
  a.id as run_answer_id,
  a.provider,
  a.model,
  r.methodology_version,
  a.measurement_context_json ->> 'locale' as locale,
  a.measurement_context_json ->> 'market' as market,
  a.measurement_context_json ->> 'buyerStage' as buyer_stage,
  a.measurement_context_json ->> 'promptVersion' as prompt_version,
  a.measurement_context_json ->> 'parserVersion' as parser_version,
  a.measurement_context_json ->> 'retrievalVersion' as retrieval_version,
  a.measurement_context_json ->> 'policyVersion' as policy_version,
  a.measurement_context_json ->> 'schemaVersion' as schema_version,
  a.measurement_context_json ->> 'evaluationVersion' as evaluation_version,
  encode(
    digest(
      convert_to(
        coalesce(a.prompt_key, '') || E'\x1f' ||
        regexp_replace(trim(coalesce(a.prompt_text, '')), '\s+', ' ', 'g'),
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  ) as question_identity_hash,
  encode(
    digest(
      convert_to(
        coalesce(a.measurement_context_json ->> 'locale', '') || E'\x1f' ||
        coalesce(a.measurement_context_json ->> 'market', '') || E'\x1f' ||
        coalesce(a.measurement_context_json ->> 'buyerStage', '') || E'\x1f' ||
        coalesce(a.measurement_context_json ->> 'promptVersion', '') || E'\x1f' ||
        coalesce(a.measurement_context_json ->> 'parserVersion', '') || E'\x1f' ||
        coalesce(a.measurement_context_json ->> 'retrievalVersion', '') || E'\x1f' ||
        coalesce(a.measurement_context_json ->> 'policyVersion', '') || E'\x1f' ||
        coalesce(a.measurement_context_json ->> 'schemaVersion', '') || E'\x1f' ||
        coalesce(a.measurement_context_json ->> 'evaluationVersion', ''),
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  ) as measurement_context_hash,
  a.brand_present,
  case
    when jsonb_typeof(a.citations_json) = 'array' then jsonb_array_length(a.citations_json)
    else 0
  end as citation_count,
  a.collected_at
from public.run_answers a
join public.runs r
  on r.id = a.run_id
 and r.organization_id = a.organization_id
where a.review_status = 'verified'
  and a.measurement_context_json is not null
  and nullif(trim(a.prompt_text), '') is not null
  and nullif(trim(a.model), '') is not null
  and nullif(trim(r.methodology_version), '') is not null
  and nullif(trim(a.measurement_context_json ->> 'locale'), '') is not null
  and nullif(trim(a.measurement_context_json ->> 'market'), '') is not null
  and nullif(trim(a.measurement_context_json ->> 'buyerStage'), '') is not null
  and nullif(trim(a.measurement_context_json ->> 'promptVersion'), '') is not null
  and nullif(trim(a.measurement_context_json ->> 'parserVersion'), '') is not null
  and nullif(trim(a.measurement_context_json ->> 'retrievalVersion'), '') is not null
  and nullif(trim(a.measurement_context_json ->> 'policyVersion'), '') is not null
  and nullif(trim(a.measurement_context_json ->> 'schemaVersion'), '') is not null
  and nullif(trim(a.measurement_context_json ->> 'evaluationVersion'), '') is not null;

revoke all on public.measurement_observation_facts from public, anon, authenticated;
grant select on public.measurement_observation_facts to service_role;

comment on view public.measurement_observation_facts is
  'Service-only verified measurement facts. Raw question text is one-way hashed and raw answer/citation/review content is not exposed.';

-- Privacy-safe internal benchmark protocol candidates. Each organization is
-- reduced to one equal-weight protocol observation before cross-tenant
-- aggregation, preventing a high-volume tenant from dominating the cohort.
create or replace view public.benchmark_protocol_candidates
with (security_invoker = true)
as
with eligible_facts as (
  select f.*
  from public.measurement_observation_facts f
  join public.data_governance_settings g
    on g.organization_id = f.organization_id
  where g.benchmark_eligible = true
    and g.benchmark_consent_at is not null
    and g.benchmark_consent_at <= f.collected_at
    and g.anonymization_required = true
),
run_protocols as (
  select
    organization_id,
    project_id,
    run_id,
    methodology_version,
    provider,
    model,
    locale,
    market,
    buyer_stage,
    prompt_version,
    parser_version,
    retrieval_version,
    policy_version,
    schema_version,
    evaluation_version,
    measurement_context_hash,
    encode(
      digest(
        convert_to(
          string_agg(question_identity_hash, '|' order by question_identity_hash),
          'UTF8'
        ),
        'sha256'
      ),
      'hex'
    ) as question_matrix_hash,
    avg(case when brand_present is true then 1.0 when brand_present is false then 0.0 else null end) as run_brand_presence_rate,
    avg(case when citation_count > 0 then 1.0 else 0.0 end) as run_citation_bearing_answer_rate,
    count(*) as answer_count,
    max(collected_at) as observed_at
  from eligible_facts
  group by
    organization_id, project_id, run_id, methodology_version,
    provider, model, locale, market, buyer_stage,
    prompt_version, parser_version, retrieval_version, policy_version,
    schema_version, evaluation_version, measurement_context_hash
),
org_protocols as (
  select
    organization_id,
    question_matrix_hash,
    measurement_context_hash,
    methodology_version,
    provider,
    model,
    locale,
    market,
    buyer_stage,
    prompt_version,
    parser_version,
    retrieval_version,
    policy_version,
    schema_version,
    evaluation_version,
    avg(run_brand_presence_rate) as org_brand_presence_rate,
    avg(run_citation_bearing_answer_rate) as org_citation_bearing_answer_rate,
    count(*) as observed_run_count,
    min(observed_at) as first_observed_at,
    max(observed_at) as last_observed_at
  from run_protocols
  group by
    organization_id, question_matrix_hash, measurement_context_hash,
    methodology_version, provider, model, locale, market, buyer_stage,
    prompt_version, parser_version, retrieval_version, policy_version,
    schema_version, evaluation_version
)
select question_matrix_hash,
  measurement_context_hash,
  methodology_version,
  provider,
  model,
  locale,
  market,
  buyer_stage,
  prompt_version,
  parser_version,
  retrieval_version,
  policy_version,
  schema_version,
  evaluation_version,
  count(distinct organization_id) as eligible_organization_count,
  sum(observed_run_count) as observed_run_count,
  avg(org_brand_presence_rate) as observed_brand_presence_rate,
  avg(org_citation_bearing_answer_rate) as citation_bearing_answer_rate,
  min(first_observed_at) as first_observed_at,
  max(last_observed_at) as last_observed_at
from org_protocols
group by
  question_matrix_hash, measurement_context_hash, methodology_version,
  provider, model, locale, market, buyer_stage,
  prompt_version, parser_version, retrieval_version, policy_version,
  schema_version, evaluation_version
having count(distinct organization_id) >= 10;

revoke all on public.benchmark_protocol_candidates from public, anon, authenticated;
grant select on public.benchmark_protocol_candidates to service_role;

comment on view public.benchmark_protocol_candidates is
  'Internal consent-gated anonymized observational protocol cohorts. Rows are withheld below ten distinct organizations and are not public market-share or demand claims.';

commit;
