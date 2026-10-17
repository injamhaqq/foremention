-- Chat 06 disposable local-database functional test.
-- Run ONLY after Supabase migrations on an isolated database. No Paddle calls.
-- Transaction rolls back all synthetic events and heartbeat state.
\set ON_ERROR_STOP on
begin;

do $probe$
declare
  v_id text := 'evt_' || repeat('a',26);
  v_other_id text := 'evt_' || repeat('b',26);
  v_raw text := '{"event_id":"evt_' || repeat('a',26) || '","event_type":"subscription.paused","data":{"status":"paused"}}';
  v_other_raw text := '{"event_id":"evt_' || repeat('b',26) || '","event_type":"subscription.paused","data":{"status":"paused"}}';
  v_hash text;
  v_other_hash text;
  v_result jsonb;
  v_claim record;
  v_old_token uuid;
  v_old_generation int;
  v_count int;
  v_status text;
begin
  if pg_catalog.has_table_privilege('anon','public.billing_verified_event_inbox','SELECT')
    or pg_catalog.has_table_privilege('authenticated','public.billing_verified_event_inbox','SELECT')
    or pg_catalog.has_table_privilege('anon','public.billing_verified_inbox_worker_heartbeat','SELECT')
    or pg_catalog.has_function_privilege('anon','public.enqueue_verified_billing_event(text,text,text,text,text,text)','EXECUTE')
    or pg_catalog.has_function_privilege('authenticated','public.claim_verified_billing_batch(integer,integer,text)','EXECUTE')
  then raise exception 'billing_inbox_public_privilege_leak'; end if;

  v_hash := encode(extensions.digest(convert_to(v_raw,'UTF8'),'sha256'),'hex');
  v_other_hash := encode(extensions.digest(convert_to(v_other_raw,'UTF8'),'sha256'),'hex');

  -- New live events must not be acknowledged without a live worker heartbeat.
  begin
    perform public.enqueue_verified_billing_event('paddle',v_id,'live','subscription.paused',v_hash,v_raw);
    raise exception 'billing_unhealthy_worker_accepted';
  exception when others then
    if sqlerrm <> 'billing_inbox_worker_unhealthy' then raise; end if;
  end;

  -- A sandbox worker does not wake live admission.
  select count(*) into v_count from public.claim_verified_billing_batch(1,120,'sandbox');
  if v_count<>0 then raise exception 'unexpected_sandbox_work'; end if;
  begin
    perform public.enqueue_verified_billing_event('paddle',v_id,'live','subscription.paused',v_hash,v_raw);
    raise exception 'billing_cross_mode_heartbeat_accepted';
  exception when others then
    if sqlerrm <> 'billing_inbox_worker_unhealthy' then raise; end if;
  end;

  -- Live consumer poll creates a fresh, exact-mode heartbeat.
  select count(*) into v_count from public.claim_verified_billing_batch(1,120,'live');
  if v_count<>0 then raise exception 'unexpected_live_work_before_enqueue'; end if;

  select public.enqueue_verified_billing_event('paddle',v_id,'live','subscription.paused',v_hash,v_raw)
    into v_result;
  if v_result->>'accepted'<>'true' or v_result->>'duplicate'<>'false' then
    raise exception 'first_verified_event_not_durable';
  end if;

  select public.enqueue_verified_billing_event('paddle',v_id,'live','subscription.paused',v_hash,v_raw)
    into v_result;
  if v_result->>'duplicate'<>'true' then raise exception 'idempotent_duplicate_not_recognized'; end if;

  -- Same Paddle event ID may never silently accept distinct bytes.
  begin
    perform public.enqueue_verified_billing_event('paddle',v_id,'live','subscription.paused',
      encode(extensions.digest(convert_to(v_raw || ' ','UTF8'),'sha256'),'hex'),v_raw || ' ');
    raise exception 'billing_conflicting_duplicate_accepted';
  exception when others then
    if sqlerrm <> 'billing_event_integrity_conflict' then raise; end if;
  end;

  -- The SQL contract itself checks that envelope identity equals the supplied ID.
  begin
    perform public.enqueue_verified_billing_event('paddle',v_other_id,'live','subscription.paused',v_hash,v_raw);
    raise exception 'billing_mismatched_envelope_accepted';
  exception when others then
    if sqlerrm <> 'billing_verified_event_envelope_mismatch' then raise; end if;
  end;

  -- Another environment cannot claim this live inbox record.
  select count(*) into v_count from public.claim_verified_billing_batch(1,120,'sandbox');
  if v_count<>0 then raise exception 'billing_cross_mode_claim'; end if;

  -- Query the state-changing function first, then inspect table state in a
  -- separate statement. Joining the modified table in one statement can read
  -- a pre-update MVCC snapshot even though the function updated it.
  select * into v_claim from public.claim_verified_billing_batch(1,120,'live');
  if not found then raise exception 'billing_first_claim_not_returned'; end if;
  select status into v_status from public.billing_verified_event_inbox
    where provider='paddle' and event_id=v_id;
  if v_status<>'leased' or v_claim.generation<>1 or v_claim.lease_token is null
    then raise exception 'billing_first_claim_invalid'; end if;
  v_old_token := v_claim.lease_token;
  v_old_generation := v_claim.generation;

  -- An event cannot be marked applied before a transactional billing receipt.
  begin
    perform public.settle_verified_billing_event('paddle',v_id,v_old_generation,v_old_token,'applied',null);
    raise exception 'billing_premature_applied_allowed';
  exception when others then
    if sqlerrm <> 'billing_event_not_applied' then raise; end if;
  end;

  if public.settle_verified_billing_event('paddle',v_id,v_old_generation+1,v_old_token,'ignored',null)
  then raise exception 'billing_wrong_generation_settled'; end if;

  -- Force synthetic interrupted lease expiry, then reclaim with new fencing.
  update public.billing_verified_event_inbox
    set lease_expires_at=clock_timestamp()-interval '1 minute'
    where provider='paddle' and event_id=v_id;
  select * into v_claim from public.claim_verified_billing_batch(1,120,'live');
  if not found then raise exception 'billing_reclaim_not_returned'; end if;
  if v_claim.generation<>v_old_generation+1 or v_claim.lease_token=v_old_token
  then raise exception 'billing_lease_reclaim_not_fenced'; end if;

  if public.settle_verified_billing_event('paddle',v_id,v_old_generation,v_old_token,'ignored',null)
  then raise exception 'billing_old_worker_settled'; end if;

  if not public.settle_verified_billing_event('paddle',v_id,v_claim.generation,v_claim.lease_token,
      'needs_review','billing_manual_case')
  then raise exception 'billing_review_case_not_settled'; end if;
  select status into v_status from public.billing_verified_event_inbox
    where provider='paddle' and event_id=v_id;
  if v_status<>'needs_review' then raise exception 'billing_review_case_not_retained'; end if;

  -- A silent worker outage closes new intake and leaves existing reviewed cases.
  update public.billing_verified_inbox_worker_heartbeat
    set last_polled_at=clock_timestamp()-interval '21 minutes'
    where source_mode='live';
  begin
    perform public.enqueue_verified_billing_event('paddle',v_other_id,'live','subscription.paused',v_other_hash,v_other_raw);
    raise exception 'billing_stale_worker_accepted';
  exception when others then
    if sqlerrm <> 'billing_inbox_worker_unhealthy' then raise; end if;
  end;

  raise notice 'chat06 billing SQL integrity / heartbeat / leases PASS';
end;
$probe$;

rollback;
