create or replace function public.apply_billing_event_atomic(
  p_provider text,
  p_event_id text,
  p_organization_id uuid,
  p_package_key text,
  p_state text,
  p_legacy_status text,
  p_feature_keys text[],
  p_external_customer_id text default null,
  p_external_subscription_id text default null,
  p_effective_at timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_receipt_exists boolean := false;
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

  insert into public.billing_accounts (
    organization_id,
    provider,
    external_customer_id,
    external_subscription_id,
    state,
    verified_webhook_at
  ) values (
    p_organization_id,
    p_provider,
    nullif(p_external_customer_id, ''),
    nullif(p_external_subscription_id, ''),
    p_state,
    p_effective_at
  )
  on conflict (organization_id) do update set
    provider = excluded.provider,
    external_customer_id = excluded.external_customer_id,
    external_subscription_id = excluded.external_subscription_id,
    state = excluded.state,
    verified_webhook_at = excluded.verified_webhook_at;

  insert into public.organization_entitlements (
    organization_id,
    plan,
    status,
    package_key,
    feature_keys,
    billing_source,
    effective_at
  ) values (
    p_organization_id,
    'free_beta',
    p_legacy_status,
    p_package_key,
    p_feature_keys,
    p_provider,
    p_effective_at
  )
  on conflict (organization_id) do update set
    status = excluded.status,
    package_key = excluded.package_key,
    feature_keys = excluded.feature_keys,
    billing_source = excluded.billing_source,
    effective_at = excluded.effective_at;

  update public.billing_webhook_events
     set processed_at = p_effective_at
   where provider = p_provider
     and event_id = p_event_id
     and organization_id = p_organization_id
     and processed_at is null;

  return true;
end;
$$;

revoke all on function public.apply_billing_event_atomic(text,text,uuid,text,text,text,text[],text,text,timestamptz) from public, anon, authenticated;
grant execute on function public.apply_billing_event_atomic(text,text,uuid,text,text,text,text[],text,text,timestamptz) to service_role;

comment on function public.apply_billing_event_atomic(text,text,uuid,text,text,text,text[],text,text,timestamptz) is
  'Service-only atomic application of one previously claimed, verified billing event. Billing account, entitlement and receipt completion commit or roll back together.';
