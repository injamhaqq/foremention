-- Reconcile the additive product schema that production skipped, then remove
-- anonymous access to trusted SECURITY DEFINER functions in the exposed API.
-- Every object change is idempotent so this remains safe after the original
-- timestamped migrations have already run in a fresh environment.
begin;

alter table public.sources
  add column if not exists content_signature text,
  add column if not exists content_length integer check (content_length is null or content_length >= 0),
  add column if not exists last_reachable_at timestamptz,
  add column if not exists last_content_change_at timestamptz;

comment on column public.sources.content_signature is
  'A bounded 32-bit similarity fingerprint of visible text. It is not page content or a page review.';

create table if not exists public.verified_claim_evidence (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  claim_id uuid not null references public.verified_claims(id) on delete cascade,
  evidence_item_id uuid not null references public.evidence_items(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (claim_id, evidence_item_id)
);

insert into public.verified_claim_evidence (organization_id, claim_id, evidence_item_id)
select organization_id, id, evidence_item_id
from public.verified_claims
where evidence_item_id is not null
on conflict do nothing;

create index if not exists verified_claim_evidence_org_idx
  on public.verified_claim_evidence (organization_id, claim_id);
alter table public.verified_claim_evidence enable row level security;
drop policy if exists "verified_claim_evidence_select_member" on public.verified_claim_evidence;
create policy "verified_claim_evidence_select_member"
  on public.verified_claim_evidence for select to authenticated
  using (public.is_org_member(organization_id));
drop policy if exists "verified_claim_evidence_write_analyst" on public.verified_claim_evidence;
create policy "verified_claim_evidence_write_analyst"
  on public.verified_claim_evidence for all to authenticated
  using (public.has_org_role(organization_id, array['owner','admin','analyst']::public.organization_role[]))
  with check (public.has_org_role(organization_id, array['owner','admin','analyst']::public.organization_role[]));
grant select, insert, update, delete on public.verified_claim_evidence to authenticated;

alter table public.verified_claims
  add column if not exists verification_status text not null default 'pending',
  add column if not exists verification_note text;
alter table public.verified_claims drop constraint if exists verified_claims_verification_status_check;
alter table public.verified_claims add constraint verified_claims_verification_status_check
  check (verification_status in ('pending','verified','disputed'));
update public.verified_claims
set verification_status = 'verified'
where verified_at is not null and verification_status = 'pending';

alter table public.notification_preferences
  add column if not exists weekly_digest_enabled boolean not null default true,
  add column if not exists unsubscribed_at timestamptz;

create table if not exists public.application_email_deliveries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_key text not null,
  kind text not null,
  status text not null default 'pending' check (status in ('pending','sent','failed','skipped')),
  provider_message_id text,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id, event_key)
);
create index if not exists application_email_deliveries_user_idx
  on public.application_email_deliveries (user_id, created_at desc);
alter table public.application_email_deliveries enable row level security;
drop policy if exists "application_email_deliveries_select_self" on public.application_email_deliveries;
create policy "application_email_deliveries_select_self"
  on public.application_email_deliveries for select to authenticated
  using (user_id = (select auth.uid()) and public.is_org_member(organization_id));
grant select on public.application_email_deliveries to authenticated;

create table if not exists public.workspace_webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 80),
  destination_url text not null check (char_length(destination_url) between 12 and 2048),
  event_types text[] not null default '{}',
  active boolean not null default true,
  secret_hint text not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists workspace_webhook_endpoints_org_idx
  on public.workspace_webhook_endpoints (organization_id, created_at desc);

create table if not exists public.workspace_webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  endpoint_id uuid not null references public.workspace_webhook_endpoints(id) on delete cascade,
  event_key text not null,
  event_type text not null,
  status text not null default 'pending' check (status in ('pending','delivered','failed')),
  attempt_count integer not null default 0 check (attempt_count between 0 and 10),
  response_status integer,
  error_code text,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (endpoint_id, event_key)
);
create index if not exists workspace_webhook_deliveries_org_idx
  on public.workspace_webhook_deliveries (organization_id, created_at desc);

