-- Foremention Commercial Engine v1
-- Extends the existing first-party company/customer-proof commercial foundation.
-- It does not create a parallel CRM and does not seed synthetic commercial facts.

begin;

-- Preserve the existing commercial account object and extend only the fields
-- needed for repeatable qualification and account context.
alter table public.commercial_accounts
  add column if not exists market text,
  add column if not exists employee_band text,
  add column if not exists arr_band text,
  add column if not exists notes text;

alter table public.commercial_accounts
  drop constraint if exists commercial_account_lifecycle_check;
alter table public.commercial_accounts
  add constraint commercial_account_lifecycle_check
  check (lifecycle_stage in ('target','prospect','qualified','contacted','conversation','design_partner','customer','churned','disqualified'));

create index if not exists commercial_accounts_market_idx
  on public.commercial_accounts (market) where market is not null;

-- Preserve the existing protected commercial contact object/PII boundary while
-- making buying roles explicit enough for champion/economic-buyer workflows.
alter table public.commercial_contacts
  add column if not exists relationship_state text not null default 'unknown';

alter table public.commercial_contacts
  drop constraint if exists commercial_contact_buyer_role_check;
alter table public.commercial_contacts
  add constraint commercial_contact_buyer_role_check
  check (buyer_role is null or buyer_role in ('champion','daily_user','economic_buyer','influencer','technical_evaluator','security','procurement','legal','other'));

alter table public.commercial_contacts
  add constraint commercial_contact_relationship_state_check
  check (relationship_state in ('unknown','cold','engaged','supportive','neutral','blocked'));

create index if not exists commercial_contacts_role_idx
  on public.commercial_contacts (account_id, buyer_role);

-- Preserve current opportunity/revenue evidence fields and extend the pipeline
-- rather than replacing the existing identified/demo/pilot flow.
alter table public.commercial_opportunities
  add column if not exists design_partner_application_id uuid references public.design_partner_applications(id) on delete set null,
  add column if not exists source text,
  add column if not exists trigger_context text,
  add column if not exists qualification jsonb not null default '{}'::jsonb,
  add column if not exists champion_contact_id uuid references public.commercial_contacts(id) on delete set null,
  add column if not exists economic_buyer_contact_id uuid references public.commercial_contacts(id) on delete set null,
  add column if not exists package_key text,
  add column if not exists discovery_at timestamptz,
  add column if not exists qualified_at timestamptz,
  add column if not exists demo_at timestamptz,
  add column if not exists proposal_at timestamptz,
  add column if not exists security_review_at timestamptz,
  add column if not exists procurement_at timestamptz,
  add column if not exists negotiation_at timestamptz,
  add column if not exists forecast_close_at date,
  add column if not exists contract_term text,
  add column if not exists renewal_at date;

alter table public.commercial_opportunities
  drop constraint if exists commercial_opportunity_stage_check;
alter table public.commercial_opportunities
  add constraint commercial_opportunity_stage_check
  check (stage in ('identified','discovery','qualified','demo','pilot_proposed','pilot_active','proposal','security_review','procurement','negotiation','won','lost'));

alter table public.commercial_opportunities
  drop constraint if exists commercial_opportunity_model_check;
alter table public.commercial_opportunities
  add constraint commercial_opportunity_model_check
  check (commercial_model in ('pilot','monthly','annual','multi_year','renewal','expansion','custom'));

alter table public.commercial_opportunities
  add constraint commercial_opportunity_qualification_json_check
  check (jsonb_typeof(qualification) = 'object');
alter table public.commercial_opportunities
  add constraint commercial_opportunity_package_key_check
  check (package_key is null or package_key in ('core','signal','intelligence','custom'));
alter table public.commercial_opportunities
  add constraint commercial_opportunity_contract_term_check
  check (contract_term is null or contract_term in ('monthly','annual','multi_year','custom'));

create index if not exists commercial_opportunities_pipeline_idx
  on public.commercial_opportunities (stage, forecast_close_at, created_at desc);
create index if not exists commercial_opportunities_renewal_idx
  on public.commercial_opportunities (renewal_at) where renewal_at is not null;
create index if not exists commercial_opportunities_champion_idx
  on public.commercial_opportunities (champion_contact_id) where champion_contact_id is not null;
create index if not exists commercial_opportunities_economic_buyer_idx
  on public.commercial_opportunities (economic_buyer_contact_id) where economic_buyer_contact_id is not null;

