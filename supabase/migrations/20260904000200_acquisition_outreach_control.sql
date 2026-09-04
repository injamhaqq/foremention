-- Foremention acquisition outreach control plane.
-- Service-only. Adds verified contact-route state, evidence-linked drafts,
-- suppression, sequence idempotency, provider correlation, and first-party reply classification.
-- It does not manufacture replies, conversations, customers, design partners, or revenue.

begin;

alter table public.commercial_contacts
  add column if not exists contact_route_status text not null default 'unverified';
alter table public.commercial_contacts
  add column if not exists contact_source_url text;
alter table public.commercial_contacts
  add column if not exists contact_verified_at timestamptz;
alter table public.commercial_contacts
  add column if not exists acquisition_contact_key text;
alter table public.commercial_contacts
  drop constraint if exists commercial_contacts_route_status_check;
alter table public.commercial_contacts
  add constraint commercial_contacts_route_status_check
  check (contact_route_status in ('unverified','verified','invalid','suppressed')) not valid;
alter table public.commercial_contacts
  drop constraint if exists commercial_contacts_verified_route_check;
alter table public.commercial_contacts
  add constraint commercial_contacts_verified_route_check
  check (
    contact_route_status <> 'verified'
    or (
      email is not null
      and contact_source_url ~ '^https://'
      and contact_verified_at is not null
    )
  ) not valid;
alter table public.commercial_contacts
  drop constraint if exists commercial_contacts_acquisition_contact_key_check;
alter table public.commercial_contacts
  add constraint commercial_contacts_acquisition_contact_key_check
  check (acquisition_contact_key is null or acquisition_contact_key ~ '^acq-contact-[a-f0-9]{16}$') not valid;

create unique index if not exists commercial_contacts_acquisition_contact_key_unique
  on public.commercial_contacts (acquisition_contact_key)
  where acquisition_contact_key is not null;

create table if not exists public.acquisition_outreach_drafts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.commercial_accounts(id) on delete cascade,
  contact_id uuid not null references public.commercial_contacts(id) on delete cascade,
  research_run_id uuid not null references public.acquisition_research_runs(id) on delete cascade,
  draft_key text not null unique,
  subject text not null,
  body text not null,
  claim_sources jsonb not null default '[]'::jsonb,
  status text not null default 'draft',
  approved_at timestamptz,
  approved_by uuid,
  sent_at timestamptz,
  transport text,
  external_reference text,
  provider_message_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint acquisition_outreach_drafts_key_check check (char_length(draft_key) between 8 and 200),
  constraint acquisition_outreach_drafts_subject_check check (char_length(btrim(subject)) between 1 and 160),
  constraint acquisition_outreach_drafts_body_check check (char_length(btrim(body)) between 1 and 20000),
  constraint acquisition_outreach_drafts_claim_sources_check check (jsonb_typeof(claim_sources) = 'array'),
  constraint acquisition_outreach_drafts_status_check check (status in ('draft','approved','suppressed','sent','failed')),
  constraint acquisition_outreach_drafts_approval_check check (status <> 'approved' or approved_at is not null),
  constraint acquisition_outreach_drafts_sent_check check (
    status <> 'sent'
    or (
      approved_at is not null
      and sent_at is not null
      and transport is not null
      and external_reference is not null
    )
  )
);

create unique index if not exists acquisition_outreach_drafts_external_reference_unique
  on public.acquisition_outreach_drafts (external_reference)
  where external_reference is not null;
create unique index if not exists acquisition_outreach_drafts_provider_message_id_unique
  on public.acquisition_outreach_drafts (provider_message_id)
  where provider_message_id is not null;

create table if not exists public.acquisition_suppressions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.commercial_accounts(id) on delete cascade,
  contact_id uuid not null unique references public.commercial_contacts(id) on delete cascade,
  reason text not null,
  source_system text not null default 'operator',
  source_reference text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  lifted_at timestamptz,
  constraint acquisition_suppressions_reason_check check (reason in ('unsubscribe','bounce','complaint','provider_suppressed','negative_intent','reply_received','manual')),
  constraint acquisition_suppressions_lift_check check ((active = true and lifted_at is null) or (active = false and lifted_at is not null))
);

