-- Foremention Agent OS Phase 3: controlled execution receipts.
-- External communication remains a two-step human flow:
-- pending_approval -> approved -> explicit execute -> provider receipt.
-- Only the narrow Customer Success email executor is enabled here.

begin;

create table if not exists public.agent_action_executions (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null unique references public.agent_actions(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  executor_type text not null constraint agent_action_executions_executor_check check (
    executor_type in ('customer_success_email')
  ),
  execution_key text not null unique constraint agent_action_executions_key_check check (
    char_length(execution_key) between 8 and 240
  ),
  status text not null default 'running' constraint agent_action_executions_status_check check (
    status in ('running','succeeded','failed','blocked','uncertain')
  ),
  provider text,
  provider_message_id text,
  result_json jsonb not null default '{}'::jsonb constraint agent_action_executions_result_check check (
    jsonb_typeof(result_json) = 'object'
  ),
  error_code text constraint agent_action_executions_error_check check (
    error_code is null or char_length(error_code) <= 240
  ),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agent_action_executions_terminal_check check (
    (status = 'running' and completed_at is null)
    or (status <> 'running' and completed_at is not null)
  )
);

create index if not exists agent_action_executions_org_created_idx
  on public.agent_action_executions (organization_id, created_at desc);
create index if not exists agent_action_executions_status_created_idx
  on public.agent_action_executions (status, created_at desc);

create trigger agent_action_executions_updated_at
  before update on public.agent_action_executions
  for each row execute function public.set_updated_at();

alter table public.agent_action_executions enable row level security;
revoke all on table public.agent_action_executions from public;
revoke all on table public.agent_action_executions from anon, authenticated;
grant select, insert, update, delete on table public.agent_action_executions to service_role;

create or replace function public.claim_agent_action_execution(
  p_action_id uuid,
  p_execution_key text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing public.agent_action_executions%rowtype;
  claimed_org uuid;
  new_id uuid;
begin
  select * into existing
  from public.agent_action_executions
  where action_id = p_action_id
  limit 1;

  if existing.id is not null then
    return jsonb_build_object(
      'id', existing.id,
      'created', false,
      'status', existing.status,
      'reason', 'already_claimed'
    );
  end if;

  update public.agent_actions
  set status = 'executing',
      executed_at = now()
  where id = p_action_id
    and status = 'approved'
    and requires_approval = true
    and decided_at is not null
    and decided_by is not null
    and agent_id = 'customer-success'
    and action_type = 'customer_success_message_draft'
    and effect_class = 'external_communication'
    and risk_level = 'medium'
  returning organization_id into claimed_org;

  if claimed_org is null then
    return jsonb_build_object('created', false, 'reason', 'not_executable');
  end if;

  begin
    insert into public.agent_action_executions (
      action_id,
      organization_id,
      executor_type,
      execution_key,
      status
    ) values (
      p_action_id,
      claimed_org,
      'customer_success_email',
      p_execution_key,
      'running'
    )
    returning id into new_id;
  exception when unique_violation then
    select * into existing
    from public.agent_action_executions
    where action_id = p_action_id
    limit 1;
    if existing.id is not null then
      return jsonb_build_object(
        'id', existing.id,
        'created', false,
        'status', existing.status,
        'reason', 'already_claimed'
      );
    end if;
    raise;
  end;

  return jsonb_build_object('id', new_id, 'created', true, 'status', 'running');
end;
$$;

create or replace function public.finish_agent_action_execution(
  p_action_id uuid,
  p_status text,
  p_provider text default null,
  p_provider_message_id text default null,
  p_error_code text default null,
  p_result_json jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  execution_id uuid;
  current_status text;
  next_action_status text;
  finished_at timestamptz := now();
begin
  if p_status not in ('succeeded','failed','blocked','uncertain') then
    raise exception 'invalid execution status';
  end if;

  select id, status into execution_id, current_status
  from public.agent_action_executions
  where action_id = p_action_id
  for update;

  if execution_id is null then
    raise exception 'agent execution not found';
  end if;

  if current_status <> 'running' then
    return jsonb_build_object('id', execution_id, 'status', current_status, 'changed', false);
  end if;

  update public.agent_action_executions
  set status = p_status,
      provider = nullif(btrim(p_provider), ''),
      provider_message_id = nullif(btrim(p_provider_message_id), ''),
      error_code = nullif(left(btrim(p_error_code), 240), ''),
      result_json = coalesce(p_result_json, '{}'::jsonb),
      completed_at = finished_at
  where id = execution_id;

  next_action_status := case p_status
    when 'succeeded' then 'completed'
    when 'blocked' then 'cancelled'
    when 'failed' then 'failed'
    when 'uncertain' then 'executing'
    else 'failed'
  end;

  update public.agent_actions
  set status = next_action_status,
      completed_at = case when p_status = 'uncertain' then null else finished_at end
  where id = p_action_id
    and status = 'executing';

  return jsonb_build_object(
    'id', execution_id,
    'status', p_status,
    'actionStatus', next_action_status,
    'changed', true
  );
end;
$$;

revoke all on function public.claim_agent_action_execution(uuid, text) from public;
revoke all on function public.claim_agent_action_execution(uuid, text) from anon, authenticated;
grant execute on function public.claim_agent_action_execution(uuid, text) to service_role;

revoke all on function public.finish_agent_action_execution(uuid, text, text, text, text, jsonb) from public;
revoke all on function public.finish_agent_action_execution(uuid, text, text, text, text, jsonb) from anon, authenticated;
grant execute on function public.finish_agent_action_execution(uuid, text, text, text, text, jsonb) to service_role;

comment on table public.agent_action_executions is
  'Service-only execution receipts. One action can be claimed once; uncertain provider outcomes remain non-retryable until manually reconciled.';
comment on function public.claim_agent_action_execution(uuid, text) is
  'Atomically claims only an approved medium-risk Customer Success external communication action.';
comment on function public.finish_agent_action_execution(uuid, text, text, text, text, jsonb) is
  'Finalizes an execution receipt and its action state. Uncertain executions deliberately leave the action executing.';

commit;
