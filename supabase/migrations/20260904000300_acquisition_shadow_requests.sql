-- Durable, service-only execution ledger for repo-authorized acquisition shadow runs.
-- Stores aggregate execution state only; no prospect/contact PII is exposed to browser roles.

begin;

create table if not exists public.acquisition_shadow_requests (
  request_key text primary key,
  release_sha text not null,
  github_run_id text not null,
  github_run_attempt integer not null,
  status text not null default 'requested',
  inngest_event_id text,
  candidate_count integer not null default 0,
  persisted_count integer not null default 0,
  researched_count integer not null default 0,
  qualified_shadow_count integer not null default 0,
  contact_resolved_count integer not null default 0,
  draft_created_count integer not null default 0,
  discovery_credits_used integer not null default 0,
  research_credits_used integer not null default 0,
  contact_credits_used integer not null default 0,
  error_code text,
  requested_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint acquisition_shadow_requests_key_check
    check (request_key ~ '^shadow-[a-f0-9]{12}-[0-9]+-[0-9]+$'),
  constraint acquisition_shadow_requests_release_sha_check
    check (release_sha ~ '^[a-f0-9]{40}$'),
  constraint acquisition_shadow_requests_run_id_check
    check (github_run_id ~ '^[0-9]+$'),
  constraint acquisition_shadow_requests_attempt_check
    check (github_run_attempt between 1 and 1000),
  constraint acquisition_shadow_requests_status_check
    check (status in ('requested','running','disabled','provider_unavailable','schema_unavailable','shadow_drafted','failed')),
  constraint acquisition_shadow_requests_counts_check
    check (
      candidate_count >= 0 and persisted_count >= 0 and researched_count >= 0
      and qualified_shadow_count >= 0 and contact_resolved_count >= 0 and draft_created_count >= 0
    ),
  constraint acquisition_shadow_requests_credits_check
    check (discovery_credits_used >= 0 and research_credits_used >= 0 and contact_credits_used >= 0),
  constraint acquisition_shadow_requests_error_check
    check (error_code is null or char_length(error_code) <= 200)
);

create unique index if not exists acquisition_shadow_requests_release_run_attempt_unique
  on public.acquisition_shadow_requests (release_sha, github_run_id, github_run_attempt);
create index if not exists acquisition_shadow_requests_recent_idx
  on public.acquisition_shadow_requests (requested_at desc);

alter table public.acquisition_shadow_requests enable row level security;
revoke all on table public.acquisition_shadow_requests from public;
revoke all on table public.acquisition_shadow_requests from anon, authenticated;
grant select, insert, update, delete on table public.acquisition_shadow_requests to service_role;

commit;