create table if not exists public.acquisition_sequence_enrollments (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.commercial_accounts(id) on delete cascade,
  contact_id uuid not null references public.commercial_contacts(id) on delete cascade,
  draft_id uuid not null references public.acquisition_outreach_drafts(id) on delete cascade,
  provider text not null,
  external_prospect_id text,
  external_sequence_id text,
  idempotency_key text not null unique,
  status text not null default 'queued',
  enrolled_at timestamptz,
  stopped_at timestamptz,
  stop_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint acquisition_sequence_enrollments_provider_check check (char_length(btrim(provider)) between 2 and 80),
  constraint acquisition_sequence_enrollments_idempotency_check check (char_length(idempotency_key) between 8 and 200),
  constraint acquisition_sequence_enrollments_status_check check (status in ('queued','enrolled','paused','stopped','failed')),
  constraint acquisition_sequence_enrollments_enrolled_check check (status <> 'enrolled' or enrolled_at is not null),
  constraint acquisition_sequence_enrollments_stopped_check check (status <> 'stopped' or stopped_at is not null)
);

create unique index if not exists acquisition_sequence_enrollments_draft_provider_unique
  on public.acquisition_sequence_enrollments (draft_id, provider);

create table if not exists public.acquisition_reply_events (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.commercial_accounts(id) on delete cascade,
  contact_id uuid not null references public.commercial_contacts(id) on delete cascade,
  enrollment_id uuid references public.acquisition_sequence_enrollments(id) on delete set null,
  external_reference text not null unique,
  classification text not null constraint acquisition_reply_events_classification_check check (classification in ('positive','referral','question','objection','timing','not_relevant','unsubscribe','bounce')),
  evidence_excerpt text,
  received_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint acquisition_reply_events_reference_check check (char_length(btrim(external_reference)) between 4 and 300),
  constraint acquisition_reply_events_excerpt_check check (evidence_excerpt is null or char_length(evidence_excerpt) <= 2000)
);

create table if not exists public.acquisition_outreach_webhook_events (
  id uuid primary key default gen_random_uuid(),
  svix_id text not null unique,
  event_type text not null,
  provider_email_id text,
  event_created_at timestamptz not null,
  processed_at timestamptz not null default now(),
  outcome text not null default 'processed',
  created_at timestamptz not null default now(),
  constraint acquisition_outreach_webhook_events_svix_id_check check (char_length(btrim(svix_id)) between 8 and 300),
  constraint acquisition_outreach_webhook_events_type_check check (char_length(btrim(event_type)) between 3 and 100),
  constraint acquisition_outreach_webhook_events_outcome_check check (outcome in ('processed','ignored','duplicate','failed'))
);

create index if not exists acquisition_outreach_drafts_review_idx
  on public.acquisition_outreach_drafts (status, created_at desc);
create index if not exists acquisition_suppressions_active_idx
  on public.acquisition_suppressions (active, contact_id);
create index if not exists acquisition_sequence_enrollments_contact_idx
  on public.acquisition_sequence_enrollments (contact_id, status);
create index if not exists acquisition_reply_events_contact_received_idx
  on public.acquisition_reply_events (contact_id, received_at desc);
create index if not exists acquisition_outreach_webhook_events_email_idx
  on public.acquisition_outreach_webhook_events (provider_email_id, event_created_at desc)
  where provider_email_id is not null;

alter table public.acquisition_outreach_drafts enable row level security;
alter table public.acquisition_suppressions enable row level security;
alter table public.acquisition_sequence_enrollments enable row level security;
alter table public.acquisition_reply_events enable row level security;
alter table public.acquisition_outreach_webhook_events enable row level security;

revoke all on table
  public.acquisition_outreach_drafts,
  public.acquisition_suppressions,
  public.acquisition_sequence_enrollments,
  public.acquisition_reply_events,
  public.acquisition_outreach_webhook_events
from public;
revoke all on table
  public.acquisition_outreach_drafts,
  public.acquisition_suppressions,
  public.acquisition_sequence_enrollments,
  public.acquisition_reply_events,
  public.acquisition_outreach_webhook_events
from anon, authenticated;
grant select, insert, update, delete on table
  public.acquisition_outreach_drafts,
  public.acquisition_suppressions,
  public.acquisition_sequence_enrollments,
  public.acquisition_reply_events,
  public.acquisition_outreach_webhook_events
to service_role;

commit;
