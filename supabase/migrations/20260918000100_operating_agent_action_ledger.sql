-- Foremention operating-agent action ledger.
-- Service-only by design. This table records what an operating agent observed or
-- proposes; it does not grant the agent direct browser, payment, production,
-- destructive, legal, or outbound communication privileges.

begin;

create table if not exists public.agent_actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  run_id uuid references public.runs(id) on delete set null,
  agent_id text not null constraint agent_actions_agent_check check (
    agent_id in ('research-insight','customer-success','onboarding','sales','marketing','support','product','qa','engineering','finance-ops','ceo')
  ),
  action_type text not null constraint agent_actions_type_check check (char_length(btrim(action_type)) between 2 and 120),
  effect_class text not null constraint agent_actions_effect_check check (
    effect_class in ('observe','internal_write','external_communication','commercial_commitment','financial','production_change','destructive','legal_compliance')
  ),
  risk_level text not null constraint agent_actions_risk_check check (risk_level in ('low','medium','high','critical')),
  status text not null default 'proposed' constraint agent_actions_status_check check (
    status in ('proposed','pending_approval','approved','rejected','executing','completed','failed','cancelled')
  ),
  title text not null constraint agent_actions_title_check check (char_length(btrim(title)) between 2 and 240),
  rationale text not null constraint agent_actions_rationale_check check (char_length(btrim(rationale)) between 2 and 4000),
  confidence numeric(4,3) constraint agent_actions_confidence_check check (confidence is null or confidence between 0 and 1),
  evidence_json jsonb not null default '[]'::jsonb constraint agent_actions_evidence_check check (jsonb_typeof(evidence_json) = 'array'),
  payload_json jsonb not null default '{}'::jsonb constraint agent_actions_payload_check check (jsonb_typeof(payload_json) = 'object'),
  requires_approval boolean not null default true,
  decision_note text constraint agent_actions_decision_note_check check (decision_note is null or char_length(decision_note) <= 2000),
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  estimated_cost_usd numeric(14,6) constraint agent_actions_cost_check check (estimated_cost_usd is null or estimated_cost_usd >= 0),
  idempotency_key text not null unique constraint agent_actions_idempotency_check check (char_length(idempotency_key) between 8 and 240),
  executed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agent_actions_scope_check check (
    project_id is null or organization_id is not null
  ),
  constraint agent_actions_consequential_approval_check check (
    effect_class not in ('external_communication','commercial_commitment','financial','production_change','destructive','legal_compliance')
    or requires_approval = true
  ),
  constraint agent_actions_decision_check check (
    (decided_at is null and decided_by is null)
    or (decided_at is not null and decided_by is not null)
  )
);

create index if not exists agent_actions_status_created_idx on public.agent_actions (status, created_at desc);
create index if not exists agent_actions_org_status_idx on public.agent_actions (organization_id, status, created_at desc) where organization_id is not null;
create index if not exists agent_actions_agent_created_idx on public.agent_actions (agent_id, created_at desc);

create trigger agent_actions_updated_at
  before update on public.agent_actions
  for each row execute function public.set_updated_at();

alter table public.agent_actions enable row level security;
revoke all on table public.agent_actions from public;
revoke all on table public.agent_actions from anon, authenticated;
grant select, insert, update, delete on table public.agent_actions to service_role;

comment on table public.agent_actions is 'Service-only operating-agent ledger. Consequential effects remain approval-gated; a row is not proof that an external action executed.';
comment on column public.agent_actions.confidence is 'Optional explicit confidence only when a producing agent has a defensible method. NULL is preferred over invented precision.';
comment on column public.agent_actions.evidence_json is 'Inspectable evidence references supporting the observation or proposal; never a substitute for source review.';

commit;
