begin;
create or replace view public.customer_value_validation_evidence
with (security_invoker = true)
as
select distinct
  review.id as review_id,
  review.organization_id,
  review.project_id,
  review.review_type,
  review.occurred_at as customer_confirmed_at,
  decision.id as confirmed_decision_event_id,
  decision.occurred_at as decision_at,
  assessment.id as confirmed_second_use_assessment_id,
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
  on decision.organization_id = review.organization_id
 and decision.project_id = review.project_id
 and decision.event_type = 'decision'
 and decision.actor_type = 'user'
 and decision.occurred_at <= review.occurred_at
join public.change_verification_assessments assessment
  on assessment.organization_id = review.organization_id
 and assessment.project_id = review.project_id
 and assessment.comparison_eligible = true
 and assessment.follow_up_run_id is not null
 and assessment.assessed_at >= decision.occurred_at
 and assessment.assessed_at <= review.occurred_at
where review.review_type in ('success_review','qbr','business_value','renewal','expansion','advocacy')
  and (review.operational_value <> '{}'::jsonb or review.economic_value_status = 'verified');
revoke all on table public.customer_value_validation_evidence from public, anon, authenticated;
grant select on table public.customer_value_validation_evidence to service_role;
commit;
