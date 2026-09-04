-- Foremention acquisition research provenance + deterministic dedupe.
-- Shadow mode only: this migration records public-source research and qualification
-- evidence. It does not send outreach, create opportunities, or promote lifecycle truth.

begin;

alter table public.commercial_accounts
  add column if not exists canonical_company_key text;

alter table public.commercial_accounts
  add constraint commercial_accounts_canonical_company_key_check
  check (
    canonical_company_key is null
    or canonical_company_key ~ '^[a-z0-9][a-z0-9.-]{1,253}[a-z0-9]$'
  ) not valid;

create unique index if not exists commercial_accounts_canonical_company_key_uidx
  on public.commercial_accounts (canonical_company_key)
  where canonical_company_key is not null;

create table if not exists public.acquisition_research_runs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.commercial_accounts(id) on delete cascade,
  run_key text not null unique,
  canonical_company_key text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  qualification_score smallint not null check (qualification_score between 0 and 100),
  qualification_reasons text[] not null default '{}'::text[],
  score_breakdown jsonb not null default '{}'::jsonb,
  why_now text,
  disqualifiers text[] not null default '{}'::text[],
  qualified_shadow boolean not null default false,
  created_at timestamptz not null default now(),
  constraint acquisition_research_runs_key_check
    check (char_length(run_key) between 8 and 200),
  constraint acquisition_research_runs_company_key_check
    check (canonical_company_key ~ '^[a-z0-9][a-z0-9.-]{1,253}[a-z0-9]$'),
  constraint acquisition_research_runs_score_breakdown_check
    check (jsonb_typeof(score_breakdown) = 'object'),
  constraint acquisition_research_runs_why_now_check
    check (why_now is null or char_length(btrim(why_now)) between 3 and 1000),
  constraint acquisition_research_runs_shadow_gate_check
    check (
      qualified_shadow = false
      or (
        qualification_score >= 75
        and why_now is not null
        and char_length(btrim(why_now)) >= 3
        and cardinality(disqualifiers) = 0
        and completed_at is not null
      )
    )
);

create table if not exists public.acquisition_research_evidence (
  id uuid primary key default gen_random_uuid(),
  research_run_id uuid not null references public.acquisition_research_runs(id) on delete cascade,
  source_url text not null,
  retrieved_at timestamptz not null,
  evidence_key text not null,
  evidence_value text not null,
  confidence smallint not null check (confidence between 0 and 100),
  created_at timestamptz not null default now(),
  constraint acquisition_research_evidence_source_url_check
    check (source_url ~ '^https://'),
  constraint acquisition_research_evidence_key_check
    check (char_length(evidence_key) between 2 and 120),
  constraint acquisition_research_evidence_value_check
    check (char_length(evidence_value) between 1 and 4000),
  constraint acquisition_research_evidence_not_future_check
    check (retrieved_at <= created_at + interval '5 minutes'),
  unique (research_run_id, source_url, evidence_key)
);

create index if not exists acquisition_research_runs_account_idx
  on public.acquisition_research_runs (account_id, created_at desc);
create index if not exists acquisition_research_evidence_run_retrieved_idx
  on public.acquisition_research_evidence (research_run_id, retrieved_at desc);

alter table public.acquisition_research_runs enable row level security;
alter table public.acquisition_research_evidence enable row level security;

-- Acquisition research is a company-operator truth surface, not customer workspace
-- data. Keep it unavailable to browser roles and accessible only through service-role
-- operator workflows, matching the existing commercial truth-store boundary.
revoke all on table public.acquisition_research_runs, public.acquisition_research_evidence from public;
revoke all on table public.acquisition_research_runs, public.acquisition_research_evidence from anon, authenticated;
grant select, insert, update, delete on table public.acquisition_research_runs, public.acquisition_research_evidence to service_role;

-- Eligibility is computed from provenance at read time. A candidate cannot appear in
-- this view when it has no public evidence or when every source is stale (>30 days).
-- This view never mutates commercial_accounts.lifecycle_stage or qualification_status.
create or replace view public.acquisition_shadow_qualified_candidates as
select
  r.id as research_run_id,
  r.account_id,
  r.canonical_company_key,
  r.qualification_score,
  r.qualification_reasons,
  r.score_breakdown,
  r.why_now,
  r.completed_at,
  max(e.retrieved_at) as freshest_evidence_at,
  count(*) filter (where e.retrieved_at >= now() - interval '30 days') as fresh_source_count
from public.acquisition_research_runs r
join public.acquisition_research_evidence e on e.research_run_id = r.id
where r.qualified_shadow = true
  and r.qualification_score >= 75
  and cardinality(r.disqualifiers) = 0
  and r.why_now is not null
  and e.retrieved_at >= now() - interval '30 days'
group by
  r.id,
  r.account_id,
  r.canonical_company_key,
  r.qualification_score,
  r.qualification_reasons,
  r.score_breakdown,
  r.why_now,
  r.completed_at;

revoke all on table public.acquisition_shadow_qualified_candidates from public;
revoke all on table public.acquisition_shadow_qualified_candidates from anon, authenticated;
grant select on table public.acquisition_shadow_qualified_candidates to service_role;

commit;
