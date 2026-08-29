-- Foremention Retention Loop v1
-- Additive only: preserve the existing collection, evidence, action and entitlement models.

-- New collaboration roles are additive. Application/RLS logic continues to derive the
-- organization from the authenticated membership rather than trusting browser input.
alter type public.organization_role add value if not exists 'reviewer';
alter type public.organization_role add value if not exists 'stakeholder';

begin;

create table if not exists public.measurement_schedules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  category_id uuid references public.categories(id) on delete cascade,
  name text not null default 'Comparable remeasurement' check (char_length(name) between 3 and 120),
  cadence text not null check (cadence in ('weekly', 'biweekly', 'monthly')),
  timezone text not null default 'UTC' check (char_length(timezone) between 1 and 80),
  question_ids uuid[] not null default '{}',
  provider_ids text[] not null default '{}',
  model_snapshot text,
  methodology_snapshot text not null,
  locale text not null default 'en-US',
  market text not null default 'global',
  enabled boolean not null default true,
  next_run_at timestamptz not null,
  last_run_at timestamptz,
  last_run_id uuid references public.runs(id) on delete set null,
  idempotency_seed uuid not null default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (cardinality(question_ids) between 1 and 100),
  check (cardinality(provider_ids) between 1 and 8)
);

create unique index if not exists measurement_schedules_idempotency_seed_unique
  on public.measurement_schedules (idempotency_seed);
create index if not exists measurement_schedules_due_idx
  on public.measurement_schedules (enabled, next_run_at)
  where enabled = true;
create index if not exists measurement_schedules_workspace_idx
  on public.measurement_schedules (organization_id, project_id, created_at desc);

create table if not exists public.record_shares (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  run_id uuid not null references public.runs(id) on delete cascade,
  token_hash text not null unique check (char_length(token_hash) >= 32),
  include_evidence boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at)
);

create index if not exists record_shares_workspace_idx
  on public.record_shares (organization_id, run_id, created_at desc);
create index if not exists record_shares_token_active_idx
  on public.record_shares (token_hash, expires_at)
  where revoked_at is null;

-- Commercial activation is intentionally separate from the existing usage-entitlement
-- row. This table stores provider lifecycle identifiers only; no price is invented here.
create table if not exists public.billing_accounts (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  provider text not null default 'unconfigured',
  external_customer_id text,
  external_subscription_id text,
  state text not null default 'unconfigured' check (state in ('unconfigured','trialing','active','past_due','paused','cancelled')),
  verified_webhook_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((state = 'unconfigured' and verified_webhook_at is null) or state <> 'unconfigured')
);

-- Reuse the existing private-beta organization_entitlements table rather than
-- creating a parallel commercial truth store.
alter table public.organization_entitlements
  add column if not exists package_key text not null default 'private_beta',
  add column if not exists feature_keys text[] not null default '{}',
  add column if not exists billing_source text not null default 'founder_grant',
  add column if not exists effective_at timestamptz not null default now(),
  add column if not exists expires_at timestamptz;

alter table public.organization_entitlements
  drop constraint if exists organization_entitlements_package_key_check;
alter table public.organization_entitlements
  add constraint organization_entitlements_package_key_check
  check (package_key in ('private_beta','core','signal','intelligence','custom'));

-- Existing owner_id remains the canonical action owner. These fields make ownership,
-- due dates and non-causal remeasurement explicit without replacing placements.
alter table public.placements
  add column if not exists due_at timestamptz,
  add column if not exists priority text not null default 'normal',
  add column if not exists baseline_run_id uuid references public.runs(id) on delete set null,
  add column if not exists remeasurement_run_id uuid references public.runs(id) on delete set null,
  add column if not exists remeasurement_due_at timestamptz;

alter table public.placements
  drop constraint if exists placements_priority_check;
alter table public.placements
  add constraint placements_priority_check check (priority in ('low','normal','high','critical'));

-- Prompt locale already exists. Market is additive and becomes part of any exact
-- comparison snapshot. Historical rows truthfully default to global.
alter table public.prompts
  add column if not exists market text not null default 'global';

alter table if exists public.prompt_versions
  add column if not exists locale text not null default 'en-US',
  add column if not exists market text not null default 'global';

alter table if exists public.run_prompt_selections
  add column if not exists locale text not null default 'en-US',
  add column if not exists market text not null default 'global';

create trigger measurement_schedules_updated_at
  before update on public.measurement_schedules
  for each row execute function public.set_updated_at();
create trigger billing_accounts_updated_at
  before update on public.billing_accounts
  for each row execute function public.set_updated_at();

alter table public.measurement_schedules enable row level security;
alter table public.record_shares enable row level security;
alter table public.billing_accounts enable row level security;

create policy "measurement_schedules_select_member" on public.measurement_schedules
  for select using (public.is_org_member(organization_id));
create policy "measurement_schedules_insert_operator" on public.measurement_schedules
  for insert with check (
    exists (
      select 1 from public.organization_members member
      where member.organization_id = measurement_schedules.organization_id
        and member.user_id = (select auth.uid())
        and member.role::text in ('owner','admin','analyst')
    )
  );
create policy "measurement_schedules_update_operator" on public.measurement_schedules
  for update using (
    exists (
      select 1 from public.organization_members member
      where member.organization_id = measurement_schedules.organization_id
        and member.user_id = (select auth.uid())
        and member.role::text in ('owner','admin','analyst')
    )
  ) with check (
    exists (
      select 1 from public.organization_members member
      where member.organization_id = measurement_schedules.organization_id
        and member.user_id = (select auth.uid())
        and member.role::text in ('owner','admin','analyst')
    )
  );
create policy "measurement_schedules_delete_owner_admin" on public.measurement_schedules
  for delete using (
    exists (
      select 1 from public.organization_members member
      where member.organization_id = measurement_schedules.organization_id
        and member.user_id = (select auth.uid())
        and member.role::text in ('owner','admin')
    )
  );

create policy "record_shares_select_member" on public.record_shares
  for select using (public.is_org_member(organization_id));
create policy "record_shares_insert_operator" on public.record_shares
  for insert with check (
    exists (
      select 1 from public.organization_members member
      where member.organization_id = record_shares.organization_id
        and member.user_id = (select auth.uid())
        and member.role::text in ('owner','admin','analyst')
    )
  );
create policy "record_shares_update_operator" on public.record_shares
  for update using (
    exists (
      select 1 from public.organization_members member
      where member.organization_id = record_shares.organization_id
        and member.user_id = (select auth.uid())
        and member.role::text in ('owner','admin','analyst')
    )
  ) with check (
    exists (
      select 1 from public.organization_members member
      where member.organization_id = record_shares.organization_id
        and member.user_id = (select auth.uid())
        and member.role::text in ('owner','admin','analyst')
    )
  );

-- Billing account state is readable by members but writable only through trusted
-- server/service-role processing after a verified webhook.
create policy "billing_accounts_select_member" on public.billing_accounts
  for select using (public.is_org_member(organization_id));

grant select, insert, update, delete on public.measurement_schedules to authenticated;
grant select, insert, update on public.record_shares to authenticated;
grant select on public.billing_accounts to authenticated;

commit;
