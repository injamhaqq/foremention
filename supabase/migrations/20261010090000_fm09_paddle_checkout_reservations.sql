-- FM-09: additive Paddle sandbox checkout and adjustment integrity spine.
-- STAGED DRAFT ONLY. FM-05 owns migration review. No production billing unlock.
begin;

-- A provider may accept a create transaction even if its HTTP response is lost.
-- No automatic lease expiration: a still-payable checkout must be reconciled
-- with Paddle before its organization's checkout reservation is reopened.
create table if not exists public.billing_checkout_reservations (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null check (provider = 'paddle'),
  package_key text not null check (package_key in ('core', 'signal')),
  billing_interval text not null check (billing_interval in ('monthly', 'annual')),
  state text not null default 'reserved'
    check (state in ('reserved', 'ready', 'uncertain', 'reconciled')),
  external_transaction_id text check (
    external_transaction_id is null
    or external_transaction_id ~ '^txn_[a-z0-9]{26}$'
  ),
  checkout_url text,
  reconciliation_evidence text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((state <> 'ready') or (external_transaction_id is not null and checkout_url is not null)),
  check (state <> 'reconciled' or nullif(reconciliation_evidence, '') is not null)
);

-- One unresolved/payable transaction per organization, enforced across workers.
create unique index if not exists billing_checkout_unresolved_org_uidx
  on public.billing_checkout_reservations (organization_id)
  where state <> 'reconciled';
create unique index if not exists billing_checkout_provider_transaction_uidx
  on public.billing_checkout_reservations (provider, external_transaction_id)
  where external_transaction_id is not null;
create index if not exists billing_checkout_unresolved_created_idx
  on public.billing_checkout_reservations (created_at)
  where state <> 'reconciled';

alter table public.billing_checkout_reservations enable row level security;
revoke all on public.billing_checkout_reservations from public, anon, authenticated;
grant select, insert, update on public.billing_checkout_reservations to service_role;

create trigger billing_checkout_reservations_updated_at
  before update on public.billing_checkout_reservations
  for each row execute function public.set_updated_at();

create or replace function public.reserve_paddle_checkout(
  p_reservation_id uuid,
  p_organization_id uuid,
  p_package_key text,
  p_billing_interval text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_billing_state text;
  v_ent_status text;
  v_ent_expires_at timestamptz;
  v_rows integer := 0;
begin
  if p_reservation_id is null or p_organization_id is null
      or p_package_key not in ('core', 'signal')
      or p_billing_interval not in ('monthly', 'annual') then
    raise exception 'invalid Paddle reservation';
  end if;

  -- Serialize concurrent requests against the same organization row.
  select id into v_org_id from public.organizations
    where id = p_organization_id for update;
  if v_org_id is null then return false; end if;

  select state into v_billing_state
    from public.billing_accounts where organization_id = p_organization_id;
  select status, expires_at into v_ent_status, v_ent_expires_at
    from public.organization_entitlements where organization_id = p_organization_id;

  if v_billing_state in ('trialing', 'active', 'past_due', 'paused') then
    return false;
  end if;
  if v_billing_state = 'cancelled'
      and v_ent_status = 'active'
      and (v_ent_expires_at is null or v_ent_expires_at > now()) then
    return false;
  end if;

  insert into public.billing_checkout_reservations
    (id, organization_id, provider, package_key, billing_interval, state)
  values
    (p_reservation_id, p_organization_id, 'paddle',
     p_package_key, p_billing_interval, 'reserved')
  on conflict do nothing;
  get diagnostics v_rows = row_count;
  return v_rows = 1;
end;
$$;

create or replace function public.record_paddle_checkout_session(
  p_reservation_id uuid,
  p_organization_id uuid,
  p_transaction_id text,
  p_checkout_url text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows integer := 0;
begin
  if p_reservation_id is null or p_organization_id is null
    or p_transaction_id !~ '^txn_[a-z0-9]{26}$'
    or p_checkout_url is null or p_checkout_url !~ '^https://' then
    raise exception 'invalid Paddle checkout result';
  end if;
  update public.billing_checkout_reservations
     set state = 'ready', external_transaction_id = p_transaction_id,
         checkout_url = p_checkout_url
   where id = p_reservation_id
     and organization_id = p_organization_id
     and provider = 'paddle'
     and state = 'reserved';
  get diagnostics v_rows = row_count;
  return v_rows = 1;
end;
$$;

create or replace function public.mark_paddle_checkout_uncertain(
  p_reservation_id uuid,
  p_organization_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows integer := 0;
begin
  if p_reservation_id is null or p_organization_id is null then
    raise exception 'invalid Paddle checkout reservation';
  end if;
  update public.billing_checkout_reservations
     set state = 'uncertain'
   where id = p_reservation_id
     and organization_id = p_organization_id
     and provider = 'paddle'
     and state = 'reserved';
  get diagnostics v_rows = row_count;
  return v_rows = 1;
end;
$$;

revoke all on function public.reserve_paddle_checkout(uuid, uuid, text, text)
  from public, anon, authenticated;
revoke all on function public.record_paddle_checkout_session(uuid, uuid, text, text)
  from public, anon, authenticated;
revoke all on function public.mark_paddle_checkout_uncertain(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.reserve_paddle_checkout(uuid, uuid, text, text) to service_role;
grant execute on function public.record_paddle_checkout_session(uuid, uuid, text, text) to service_role;
grant execute on function public.mark_paddle_checkout_uncertain(uuid, uuid) to service_role;

-- Financial cases are a separate, append-only audit stream. Refund/dispute
-- classification NEVER mutates organization_entitlements directly.
create table if not exists public.billing_financial_adjustment_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null check (provider = 'paddle'),
  event_id text not null check (char_length(event_id) between 1 and 160),
  adjustment_id text not null check (adjustment_id ~ '^adj_[a-z0-9]{26}$'),
  transaction_id text not null check (transaction_id ~ '^txn_[a-z0-9]{26}$'),
  external_subscription_id text,
  external_customer_id text not null check (external_customer_id ~ '^ctm_[a-z0-9]{26}$'),
  action text not null check (action in (
    'credit', 'refund', 'chargeback', 'chargeback_reverse',
    'chargeback_warning', 'chargeback_warning_reverse', 'credit_reverse'
  )),
  status text not null check (status in ('pending_approval', 'approved', 'rejected', 'reversed')),
  adjustment_type text check (adjustment_type is null or adjustment_type in ('full', 'partial')),
  event_type text not null check (event_type in ('adjustment.created', 'adjustment.updated')),
  occurred_at timestamptz not null,
  review_status text not null default 'review_required' check (review_status = 'review_required'),
  received_at timestamptz not null default now(),
  unique (provider, event_id)
);
create index if not exists billing_financial_adjustment_org_idx
  on public.billing_financial_adjustment_events (organization_id, occurred_at desc);
alter table public.billing_financial_adjustment_events enable row level security;
revoke all on public.billing_financial_adjustment_events from public, anon, authenticated;
grant select, insert on public.billing_financial_adjustment_events to service_role;
comment on table public.billing_financial_adjustment_events is
  'Verified provider adjustment receipts only; every refund/dispute case requires separate reviewed policy before entitlement mutation.';

commit;
