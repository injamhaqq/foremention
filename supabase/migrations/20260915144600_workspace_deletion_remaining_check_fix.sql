-- F12 follow-up: replace the catalog/XML remaining-row probe with a direct
-- dynamic count. Empty result sets are valid and must not be parsed as XML.
begin;

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
  tenant_table record;
  deleted_rows bigint;
  deleted_this_pass bigint;
  table_rows bigint;
  remaining_tables integer;
  pass integer;
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

  perform set_config('foremention.permanent_delete_org_id', deletion_request.organization_id::text, true);

  for pass in 1..20 loop
    deleted_this_pass := 0;
    for tenant_table in
      select distinct child.relname as table_name
      from pg_catalog.pg_constraint fk
      join pg_catalog.pg_class child on child.oid = fk.conrelid
      join pg_catalog.pg_namespace child_ns on child_ns.oid = child.relnamespace
      join pg_catalog.pg_class parent on parent.oid = fk.confrelid
      join pg_catalog.pg_namespace parent_ns on parent_ns.oid = parent.relnamespace
      where fk.contype = 'f'
        and child_ns.nspname = 'public'
        and parent_ns.nspname = 'public'
        and parent.relname = 'organizations'
        and fk.confdeltype = 'c'
      order by child.relname
    loop
      begin
        execute format('delete from public.%I where organization_id = $1', tenant_table.table_name)
          using deletion_request.organization_id;
        get diagnostics deleted_rows = row_count;
        deleted_this_pass := deleted_this_pass + deleted_rows;
      exception when foreign_key_violation then
        -- Another tenant-owned child still restricts this parent. A later pass
        -- retries after the dependent table has been removed.
        null;
      end;
    end loop;

    remaining_tables := 0;
    for tenant_table in
      select distinct child.relname as table_name
      from pg_catalog.pg_constraint fk
      join pg_catalog.pg_class child on child.oid = fk.conrelid
      join pg_catalog.pg_namespace child_ns on child_ns.oid = child.relnamespace
      join pg_catalog.pg_class parent on parent.oid = fk.confrelid
      join pg_catalog.pg_namespace parent_ns on parent_ns.oid = parent.relnamespace
      where fk.contype = 'f'
        and child_ns.nspname = 'public'
        and parent_ns.nspname = 'public'
        and parent.relname = 'organizations'
        and fk.confdeltype = 'c'
      order by child.relname
    loop
      execute format('select count(*) from public.%I where organization_id = $1', tenant_table.table_name)
        into table_rows using deletion_request.organization_id;
      if table_rows > 0 then
        remaining_tables := remaining_tables + 1;
      end if;
    end loop;

    exit when remaining_tables = 0;
    if deleted_this_pass = 0 then
      raise exception 'Workspace deletion dependency graph could not be fully purged';
    end if;
  end loop;

  if remaining_tables <> 0 then
    raise exception 'Workspace deletion dependency graph exceeded the safe purge-pass limit';
  end if;

  delete from public.organizations where id = deletion_request.organization_id;
  perform set_config('foremention.permanent_delete_org_id', '', true);
  return query select receipt, deletion_request.organization_id, counts;
end;
$$;

revoke all on function public.execute_foremention_account_deletion(uuid, uuid) from public, anon, authenticated;
grant execute on function public.execute_foremention_account_deletion(uuid, uuid) to service_role;

commit;
