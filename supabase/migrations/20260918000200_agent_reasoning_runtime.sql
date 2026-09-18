-- Foremention Agent OS Phase 2: bounded model-reasoning ledger and atomic
-- daily budget reservation. Service-only. This table records model synthesis
-- separately from customer collection cost so product measurement economics do
-- not silently absorb company-operating-agent spend.

begin;

create table if not exists public.agent_reasoning_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  run_id uuid not null references public.runs(id) on delete cascade,
  agent_id text not null constraint agent_reasoning_runs_agent_check check (
    agent_id in ('research-insight','customer-success','onboarding','sales','marketing','support','product','qa','engineering','finance-ops','ceo')
  ),
  task_type text not null constraint agent_reasoning_runs_task_check check (char_length(btrim(task_type)) between 2 and 120),
  model text not null constraint agent_reasoning_runs_model_check check (char_length(btrim(model)) between 2 and 160),
  prompt_version text not null constraint agent_reasoning_runs_prompt_version_check check (char_length(btrim(prompt_version)) between 2 and 120),
  status text not null default 'running' constraint agent_reasoning_runs_status_check check (status in ('running','complete','failed')),
  idempotency_key text not null unique constraint agent_reasoning_runs_idempotency_check check (char_length(idempotency_key) between 8 and 240),
  input_hash text not null constraint agent_reasoning_runs_input_hash_check check (input_hash ~ '^[a-f0-9]{64}$'),
  input_chars integer not null constraint agent_reasoning_runs_input_chars_check check (input_chars between 0 and 100000),
  max_output_tokens integer not null constraint agent_reasoning_runs_max_output_check check (max_output_tokens between 1 and 10000),
  input_tokens integer constraint agent_reasoning_runs_input_tokens_check check (input_tokens is null or input_tokens >= 0),
  output_tokens integer constraint agent_reasoning_runs_output_tokens_check check (output_tokens is null or output_tokens >= 0),
  estimated_max_cost_usd numeric(14,6) not null default 0 constraint agent_reasoning_runs_estimated_cost_check check (estimated_max_cost_usd between 0 and 1000),
  actual_cost_usd numeric(14,6) constraint agent_reasoning_runs_actual_cost_check check (actual_cost_usd is null or actual_cost_usd between 0 and 1000),
  response_id text,
  output_json jsonb,
  error_detail text constraint agent_reasoning_runs_error_check check (error_detail is null or char_length(error_detail) <= 2000),
  latency_ms integer constraint agent_reasoning_runs_latency_check check (latency_ms is null or latency_ms >= 0),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agent_reasoning_runs_terminal_check check (
    (status = 'running' and completed_at is null)
    or (status in ('complete','failed') and completed_at is not null)
  ),
  constraint agent_reasoning_runs_output_check check (
    status <> 'complete' or jsonb_typeof(output_json) = 'object'
  )
);

create index if not exists agent_reasoning_runs_day_cost_idx
  on public.agent_reasoning_runs (created_at, status);
create index if not exists agent_reasoning_runs_org_created_idx
  on public.agent_reasoning_runs (organization_id, created_at desc);
create index if not exists agent_reasoning_runs_run_agent_idx
  on public.agent_reasoning_runs (run_id, agent_id, created_at desc);

create trigger agent_reasoning_runs_updated_at
  before update on public.agent_reasoning_runs
  for each row execute function public.set_updated_at();

alter table public.agent_reasoning_runs enable row level security;
revoke all on table public.agent_reasoning_runs from public;
revoke all on table public.agent_reasoning_runs from anon, authenticated;
grant select, insert, update, delete on table public.agent_reasoning_runs to service_role;

