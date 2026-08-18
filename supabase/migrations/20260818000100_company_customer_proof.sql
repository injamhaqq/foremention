-- Foremention company customer-proof operating foundation.
--
-- This migration intentionally creates no accounts, customers, opportunities,
-- revenue, or KPI classifications. Real zero must stay real zero. Product
-- organizations fail closed from company KPIs until a human operator explicitly
-- classifies an organization as a design partner or customer.

create table if not exists public.company_organization_classifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  classification text not null default 'unknown' constraint company_org_classification_check check (classification in ('unknown', 'internal', 'synthetic', 'benchmark', 'design_partner', 'customer')),
  included_in_company_kpis boolean not null default false,
  rationale text,
  classified_by uuid,
  classified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_org_kpi_eligibility_check check (included_in_company_kpis = false or classification in ('design_partner', 'customer'))
);

create table if not exists public.commercial_accounts (
  id uuid primary key default gen_random_uuid(),
  customer_organization_id uuid unique references public.organizations(id) on delete set null,
  company_name text not null,
  domain text,
  lead_source text,
  channel text,
  lifecycle_stage text not null default 'target' constraint commercial_account_lifecycle_check check (lifecycle_stage in ('target', 'qualified', 'contacted', 'conversation', 'design_partner', 'customer', 'churned', 'disqualified')),
  qualification_status text not null default 'unreviewed' constraint commercial_account_qualification_check check (qualification_status in ('unreviewed', 'qualified', 'disqualified')),
  icp_score smallint constraint commercial_account_icp_score_check check (icp_score between 0 and 100),
  qualification_reason text,
  next_action text,
  next_action_at timestamptz,
  owner_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.commercial_contacts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.commercial_accounts(id) on delete cascade,
  full_name text,
  email text,
  job_title text,
  buyer_role text constraint commercial_contact_buyer_role_check check (buyer_role is null or buyer_role in ('champion', 'daily_user', 'economic_buyer', 'influencer', 'procurement', 'other')),
  is_primary boolean not null default false,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.commercial_opportunities (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.commercial_accounts(id) on delete cascade,
  primary_contact_id uuid references public.commercial_contacts(id) on delete set null,
  stage text not null default 'identified' constraint commercial_opportunity_stage_check check (stage in ('identified', 'discovery', 'demo', 'pilot_proposed', 'pilot_active', 'won', 'lost')),
  commercial_model text not null default 'pilot' constraint commercial_opportunity_model_check check (commercial_model in ('pilot', 'annual', 'renewal', 'expansion')),
  currency text not null default 'USD' constraint commercial_opportunity_currency_check check (currency ~ '^[A-Z]{3}$'),
  probability_percent smallint constraint commercial_opportunity_probability_check check (probability_percent between 0 and 100),
  expected_value_usd numeric(14,2) constraint commercial_opportunity_expected_value_check check (expected_value_usd is null or expected_value_usd >= 0),
  quoted_value_usd numeric(14,2) constraint commercial_opportunity_quoted_value_check check (quoted_value_usd is null or quoted_value_usd >= 0),
  negotiated_value_usd numeric(14,2) constraint commercial_opportunity_negotiated_value_check check (negotiated_value_usd is null or negotiated_value_usd >= 0),
  accepted_value_usd numeric(14,2) constraint commercial_opportunity_accepted_value_check check (accepted_value_usd is null or accepted_value_usd >= 0),
  paid_value_usd numeric(14,2) constraint commercial_opportunity_paid_value_check check (paid_value_usd is null or paid_value_usd >= 0),
  mrr_usd numeric(14,2) constraint commercial_opportunity_mrr_check check (mrr_usd is null or mrr_usd >= 0),
  arr_usd numeric(14,2) constraint commercial_opportunity_arr_check check (arr_usd is null or arr_usd >= 0),
  proposed_at timestamptz,
  pilot_started_at timestamptz,
  closed_at timestamptz,
  lost_reason text constraint commercial_opportunity_lost_reason_check check (lost_reason is null or lost_reason in ('no_urgent_pain', 'no_budget', 'timing', 'no_authority', 'missing_capability', 'trust_security', 'competitor', 'internal_build', 'no_response', 'other')),
  revenue_source text not null default 'none' constraint commercial_opportunity_revenue_source_check check (revenue_source in ('none', 'manual_verified', 'billing_provider')),
  billing_reference text,
  next_action text,
  next_action_at timestamptz,
  owner_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commercial_opportunity_won_evidence_check check (stage <> 'won' or accepted_value_usd is not null or paid_value_usd is not null)
);

create table if not exists public.commercial_events (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.commercial_accounts(id) on delete cascade,
  contact_id uuid references public.commercial_contacts(id) on delete set null,
  opportunity_id uuid references public.commercial_opportunities(id) on delete set null,
  event_type text not null constraint commercial_event_type_check check (event_type in ('outreach_sent', 'reply_received', 'conversation_held', 'discovery_held', 'demo_held', 'pilot_proposal_sent', 'pilot_started', 'pilot_completed', 'payment_verified', 'renewal_verified', 'expansion_verified', 'churn_verified', 'customer_success_checkpoint')),
  channel text,
  outcome text,
  next_action text,
  next_action_at timestamptz,
  source_system text not null default 'manual',
  external_reference text,
  occurred_at timestamptz not null default now(),
  recorded_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists company_org_classifications_kpi_idx
  on public.company_organization_classifications (included_in_company_kpis, classification);
create index if not exists commercial_accounts_lifecycle_idx
  on public.commercial_accounts (lifecycle_stage, qualification_status);
create index if not exists commercial_accounts_next_action_idx
  on public.commercial_accounts (next_action_at) where next_action_at is not null;
create index if not exists commercial_contacts_account_idx
  on public.commercial_contacts (account_id);
create index if not exists commercial_opportunities_account_stage_idx
  on public.commercial_opportunities (account_id, stage);
create index if not exists commercial_opportunities_next_action_idx
  on public.commercial_opportunities (next_action_at) where next_action_at is not null;
create index if not exists commercial_events_account_occurred_idx
  on public.commercial_events (account_id, occurred_at desc);
create index if not exists commercial_events_opportunity_idx
  on public.commercial_events (opportunity_id) where opportunity_id is not null;
create index if not exists commercial_events_contact_idx
  on public.commercial_events (contact_id) where contact_id is not null;
create index if not exists commercial_events_type_occurred_idx
  on public.commercial_events (event_type, occurred_at desc);

alter table public.company_organization_classifications enable row level security;
alter table public.commercial_accounts enable row level security;
alter table public.commercial_contacts enable row level security;
alter table public.commercial_opportunities enable row level security;
alter table public.commercial_events enable row level security;

-- Company/commercial records are operator systems, not customer workspace data.
-- No browser-role policies are created. Keep PII out of PostHog and customer RLS surfaces.
revoke all on table public.company_organization_classifications, public.commercial_accounts, public.commercial_contacts, public.commercial_opportunities, public.commercial_events from public;
revoke all on table public.company_organization_classifications, public.commercial_accounts, public.commercial_contacts, public.commercial_opportunities, public.commercial_events from anon, authenticated;
grant select, insert, update, delete on table public.company_organization_classifications, public.commercial_accounts, public.commercial_contacts, public.commercial_opportunities, public.commercial_events to service_role;

create or replace view public.company_ceo_scorecard as
with
account_metrics as (
  select
    count(distinct ca.id) filter (where ca.lifecycle_stage <> 'disqualified') as target_accounts,
    count(distinct ca.id) filter (where ca.qualification_status = 'qualified') as qualified_accounts,
    count(distinct ca.id) filter (where ca.lifecycle_stage = 'design_partner') as design_partners,
    count(distinct ca.id) filter (where ca.lifecycle_stage = 'customer') as customer_accounts,
    count(distinct ca.id) filter (where ca.lifecycle_stage = 'churned') as churned_accounts
  from public.commercial_accounts ca
),
event_metrics as (
  select
    count(distinct ce.account_id) filter (where ce.event_type = 'outreach_sent') as contacted_accounts,
    count(*) filter (where ce.event_type = 'reply_received') as replies,
    count(*) filter (where ce.event_type in ('conversation_held', 'discovery_held')) as conversations,
    count(*) filter (where ce.event_type = 'demo_held') as demos,
    count(*) filter (where ce.event_type = 'pilot_proposal_sent') as pilot_proposals
  from public.commercial_events ce
),
opportunity_metrics as (
  select
    count(*) filter (where co.stage = 'pilot_active') as active_pilots,
    count(distinct co.account_id) filter (where co.stage = 'won' and co.paid_value_usd > 0) as paying_organizations,
    coalesce(sum(co.expected_value_usd) filter (where co.stage in ('identified', 'discovery', 'demo', 'pilot_proposed')), 0)::numeric(14,2) as pipeline_value_usd,
    coalesce(sum(coalesce(co.expected_value_usd, 0) * coalesce(co.probability_percent, 0) / 100.0) filter (where co.stage in ('identified', 'discovery', 'demo', 'pilot_proposed')), 0)::numeric(14,2) as weighted_pipeline_usd,
    coalesce(sum(coalesce(co.mrr_usd, 0)) filter (where co.stage = 'won'), 0)::numeric(14,2) as mrr_usd,
    coalesce(sum(coalesce(co.arr_usd, 0)) filter (where co.stage = 'won'), 0)::numeric(14,2) as arr_usd,
    coalesce(sum(coalesce(co.paid_value_usd, 0)) filter (where co.stage = 'won'), 0)::numeric(14,2) as verified_paid_value_usd
  from public.commercial_opportunities co
)
select am.*, em.*, om.*
from account_metrics am
cross join event_metrics em
cross join opportunity_metrics om;

create or replace view public.company_customer_value_scorecard as
with eligible_orgs as (
  select coc.organization_id
  from public.company_organization_classifications coc
  where coc.included_in_company_kpis = true
),
value_weeks as (
  select distinct o.organization_id, date_trunc('week', o.created_at)::date as value_week
  from public.opportunities o
  join eligible_orgs eo on eo.organization_id = o.organization_id
),
current_value_orgs as (
  select distinct vw.organization_id
  from value_weeks vw
  where vw.value_week = date_trunc('week', current_date)::date
),
retained_value_orgs as (
  select cvo.organization_id
  from current_value_orgs cvo
  where exists (
    select 1
    from value_weeks previous
    where previous.organization_id = cvo.organization_id
      and previous.value_week < date_trunc('week', current_date)::date
  )
),
first_value as (
  select o.organization_id, min(o.created_at) as first_value_at
  from public.opportunities o
  join eligible_orgs eo on eo.organization_id = o.organization_id
  group by o.organization_id
),
verified_improvement as (
  select distinct rf.organization_id
  from public.resolution_follow_ups rf
  join eligible_orgs eo on eo.organization_id = rf.organization_id
  where rf.status = 'complete'
    and rf.rerun_id is not null
    and jsonb_typeof(rf.outcome) = 'object'
    and rf.outcome <> '{}'::jsonb
),
costs as (
  select coalesce(sum(ace.estimated_cost_usd), 0)::numeric(14,6) as ai_cost_usd
  from public.ai_cost_events ace
  join eligible_orgs eo on eo.organization_id = ace.organization_id
)
select
  (select count(*) from eligible_orgs) as kpi_eligible_organizations,
  (select count(*) from first_value) as activated_organizations,
  (select count(*) from current_value_orgs) as current_week_value_organizations,
  (select count(*) from retained_value_orgs) as weekly_retained_value_organizations,
  (select count(*) from verified_improvement) as verified_improvement_organizations,
  (select ai_cost_usd from costs) as ai_cost_usd,
  case
    when (select count(*) from first_value) < 5 then null
    else (
      select percentile_cont(0.5) within group (order by extract(epoch from (fv.first_value_at - org.created_at)) / 3600.0)
      from first_value fv
      join public.organizations org on org.id = fv.organization_id
    )
  end as median_time_to_first_verified_value_hours
;

revoke all on table public.company_ceo_scorecard from public;
revoke all on table public.company_customer_value_scorecard from public;
revoke all on table public.company_ceo_scorecard from anon, authenticated;
revoke all on table public.company_customer_value_scorecard from anon, authenticated;
grant select on table public.company_ceo_scorecard, public.company_customer_value_scorecard to service_role;

comment on table public.company_organization_classifications is 'Human-controlled eligibility boundary separating real customer/design-partner organizations from internal, synthetic, benchmark, and unknown activity.';
comment on table public.commercial_contacts is 'Protected first-party commercial PII. Never mirror raw contact PII into PostHog.';
comment on view public.company_ceo_scorecard is 'Aggregate company/revenue operating metrics from real first-party commercial records only.';
comment on view public.company_customer_value_scorecard is 'Aggregate value/outcome metrics for explicitly KPI-eligible external organizations only.';
