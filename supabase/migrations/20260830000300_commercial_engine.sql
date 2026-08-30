-- Foremention Commercial Engine v1
-- Founder-internal revenue operations and pricing research truth store.
-- No customer/browser write policies are granted. Public pricing is not encoded here.

begin;

create table if not exists public.commercial_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  company_name text not null check (char_length(company_name) between 2 and 180),
  domain text check (domain is null or char_length(domain) between 3 and 255),
  source text not null check (char_length(source) between 2 and 120),
  lifecycle text not null default 'prospect' check (lifecycle in ('prospect','design_partner','customer','former_customer','disqualified')),
  market text,
  employee_band text,
  arr_band text,
  owner_user_id uuid references auth.users(id) on delete set null,
  notes text check (notes is null or char_length(notes) <= 8000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists commercial_accounts_lifecycle_idx
  on public.commercial_accounts (lifecycle, created_at desc);
create index if not exists commercial_accounts_organization_idx
  on public.commercial_accounts (organization_id) where organization_id is not null;

create table if not exists public.commercial_contacts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.commercial_accounts(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 180),
  email text check (email is null or char_length(email) between 3 and 320),
  title text check (title is null or char_length(title) <= 180),
  buying_role text not null default 'other' check (buying_role in ('champion','economic_buyer','technical_evaluator','security','procurement','legal','other')),
  relationship_state text not null default 'unknown' check (relationship_state in ('unknown','cold','engaged','supportive','neutral','blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists commercial_contacts_account_idx
  on public.commercial_contacts (account_id, buying_role);

create table if not exists public.commercial_opportunities (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.commercial_accounts(id) on delete cascade,
  design_partner_application_id uuid references public.design_partner_applications(id) on delete set null,
  opportunity_type text not null default 'new_business' check (opportunity_type in ('new_business','design_partner','renewal','expansion')),
  source text not null check (char_length(source) between 2 and 120),
  trigger text check (trigger is null or char_length(trigger) <= 2000),
  stage text not null default 'prospect' check (stage in ('prospect','discovery','qualified','demo','proposal','security_review','procurement','negotiation','won','lost')),
  package_key text check (package_key is null or package_key in ('core','signal','intelligence','custom')),
  qualification jsonb not null default '{}'::jsonb check (jsonb_typeof(qualification) = 'object'),
  champion_contact_id uuid references public.commercial_contacts(id) on delete set null,
  economic_buyer_contact_id uuid references public.commercial_contacts(id) on delete set null,
  discovery_at timestamptz,
  qualified_at timestamptz,
  demo_at timestamptz,
  proposal_at timestamptz,
  security_review_at timestamptz,
  procurement_at timestamptz,
  negotiation_at timestamptz,
  forecast_close_at date,
  contract_term text check (contract_term is null or contract_term in ('monthly','annual','multi_year','custom')),
  proposed_acv_cents bigint check (proposed_acv_cents is null or proposed_acv_cents >= 0),
  closed_acv_cents bigint check (closed_acv_cents is null or closed_acv_cents >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  closed_at timestamptz,
  lost_reason text check (lost_reason is null or char_length(lost_reason) <= 2000),
  renewal_at date,
  owner_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((stage = 'lost' and lost_reason is not null and closed_at is not null) or stage <> 'lost'),
  check ((stage = 'won' and closed_at is not null) or stage <> 'won')
);

create index if not exists commercial_opportunities_pipeline_idx
  on public.commercial_opportunities (stage, forecast_close_at, created_at desc);
create index if not exists commercial_opportunities_account_idx
  on public.commercial_opportunities (account_id, created_at desc);
create index if not exists commercial_opportunities_renewal_idx
  on public.commercial_opportunities (renewal_at) where renewal_at is not null;

create table if not exists public.commercial_stage_events (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.commercial_opportunities(id) on delete cascade,
  from_stage text check (from_stage is null or from_stage in ('prospect','discovery','qualified','demo','proposal','security_review','procurement','negotiation','won','lost')),
  to_stage text not null check (to_stage in ('prospect','discovery','qualified','demo','proposal','security_review','procurement','negotiation','won','lost')),
  reason text check (reason is null or char_length(reason) <= 2000),
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now()
);

create index if not exists commercial_stage_events_opportunity_idx
  on public.commercial_stage_events (opportunity_id, changed_at asc);

create table if not exists public.commercial_activities (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.commercial_opportunities(id) on delete cascade,
  contact_id uuid references public.commercial_contacts(id) on delete set null,
  activity_type text not null check (activity_type in ('discovery','qualification','demo','proposal','follow_up','security_review','procurement','negotiation','renewal_review','expansion_review','win_loss_review')),
  outcome text check (outcome is null or char_length(outcome) <= 4000),
  next_step text check (next_step is null or char_length(next_step) <= 2000),
  occurred_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists commercial_activities_opportunity_idx
  on public.commercial_activities (opportunity_id, occurred_at desc);

create table if not exists public.pricing_research_records (
  id uuid primary key default gen_random_uuid(),
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
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (evidence_state <> 'current_fact' or (evidence_source is not null and observed_at is not null))
);

create index if not exists pricing_research_records_dimension_idx
  on public.pricing_research_records (dimension, evidence_state, observed_at desc nulls last);

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
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_end >= period_start)
);

create unique index if not exists commercial_metric_periods_range_source_unique
  on public.commercial_metric_periods (period_start, period_end, source);

create trigger commercial_accounts_updated_at before update on public.commercial_accounts
  for each row execute function public.set_updated_at();
create trigger commercial_contacts_updated_at before update on public.commercial_contacts
  for each row execute function public.set_updated_at();
create trigger commercial_opportunities_updated_at before update on public.commercial_opportunities
  for each row execute function public.set_updated_at();
create trigger pricing_research_records_updated_at before update on public.pricing_research_records
  for each row execute function public.set_updated_at();
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
    values (new.id, null, new.stage, new.owner_user_id);
  elsif new.stage is distinct from old.stage then
    insert into public.commercial_stage_events (opportunity_id, from_stage, to_stage, changed_by)
    values (new.id, old.stage, new.stage, new.owner_user_id);
  end if;
  return new;
end;
$$;

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

create trigger commercial_stage_events_immutable
  before update or delete on public.commercial_stage_events
  for each row execute function public.prevent_commercial_audit_mutation();

alter table public.commercial_accounts enable row level security;
alter table public.commercial_contacts enable row level security;
alter table public.commercial_opportunities enable row level security;
alter table public.commercial_stage_events enable row level security;
alter table public.commercial_activities enable row level security;
alter table public.pricing_research_records enable row level security;
alter table public.commercial_metric_periods enable row level security;

-- No authenticated policies are intentionally created. These tables contain
-- founder/internal CRM, pricing research and revenue data and are accessed only
-- through trusted service-role operations until an explicit internal admin surface exists.
revoke all on public.commercial_accounts from anon, authenticated;
revoke all on public.commercial_contacts from anon, authenticated;
revoke all on public.commercial_opportunities from anon, authenticated;
revoke all on public.commercial_stage_events from anon, authenticated;
revoke all on public.commercial_activities from anon, authenticated;
revoke all on public.pricing_research_records from anon, authenticated;
revoke all on public.commercial_metric_periods from anon, authenticated;

revoke all on function public.capture_commercial_stage_event() from public, anon, authenticated;
revoke all on function public.prevent_commercial_audit_mutation() from public, anon, authenticated;

commit;
