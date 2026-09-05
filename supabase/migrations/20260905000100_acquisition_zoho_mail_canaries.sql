create table if not exists public.acquisition_zoho_mail_canaries (
  id uuid primary key default gen_random_uuid(),
  canary_key text not null unique,
  recipient_email text not null,
  sender_email text not null,
  status text not null default 'requested' check (status in ('requested', 'sent', 'reply_received', 'send_uncertain')),
  provider_message_id text,
  zoho_message_id text,
  sent_at timestamptz,
  replied_at timestamptz,
  reply_message_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists acquisition_zoho_mail_canaries_status_created_idx
  on public.acquisition_zoho_mail_canaries (status, created_at desc);

alter table public.acquisition_zoho_mail_canaries enable row level security;

revoke all on table public.acquisition_zoho_mail_canaries from anon, authenticated;
grant select, insert, update, delete on table public.acquisition_zoho_mail_canaries to service_role;
