-- Collaboration, in-app alerts, and reversible account lifecycle controls.
-- The admin enum value is committed by the immediately preceding migration.
begin;

alter table public.organization_members
  add column if not exists member_email text,
  add column if not exists invited_by uuid references auth.users(id) on delete set null;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_key text not null,
  kind text not null check (kind in ('run_ready','run_failed','source_map_published','evidence_review','workspace')),
  title text not null,
  body text not null,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, event_key, user_id)
);

create table if not exists public.notification_preferences (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  in_app_enabled boolean not null default true,
  email_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','cancelled','completed')),
  scheduled_for timestamptz not null,
  reason text,
  cancelled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists account_deletion_requests_one_pending_idx
  on public.account_deletion_requests (organization_id)
  where status = 'pending';
create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);
create index if not exists invitations_org_status_idx
  on public.invitations (organization_id, status, expires_at);

drop trigger if exists notification_preferences_updated_at on public.notification_preferences;
create trigger notification_preferences_updated_at
  before update on public.notification_preferences
  for each row execute function public.set_updated_at();
drop trigger if exists account_deletion_requests_updated_at on public.account_deletion_requests;
create trigger account_deletion_requests_updated_at
  before update on public.account_deletion_requests
  for each row execute function public.set_updated_at();

alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.account_deletion_requests enable row level security;

drop policy if exists "notifications_select_self" on public.notifications;
create policy "notifications_select_self"
  on public.notifications for select
  using (user_id = auth.uid() and public.is_org_member(organization_id));
drop policy if exists "notifications_update_self" on public.notifications;
create policy "notifications_update_self"
  on public.notifications for update
  using (user_id = auth.uid() and public.is_org_member(organization_id))
  with check (user_id = auth.uid() and public.is_org_member(organization_id));

drop policy if exists "notification_preferences_select_self" on public.notification_preferences;
create policy "notification_preferences_select_self"
  on public.notification_preferences for select
  using (user_id = auth.uid() and public.is_org_member(organization_id));
drop policy if exists "notification_preferences_write_self" on public.notification_preferences;
create policy "notification_preferences_write_self"
  on public.notification_preferences for all
  using (user_id = auth.uid() and public.is_org_member(organization_id))
  with check (user_id = auth.uid() and public.is_org_member(organization_id));

drop policy if exists "account_deletion_requests_select_owner" on public.account_deletion_requests;
create policy "account_deletion_requests_select_owner"
  on public.account_deletion_requests for select
  using (
    requested_by = auth.uid()
    and public.has_org_role(organization_id, array['owner']::public.organization_role[])
  );

-- Admins can operate customer workflows but cannot transfer ownership,
-- change organization ownership, or delete an organization directly.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'categories','prompts','runs','sources','source_maps','source_map_entries',
    'placements','placement_events','projects','domains','competitors',
    'prompt_clusters','prompt_versions','run_attempts','answer_brand_mentions',
    'source_brand_mentions','source_observations','source_contacts','source_routes',
    'opportunities','opportunity_scores','evidence_items','verified_claims',
    'placement_activities','outreach_actions','approvals','indexing_checks',
    'citation_observations','referral_metrics','crm_attribution_events','jobs',
    'audit_logs','run_prompt_selections'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', table_name || '_write_admin', table_name);
    execute format(
      'create policy %I on public.%I for all using (public.has_org_role(organization_id, array[''admin'']::public.organization_role[])) with check (public.has_org_role(organization_id, array[''admin'']::public.organization_role[]))',
      table_name || '_write_admin',
      table_name
    );
  end loop;
end $$;

drop policy if exists "invitations_write_admin" on public.invitations;
create policy "invitations_write_admin"
  on public.invitations for all
  using (public.has_org_role(organization_id, array['admin']::public.organization_role[]))
  with check (public.has_org_role(organization_id, array['admin']::public.organization_role[]));

drop policy if exists "invitations_select_member" on public.invitations;
drop policy if exists "invitations_select_manager" on public.invitations;
create policy "invitations_select_manager"
  on public.invitations for select
  using (public.has_org_role(organization_id, array['owner','admin']::public.organization_role[]));

grant select, update on public.notifications to authenticated;
grant select, insert, update on public.notification_preferences to authenticated;
grant select on public.account_deletion_requests to authenticated;

commit;
