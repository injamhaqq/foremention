-- Foremention ICP + category evidence ledger.
-- Extends the existing first-party commercial/customer-proof system rather than
-- creating a second CRM. This migration seeds no accounts, interviews, evidence,
-- confidence, experiments, payments, or customer claims.

begin;

-- Repair the migration-chain regression where 20260830000400 replaced the
-- commercial event constraint and accidentally removed the research event kinds
-- introduced by 20260830000300. Preserve the union of both contracts.
alter table public.commercial_events
  drop constraint if exists commercial_event_type_check;

alter table public.commercial_events
  add constraint commercial_event_type_check check (event_type in (
    'outreach_sent',
    'reply_received',
    'conversation_held',
    'discovery_held',
    'qualification_completed',
    'demo_held',
    'pilot_proposal_sent',
    'pilot_started',
    'pilot_completed',
    'proposal_sent',
    'security_review_started',
    'security_review_completed',
    'procurement_started',
    'procurement_completed',
    'negotiation_updated',
    'payment_verified',
    'renewal_review',
    'renewal_verified',
    'expansion_review',
    'expansion_verified',
    'churn_verified',
    'win_loss_review',
    'customer_success_checkpoint',
    'customer_interview',
    'objection_recorded',
    'lost_deal_recorded',
    'feature_request_recorded',
    'use_case_validated',
    'referral_verified'
  ));

