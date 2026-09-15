-- F14/F16: make customer-value and paid-pilot acceptance evidence explicit and
-- fail closed. This migration creates no customer, partner, payment, decision,
-- or success facts. A zero-evidence production system remains zero.
begin;

alter table public.customer_success_reviews
  add column if not exists customer_confirmed_value boolean not null default false,
  add column if not exists confirmed_decision_event_id uuid references public.outcome_ledger_events(id) on delete restrict,
  add column if not exists confirmed_second_use_assessment_id uuid references public.change_verification_assessments(id) on delete restrict;

alter table public.customer_success_reviews
  drop constraint if exists customer_success_reviews_confirmed_value_evidence_check;
alter table public.customer_success_reviews
  add constraint customer_success_reviews_confirmed_value_evidence_check check (
    (
      customer_confirmed_value = false
      and confirmed_decision_event_id is null
      and confirmed_second_use_assessment_id is null
    )
    or
    (
      customer_confirmed_value = true
      and confirmed_decision_event_id is not null
      and confirmed_second_use_assessment_id is not null
      and review_type in ('success_review','qbr','business_value','renewal','expansion','advocacy')
    )
  );

create or replace function public.validate_customer_confirmed_value_evidence() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  decision_row record;
  assessment_row record;
begin
  if not new.customer_confirmed_value then
    return new;
  end if;

  if not exists (
    select 1
    from public.company_organization_classifications classification
    where classification.organization_id = new.organization_id
      and classification.classification in ('design_partner','customer')
      and classification.included_in_company_kpis = true
  ) then
    raise exception 'Customer-confirmed value requires an explicitly verified external design partner or customer';
  end if;

  if not exists (
    select 1
    from public.commercial_accounts account
    where account.customer_organization_id = new.organization_id
      and account.qualification_status = 'qualified'
      and account.lifecycle_stage in ('design_partner','customer')
  ) then
    raise exception 'Customer-confirmed value requires a qualified commercial account linked to this organization';
  end if;

  select event.organization_id, event.project_id, event.event_type, event.actor_type, event.occurred_at
    into decision_row
  from public.outcome_ledger_events event
  where event.id = new.confirmed_decision_event_id
    and event.organization_id = new.organization_id
    and event.project_id = new.project_id
    and event.event_type = 'decision'
    and event.actor_type = 'user';

  if decision_row.event_type is null then
    raise exception 'Customer-confirmed value requires a user decision event in the same workspace';
  end if;

  select assessment.organization_id, assessment.project_id, assessment.comparison_eligible,
         assessment.follow_up_run_id, assessment.assessed_at
    into assessment_row
  from public.change_verification_assessments assessment
  where assessment.id = new.confirmed_second_use_assessment_id
    and assessment.organization_id = new.organization_id
    and assessment.project_id = new.project_id
    and assessment.comparison_eligible = true
    and assessment.follow_up_run_id is not null;

  if assessment_row.organization_id is null then
    raise exception 'Customer-confirmed value requires a comparable verified second-use assessment in the same workspace';
  end if;

  if assessment_row.assessed_at < decision_row.occurred_at then
    raise exception 'Customer-confirmed value requires comparable second use after the recorded customer decision';
  end if;

  if new.occurred_at < assessment_row.assessed_at then
    raise exception 'Customer-confirmed value review cannot predate its second-use evidence';
  end if;

  if new.operational_value = '{}'::jsonb and new.economic_value_status <> 'verified' then
    raise exception 'Customer-confirmed value requires an explicit operational or verified economic value basis';
  end if;

  return new;
end;
$$;

drop trigger if exists customer_success_reviews_confirmed_value_validate on public.customer_success_reviews;
create trigger customer_success_reviews_confirmed_value_validate
  before insert on public.customer_success_reviews
  for each row execute function public.validate_customer_confirmed_value_evidence();

revoke all on function public.validate_customer_confirmed_value_evidence() from public, anon, authenticated;

