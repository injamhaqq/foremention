-- Durable billing webhook receipts.
-- Service-role only: customer sessions must never be able to read or mutate provider event ids.

create table if not exists public.billing_webhook_events (
  provider text not null check (char_length(provider) between 1 and 80),
  event_id text not null check (char_length(event_id) between 1 and 160),
  organization_id uuid references public.organizations(id) on delete set null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  primary key (provider, event_id)
);

create index if not exists billing_webhook_events_received_at_idx
  on public.billing_webhook_events (received_at desc);

alter table public.billing_webhook_events enable row level security;

comment on table public.billing_webhook_events is
  'Service-only idempotency receipts for verified billing-provider events. No authenticated or anonymous table policy is granted.';
