-- FM-05/FM-09 (Refs #516 #517): package-based capacity is set ONLY by the
-- verified billing path. apply_billing_event_atomic_v2 (service_role only,
-- called after provider signature verification) upserts
-- organization_entitlements with billing_source = <provider>. This trigger
-- runs in that same transaction and derives capacity from the package and
-- entitlement status, so capacity can never drift from verified billing state.
--
-- Capacity mirrors the published /pricing page:
--   Core:   1 brand, up to 25 approved buyer questions, monthly cadence
--           -> 25 provider-prompt run units per month (25 x 1 cycle x 1 provider)
--   Signal: up to 3 brands, up to 100 approved buyer questions, weekly cadence
--           -> 500 run units per month (100 x 5 possible weekly cycles x 1 provider)
-- Any non-active, expired, or non-paid package falls back to Foundation access
-- (10 questions, 20 run units, 1 brand). Founder/manual grants
-- (billing_source not a billing provider) are never touched.

create or replace function public.billing_package_capacity_v1()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_paid_active boolean;
begin
  if new.billing_source is null or new.billing_source not in ('stripe', 'creem', 'paddle') then
    return new;
  end if;

  v_paid_active := new.status = 'active'
    and (new.expires_at is null or new.expires_at > now())
    and new.package_key in ('core', 'signal');

  if v_paid_active and new.package_key = 'signal' then
    new.max_prompts := 100;
    new.monthly_run_units := 500;
    new.max_brands := 3;
  elsif v_paid_active and new.package_key = 'core' then
    new.max_prompts := 25;
    new.monthly_run_units := 25;
    new.max_brands := 1;
  else
    new.max_prompts := 10;
    new.monthly_run_units := 20;
    new.max_brands := 1;
  end if;
  return new;
end;
$$;

revoke all on function public.billing_package_capacity_v1() from public, anon, authenticated;

drop trigger if exists organization_entitlements_billing_package_capacity on public.organization_entitlements;
create trigger organization_entitlements_billing_package_capacity
before insert or update of status, package_key, billing_source, expires_at, max_prompts, monthly_run_units, max_brands
on public.organization_entitlements
for each row execute function public.billing_package_capacity_v1();

-- Re-derive capacity for rows already written by verified billing.
update public.organization_entitlements
   set status = status
 where billing_source in ('stripe', 'creem', 'paddle');

comment on function public.billing_package_capacity_v1() is
  'Derives buyer-question, run-unit and brand capacity from verified provider billing state (Refs #516). Manual grants are untouched.';

-- Atomic buyer-question admission (Refs #516 #532). The API pre-check reads
-- before it writes, so concurrent requests could otherwise exceed a paid cap.
-- This trigger serialises admission per organization with a transaction-scoped
-- advisory lock, then counts ACTIVE questions across the whole organization
-- (all projects) against the persisted entitlement. It fires for every
-- writer an end user can reach (direct PostgREST insert, reactivation via
-- update, and any SQL function such as the atomic versioned-create RPC).
-- Operator/service paths (service_role, migrations, restore) are not gated.
-- Effective limit: active + unexpired entitlement -> max_prompts (derived from
-- verified billing above, or an explicit founder grant); otherwise Foundation 10.
-- PT429 makes PostgREST answer HTTP 429 with the allow-listed message.

create or replace function public.enforce_buyer_question_capacity_v1()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role text := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '');
  v_limit integer;
  v_active integer;
begin
  if v_role <> 'authenticated' then
    return new;
  end if;
  if not coalesce(new.active, false) then
    return new;
  end if;
  if tg_op = 'UPDATE' and coalesce(old.active, false) and old.organization_id = new.organization_id then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('foremention.buyer_question_admission:' || new.organization_id::text, 0));

  select case
           when e.status = 'active' and (e.expires_at is null or e.expires_at > now()) and e.max_prompts > 0
             then e.max_prompts
           else 10
         end
    into v_limit
    from public.organization_entitlements e
   where e.organization_id = new.organization_id;
  v_limit := coalesce(v_limit, 10);

  select count(*) into v_active
    from public.prompts p
   where p.organization_id = new.organization_id
     and p.active
     and p.id <> new.id;

  if v_active >= v_limit then
    raise sqlstate 'PT429' using message = 'Prompt limit exceeded for this workspace entitlement (' || v_limit || ' active buyer questions).';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_buyer_question_capacity_v1() from public, anon, authenticated;

drop trigger if exists prompts_buyer_question_capacity on public.prompts;
create trigger prompts_buyer_question_capacity
before insert or update of active, organization_id on public.prompts
for each row execute function public.enforce_buyer_question_capacity_v1();

comment on function public.enforce_buyer_question_capacity_v1() is
  'Atomic, organization-wide buyer-question admission against the persisted entitlement (Refs #516 #532).';
