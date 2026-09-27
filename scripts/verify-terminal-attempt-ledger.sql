\set ON_ERROR_STOP on

-- NON-PRODUCTION ONLY: this file runs exclusively inside CI's freshly reset
-- local Supabase database. All fixture changes are rolled back, even on success.
-- No provider API call, customer account, remote migration repair or real bill.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

insert into auth.users (id) values
  ('f1300000-0000-4000-8000-000000000001'::uuid);

insert into public.organizations (id, name, slug, created_by) values
  ('f1300000-0000-4000-8000-000000000010'::uuid, 'Synthetic Cost Ledger Fixture',
   'synthetic-cost-ledger-fixture', 'f1300000-0000-4000-8000-000000000001'::uuid);

insert into public.categories (id, organization_id, name) values
  ('f1300000-0000-4000-8000-000000000020'::uuid,
   'f1300000-0000-4000-8000-000000000010'::uuid, 'Synthetic cost category');

insert into public.prompts (id, organization_id, category_id, prompt_key, prompt_text) values
  ('f1300000-0000-4000-8000-000000000040'::uuid,
   'f1300000-0000-4000-8000-000000000010'::uuid,
   'f1300000-0000-4000-8000-000000000020'::uuid,
   'synthetic-ledger-q1', 'Synthetic only: does terminal cost persist?');

insert into public.runs (id, organization_id, category_id, created_by) values
  ('f1300000-0000-4000-8000-000000000050'::uuid,
   'f1300000-0000-4000-8000-000000000010'::uuid,
   'f1300000-0000-4000-8000-000000000020'::uuid,
   'f1300000-0000-4000-8000-000000000001'::uuid);

-- A started but non-terminal attempt must not produce a billable event.
insert into public.run_attempts (
  id, organization_id, run_id, prompt_id, prompt_key, provider, model,
  attempt_number, status, started_at
) values (
  'f1300000-0000-4000-8000-000000000061'::uuid,
  'f1300000-0000-4000-8000-000000000010'::uuid,
  'f1300000-0000-4000-8000-000000000050'::uuid,
  'f1300000-0000-4000-8000-000000000040'::uuid,
  'synthetic-ledger-q1', 'cloudflare', 'synthetic-fixture-model',
  1, 'running', now()
);

do $$
begin
  if exists (select 1 from public.ai_cost_events
    where run_attempt_id='f1300000-0000-4000-8000-000000000061'::uuid) then
    raise exception 'Running attempt generated a premature ledger charge';
  end if;
  if not exists (select 1 from pg_trigger
    where tgrelid='public.run_attempts'::regclass
      and tgname='ledger_run_attempt_cost_after_write' and tgenabled='O') then
    raise exception 'Atomic terminal-attempt ledger trigger is missing or disabled';
  end if;
end
$$;

-- Terminal transition and its ledger entry must commit atomically in the
-- same transaction. No source or cost is claimed to be an external invoice.
update public.run_attempts
set status='complete', completed_at=now(), estimated_cost_usd=0.000123,
    cost_source='estimated', usage_input_tokens=7, usage_output_tokens=4,
    usage_total_tokens=11
where id='f1300000-0000-4000-8000-000000000061'::uuid;

do $$
begin
  if (select count(*) from public.ai_cost_events
      where run_attempt_id='f1300000-0000-4000-8000-000000000061'::uuid) <> 1
    or not exists (
      select 1 from public.ai_cost_events
      where run_attempt_id='f1300000-0000-4000-8000-000000000061'::uuid
        and organization_id='f1300000-0000-4000-8000-000000000010'::uuid
        and run_id='f1300000-0000-4000-8000-000000000050'::uuid
        and estimated_cost_usd=0.000123 and cost_source='estimated'
        and input_tokens=7 and output_tokens=4 and total_tokens=11
    ) then
      raise exception 'Successful terminal attempt did not create correct single cost receipt';
  end if;
end
$$;

-- A same-attempt replay must update in place, never double-book. This
-- synthetic provider_reported value tests plumbing, not an actual invoice.
update public.run_attempts
set estimated_cost_usd=0.000111, cost_source='provider_reported',
    usage_input_tokens=8
where id='f1300000-0000-4000-8000-000000000061'::uuid;

do $$
begin
  if (select count(*) from public.ai_cost_events
      where run_attempt_id='f1300000-0000-4000-8000-000000000061'::uuid) <> 1
    or not exists (
      select 1 from public.ai_cost_events
      where run_attempt_id='f1300000-0000-4000-8000-000000000061'::uuid
        and estimated_cost_usd=0.000111
        and cost_source='provider_reported' and input_tokens=8
    ) then
    raise exception 'Replay duplicate or stale terminal cost receipt';
  end if;
