-- Launch 2026-10-14: 7-day Core trial (no card) and a tighter free tier.
--
-- 1. Free tier (new workspaces only). Column defaults decide the entitlement
--    row a new organization gets on its first run/quota check. Existing rows
--    (including every existing test workspace) are NOT changed.
--      Free: 5 buyer questions, 10 provider-prompt observations / month,
--            5 questions per run, 1 provider, $1 monthly AI spend cap.
--    The lapsed-paid fallback inside billing_package_capacity_v1 and the
--    no-entitlement fallback in enforce_buyer_question_capacity_v1 use the
--    same free numbers.
--
-- 2. Core trial. start_core_trial() lets a workspace OWNER start one 7-day
--    trial with Core capacity (25 questions, 25/run, 2 providers, 50
--    observations, $5 AI cap) and no payment method. One trial per
--    organization and per user, recorded in core_trial_claims. The trial row
--    is package_key='core', billing_source='trial', expires_at=+7 days, so the
--    verified-billing trigger never touches it and a real Paddle payment
--    (billing_source='paddle') replaces it cleanly.
--    expire_core_trials() (service_role; called hourly by the Worker cron)
--    returns lapsed trials to the free tier with billing_source='trial_expired'.
--
-- Rollback:
--   drop function public.start_core_trial(uuid); drop function public.expire_core_trials();
--   drop table public.core_trial_claims;
--   restore column defaults (10 / 20 / 10 / 2.00) and the previous bodies of
--   billing_package_capacity_v1 (20261014160000) and
--   enforce_buyer_question_capacity_v1 (20261011090000).

begin;

alter table public.organization_entitlements
  alter column max_prompts set default 5,
  alter column monthly_run_units set default 10,
  alter column max_prompts_per_run set default 5,
  alter column monthly_ai_spend_cap_usd set default 1.00;

create or replace function public.billing_package_capacity_v1()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
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
    new.monthly_run_units := 1000;
    new.max_brands := 3;
    new.max_prompts_per_run := 100;
    new.max_providers_per_run := 3;
    new.max_concurrent_runs := 2;
    new.monthly_ai_spend_cap_usd := 40.00;
  elsif v_paid_active and new.package_key = 'core' then
    new.max_prompts := 25;
    new.monthly_run_units := 100;
    new.max_brands := 1;
    new.max_prompts_per_run := 25;
    new.max_providers_per_run := 2;
    new.max_concurrent_runs := 1;
    new.monthly_ai_spend_cap_usd := 10.00;
  else
    new.max_prompts := 5;
    new.monthly_run_units := 10;
    new.max_brands := 1;
    new.max_prompts_per_run := 5;
    new.max_providers_per_run := 1;
    new.max_concurrent_runs := 1;
    new.monthly_ai_spend_cap_usd := 1.00;
  end if;
  return new;
end;
$function$;

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
           else 5
         end
    into v_limit
    from public.organization_entitlements e
   where e.organization_id = new.organization_id;
  v_limit := coalesce(v_limit, 5);

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

create table if not exists public.core_trial_claims (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  user_id uuid not null unique,
  claimed_at timestamptz not null default now(),
  ends_at timestamptz not null
);

alter table public.core_trial_claims enable row level security;
revoke all on table public.core_trial_claims from public, anon, authenticated;
grant all on table public.core_trial_claims to service_role;

create or replace function public.start_core_trial(p_organization_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_ent public.organization_entitlements%rowtype;
  v_ends timestamptz := now() + interval '7 days';
begin
  if v_user is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if not exists (
    select 1 from public.organization_members m
     where m.organization_id = p_organization_id
       and m.user_id = v_user
       and m.role = 'owner'::public.organization_role
  ) then
    raise exception 'Only the workspace owner can start a trial' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_organization_id::text));

  if exists (select 1 from public.core_trial_claims c where c.organization_id = p_organization_id or c.user_id = v_user) then
    raise exception 'A Core trial has already been used for this workspace or account' using errcode = 'P0001';
  end if;

  insert into public.organization_entitlements (organization_id)
  values (p_organization_id)
  on conflict (organization_id) do nothing;

  select * into v_ent from public.organization_entitlements e where e.organization_id = p_organization_id for update;

  if v_ent.billing_source in ('stripe', 'creem', 'paddle') and v_ent.status = 'active'
     and (v_ent.expires_at is null or v_ent.expires_at > now()) then
    raise exception 'This workspace already has a paid plan' using errcode = 'P0001';
  end if;
  if v_ent.billing_source in ('trial', 'trial_expired') then
    raise exception 'A Core trial has already been used for this workspace or account' using errcode = 'P0001';
  end if;

  update public.organization_entitlements e
     set package_key = 'core',
         billing_source = 'trial',
         status = 'active',
         effective_at = now(),
         expires_at = v_ends,
         max_prompts = 25,
         monthly_run_units = 50,
         max_brands = 1,
         max_prompts_per_run = 25,
         max_providers_per_run = 2,
         max_concurrent_runs = 1,
         monthly_ai_spend_cap_usd = 5.00,
         updated_at = now()
   where e.organization_id = p_organization_id;

  insert into public.core_trial_claims (organization_id, user_id, ends_at)
  values (p_organization_id, v_user, v_ends);

  return jsonb_build_object('packageKey', 'core', 'trial', true, 'endsAt', v_ends);
end;
$$;

revoke all on function public.start_core_trial(uuid) from public, anon;
grant execute on function public.start_core_trial(uuid) to authenticated, service_role;

create or replace function public.expire_core_trials()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.organization_entitlements e
     set package_key = 'private_beta',
         billing_source = 'trial_expired',
         status = 'active',
         expires_at = null,
         max_prompts = 5,
         monthly_run_units = 10,
         max_brands = 1,
         max_prompts_per_run = 5,
         max_providers_per_run = 1,
         max_concurrent_runs = 1,
         monthly_ai_spend_cap_usd = 1.00,
         updated_at = now()
   where e.billing_source = 'trial'
     and e.expires_at is not null
     and e.expires_at <= now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.expire_core_trials() from public, anon, authenticated;
grant execute on function public.expire_core_trials() to service_role;

commit;