create or replace view public.customer_value_validation_evidence
with (security_invoker = true)
as
select
  review.id as review_id,
  review.organization_id,
  review.project_id,
  review.review_type,
  review.occurred_at as customer_confirmed_at,
  review.confirmed_decision_event_id,
  decision.occurred_at as decision_at,
  review.confirmed_second_use_assessment_id,
  assessment.follow_up_run_id,
  assessment.assessed_at as second_use_assessed_at,
  assessment.verification_state,
  assessment.comparison_eligible,
  review.operational_value,
  review.economic_value_status,
  review.economic_value_amount,
  review.economic_value_currency
from public.customer_success_reviews review
join public.company_organization_classifications classification
  on classification.organization_id = review.organization_id
 and classification.classification in ('design_partner','customer')
 and classification.included_in_company_kpis = true
join public.commercial_accounts account
  on account.customer_organization_id = review.organization_id
 and account.qualification_status = 'qualified'
 and account.lifecycle_stage in ('design_partner','customer')
join public.outcome_ledger_events decision
  on decision.id = review.confirmed_decision_event_id
 and decision.organization_id = review.organization_id
 and decision.project_id = review.project_id
 and decision.event_type = 'decision'
 and decision.actor_type = 'user'
join public.change_verification_assessments assessment
  on assessment.id = review.confirmed_second_use_assessment_id
 and assessment.organization_id = review.organization_id
 and assessment.project_id = review.project_id
 and assessment.comparison_eligible = true
 and assessment.follow_up_run_id is not null
where review.customer_confirmed_value = true
  and assessment.assessed_at >= decision.occurred_at
  and review.occurred_at >= assessment.assessed_at;

revoke all on table public.customer_value_validation_evidence from public, anon, authenticated;
grant select on table public.customer_value_validation_evidence to service_role;

create or replace view public.qualified_paid_pilot_evidence
with (security_invoker = true)
as
select
  account.id as account_id,
  account.customer_organization_id as organization_id,
  account.company_name,
  opportunity.id as opportunity_id,
  opportunity.paid_value_usd,
  opportunity.currency,
  opportunity.revenue_source,
  opportunity.pilot_started_at,
  opportunity.closed_at,
  payment.id as payment_event_id,
  payment.occurred_at as payment_verified_at,
  cycle.id as execution_cycle_id,
  cycle.change_specification_id,
  cycle.started_at as execution_started_at,
  cycle.completed_at as execution_completed_at
from public.commercial_accounts account
join public.company_organization_classifications classification
  on classification.organization_id = account.customer_organization_id
 and classification.classification in ('design_partner','customer')
 and classification.included_in_company_kpis = true
join public.commercial_opportunities opportunity
  on opportunity.account_id = account.id
 and opportunity.commercial_model = 'pilot'
 and opportunity.stage = 'won'
 and opportunity.paid_value_usd > 0
 and opportunity.revenue_source in ('manual_verified','billing_provider')
join public.commercial_events payment
  on payment.account_id = account.id
 and payment.opportunity_id = opportunity.id
 and payment.event_type = 'payment_verified'
join public.design_partner_execution_cycles cycle
  on cycle.organization_id = account.customer_organization_id
 and cycle.lifecycle_state = 'completed'
 and cycle.completed_at is not null
where account.qualification_status = 'qualified'
  and account.lifecycle_stage in ('design_partner','customer')
  and exists (
    select 1 from public.commercial_events pilot_started
    where pilot_started.account_id = account.id
      and pilot_started.opportunity_id = opportunity.id
      and pilot_started.event_type = 'pilot_started'
  )
  and exists (
    select 1 from public.commercial_events pilot_completed
    where pilot_completed.account_id = account.id
      and pilot_completed.opportunity_id = opportunity.id
      and pilot_completed.event_type = 'pilot_completed'
  );

revoke all on table public.qualified_paid_pilot_evidence from public, anon, authenticated;
grant select on table public.qualified_paid_pilot_evidence to service_role;

commit;