end
$$;

-- Distinct retries are distinct attempts and must not be suppressed by
-- the unique (run_id,prompt_id,provider,attempt_number) contract.
insert into public.run_attempts (
  id, organization_id, run_id, prompt_id, prompt_key, provider, model,
  attempt_number, status, estimated_cost_usd, cost_source, completed_at
) values (
  'f1300000-0000-4000-8000-000000000062'::uuid,
  'f1300000-0000-4000-8000-000000000010'::uuid,
  'f1300000-0000-4000-8000-000000000050'::uuid,
  'f1300000-0000-4000-8000-000000000040'::uuid,
  'synthetic-ledger-q1', 'cloudflare', 'synthetic-fixture-model',
  2, 'failed', 0.000023, 'estimated', now()
), (
  'f1300000-0000-4000-8000-000000000063'::uuid,
  'f1300000-0000-4000-8000-000000000010'::uuid,
  'f1300000-0000-4000-8000-000000000050'::uuid,
  'f1300000-0000-4000-8000-000000000040'::uuid,
  'synthetic-ledger-q1', 'cloudflare', 'synthetic-fixture-model',
  3, 'rate_limited', 0.000000, 'estimated', now()
);

-- Cost unknown != cost zero: a terminal attempt with NULL cost must be
-- explicitly unaccounted until a truthful value and completion exist.
insert into public.run_attempts (
  id, organization_id, run_id, prompt_id, prompt_key, provider, model,
  attempt_number, status, completed_at, estimated_cost_usd
) values (
  'f1300000-0000-4000-8000-000000000064'::uuid,
  'f1300000-0000-4000-8000-000000000010'::uuid,
  'f1300000-0000-4000-8000-000000000050'::uuid,
  'f1300000-0000-4000-8000-000000000040'::uuid,
  'synthetic-ledger-q1', 'cloudflare', 'synthetic-fixture-model',
  4, 'failed', now(), null
);

do $ledger_diagnostic$
declare
  actual_count integer;
begin
  select count(*) into actual_count from public.ai_cost_events
  where run_id='f1300000-0000-4000-8000-000000000050'::uuid;
  if actual_count <> 3 then
    raise exception 'Expected exactly three receipts, got % (retry2 %, zero3 %, unknown4 %)',
      actual_count,
      exists (select 1 from public.ai_cost_events where run_attempt_id='f1300000-0000-4000-8000-000000000062'::uuid),
      exists (select 1 from public.ai_cost_events where run_attempt_id='f1300000-0000-4000-8000-000000000063'::uuid),
      exists (select 1 from public.ai_cost_events where run_attempt_id='f1300000-0000-4000-8000-000000000064'::uuid);
  end if;
  if not exists (select 1 from public.ai_cost_events
      where run_attempt_id='f1300000-0000-4000-8000-000000000062'::uuid
        and estimated_cost_usd=0.000023 and cost_source='estimated')
    or not exists (select 1 from public.ai_cost_events
      where run_attempt_id='f1300000-0000-4000-8000-000000000063'::uuid
        and estimated_cost_usd=0)
    or exists (select 1 from public.ai_cost_events
      where run_attempt_id='f1300000-0000-4000-8000-000000000064'::uuid) then
    raise exception 'Retry, explicit zero or unknown-cost treatment was incorrect';
  end if;
end
$ledger_diagnostic$;

-- When cost is later legitimately established, the same terminal attempt
-- receives exactly one receipt. Do not perform equivalent retroactive updates
-- on historical production rows without independently verified billing.
update public.run_attempts
set estimated_cost_usd=0.000007, cost_source='estimated'
where id='f1300000-0000-4000-8000-000000000064'::uuid;

do $$
begin
  if (select count(*) from public.ai_cost_events
      where run_id='f1300000-0000-4000-8000-000000000050'::uuid) <> 4
    or not exists (select 1 from public.ai_cost_events
      where run_attempt_id='f1300000-0000-4000-8000-000000000064'::uuid
        and estimated_cost_usd=0.000007) then
    raise exception 'Legitimate late cost recording was lost or double-counted';
  end if;
  if has_function_privilege('authenticated','public.ledger_run_attempt_cost()','EXECUTE') then
    raise exception 'Customer-authenticated role can execute internal ledger trigger directly';
  end if;
end
$$;

rollback;
select 'isolated terminal-attempt ledger invariant passed' as result;
