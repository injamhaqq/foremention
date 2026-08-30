-- Foremention billing commercial hardening.
-- Additive: keeps the existing verified-event receipt and entitlement stores,
-- adds opt-in grace expiry plus immutable billing state history.

begin;

alter table public.billing_accounts
  add column if not exists grace_period_ends_at timestamptz;

create table if not exists public.billing_state_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null check (char_length(provider) between 1 and 80),
  event_id text not null check (char_length(event_id) between 1 and 160),
  previous_state text check (previous_state is null or previous_state in ('unconfigured','trialing','active','past_due','paused','cancelled')),
  state text not null check (state in ('trialing','active','past_due','paused','cancelled')),
  package_key text not null check (package_key in ('core','signal','intelligence','custom')),
  entitlement_status text not null check (entitlement_status in ('active','paused','cancelled')),
  entitlement_expires_at timestamptz,
  grace_period_ends_at timestamptz,
  external_customer_id text,
  external_subscription_id text,
  effective_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (provider, event_id)
);

create index if not exists billing_state_history_org_idx
  on public.billing_state_history (organization_id, effective_at desc);

alter table public.billing_state_history enable row level security;
create policy "billing_state_history_select_member" on public.billing_state_history
  for select using (public.is_org_member(organization_id));
grant select on public.billing_state_history to authenticated;

create or replace function public.prevent_billing_history_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'billing state history is immutable';
end;
$$;

create trigger billing_state_history_immutable
  before update or delete on public.billing_state_history
  for each row execute function public.prevent_billing_history_mutation();

create or replace function public.apply_billing_event_atomic_v2(
  p_provider text,
  p_event_id text,
  p_organization_id uuid,
  p_package_key text,
  p_state text,
  p_legacy_status text,
  p_feature_keys text[],
  p_external_customer_id text default null,
  p_external_subscription_id text default null,
  p_entitlement_expires_at timestamptz default null,
  p_grace_period_ends_at timestamptz default null,
  p_effective_at timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_receipt_exists boolean := false;
  v_previous_state text := null;
  v_existing_grace timestamptz := null;
  v_grace_end timestamptz := null;
  v_entitlement_expiry timestamptz := null;
  v_entitlement_status text := p_legacy_status;
begin
  if p_provider is null or char_length(p_provider) not between 1 and 80 then
    raise exception 'invalid billing provider';
  end if;
  if p_event_id is null or char_length(p_event_id) not between 1 and 160 then
    raise exception 'invalid billing event id';
  end if;
  if p_organization_id is null then
    raise exception 'invalid billing organization';
  end if;
  if p_package_key not in ('core','signal','intelligence','custom') then
    raise exception 'invalid billing package';
  end if;
  if p_state not in ('trialing','active','past_due','paused','cancelled') then
    raise exception 'invalid billing state';
  end if;
  if p_legacy_status not in ('active','paused','cancelled') then
    raise exception 'invalid entitlement status';
  end if;
  if p_feature_keys is null then
    raise exception 'billing feature keys are required';
  end if;

  select true
    into v_receipt_exists
    from public.billing_webhook_events
   where provider = p_provider
     and event_id = p_event_id
     and organization_id = p_organization_id
     and processed_at is null
   for update;

  if not coalesce(v_receipt_exists, false) then
    return false;
  end if;

  select state, grace_period_ends_at
    into v_previous_state, v_existing_grace
    from public.billing_accounts
   where organization_id = p_organization_id
   for update;

  if p_state = 'past_due' and p_grace_period_ends_at is not null then
    if v_previous_state = 'past_due' and v_existing_grace is not null then
      v_grace_end := v_existing_grace;
    else
      v_grace_end := p_grace_period_ends_at;
    end if;
    v_entitlement_expiry := v_grace_end;
    v_entitlement_status := 'active';
  elsif p_state = 'past_due' then
    v_grace_end := null;
    v_entitlement_expiry := null;
    v_entitlement_status := 'paused';
  else
    v_grace_end := null;
    v_entitlement_expiry := p_entitlement_expires_at;
  end if;

  insert into public.billing_accounts (
    organization_id,
    provider,
    external_customer_id,
    external_subscription_id,
    state,
    verified_webhook_at,
    grace_period_ends_at
  ) values (
    p_organization_id,
    p_provider,
    nullif(p_external_customer_id, ''),
    nullif(p_external_subscription_id, ''),
    p_state,
    p_effective_at,
    v_grace_end
  )
  on conflict (organization_id) do update set
    provider = excluded.provider,
    external_customer_id = coalesce(excluded.external_customer_id, public.billing_accounts.external_customer_id),
    external_subscription_id = coalesce(excluded.external_subscription_id, public.billing_accounts.external_subscription_id),
    state = excluded.state,
    verified_webhook_at = excluded.verified_webhook_at,
    grace_period_ends_at = excluded.grace_period_ends_at;

  insert into public.organization_entitlements (
    organization_id,
    plan,
    status,
    package_key,
    feature_keys,
    billing_source,
    effective_at,
    expires_at
  ) values (
    p_organization_id,
    'free_beta',
    v_entitlement_status,
    p_package_key,
    p_feature_keys,
    p_provider,
    p_effective_at,
    v_entitlement_expiry
  )
  on conflict (organization_id) do update set
    status = excluded.status,
    package_key = excluded.package_key,
    feature_keys = excluded.feature_keys,
    billing_source = excluded.billing_source,
    effective_at = excluded.effective_at,
    expires_at = excluded.expires_at;

  insert into public.billing_state_history (
    organization_id,
    provider,
    event_id,
    previous_state,
    state,
    package_key,
    entitlement_status,
    entitlement_expires_at,
    grace_period_ends_at,
    external_customer_id,
    external_subscription_id,
    effective_at
  ) values (
    p_organization_id,
    p_provider,
    p_event_id,
    v_previous_state,
    p_state,
    p_package_key,
    v_entitlement_status,
    v_entitlement_expiry,
    v_grace_end,
    nullif(p_external_customer_id, ''),
    nullif(p_external_subscription_id, ''),
    p_effective_at
  );

  update public.billing_webhook_events
     set processed_at = p_effective_at
   where provider = p_provider
     and event_id = p_event_id
     and organization_id = p_organization_id
     and processed_at is null;

  return true;
end;
$$;

revoke all on function public.prevent_billing_history_mutation() from public, anon, authenticated;
revoke all on function public.apply_billing_event_atomic_v2(text,text,uuid,text,text,text,text[],text,text,timestamptz,timestamptz,timestamptz) from public, anon, authenticated;
grant execute on function public.apply_billing_event_atomic_v2(text,text,uuid,text,text,text,text[],text,text,timestamptz,timestamptz,timestamptz) to service_role;

comment on table public.billing_state_history is
  'Immutable audit history derived only from verified billing events.';
comment on function public.apply_billing_event_atomic_v2(text,text,uuid,text,text,text,text[],text,text,timestamptz,timestamptz,timestamptz) is
  'Service-only atomic billing application with fail-closed entitlement expiry, grace preservation, and immutable audit history.';

commit;
