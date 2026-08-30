-- Foremention Reporting + Executive Communication v1
-- Additive only. Recommendation Records, reviewed comparisons, and the Outcome Ledger
-- remain the underlying truth stores. Report snapshots are immutable communication artifacts.

begin;

create table if not exists public.report_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  report_type text not null check (report_type in (
    'recommendation_record',
    'weekly_operator_summary',
    'executive_digest',
    'monthly_review',
    'quarterly_business_review',
    'competitor_intelligence_brief',
    'action_outcome_report',
    'board_ready_summary',
    'agency_client_report'
  )),
  title text not null check (char_length(title) between 3 and 180),
  schema_version text not null default 'foremention.report_snapshot.v1' check (schema_version = 'foremention.report_snapshot.v1'),
  generated_at timestamptz not null default now(),
  data_as_of timestamptz not null,
  period_start timestamptz,
  period_end timestamptz,
  source_record_ids uuid[] not null,
  source_run_ids uuid[] not null default '{}',
  truth jsonb not null,
  private_payload jsonb not null,
  public_payload jsonb not null,
  executive_summary text not null,
  causality_boundary text not null,
  integrity_sha256 text not null check (integrity_sha256 ~ '^[a-f0-9]{64}$'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (cardinality(source_record_ids) >= 1),
  check (period_start is null or period_end is null or period_end >= period_start)
);

create index if not exists report_snapshots_org_created_idx
  on public.report_snapshots (organization_id, created_at desc);
create index if not exists report_snapshots_project_type_idx
  on public.report_snapshots (organization_id, project_id, report_type, generated_at desc);
create index if not exists report_snapshots_source_records_gin
  on public.report_snapshots using gin (source_record_ids);
create index if not exists report_snapshots_source_runs_gin
  on public.report_snapshots using gin (source_run_ids);

create table if not exists public.report_schedules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  report_type text not null check (report_type in (
    'recommendation_record',
    'weekly_operator_summary',
    'executive_digest',
    'monthly_review',
    'quarterly_business_review',
    'competitor_intelligence_brief',
    'action_outcome_report',
    'board_ready_summary',
    'agency_client_report'
  )),
  name text not null check (char_length(name) between 3 and 120),
  cadence text not null check (cadence in ('manual','weekly','monthly','quarterly')),
  timezone text not null default 'UTC' check (char_length(timezone) between 1 and 80),
  source_selector jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  next_run_at timestamptz,
  last_run_at timestamptz,
  last_report_snapshot_id uuid references public.report_snapshots(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((cadence = 'manual' and next_run_at is null) or cadence <> 'manual')
);

create index if not exists report_schedules_due_idx
  on public.report_schedules (enabled, next_run_at)
  where enabled = true and cadence <> 'manual';
create index if not exists report_schedules_org_idx
  on public.report_schedules (organization_id, created_at desc);

create table if not exists public.report_recipients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  schedule_id uuid not null references public.report_schedules(id) on delete cascade,
  email text not null check (char_length(email) between 3 and 320),
  display_name text,
  active boolean not null default true,
  unsubscribe_token_hash text unique check (unsubscribe_token_hash is null or unsubscribe_token_hash ~ '^[a-f0-9]{64}$'),
  unsubscribed_at timestamptz,
  unsubscribe_reason text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (schedule_id, email),
  check (unsubscribed_at is null or active = false)
);

create index if not exists report_recipients_schedule_idx
  on public.report_recipients (organization_id, schedule_id, active);

create table if not exists public.report_delivery_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  schedule_id uuid references public.report_schedules(id) on delete set null,
  report_snapshot_id uuid not null references public.report_snapshots(id) on delete cascade,
  recipient_id uuid references public.report_recipients(id) on delete set null,
  attempt_number integer not null default 1 check (attempt_number between 1 and 20),
  status text not null check (status in ('queued','sent','delivered','failed','blocked','unsubscribed','skipped')),
  provider text,
  provider_message_id text,
  error_signature text,
  attempted_at timestamptz not null default now(),
  delivered_at timestamptz,
  next_retry_at timestamptz,
  created_at timestamptz not null default now(),
  check (status <> 'delivered' or delivered_at is not null)
);

create index if not exists report_delivery_log_org_created_idx
  on public.report_delivery_log (organization_id, created_at desc);
