-- Owner-confirmed, delayed organization deletion with a non-identifying receipt.
-- Applying this migration does not delete data. The RPC runs only after the
-- seven-day safety window and a second explicit confirmation in the product.
begin;

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
    encode(digest(deletion_request.organization_id::text, 'sha256'), 'hex'),
    encode(digest(p_requested_by::text, 'sha256'), 'hex'),
    counts
  )
  returning id into receipt;

  delete from public.organizations where id = deletion_request.organization_id;
  return query select receipt, deletion_request.organization_id, counts;
end;
$$;

revoke all on function public.execute_foremention_account_deletion(uuid, uuid) from public, anon, authenticated;
grant execute on function public.execute_foremention_account_deletion(uuid, uuid) to service_role;

commit;