create or replace function public.reserve_agent_reasoning_run(
  p_organization_id uuid,
  p_project_id uuid,
  p_run_id uuid,
  p_agent_id text,
  p_task_type text,
  p_model text,
  p_prompt_version text,
  p_idempotency_key text,
  p_input_hash text,
  p_input_chars integer,
  p_max_output_tokens integer,
  p_estimated_max_cost_usd numeric,
  p_daily_cost_cap_usd numeric
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_id uuid;
  reserved_usd numeric(14,6) := 0;
  new_id uuid;
  cycle_start timestamptz := (date_trunc('day', now() at time zone 'utc') at time zone 'utc');
begin
  if p_daily_cost_cap_usd <= 0 or p_daily_cost_cap_usd > 1000 then
    return jsonb_build_object('reason', 'invalid_daily_cap');
  end if;
  if p_estimated_max_cost_usd < 0 or p_estimated_max_cost_usd > p_daily_cost_cap_usd then
    return jsonb_build_object('reason', 'reservation_exceeds_daily_cap');
  end if;
  if p_input_chars < 0 or p_input_chars > 100000 or p_max_output_tokens < 1 or p_max_output_tokens > 10000 then
    return jsonb_build_object('reason', 'invalid_bounds');
  end if;
  if not exists (
    select 1 from public.runs
    where id = p_run_id
      and organization_id = p_organization_id
      and project_id = p_project_id
      and status in ('complete','partial')
  ) then
    return jsonb_build_object('reason', 'reviewed_terminal_run_required');
  end if;

  select id into existing_id
  from public.agent_reasoning_runs
  where idempotency_key = p_idempotency_key
  limit 1;

  if existing_id is not null then
    return jsonb_build_object('id', existing_id, 'created', false);
  end if;

  perform pg_advisory_xact_lock(hashtext('foremention:agent-reasoning:' || current_date::text));

  -- Re-check after acquiring the lock to close the idempotency race.
  select id into existing_id
  from public.agent_reasoning_runs
  where idempotency_key = p_idempotency_key
  limit 1;
  if existing_id is not null then
    return jsonb_build_object('id', existing_id, 'created', false);
  end if;

  select coalesce(sum(
    case
      when actual_cost_usd is not null then actual_cost_usd
      else estimated_max_cost_usd
    end
  ), 0) into reserved_usd
  from public.agent_reasoning_runs
  where created_at >= cycle_start
    and status in ('running','complete','failed');

  if reserved_usd + p_estimated_max_cost_usd > p_daily_cost_cap_usd then
    return jsonb_build_object(
      'reason', 'daily_cost_cap',
      'reservedUsd', reserved_usd,
      'requestedUsd', p_estimated_max_cost_usd
    );
  end if;

  insert into public.agent_reasoning_runs (
    organization_id, project_id, run_id, agent_id, task_type, model,
    prompt_version, status, idempotency_key, input_hash, input_chars,
    max_output_tokens, estimated_max_cost_usd, started_at
  ) values (
    p_organization_id, p_project_id, p_run_id, p_agent_id, p_task_type, p_model,
    p_prompt_version, 'running', p_idempotency_key, p_input_hash, p_input_chars,
    p_max_output_tokens, p_estimated_max_cost_usd, now()
  ) returning id into new_id;

  return jsonb_build_object(
    'id', new_id,
    'created', true,
    'reservedUsd', reserved_usd + p_estimated_max_cost_usd,
    'remainingUsd', p_daily_cost_cap_usd - reserved_usd - p_estimated_max_cost_usd
  );
end;
$$;

revoke all on function public.reserve_agent_reasoning_run(uuid, uuid, uuid, text, text, text, text, text, text, integer, integer, numeric, numeric) from public;
revoke all on function public.reserve_agent_reasoning_run(uuid, uuid, uuid, text, text, text, text, text, text, integer, integer, numeric, numeric) from anon, authenticated;
grant execute on function public.reserve_agent_reasoning_run(uuid, uuid, uuid, text, text, text, text, text, text, integer, integer, numeric, numeric) to service_role;

comment on table public.agent_reasoning_runs is
  'Service-only bounded model-reasoning ledger for company operating agents. Kept separate from customer collection ai_cost_events.';
comment on function public.reserve_agent_reasoning_run(uuid, uuid, uuid, text, text, text, text, text, text, integer, integer, numeric, numeric) is
  'Atomically enforces the configured global daily reasoning-cost reservation and idempotency before an operating-agent model call.';

commit;
