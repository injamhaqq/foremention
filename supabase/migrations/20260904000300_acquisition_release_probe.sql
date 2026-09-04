-- Foremention one-time acquisition release probe ledger.
-- Service-role operators explicitly arm an exact deployed build before the public
-- probe route may dispatch a bounded shadow acquisition cycle. The ledger contains
-- no customer/contact data and never authorizes outreach sending.

begin;

create table if not exists public.acquisition_release_probes (
  build_commit text primary key,
  status text not null default 'armed',
  armed_at timestamptz not null default now(),
  expires_at timestamptz not null,
  requested_at timestamptz,
  completed_at timestamptz,
  result jsonb not null default '{}'::jsonb,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint acquisition_release_probes_build_check
    check (build_commit ~ '^[0-9a-f]{40}$'),
  constraint acquisition_release_probes_status_check
    check (status in ('armed','pending','completed','blocked','failed')),
  constraint acquisition_release_probes_result_check
    check (jsonb_typeof(result) = 'object'),
  constraint acquisition_release_probes_expiry_check
    check (expires_at > armed_at and expires_at <= armed_at + interval '30 minutes'),
  constraint acquisition_release_probes_requested_check
    check (status = 'armed' or requested_at is not null),
  constraint acquisition_release_probes_terminal_check
    check (status not in ('completed','blocked','failed') or completed_at is not null),
  constraint acquisition_release_probes_error_check
    check (error_code is null or char_length(error_code) between 3 and 160)
);

create index if not exists acquisition_release_probes_status_expiry_idx
  on public.acquisition_release_probes (status, expires_at);

alter table public.acquisition_release_probes enable row level security;
revoke all on table public.acquisition_release_probes from public;
revoke all on table public.acquisition_release_probes from anon, authenticated;
grant select, insert, update, delete on table public.acquisition_release_probes to service_role;

commit;
