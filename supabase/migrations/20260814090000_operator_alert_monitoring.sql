begin;

create table public.operator_alert_config (
  singleton boolean primary key default true check (singleton),
  recipient_email text not null check (recipient_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.operator_alert_deliveries (
  id uuid primary key default gen_random_uuid(),
  build_commit text not null unique check (build_commit ~ '^[0-9a-f]{40}$'),
  status text not null default 'pending' check (status in ('pending','sent','failed')),
  attempt_count integer not null default 1 check (attempt_count between 1 and 3),
  requested_at timestamptz not null default now(),
  sent_at timestamptz,
  provider_delivery_hash text check (provider_delivery_hash is null or provider_delivery_hash ~ '^[0-9a-f]{64}$'),
  error_code text check (error_code is null or error_code ~ '^[a-z0-9_:-]{1,80}$'),
  updated_at timestamptz not null default now()
);

create index operator_alert_deliveries_status_idx
  on public.operator_alert_deliveries(status, requested_at desc);

alter table public.operator_alert_config enable row level security;
alter table public.operator_alert_deliveries enable row level security;

revoke all on table public.operator_alert_config from anon, authenticated;
revoke all on table public.operator_alert_deliveries from anon, authenticated;
grant select on table public.operator_alert_config to service_role;
grant select, insert, update on table public.operator_alert_deliveries to service_role;

comment on table public.operator_alert_config is 'Service-only operational alert recipient configuration. Never exposed to browser roles.';
comment on table public.operator_alert_deliveries is 'Service-only, customer-data-free evidence that one controlled operator alert was attempted per deployed build.';

commit;
