begin;
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
  and exists (select 1 from public.commercial_events e where e.account_id=account.id and e.opportunity_id=opportunity.id and e.event_type='pilot_started')
  and exists (select 1 from public.commercial_events e where e.account_id=account.id and e.opportunity_id=opportunity.id and e.event_type='pilot_completed');
revoke all on table public.qualified_paid_pilot_evidence from public, anon, authenticated;
grant select on table public.qualified_paid_pilot_evidence to service_role;
commit;