alter table public.workspace_webhook_endpoints enable row level security;
alter table public.workspace_webhook_deliveries enable row level security;
drop policy if exists "workspace_webhook_endpoints_select_member" on public.workspace_webhook_endpoints;
create policy "workspace_webhook_endpoints_select_member"
  on public.workspace_webhook_endpoints for select to authenticated
  using (public.is_org_member(organization_id));
drop policy if exists "workspace_webhook_endpoints_write_admin" on public.workspace_webhook_endpoints;
create policy "workspace_webhook_endpoints_write_admin"
  on public.workspace_webhook_endpoints for all to authenticated
  using (public.has_org_role(organization_id, array['owner','admin']::public.organization_role[]))
  with check (public.has_org_role(organization_id, array['owner','admin']::public.organization_role[]));
drop policy if exists "workspace_webhook_deliveries_select_member" on public.workspace_webhook_deliveries;
create policy "workspace_webhook_deliveries_select_member"
  on public.workspace_webhook_deliveries for select to authenticated
  using (public.is_org_member(organization_id));
grant select, insert, update, delete on public.workspace_webhook_endpoints to authenticated;
grant select on public.workspace_webhook_deliveries to authenticated;

create table if not exists public.workspace_comments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  entity_type text not null check (entity_type in ('source_map_entry','priority_gap','evidence_item')),
  entity_id uuid not null,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists workspace_comments_entity_idx
  on public.workspace_comments (organization_id, entity_type, entity_id, created_at asc);
alter table public.workspace_comments enable row level security;
drop policy if exists "workspace_comments_select_member" on public.workspace_comments;
create policy "workspace_comments_select_member"
  on public.workspace_comments for select to authenticated
  using (public.is_org_member(organization_id));
drop policy if exists "workspace_comments_insert_member" on public.workspace_comments;
create policy "workspace_comments_insert_member"
  on public.workspace_comments for insert to authenticated
  with check (author_id = (select auth.uid()) and public.is_org_member(organization_id));
drop policy if exists "workspace_comments_update_author" on public.workspace_comments;
create policy "workspace_comments_update_author"
  on public.workspace_comments for update to authenticated
  using (author_id = (select auth.uid()) and public.is_org_member(organization_id))
  with check (author_id = (select auth.uid()) and public.is_org_member(organization_id));
drop policy if exists "workspace_comments_delete_author_or_admin" on public.workspace_comments;
create policy "workspace_comments_delete_author_or_admin"
  on public.workspace_comments for delete to authenticated
  using (
    (author_id = (select auth.uid()) and public.is_org_member(organization_id))
    or public.has_org_role(organization_id, array['owner','admin']::public.organization_role[])
  );
grant select, insert, update, delete on public.workspace_comments to authenticated;

create table if not exists public.integration_credentials (
  integration_id uuid primary key references public.integrations(id) on delete cascade,
  encrypted_access_token text not null,
  encrypted_refresh_token text not null,
  updated_at timestamptz not null default now()
);
alter table public.integration_credentials enable row level security;
revoke all on public.integration_credentials from anon, authenticated;

create table if not exists public.integration_activity_deliveries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  integration_id uuid not null references public.integrations(id) on delete cascade,
  provider text not null,
  event_key text not null,
  status text not null check (status in ('pending','delivered','failed')),
  external_id text,
  error_summary text,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider, event_key)
);
alter table public.integration_activity_deliveries enable row level security;
drop policy if exists "integration_activity_deliveries_read_member" on public.integration_activity_deliveries;
create policy "integration_activity_deliveries_read_member"
  on public.integration_activity_deliveries for select to authenticated
  using (public.is_org_member(organization_id));
revoke insert, update, delete on public.integration_activity_deliveries from authenticated, anon;
grant select on public.integration_activity_deliveries to authenticated;
grant select, insert, update, delete on public.integration_credentials, public.integration_activity_deliveries to service_role;

alter table public.organizations
  add column if not exists public_report_enabled boolean not null default false;

