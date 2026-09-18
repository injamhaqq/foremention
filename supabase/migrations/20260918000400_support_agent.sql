-- Foremention Agent OS Phase 4: customer support intake + service-only diagnostics.
-- Support tickets are customer-created workspace records. Internal diagnostic
-- snapshots stay service-only and never become product evidence.

begin;

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
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

commit;