create index if not exists report_delivery_log_retry_idx
  on public.report_delivery_log (status, next_retry_at)
  where status = 'failed' and next_retry_at is not null;

create table if not exists public.report_shares (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  report_snapshot_id uuid not null references public.report_snapshots(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (expires_at > created_at)
);

create index if not exists report_shares_org_idx
  on public.report_shares (organization_id, report_snapshot_id, created_at desc);
create index if not exists report_shares_active_token_idx
  on public.report_shares (token_hash, expires_at)
  where revoked_at is null;

create table if not exists public.report_share_access_log (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  report_snapshot_id uuid not null references public.report_snapshots(id) on delete cascade,
  report_share_id uuid not null references public.report_shares(id) on delete cascade,
  outcome text not null default 'resolved' check (outcome in ('resolved','expired','revoked')),
  request_fingerprint_hash text,
  user_agent_hash text,
  accessed_at timestamptz not null default now()
);

create index if not exists report_share_access_log_share_idx
  on public.report_share_access_log (report_share_id, accessed_at desc);
create index if not exists report_share_access_log_org_idx
  on public.report_share_access_log (organization_id, accessed_at desc);

create trigger report_schedules_updated_at
  before update on public.report_schedules
  for each row execute function public.set_updated_at();
create trigger report_recipients_updated_at
  before update on public.report_recipients
  for each row execute function public.set_updated_at();

alter table public.report_snapshots enable row level security;
alter table public.report_schedules enable row level security;
alter table public.report_recipients enable row level security;
alter table public.report_delivery_log enable row level security;
alter table public.report_shares enable row level security;
alter table public.report_share_access_log enable row level security;

create policy "report_snapshots_select_member" on public.report_snapshots
  for select using (public.is_org_member(organization_id));
create policy "report_snapshots_insert_operator" on public.report_snapshots
  for insert with check (
    exists (
      select 1 from public.organization_members member
      where member.organization_id = report_snapshots.organization_id
        and member.user_id = (select auth.uid())
        and member.role::text in ('owner','admin','analyst')
    )
  );

create policy "report_schedules_select_member" on public.report_schedules
  for select using (public.is_org_member(organization_id));
create policy "report_schedules_insert_operator" on public.report_schedules
  for insert with check (
    exists (
      select 1 from public.organization_members member
      where member.organization_id = report_schedules.organization_id
        and member.user_id = (select auth.uid())
        and member.role::text in ('owner','admin','analyst')
    )
  );
create policy "report_schedules_update_operator" on public.report_schedules
  for update using (
    exists (
      select 1 from public.organization_members member
      where member.organization_id = report_schedules.organization_id
        and member.user_id = (select auth.uid())
        and member.role::text in ('owner','admin','analyst')
    )
  ) with check (
    exists (
      select 1 from public.organization_members member
      where member.organization_id = report_schedules.organization_id
        and member.user_id = (select auth.uid())
        and member.role::text in ('owner','admin','analyst')
    )
  );
create policy "report_schedules_delete_owner_admin" on public.report_schedules
  for delete using (
    exists (
      select 1 from public.organization_members member
      where member.organization_id = report_schedules.organization_id
        and member.user_id = (select auth.uid())
        and member.role::text in ('owner','admin')
    )
  );

create policy "report_recipients_select_operator" on public.report_recipients
  for select using (
    exists (
      select 1 from public.organization_members member
      where member.organization_id = report_recipients.organization_id
        and member.user_id = (select auth.uid())
        and member.role::text in ('owner','admin','analyst')
    )
  );
create policy "report_recipients_insert_operator" on public.report_recipients
  for insert with check (
    exists (
      select 1 from public.organization_members member
      where member.organization_id = report_recipients.organization_id
        and member.user_id = (select auth.uid())
        and member.role::text in ('owner','admin','analyst')
    )
  );
create policy "report_recipients_update_operator" on public.report_recipients
  for update using (
    exists (
      select 1 from public.organization_members member
      where member.organization_id = report_recipients.organization_id
        and member.user_id = (select auth.uid())
        and member.role::text in ('owner','admin','analyst')
    )
  ) with check (
    exists (
      select 1 from public.organization_members member
      where member.organization_id = report_recipients.organization_id
        and member.user_id = (select auth.uid())
        and member.role::text in ('owner','admin','analyst')
    )
  );
create policy "report_recipients_delete_owner_admin" on public.report_recipients
  for delete using (
    exists (
      select 1 from public.organization_members member
      where member.organization_id = report_recipients.organization_id
        and member.user_id = (select auth.uid())
        and member.role::text in ('owner','admin')
    )
  );

create policy "report_delivery_log_select_member" on public.report_delivery_log
  for select using (public.is_org_member(organization_id));
create policy "report_shares_select_member" on public.report_shares
  for select using (public.is_org_member(organization_id));
create policy "report_shares_insert_operator" on public.report_shares
  for insert with check (
    exists (
      select 1 from public.organization_members member
      where member.organization_id = report_shares.organization_id
        and member.user_id = (select auth.uid())
        and member.role::text in ('owner','admin','analyst')
    )
  );
create policy "report_shares_update_operator" on public.report_shares
  for update using (
    exists (
      select 1 from public.organization_members member
      where member.organization_id = report_shares.organization_id
        and member.user_id = (select auth.uid())
        and member.role::text in ('owner','admin','analyst')
    )
  ) with check (
    exists (
      select 1 from public.organization_members member
      where member.organization_id = report_shares.organization_id
        and member.user_id = (select auth.uid())
        and member.role::text in ('owner','admin','analyst')
    )
  );
create policy "report_share_access_log_select_owner_admin" on public.report_share_access_log
  for select using (
    exists (
      select 1 from public.organization_members member
      where member.organization_id = report_share_access_log.organization_id
        and member.user_id = (select auth.uid())
        and member.role::text in ('owner','admin')
    )
  );

-- Public resolution returns the explicitly public-safe payload only. The raw token
-- never enters this function; callers hash it first. SECURITY DEFINER is narrowly
-- scoped to this resolver so anonymous readers cannot query tenant tables directly.
create or replace function public.resolve_report_share(
  p_token_hash text,
  p_request_fingerprint_hash text default null,
  p_user_agent_hash text default null
)
returns table (
  report_id uuid,
  report_type text,
  title text,
  generated_at timestamptz,
  data_as_of timestamptz,
  expires_at timestamptz,
  public_payload jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_share public.report_shares%rowtype;
  v_report public.report_snapshots%rowtype;
begin
  if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then
    return;
  end if;

  select * into v_share
  from public.report_shares share
  where share.token_hash = p_token_hash
    and share.revoked_at is null
    and share.expires_at > now()
  limit 1;

  if not found then return; end if;

  select * into v_report
  from public.report_snapshots snapshot
  where snapshot.id = v_share.report_snapshot_id
    and snapshot.organization_id = v_share.organization_id
  limit 1;

  if not found then return; end if;

  insert into public.report_share_access_log (
    organization_id,
    report_snapshot_id,
    report_share_id,
    outcome,
    request_fingerprint_hash,
    user_agent_hash
  ) values (
    v_share.organization_id,
    v_report.id,
    v_share.id,
    'resolved',
    left(p_request_fingerprint_hash, 128),
    left(p_user_agent_hash, 128)
  );

  return query select
    v_report.id,
    v_report.report_type,
    v_report.title,
    v_report.generated_at,
    v_report.data_as_of,
    v_share.expires_at,
    v_report.public_payload;
end;
$$;

revoke all on function public.resolve_report_share(text, text, text) from public;
grant execute on function public.resolve_report_share(text, text, text) to anon, authenticated;

grant select, insert on public.report_snapshots to authenticated;
grant select, insert, update, delete on public.report_schedules to authenticated;
grant select, insert, update, delete on public.report_recipients to authenticated;
grant select on public.report_delivery_log to authenticated;
grant select, insert, update on public.report_shares to authenticated;
grant select on public.report_share_access_log to authenticated;

-- Background generation/delivery runs use the existing service-role boundary.
grant select, insert, update on public.report_schedules to service_role;
grant select, insert, update on public.report_recipients to service_role;
grant select, insert, update on public.report_delivery_log to service_role;
grant select, insert on public.report_snapshots to service_role;
grant select, insert, update on public.report_shares to service_role;
grant select, insert on public.report_share_access_log to service_role;

commit;
