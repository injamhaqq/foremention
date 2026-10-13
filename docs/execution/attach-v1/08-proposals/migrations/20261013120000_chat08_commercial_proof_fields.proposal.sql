-- PROPOSAL ONLY (Chat08, 2026-10-13). NOT a migration; not on the replay path.
-- FM-00 decides naming/timestamp and moves it into supabase/migrations/ if accepted.
-- Scratch check: applied after a PGlite replay of all 97 repo migrations; probe
-- verification/commercial-proposal-probe.mjs. Re-run on the composed candidate before adoption.

begin;

-- 1. Founder service-time log (CV-13). Service-only; no browser grants.
create table if not exists public.commercial_service_time_entries (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.commercial_accounts(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  account_kind text not null check (account_kind in ('external_customer','prospect','internal','test','research')),
  category text not null check (category in ('acquisition','research_interview','onboarding_setup','evidence_review',
    'support','comparison','incident','retention_review','reporting','admin_internal')),
  minutes integer not null check (minutes between 1 and 1440),
  cash_cost_cents bigint check (cash_cost_cents is null or cash_cost_cents >= 0),
  cash_cost_ref text check (cash_cost_ref is null or char_length(cash_cost_ref) <= 500),
  note text check (note is null or char_length(note) <= 2000),
  occurred_at timestamptz not null, -- future dates rejected by summarizeServiceTime(); no volatile CHECK (dump/restore safety)
  recorded_by uuid,
  created_at timestamptz not null default now(),
  check (cash_cost_cents is null or cash_cost_ref is not null)
);
create index if not exists commercial_service_time_entries_org_time_idx
  on public.commercial_service_time_entries (organization_id, occurred_at desc);
alter table public.commercial_service_time_entries enable row level security;
revoke all on table public.commercial_service_time_entries from public, anon, authenticated;
grant select, insert, update, delete on table public.commercial_service_time_entries to service_role;

-- 2. Interview confirmation fields (CV-09).
alter table public.market_research_interviews
  add column if not exists participant_confirmed boolean not null default false,
  add column if not exists urgent_job boolean,
  add column if not exists current_spend_documented boolean,
  add column if not exists current_spend_detail text check (current_spend_detail is null or char_length(current_spend_detail) <= 2000);

-- 3. Event types: UNION of all 29 current values (20260901000100) plus Chat08 additions.
alter table public.commercial_events drop constraint if exists commercial_event_type_check;
alter table public.commercial_events add constraint commercial_event_type_check check (event_type in (
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
    'referral_verified',
    'scoped_offer_delivered',
    'pilot_agreement_signed',
    'continuation_decided',
    'case_study_consent_granted',
    'case_study_consent_revoked'
  ));

alter table public.commercial_events
  add column if not exists continuation_outcome text
    check (continuation_outcome is null or continuation_outcome in ('continue','renew','expand','refer','cancel','lost'));
alter table public.commercial_events
  add constraint commercial_events_continuation_outcome_required
  check (event_type <> 'continuation_decided' or continuation_outcome is not null) not valid;

-- 4. Scoped, voluntary case-study consent.
create table if not exists public.commercial_case_study_consents (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.commercial_accounts(id) on delete cascade,
  voluntary boolean not null check (voluntary = true),
  scopes text[] not null check (cardinality(scopes) > 0 and scopes <@ array['anonymized_metrics','named_quote','logo','case_study','public_review']::text[]),
  approved_text_version text not null check (char_length(approved_text_version) between 1 and 200),
  revocation_contact text not null check (char_length(revocation_contact) between 3 and 320),
  evidence_ref text not null check (char_length(evidence_ref) between 8 and 500),
  granted_at timestamptz not null,
  revoked_at timestamptz check (revoked_at is null or revoked_at >= granted_at),
  created_at timestamptz not null default now()
);
alter table public.commercial_case_study_consents enable row level security;
revoke all on table public.commercial_case_study_consents from public, anon, authenticated;
grant select, insert, update, delete on table public.commercial_case_study_consents to service_role;

commit;

-- Rollback:
-- drop table if exists public.commercial_case_study_consents;
-- alter table public.commercial_events drop constraint if exists commercial_events_continuation_outcome_required;
-- alter table public.commercial_events drop column if exists continuation_outcome;
-- (restore the 29-value commercial_event_type_check from 20260901000100 after confirming no rows use new types)
-- alter table public.market_research_interviews drop column if exists participant_confirmed, drop column if exists urgent_job,
--   drop column if exists current_spend_documented, drop column if exists current_spend_detail;
-- drop table if exists public.commercial_service_time_entries;
