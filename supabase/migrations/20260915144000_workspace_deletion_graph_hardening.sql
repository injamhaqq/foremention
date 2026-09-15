-- F12: make verified owner-controlled workspace deletion compatible with the
-- newer immutable/restrictive decision graph without weakening normal mutation
-- protections. The deletion executor marks only its current transaction/org;
-- DELETE validators remain active everywhere else.
begin;

-- Immutable history triggers must continue to reject application mutations, but
-- they must not block the established permanent-workspace deletion transaction.
-- Split mixed triggers so INSERT/UPDATE semantics stay unchanged and only the
-- transaction-marked DELETE path is bypassed.

drop trigger if exists outcome_ledger_events_append_only on public.outcome_ledger_events;
create trigger outcome_ledger_events_immutable_update
  before update on public.outcome_ledger_events
  for each row execute function public.block_outcome_ledger_mutation();
create trigger outcome_ledger_events_immutable_delete
  before delete on public.outcome_ledger_events
  for each row
  when (coalesce(current_setting('foremention.permanent_delete_org_id', true), '') <> old.organization_id::text)
  execute function public.block_outcome_ledger_mutation();

drop trigger if exists change_verification_assessments_append_only on public.change_verification_assessments;
create trigger change_verification_assessments_immutable_update
  before update on public.change_verification_assessments
  for each row execute function public.block_change_verification_assessment_mutation();
create trigger change_verification_assessments_immutable_delete
  before delete on public.change_verification_assessments
  for each row
  when (coalesce(current_setting('foremention.permanent_delete_org_id', true), '') <> old.organization_id::text)
  execute function public.block_change_verification_assessment_mutation();

drop trigger if exists next_best_change_batches_immutable on public.next_best_change_batches;
create trigger next_best_change_batches_immutable_update
  before update on public.next_best_change_batches
  for each row execute function public.block_next_best_change_history_mutation();
create trigger next_best_change_batches_immutable_delete
  before delete on public.next_best_change_batches
  for each row
  when (coalesce(current_setting('foremention.permanent_delete_org_id', true), '') <> old.organization_id::text)
  execute function public.block_next_best_change_history_mutation();

drop trigger if exists next_best_change_evaluations_immutable on public.next_best_change_evaluations;
create trigger next_best_change_evaluations_immutable_update
  before update on public.next_best_change_evaluations
  for each row execute function public.block_next_best_change_history_mutation();
create trigger next_best_change_evaluations_immutable_delete
  before delete on public.next_best_change_evaluations
  for each row
  when (coalesce(current_setting('foremention.permanent_delete_org_id', true), '') <> old.organization_id::text)
  execute function public.block_next_best_change_history_mutation();

drop trigger if exists customer_success_reviews_append_only on public.customer_success_reviews;
create trigger customer_success_reviews_immutable_update
  before update on public.customer_success_reviews
  for each row execute function public.block_customer_success_review_mutation();
create trigger customer_success_reviews_immutable_delete
  before delete on public.customer_success_reviews
  for each row
  when (coalesce(current_setting('foremention.permanent_delete_org_id', true), '') <> old.organization_id::text)
  execute function public.block_customer_success_review_mutation();

drop trigger if exists billing_state_history_immutable on public.billing_state_history;
create trigger billing_state_history_immutable_update
  before update on public.billing_state_history
  for each row execute function public.prevent_billing_history_mutation();
create trigger billing_state_history_immutable_delete
  before delete on public.billing_state_history
  for each row
  when (coalesce(current_setting('foremention.permanent_delete_org_id', true), '') <> old.organization_id::text)
  execute function public.prevent_billing_history_mutation();

-- Evidence-link validators intentionally allow customer deletion only while the
-- parent is editable. Preserve that rule for ordinary DELETE calls; skip it only
-- inside the verified permanent-workspace deletion transaction.
drop trigger if exists validate_change_specification_evidence_before_write on public.change_specification_evidence;
create trigger validate_change_specification_evidence_before_write
  before insert or update on public.change_specification_evidence
  for each row execute function public.validate_change_specification_evidence();
create trigger validate_change_specification_evidence_before_delete
  before delete on public.change_specification_evidence
  for each row
  when (coalesce(current_setting('foremention.permanent_delete_org_id', true), '') <> old.organization_id::text)
  execute function public.validate_change_specification_evidence();

drop trigger if exists validate_resolution_asset_evidence_before_write on public.resolution_asset_evidence;
create trigger validate_resolution_asset_evidence_before_write
  before insert or update on public.resolution_asset_evidence
  for each row execute function public.validate_resolution_asset_evidence();
create trigger validate_resolution_asset_evidence_before_delete
  before delete on public.resolution_asset_evidence
  for each row
  when (coalesce(current_setting('foremention.permanent_delete_org_id', true), '') <> old.organization_id::text)
  execute function public.validate_resolution_asset_evidence();

drop trigger if exists validate_eligibility_evaluation_before_write on public.eligibility_evaluations;
create trigger validate_eligibility_evaluation_before_insert
  before insert on public.eligibility_evaluations
  for each row execute function public.validate_eligibility_evaluation();
create trigger validate_eligibility_evaluation_before_update
  before update on public.eligibility_evaluations
  for each row execute function public.validate_eligibility_evaluation();
create trigger validate_eligibility_evaluation_before_delete
  before delete on public.eligibility_evaluations
  for each row
  when (coalesce(current_setting('foremention.permanent_delete_org_id', true), '') <> old.organization_id::text)
  execute function public.validate_eligibility_evaluation();

-- Recreate the service-only deletion executor. Instead of relying on PostgreSQL
-- to choose a safe order among many simultaneous organization cascades, delete
-- every direct tenant-owned child in dependency-safe rounds. Rows blocked by a
-- restrictive child FK are retried after that child is removed. This keeps
-- ordinary FK semantics (RESTRICT/SET NULL) intact outside full workspace deletion
-- and automatically covers future direct organization-owned tables.
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
        -- A restrictive tenant-child still exists. A later round deletes the
        -- dependent row first, then this parent becomes deletable.
        null;
      end;
    end loop;

    select count(*) into remaining_tables
    from (
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
        and exists (
          select 1
          from pg_catalog.pg_attribute attribute
          where attribute.attrelid = child.oid
            and attribute.attname = 'organization_id'
            and not attribute.attisdropped
        )
        and (xpath('/row/present/text()', query_to_xml(
          format('select true as present from public.%I where organization_id = %L::uuid limit 1', child.relname, deletion_request.organization_id),
          false, true, ''
        )))[1]::text::boolean
    ) remaining;

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