-- One interview row points back to the existing commercial event ledger. Names
-- and email addresses stay in commercial_contacts; this table does not duplicate
-- participant PII into product analytics or customer-visible data surfaces.
create table if not exists public.market_research_interviews (
  id uuid primary key default gen_random_uuid(),
  commercial_event_id uuid not null unique references public.commercial_events(id) on delete cascade,
  account_id uuid not null references public.commercial_accounts(id) on delete cascade,
  contact_id uuid references public.commercial_contacts(id) on delete set null,
  opportunity_id uuid references public.commercial_opportunities(id) on delete set null,
  interview_type text not null check (interview_type in (
    'buyer_interview',
    'category_comprehension',
    'win_loss',
    'design_partner_review',
    'activation_review',
    'retention_review',
    'referral_interview'
  )),
  participant_role text check (participant_role is null or char_length(participant_role) <= 200),
  qualification_band text not null default 'unknown' check (qualification_band in ('unknown','strong_icp','adjacent','disqualified')),
  interview_source text not null default 'founder_research' check (char_length(interview_source) between 2 and 120),
  raw_notes text check (raw_notes is null or char_length(raw_notes) <= 20000),
  occurred_at timestamptz not null,
  recorded_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Atomic evidence statements. Each item must point to at least one actual source
-- record/reference. Hypotheses and targets may be stored for comparison, but they
-- cannot become customer evidence merely by existing in this table.
create table if not exists public.market_evidence_items (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.commercial_accounts(id) on delete set null,
  interview_id uuid references public.market_research_interviews(id) on delete cascade,
  commercial_event_id uuid references public.commercial_events(id) on delete set null,
  opportunity_id uuid references public.commercial_opportunities(id) on delete set null,
  product_organization_id uuid references public.organizations(id) on delete set null,
  design_partner_application_id uuid references public.design_partner_applications(id) on delete set null,
  truth_classification text not null default 'first_party_customer_evidence' check (truth_classification in (
    'verified_fact',
    'production_fact',
    'first_party_customer_evidence',
    'hypothesis',
    'target',
    'experiment',
    'unknown',
    'blocked'
  )),
  confidence_dimension text not null check (confidence_dimension in (
    'icp_confidence',
    'problem_confidence',
    'buyer_confidence',
    'category_comprehension',
    'urgency',
    'willingness_to_trial',
    'willingness_to_pay',
    'activation',
    'repeat_usage',
    'retention',
    'expansion_potential'
  )),
  dimension text not null check (dimension in (
    'company_size',
    'industry',
    'geography',
    'maturity',
    'team_structure',
    'ai_recommendation_concern',
    'competitor_context',
    'buying_question_importance',
    'current_workaround',
    'urgency',
    'trigger_event',
    'champion_role',
    'economic_buyer_role',
    'budget_owner',
    'procurement_path',
    'existing_tools',
    'problem_frequency',
    'consequence_of_inaction',
    'willingness_to_change',
    'willingness_to_pay',
    'decision_criteria',
    'objection',
    'category_unaided_language',
    'category_natural_language',
    'category_comprehension',
    'category_relevance',
    'category_urgency',
    'category_differentiation',
    'category_credibility',
    'category_action_intent',
    'pilot_interest',
    'design_partner_status',
    'validated_use_case',
    'feature_request',
    'lost_reason',
    'referral',
    'payment',
    'renewal',
    'expansion',
    'churn',
    'activation',
    'second_cycle',
    'repeat_usage',
    'retention',
    'expansion_potential'
  )),
  evidence_direction text not null default 'neutral' check (evidence_direction in ('supports','weakens','contradicts','neutral')),
  evidence_kind text not null check (evidence_kind in (
    'behavioral_history',
    'verbatim_statement',
    'observed_behavior',
    'commercial_commitment',
    'verified_payment',
    'product_behavior',
    'referral',
    'operator_verified_record'
  )),
  statement text not null check (char_length(statement) between 3 and 8000),
  normalized_value text check (normalized_value is null or char_length(normalized_value) <= 1000),
  verbatim_text text check (verbatim_text is null or char_length(verbatim_text) <= 8000),
  numeric_value numeric,
  boolean_value boolean,
  source_reference text check (source_reference is null or char_length(source_reference) <= 1000),
  observed_at timestamptz not null,
  recorded_by uuid,
  created_at timestamptz not null default now(),
  constraint market_evidence_has_source check (
    interview_id is not null
    or commercial_event_id is not null
    or opportunity_id is not null
    or product_organization_id is not null
    or design_partner_application_id is not null
    or source_reference is not null
  )
);

-- Confidence is a history, never a mutable magic score. NO EVIDENCE may be used
-- as a baseline without a source; every non-empty confidence state requires an
-- actual primary evidence item and can link additional supporting/contradicting
-- items through the join table below.
create table if not exists public.market_confidence_assessments (
  id uuid primary key default gen_random_uuid(),
  hypothesis_version text not null check (char_length(hypothesis_version) between 2 and 120),
  confidence_dimension text not null check (confidence_dimension in (
    'icp_confidence',
    'problem_confidence',
    'buyer_confidence',
    'category_comprehension',
    'urgency',
    'willingness_to_trial',
    'willingness_to_pay',
    'activation',
    'repeat_usage',
    'retention',
    'expansion_potential'
  )),
  confidence_state text not null check (confidence_state in ('no_evidence','weak','emerging','moderate','strong','contradicted')),
  primary_evidence_item_id uuid references public.market_evidence_items(id) on delete restrict,
  rationale text not null check (char_length(rationale) between 3 and 8000),
  assessed_at timestamptz not null default now(),
  assessed_by uuid,
  created_at timestamptz not null default now(),
  constraint market_confidence_evidence_required check (
    (confidence_state = 'no_evidence' and primary_evidence_item_id is null)
    or (confidence_state <> 'no_evidence' and primary_evidence_item_id is not null)
  )
);

create table if not exists public.market_confidence_evidence_links (
  assessment_id uuid not null references public.market_confidence_assessments(id) on delete cascade,
  evidence_item_id uuid not null references public.market_evidence_items(id) on delete restrict,
  link_role text not null default 'supports' check (link_role in ('supports','weakens','contradicts','context')),
  created_at timestamptz not null default now(),
  primary key (assessment_id, evidence_item_id)
);

-- Experiments are plans/runs, not proof. No winner is recorded automatically.
create table if not exists public.market_experiments (
  id uuid primary key default gen_random_uuid(),
  hypothesis_version text not null check (char_length(hypothesis_version) between 2 and 120),
  experiment_type text not null check (experiment_type in (
    'category_comprehension',
    'problem_vs_category_message',
    'landing_page_message',
    'demo_opening',
    'outreach_wording',
    'buyer_language',
    'alternative_language',
    'organic_category_content'
  )),
  name text not null check (char_length(name) between 3 and 200),
  research_question text not null check (char_length(research_question) between 3 and 4000),
  audience_criteria text not null check (char_length(audience_criteria) between 3 and 4000),
  variant_definition jsonb not null default '{}'::jsonb check (jsonb_typeof(variant_definition) = 'object'),
  status text not null default 'planned' check (status in ('planned','running','completed','invalidated')),
  minimum_sample_target integer check (minimum_sample_target is null or minimum_sample_target > 0),
  decision_rule text check (decision_rule is null or char_length(decision_rule) <= 4000),
  outcome_summary text check (outcome_summary is null or char_length(outcome_summary) <= 8000),
  market_truth_decision text check (market_truth_decision is null or market_truth_decision in ('keep','refine','pivot','kill')),
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint market_experiment_completion_check check (completed_at is null or started_at is not null),
  constraint market_experiment_outcome_check check (market_truth_decision is null or status = 'completed')
);

create table if not exists public.market_experiment_observations (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references public.market_experiments(id) on delete cascade,
  interview_id uuid references public.market_research_interviews(id) on delete set null,
  account_id uuid references public.commercial_accounts(id) on delete set null,
  contact_id uuid references public.commercial_contacts(id) on delete set null,
  variant_key text check (variant_key is null or char_length(variant_key) <= 120),
  unaided_response text check (unaided_response is null or char_length(unaided_response) <= 8000),
  natural_category_language text check (natural_category_language is null or char_length(natural_category_language) <= 2000),
  comprehension_score smallint check (comprehension_score between 1 and 5),
  relevance_score smallint check (relevance_score between 1 and 5),
  urgency_score smallint check (urgency_score between 1 and 5),
  differentiation_score smallint check (differentiation_score between 1 and 5),
  credibility_score smallint check (credibility_score between 1 and 5),
  action_intent_score smallint check (action_intent_score between 1 and 5),
  committed_time boolean,
  committed_data boolean,
  committed_workflow boolean,
  trial_interest boolean,
  notes text check (notes is null or char_length(notes) <= 8000),
  observed_at timestamptz not null,
  recorded_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists market_research_interviews_account_idx on public.market_research_interviews (account_id, occurred_at desc);
create index if not exists market_research_interviews_type_idx on public.market_research_interviews (interview_type, qualification_band, occurred_at desc);
create index if not exists market_evidence_items_dimension_idx on public.market_evidence_items (confidence_dimension, dimension, observed_at desc);
create index if not exists market_evidence_items_account_idx on public.market_evidence_items (account_id, observed_at desc) where account_id is not null;
create index if not exists market_evidence_items_interview_idx on public.market_evidence_items (interview_id) where interview_id is not null;
create index if not exists market_confidence_dimension_idx on public.market_confidence_assessments (confidence_dimension, assessed_at desc);
create index if not exists market_experiments_status_idx on public.market_experiments (status, experiment_type, created_at desc);
create index if not exists market_experiment_observations_experiment_idx on public.market_experiment_observations (experiment_id, observed_at desc);

create trigger market_research_interviews_updated_at
  before update on public.market_research_interviews
  for each row execute function public.set_updated_at();
create trigger market_experiments_updated_at
  before update on public.market_experiments
  for each row execute function public.set_updated_at();

alter table public.market_research_interviews enable row level security;
alter table public.market_evidence_items enable row level security;
alter table public.market_confidence_assessments enable row level security;
alter table public.market_confidence_evidence_links enable row level security;
alter table public.market_experiments enable row level security;
alter table public.market_experiment_observations enable row level security;

-- Founder/company research may contain protected commercial context and raw
-- interview language. Keep it completely outside customer browser roles.
revoke all on table public.market_research_interviews, public.market_evidence_items,
  public.market_confidence_assessments, public.market_confidence_evidence_links,
  public.market_experiments, public.market_experiment_observations from public;
revoke all on table public.market_research_interviews, public.market_evidence_items,
  public.market_confidence_assessments, public.market_confidence_evidence_links,
  public.market_experiments, public.market_experiment_observations from anon, authenticated;

grant select, insert, update, delete on table public.market_research_interviews,
  public.market_evidence_items, public.market_confidence_assessments,
  public.market_confidence_evidence_links, public.market_experiments,
  public.market_experiment_observations to service_role;

create or replace view public.market_confidence_latest as
select distinct on (confidence_dimension)
  id,
  hypothesis_version,
  confidence_dimension,
  confidence_state,
  primary_evidence_item_id,
  rationale,
  assessed_at
from public.market_confidence_assessments
order by confidence_dimension, assessed_at desc, created_at desc;

create or replace view public.market_validation_scorecard as
select
  (select count(*) from public.market_research_interviews) as interview_count,
  (select count(distinct account_id) from public.market_research_interviews where qualification_band = 'strong_icp') as strongly_icp_relevant_accounts_interviewed,
  (select count(*) from public.market_experiment_observations) as experiment_observation_count,
  (select count(*) from public.market_evidence_items where truth_classification = 'first_party_customer_evidence') as first_party_customer_evidence_items,
  (select count(*) from public.market_evidence_items where confidence_dimension = 'willingness_to_trial' and truth_classification = 'first_party_customer_evidence') as trial_evidence_items,
  (select count(*) from public.market_evidence_items where confidence_dimension = 'willingness_to_pay' and truth_classification = 'first_party_customer_evidence') as willingness_to_pay_evidence_items,
  (select count(*) from public.market_evidence_items where dimension = 'payment' and evidence_kind = 'verified_payment') as verified_payment_evidence_items,
  (select count(*) from public.market_evidence_items where dimension = 'second_cycle' and truth_classification = 'first_party_customer_evidence') as second_cycle_evidence_items;

revoke all on table public.market_confidence_latest, public.market_validation_scorecard from public;
revoke all on table public.market_confidence_latest, public.market_validation_scorecard from anon, authenticated;
grant select on table public.market_confidence_latest, public.market_validation_scorecard to service_role;

comment on table public.market_research_interviews is
  'Service-only founder research sessions linked to the canonical commercial event ledger. Do not mirror raw notes or contact PII into product analytics.';
comment on table public.market_evidence_items is
  'Atomic market evidence with explicit truth classification, direction, dimension, and source linkage; no row automatically changes confidence.';
comment on table public.market_confidence_assessments is
  'Versioned confidence history. Every non-NO-EVIDENCE assessment requires an actual primary evidence item.';
comment on table public.market_experiments is
  'ICP/category experiments. Planned or running experiments are not customer proof and no winner is inferred automatically.';
comment on view public.market_validation_scorecard is
  'Counts only real rows in the service-only market evidence ledger; it does not infer PMF, demand, willingness to pay, or category validation.';

commit;