create table if not exists public.data_deletion_receipts (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  organization_hash text not null,
  requester_hash text not null,
  record_counts jsonb not null default '{}'::jsonb,
  email_delivery_status text not null default 'pending' check (email_delivery_status in ('pending','sent','not_configured','failed')),
  session_revocation_status text not null default 'pending' check (session_revocation_status in ('pending','revoked','failed')),
  completed_at timestamptz not null default now()
);
alter table public.data_deletion_receipts enable row level security;
revoke all on public.data_deletion_receipts from anon, authenticated;
grant select, insert, update on public.data_deletion_receipts to service_role;

create or replace function public.execute_foremention_account_deletion(
  p_request_id uuid,
  p_requested_by uuid
)
returns table(receipt_id uuid, deleted_organization_id uuid, record_counts jsonb)
language plpgsql
security definer
set search_path = ''
as $$
declare
  deletion_request public.account_deletion_requests%rowtype;
  counts jsonb;
  receipt uuid;
begin
  select * into deletion_request
  from public.account_deletion_requests
  where id = p_request_id and requested_by = p_requested_by and status = 'pending'
  for update;

  if deletion_request.id is null then raise exception 'Eligible deletion request not found'; end if;
  if deletion_request.scheduled_for > now() then raise exception 'Deletion safety window is still active'; end if;
  if not exists (
    select 1 from public.organization_members
    where organization_id = deletion_request.organization_id
      and user_id = p_requested_by
      and role = 'owner'
  ) then raise exception 'Requester is no longer the workspace owner'; end if;

  update public.runs
  set status = 'cancelled', completed_at = now(), error_summary = 'Collection cancelled by verified workspace deletion.'
  where organization_id = deletion_request.organization_id and status in ('queued','running');
  update public.jobs
  set status = 'cancelled', completed_at = now(), error_detail = 'Cancelled by verified workspace deletion.'
  where organization_id = deletion_request.organization_id and status in ('queued','running');

  counts := jsonb_build_object(
    'projects', (select count(*) from public.projects where organization_id = deletion_request.organization_id),
    'prompts', (select count(*) from public.prompts where organization_id = deletion_request.organization_id),
    'runs', (select count(*) from public.runs where organization_id = deletion_request.organization_id),
    'answers', (select count(*) from public.run_answers where organization_id = deletion_request.organization_id),
    'citations', (select count(*) from public.citations where organization_id = deletion_request.organization_id),
    'sources', (select count(*) from public.sources where organization_id = deletion_request.organization_id),
    'evidence', (select count(*) from public.evidence_items where organization_id = deletion_request.organization_id),
    'actions', (select count(*) from public.placements where organization_id = deletion_request.organization_id)
  );

  insert into public.data_deletion_receipts (request_id, organization_hash, requester_hash, record_counts)
  values (
    deletion_request.id,
    encode(extensions.digest(deletion_request.organization_id::text, 'sha256'), 'hex'),
    encode(extensions.digest(p_requested_by::text, 'sha256'), 'hex'),
    counts
  )
  returning id into receipt;

  delete from public.organizations where id = deletion_request.organization_id;
  return query select receipt, deletion_request.organization_id, counts;
end;
$$;

revoke all on function public.execute_foremention_account_deletion(uuid, uuid) from public, anon, authenticated;
grant execute on function public.execute_foremention_account_deletion(uuid, uuid) to service_role;

revoke execute on function public.complete_onboarding(jsonb) from public, anon;
revoke execute on function public.release_queued_run(uuid, uuid, text) from public, anon;
revoke execute on function public.reserve_run_budget(uuid, uuid, numeric) from public, anon;
revoke execute on function public.reserve_run_quota(uuid, integer, uuid) from public, anon;
revoke execute on function public.has_org_role(uuid, public.organization_role[]) from public, anon;
revoke execute on function public.is_org_member(uuid) from public, anon;

grant execute on function public.complete_onboarding(jsonb) to authenticated;
grant execute on function public.release_queued_run(uuid, uuid, text) to authenticated;
grant execute on function public.reserve_run_budget(uuid, uuid, numeric) to authenticated;
grant execute on function public.reserve_run_quota(uuid, integer, uuid) to authenticated;
grant execute on function public.has_org_role(uuid, public.organization_role[]) to authenticated;
grant execute on function public.is_org_member(uuid) to authenticated;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end;
$$;

commit;
