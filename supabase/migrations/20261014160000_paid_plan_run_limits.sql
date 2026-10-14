-- Launch readiness 2026-10-14: paid packages must unlock the run limits they
-- are sold with, not only the question count.
--
-- billing_package_capacity_v1 (20261011090000) raised max_prompts for verified
-- Core/Signal billing but left every run-time limit at the free-beta default:
-- max_prompts_per_run 10, max_providers_per_run 1, max_concurrent_runs 1,
-- monthly_ai_spend_cap_usd $2, and Core monthly_run_units 25 (one single-
-- provider pass per month). A paying Core customer with 25 approved questions
-- could therefore never measure them in one run, and Signal's 100 questions
-- were capped at 10 per run.
--
-- Plan limits (provider-prompt observations = questions x providers):
--   Core   $99:  25 questions, 1 brand, 25/run, 2 providers/run, 1 concurrent,
--                100 observations/month, $10 AI spend cap
--   Signal $299: 100 questions, 3 brands, 100/run, 3 providers/run, 2 concurrent,
--                1000 observations/month (weekly x 2 providers), $40 AI cap
--   Free/private beta (or lapsed paid): unchanged defaults 10 / 1 / 10 / 1 / 1 /
--                20 / $2.
-- Only rows whose billing_source is a verified provider are touched, exactly as
-- before; founder grants keep whatever limits were set by hand.
-- Rollback: re-run the function body from 20261011090000.

begin;

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
    new.max_prompts := 10;
    new.monthly_run_units := 20;
    new.max_brands := 1;
    new.max_prompts_per_run := 10;
    new.max_providers_per_run := 1;
    new.max_concurrent_runs := 1;
    new.monthly_ai_spend_cap_usd := 2.00;
  end if;
  return new;
end;
$function$;

commit;
