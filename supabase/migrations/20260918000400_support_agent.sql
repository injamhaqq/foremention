-- Foremention Agent OS Phase 4: customer support intake + service-only diagnostics.
-- Support tickets are customer-created workspace records. Internal diagnostic
-- snapshots stay service-only and never become product evidence.

begin;

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  requester_id uuid not null references auth.users(id) on delete cascade,
  requester_email text not null constraint support_tickets_requester_email_check check (
    char_length(requester_email) between 3 and 320
  ),
  category text not null constraint support_tickets_category_check check (
    category in ('account','collection','evidence','integration','billing','other')
  ),
  subject text not null constraint support_tickets_subject_check check (
    char_length(subject) between 3 and 180
  ),
  message text not null constraint support_tickets_message_check check (
    char_length(message) between 10 and 4000
  ),
  status text not null default 'new' constraint support_tickets_status_check check (
    status in ('new','triaged','reply_pending','responded','closed')
  ),
  responded_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint support_tickets_response_state_check check (
    (status = 'responded' and responded_at is not null)
    or (status <> 'responded')
  ),
  constraint support_tickets_closed_state_check check (
    (status = 'closed' and closed_at is not null)
    or (status <> 'closed')
  )
);

create index if not exists support_tickets_requester_created_idx
  on public.support_tickets (requester_id, created_at desc);
create index if not exists support_tickets_org_status_created_idx
  on public.support_tickets (organization_id, status, created_at desc);

create trigger support_tickets_updated_at
  before update on public.support_tickets
  for each row execute function public.set_updated_at();

alter table public.support_tickets enable row level security;

drop policy if exists "support_tickets_select_requester" on public.support_tickets;
create policy "support_tickets_select_requester"
  on public.support_tickets for select
  using (
    requester_id = auth.uid()
    and public.is_org_member(organization_id)
  );

drop policy if exists "support_tickets_insert_requester" on public.support_tickets;
create policy "support_tickets_insert_requester"
  on public.support_tickets for insert
  with check (
    requester_id = auth.uid()
    and public.is_org_member(organization_id)
  );

revoke all on table public.support_tickets from public;
revoke all on table public.support_tickets from anon;
grant select, insert on table public.support_tickets to authenticated;
grant select, insert, update, delete on table public.support_tickets to service_role;

create table if not exists public.support_ticket_diagnostics (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null unique references public.support_tickets(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  facts_json jsonb not null default '{}'::jsonb constraint support_ticket_diagnostics_facts_check check (
    jsonb_typeof(facts_json) = 'object'
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_ticket_diagnostics_org_created_idx
  on public.support_ticket_diagnostics (organization_id, created_at desc);

create trigger support_ticket_diagnostics_updated_at
  before update on public.support_ticket_diagnostics
  for each row execute function public.set_updated_at();

alter table public.support_ticket_diagnostics enable row level security;
revoke all on table public.support_ticket_diagnostics from public;
revoke all on table public.support_ticket_diagnostics from anon, authenticated;
grant select, insert, update, delete on table public.support_ticket_diagnostics to service_role;

comment on table public.support_tickets is
  'Customer-initiated support requests. Authenticated customers can create and read only their own workspace tickets.';
comment on table public.support_ticket_diagnostics is
  'Service-only deterministic support diagnostics. These facts guide support triage and are not Recommendation Intelligence evidence.';

-- The Phase 2 reasoning ledger originally required a reviewed collection run.
-- Support requests can legitimately exist before any collection. Preserve the
-- original run-bound contract while allowing a separate support-ticket context.
alter table public.agent_reasoning_runs
  alter column run_id drop not null,
  add column if not exists support_ticket_id uuid references public.support_tickets(id) on delete cascade;

alter table public.agent_reasoning_runs
  add constraint agent_reasoning_runs_context_check check (
    (run_id is not null and support_ticket_id is null)
    or (run_id is null and support_ticket_id is not null)
  );

create index if not exists agent_reasoning_runs_support_ticket_idx
  on public.agent_reasoning_runs (support_ticket_id, agent_id, created_at desc)
  where support_ticket_id is not null;

create or replace function public.reserve_agent_support_reasoning_run(
  p_organization_id uuid,
  p_project_id uuid,
  p_support_ticket_id uuid,
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
as $
declare
  existing_id uuid;
  reserved_usd numeric(14,6) := 0;
  new_id uuid;
  cycle_start timestamptz := (date_trunc('day', now() at time zone 'utc') at time zone 'utc');
begin
  if p_agent_id <> 'support' then
    return jsonb_build_object('reason', 'support_agent_required');
  end if;
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
    select 1
    from public.support_tickets
    where id = p_support_ticket_id
      and organization_id = p_organization_id
      and project_id = p_project_id
      and status in ('new','triaged','reply_pending')
  ) then
    return jsonb_build_object('reason', 'active_support_ticket_required');
  end if;

  select id into existing_id
  from public.agent_reasoning_runs
  where idempotency_key = p_idempotency_key
  limit 1;

  if existing_id is not null then
    return jsonb_build_object('id', existing_id, 'created', false);
  end if;

  perform pg_advisory_xact_lock(hashtext('foremention:agent-reasoning:' || current_date::text));

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
    organization_id, project_id, run_id, support_ticket_id, agent_id, task_type,
    model, prompt_version, status, idempotency_key, input_hash, input_chars,
    max_output_tokens, estimated_max_cost_usd, started_at
  ) values (
    p_organization_id, p_project_id, null, p_support_ticket_id, p_agent_id, p_task_type,
    p_model, p_prompt_version, 'running', p_idempotency_key, p_input_hash, p_input_chars,
    p_max_output_tokens, p_estimated_max_cost_usd, now()
  ) returning id into new_id;

  return jsonb_build_object(
    'id', new_id,
    'created', true,
    'reservedUsd', reserved_usd + p_estimated_max_cost_usd,
    'remainingUsd', p_daily_cost_cap_usd - reserved_usd - p_estimated_max_cost_usd
  );
end;
$;

revoke all on function public.reserve_agent_support_reasoning_run(uuid, uuid, uuid, text, text, text, text, text, text, integer, integer, numeric, numeric) from public;
revoke all on function public.reserve_agent_support_reasoning_run(uuid, uuid, uuid, text, text, text, text, text, text, integer, integer, numeric, numeric) from anon, authenticated;
grant execute on function public.reserve_agent_support_reasoning_run(uuid, uuid, uuid, text, text, text, text, text, text, integer, integer, numeric, numeric) to service_role;

comment on function public.reserve_agent_support_reasoning_run(uuid, uuid, uuid, text, text, text, text, text, text, integer, integer, numeric, numeric) is
  'Atomically reserves bounded Support Agent reasoning cost against a real active support ticket without fabricating a collection run.';

commit;