-- Existing commercial_events remains the activity ledger. Expand its enum for
-- the new sales/procurement/renewal stages instead of creating a duplicate log.
alter table public.commercial_events
  drop constraint if exists commercial_event_type_check;
alter table public.commercial_events
  add constraint commercial_event_type_check
  check (event_type in (
    'outreach_sent','reply_received','conversation_held','discovery_held',
    'qualification_completed','demo_held','pilot_proposal_sent','pilot_started','pilot_completed',
    'proposal_sent','security_review_started','security_review_completed',
    'procurement_started','procurement_completed','negotiation_updated',
    'payment_verified','renewal_review','renewal_verified','expansion_review','expansion_verified',
    'churn_verified','win_loss_review','customer_success_checkpoint'
  ));

-- Immutable opportunity stage history. Existing commercial_events remains the
-- human activity log; this table exists specifically for stage-transition audit.
create table if not exists public.commercial_stage_events (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.commercial_opportunities(id) on delete cascade,
  from_stage text check (from_stage is null or from_stage in ('identified','discovery','qualified','demo','pilot_proposed','pilot_active','proposal','security_review','procurement','negotiation','won','lost')),
  to_stage text not null check (to_stage in ('identified','discovery','qualified','demo','pilot_proposed','pilot_active','proposal','security_review','procurement','negotiation','won','lost')),
  reason text check (reason is null or char_length(reason) <= 2000),
  changed_by uuid,
  changed_at timestamptz not null default now()
);

create index if not exists commercial_stage_events_opportunity_idx
  on public.commercial_stage_events (opportunity_id, changed_at asc);

-- Pricing-validation truth store. current_fact requires explicit evidence and
-- observation time; experiments/hypotheses/targets cannot masquerade as facts.
create table if not exists public.pricing_research_records (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.commercial_accounts(id) on delete set null,
  opportunity_id uuid references public.commercial_opportunities(id) on delete set null,
  evidence_state text not null check (evidence_state in ('current_fact','experiment','hypothesis','future_target')),
  dimension text not null check (dimension in ('willingness_to_pay','value_metric','package_boundary','question_limit','brand_workspace_limit','measurement_frequency','users','integrations','api','enterprise_controls','minimum_acv','annual_contract','overage','gross_margin')),
  package_key text check (package_key is null or package_key in ('core','signal','intelligence','custom')),
  statement text not null check (char_length(statement) between 3 and 4000),
  amount_cents bigint check (amount_cents is null or amount_cents >= 0),
  numeric_value numeric,
  unit text check (unit is null or char_length(unit) <= 80),
  evidence_source text check (evidence_source is null or char_length(evidence_source) <= 1000),
  observed_at timestamptz,
  experiment_status text check (experiment_status is null or experiment_status in ('planned','running','completed','invalidated')),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (evidence_state <> 'current_fact' or (evidence_source is not null and observed_at is not null))
);

create index if not exists pricing_research_records_dimension_idx
  on public.pricing_research_records (dimension, evidence_state, observed_at desc nulls last);
create index if not exists pricing_research_records_opportunity_idx
  on public.pricing_research_records (opportunity_id) where opportunity_id is not null;

-- Period inputs are deliberately nullable: unknown commercial data is not zero.
create table if not exists public.commercial_metric_periods (
  id uuid primary key default gen_random_uuid(),
  period_start date not null,
  period_end date not null,
  source text not null check (char_length(source) between 2 and 500),
  status text not null default 'draft' check (status in ('draft','verified')),
  lead_count integer check (lead_count is null or lead_count >= 0),
  qualified_opportunity_count integer check (qualified_opportunity_count is null or qualified_opportunity_count >= 0),
  demo_count integer check (demo_count is null or demo_count >= 0),
  design_partner_count integer check (design_partner_count is null or design_partner_count >= 0),
  won_count integer check (won_count is null or won_count >= 0),
  lost_count integer check (lost_count is null or lost_count >= 0),
  sales_marketing_spend_cents bigint check (sales_marketing_spend_cents is null or sales_marketing_spend_cents >= 0),
  revenue_cents bigint check (revenue_cents is null or revenue_cents >= 0),
  service_cogs_cents bigint check (service_cogs_cents is null or service_cogs_cents >= 0),
  starting_mrr_cents bigint check (starting_mrr_cents is null or starting_mrr_cents >= 0),
  new_mrr_cents bigint check (new_mrr_cents is null or new_mrr_cents >= 0),
  expansion_mrr_cents bigint check (expansion_mrr_cents is null or expansion_mrr_cents >= 0),
  contraction_mrr_cents bigint check (contraction_mrr_cents is null or contraction_mrr_cents >= 0),
  churned_mrr_cents bigint check (churned_mrr_cents is null or churned_mrr_cents >= 0),
  ending_mrr_cents bigint check (ending_mrr_cents is null or ending_mrr_cents >= 0),
  notes text check (notes is null or char_length(notes) <= 8000),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_end >= period_start)
);

