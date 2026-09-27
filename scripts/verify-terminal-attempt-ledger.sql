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

-- The guard is an intentional conservative accounting policy: tokenless
-- failed/rate-limited ESTIMATES remain on attempt rows for circuit/budget
-- safety, but MUST NOT be booked into ai_cost_events or actual run cost.
-- Earlier isolated CI "missing retry receipts" were this expected guard.
insert into public.run_attempts (
  id, organization_id, run_id, prompt_id, prompt_key, provider, model,
  attempt_number, status, started_at
) values (
  'f1300000-0000-4000-8000-000000000062'::uuid,
  'f1300000-0000-4000-8000-000000000010'::uuid,
  'f1300000-0000-4000-8000-000000000050'::uuid,
  'f1300000-0000-4000-8000-000000000040'::uuid,
  'synthetic-ledger-q1', 'cloudflare', 'synthetic-fixture-model',
  2, 'running', now()
), (
  'f1300000-0000-4000-8000-000000000063'::uuid,
  'f1300000-0000-4000-8000-000000000010'::uuid,
  'f1300000-0000-4000-8000-000000000050'::uuid,
  'f1300000-0000-4000-8000-000000000040'::uuid,
  'synthetic-ledger-q1', 'cloudflare', 'synthetic-fixture-model',
  3, 'running', now()
);

update public.run_attempts
set status='failed', estimated_cost_usd=0.000023,
    cost_source='estimated', completed_at=now()
where id='f1300000-0000-4000-8000-000000000062'::uuid;

update public.run_attempts
set status='rate_limited', estimated_cost_usd=0.000000,
    cost_source='estimated', completed_at=now()
where id='f1300000-0000-4000-8000-000000000063'::uuid;

-- NULL means unknown. Neither unknown nor tokenless estimated failure is a
-- billable observation, even if the system recorded a conservative ceiling.
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

do $$
begin
  if (select count(*) from public.ai_cost_events
      where run_id='f1300000-0000-4000-8000-000000000050'::uuid) <> 1
     or exists (select 1 from public.ai_cost_events
      where run_attempt_id in (
        'f1300000-0000-4000-8000-000000000062'::uuid,
        'f1300000-0000-4000-8000-000000000063'::uuid,
        'f1300000-0000-4000-8000-000000000064'::uuid
      )) then
    raise exception 'Guard incorrectly booked tokenless failed estimates or a NULL estimate';
  end if;
  if not exists (select 1 from public.run_attempts
      where id='f1300000-0000-4000-8000-000000000062'::uuid
        and status='failed' and estimated_cost_usd=0.000023
        and usage_input_tokens is null and completed_at is not null)
     or not exists (select 1 from public.run_attempts
      where id='f1300000-0000-4000-8000-000000000063'::uuid
        and status='rate_limited' and estimated_cost_usd=0
        and usage_total_tokens is null) then
    raise exception 'Conservative budget estimates were erased or fixture inputs changed';
  end if;
end
$$;

-- Failure with newly documented metered usage is different from an
-- unsubstantiated retry ceiling. The trigger must now create a receipt.
update public.run_attempts
set usage_input_tokens=2, usage_total_tokens=2, estimated_cost_usd=0.000023
where id='f1300000-0000-4000-8000-000000000062'::uuid;

do $$
begin
  if (select count(*) from public.ai_cost_events
      where run_attempt_id='f1300000-0000-4000-8000-000000000062'::uuid) <> 1
    or not exists (select 1 from public.ai_cost_events
      where run_attempt_id='f1300000-0000-4000-8000-000000000062'::uuid
        and estimated_cost_usd=0.000023 and input_tokens=2 and total_tokens=2)
  then raise exception 'Metered failed retry did not receive its own ledger receipt'; end if;
end
$$;

-- Synthetic provider-reported ZERO (NOT a real invoice) is eligible as a
-- distinct cost receipt even without tokens; estimated tokenless zero was not.
update public.run_attempts
set cost_source='provider_reported'
where id='f1300000-0000-4000-8000-000000000063'::uuid;

do $$
begin
  if (select count(*) from public.ai_cost_events
      where run_attempt_id='f1300000-0000-4000-8000-000000000063'::uuid) <> 1
    or not exists (select 1 from public.ai_cost_events
      where run_attempt_id='f1300000-0000-4000-8000-000000000063'::uuid
        and cost_source='provider_reported' and estimated_cost_usd=0)
  then raise exception 'Provider-reported synthetic zero was not retained as a distinct receipt'; end if;
end
$$;

-- Updating cost alone on a failed tokenless attempt must remain excluded;
-- later adding supported metering and repeating a cost-column update may
-- legitimately produce a new receipt. Never infer external invoice evidence.
update public.run_attempts
set estimated_cost_usd=0.000007, cost_source='estimated'
where id='f1300000-0000-4000-8000-000000000064'::uuid;

do $$
begin
  if exists (select 1 from public.ai_cost_events
      where run_attempt_id='f1300000-0000-4000-8000-000000000064'::uuid)
  then raise exception 'Late tokenless estimate incorrectly became booked spend'; end if;
end
$$;

update public.run_attempts
set usage_input_tokens=1, usage_total_tokens=1, estimated_cost_usd=0.000007
where id='f1300000-0000-4000-8000-000000000064'::uuid;

-- A direct terminal INSERT with metered input is eligible as well; it is
-- the guard, not terminal INSERT vs UPDATE syntax, that controls booking.
insert into public.run_attempts (
  id, organization_id, run_id, prompt_id, prompt_key, provider, model,
  attempt_number, status, usage_input_tokens, usage_total_tokens,
  estimated_cost_usd, cost_source, completed_at
) values (
  'f1300000-0000-4000-8000-000000000065'::uuid,
  'f1300000-0000-4000-8000-000000000010'::uuid,
  'f1300000-0000-4000-8000-000000000050'::uuid,
  'f1300000-0000-4000-8000-000000000040'::uuid,
  'synthetic-ledger-q1', 'cloudflare', 'synthetic-fixture-model',
  5, 'failed', 3, 3, 0.000005, 'estimated', now()
);

do $$
begin
  if (select count(*) from public.ai_cost_events
      where run_id='f1300000-0000-4000-8000-000000000050'::uuid) <> 5
    or (select count(distinct run_attempt_id) from public.ai_cost_events
      where run_id='f1300000-0000-4000-8000-000000000050'::uuid) <> 5
    or not exists (select 1 from public.ai_cost_events
      where run_attempt_id='f1300000-0000-4000-8000-000000000064'::uuid
        and estimated_cost_usd=0.000007 and input_tokens=1)
    or not exists (select 1 from public.ai_cost_events
      where run_attempt_id='f1300000-0000-4000-8000-000000000065'::uuid
        and estimated_cost_usd=0.000005 and input_tokens=3)
  then raise exception 'Five distinct eligible metered or provider-reported cost receipts were not produced'; end if;
  if has_function_privilege('authenticated','public.ledger_run_attempt_cost()','EXECUTE')
    or has_function_privilege('authenticated','public.guard_provider_cost_event()','EXECUTE')
  then raise exception 'Authenticated customer can directly execute internal ledger guards'; end if;
end
$$;

rollback;
select 'isolated terminal-attempt guarded ledger invariant passed' as result;
