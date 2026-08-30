-- Extend the existing company customer-proof operating system.
-- Do not create a parallel customer truth store and do not seed proof rows.

alter table public.commercial_accounts
  add column if not exists design_partner_application_id uuid references public.design_partner_applications(id) on delete set null;

create unique index if not exists commercial_accounts_design_partner_application_uidx
  on public.commercial_accounts (design_partner_application_id)
  where design_partner_application_id is not null;

-- Keep the original verified commercial lifecycle events and add the missing
-- founder/customer-discovery evidence types required by the PMF loop.
alter table public.commercial_events
  drop constraint if exists commercial_event_type_check;

alter table public.commercial_events
  add constraint commercial_event_type_check check (event_type in (
    'outreach_sent',
    'reply_received',
    'conversation_held',
    'discovery_held',
    'demo_held',
    'pilot_proposal_sent',
    'pilot_started',
    'pilot_completed',
    'payment_verified',
    'renewal_verified',
    'expansion_verified',
    'churn_verified',
    'customer_success_checkpoint',
    'customer_interview',
    'objection_recorded',
    'lost_deal_recorded',
    'feature_request_recorded',
    'use_case_validated',
    'referral_verified'
  ));

-- These remain founder/operator records. Customer browser roles receive no
-- direct access and raw commercial/customer-discovery text must not be mirrored
-- into product analytics.
revoke all on table public.commercial_accounts, public.commercial_events from anon, authenticated;
grant select, insert, update, delete on table public.commercial_accounts, public.commercial_events to service_role;

comment on column public.commercial_accounts.design_partner_application_id is
  'Optional first-party link from an accepted design-partner application into the existing commercial account ledger. No application is auto-converted.';
comment on table public.commercial_events is
  'Service-only first-party commercial and customer-discovery evidence. Records interviews, objections, lost deals, requests, use cases, referrals, verified lifecycle events, and follow-up actions without seeding synthetic proof.';