create unique index if not exists commercial_metric_periods_range_source_unique
  on public.commercial_metric_periods (period_start, period_end, source);

-- The original commercial tables already carry updated_at fields but no update
-- triggers. Add them without changing their customer-proof semantics.
drop trigger if exists commercial_accounts_updated_at on public.commercial_accounts;
create trigger commercial_accounts_updated_at before update on public.commercial_accounts
  for each row execute function public.set_updated_at();
drop trigger if exists commercial_contacts_updated_at on public.commercial_contacts;
create trigger commercial_contacts_updated_at before update on public.commercial_contacts
  for each row execute function public.set_updated_at();
drop trigger if exists commercial_opportunities_updated_at on public.commercial_opportunities;
create trigger commercial_opportunities_updated_at before update on public.commercial_opportunities
  for each row execute function public.set_updated_at();
drop trigger if exists pricing_research_records_updated_at on public.pricing_research_records;
create trigger pricing_research_records_updated_at before update on public.pricing_research_records
  for each row execute function public.set_updated_at();
drop trigger if exists commercial_metric_periods_updated_at on public.commercial_metric_periods;
create trigger commercial_metric_periods_updated_at before update on public.commercial_metric_periods
  for each row execute function public.set_updated_at();

create or replace function public.capture_commercial_stage_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.commercial_stage_events (opportunity_id, from_stage, to_stage, changed_by)
    values (new.id, null, new.stage, new.owner_id);
  elsif new.stage is distinct from old.stage then
    insert into public.commercial_stage_events (opportunity_id, from_stage, to_stage, changed_by)
    values (new.id, old.stage, new.stage, new.owner_id);
  end if;
  return new;
end;
$$;

drop trigger if exists commercial_opportunity_stage_audit on public.commercial_opportunities;
create trigger commercial_opportunity_stage_audit
  after insert or update of stage on public.commercial_opportunities
  for each row execute function public.capture_commercial_stage_event();

create or replace function public.prevent_commercial_audit_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'commercial audit events are immutable';
end;
$$;

drop trigger if exists commercial_stage_events_immutable on public.commercial_stage_events;
create trigger commercial_stage_events_immutable
  before update or delete on public.commercial_stage_events
  for each row execute function public.prevent_commercial_audit_mutation();

alter table public.commercial_accounts enable row level security;
alter table public.commercial_contacts enable row level security;
alter table public.commercial_opportunities enable row level security;
alter table public.commercial_events enable row level security;
alter table public.commercial_stage_events enable row level security;
alter table public.pricing_research_records enable row level security;
alter table public.commercial_metric_periods enable row level security;

-- Keep all company/commercial records out of browser/customer data surfaces.
revoke all on public.commercial_accounts from anon, authenticated;
revoke all on public.commercial_contacts from anon, authenticated;
revoke all on public.commercial_opportunities from anon, authenticated;
revoke all on public.commercial_events from anon, authenticated;
revoke all on public.commercial_stage_events from public, anon, authenticated;
revoke all on public.pricing_research_records from public, anon, authenticated;
revoke all on public.commercial_metric_periods from public, anon, authenticated;

grant select, insert, update, delete on public.commercial_stage_events to service_role;
grant select, insert, update, delete on public.pricing_research_records to service_role;
grant select, insert, update, delete on public.commercial_metric_periods to service_role;

revoke all on function public.capture_commercial_stage_event() from public, anon, authenticated;
revoke all on function public.prevent_commercial_audit_mutation() from public, anon, authenticated;

comment on table public.pricing_research_records is
  'Founder-internal pricing evidence; current facts require explicit evidence source and observation time.';
comment on table public.commercial_metric_periods is
  'Founder-internal observed commercial metric inputs. Nullable values distinguish unknown from zero.';
comment on table public.commercial_stage_events is
  'Immutable opportunity stage-transition audit layered on the existing first-party commercial system.';

commit;
