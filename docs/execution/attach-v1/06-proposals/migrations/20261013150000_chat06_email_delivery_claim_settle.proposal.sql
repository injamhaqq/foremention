-- PROPOSAL ONLY (Chat06 -> FM-00). Not in supabase/migrations; FM-00 owns
-- shared migrations, lineage and production gates. Do not apply to production
-- before a verified recovery point (06 restore-and-rollback-plan.md, A05).
--
-- CV-12: fenced, tenant-scoped claim/settle for application e-mail delivery.
-- Spec: docs/execution/attach-v1/06-proposals/operations-acceptance.md
--       "Email delivery lease/RPC proposal".
--
-- Properties:
--  * Additive only: new nullable/defaulted columns, one partial index, three
--    service_role-only SECURITY DEFINER functions. The existing status check
--    (pending/sent/failed/skipped), unique (organization_id,user_id,event_key),
--    RLS policy and grants are untouched, so the current direct-PATCH sender in
--    lib/workspace-email-alerts.ts keeps working with or without this migration.
--  * Legacy rows (inserted by the direct path, enqueued_via_lease = false) are
--    NEVER claimed or replayed: their outcome cannot be reconciled.
--  * Each claim increments attempt_generation and mints a fresh lease_token;
--    settle must present both, so a late worker cannot settle a newer attempt.
--  * The provider idempotency key is a stable generated column
--    ('foremention-alert:' || id), identical to workspaceAlertIdempotencyKey().
--  * An expired lease is reclaimable only inside the provider idempotency
--    window (default 23 h; Resend documents 24 h retention - verify before use).
--    Outside it the row is held as outcome_uncertain for human reconciliation.
--  * Provider-uncertain outcomes are held (pending + outcome_uncertain), never
--    rewritten as failed and never auto-replayed.
--  * Unsubscribe / e-mail preference / weekly-digest preference / membership
--    are re-checked at claim time; the recipient address is read from the DB.
--  * Error codes are sanitised to a short slug; no URLs, headers or content.
begin;

alter table public.application_email_deliveries
  add column if not exists enqueued_via_lease boolean not null default false,
  add column if not exists attempt_generation integer not null default 0,
  add column if not exists attempt_count integer not null default 0,
  add column if not exists max_attempts integer not null default 3,
  add column if not exists lease_token uuid,
  add column if not exists lease_expires_at timestamptz,
  add column if not exists next_attempt_at timestamptz,
  add column if not exists outcome_uncertain boolean not null default false,
  add column if not exists last_attempt_at timestamptz,
  add column if not exists settled_at timestamptz,
  add column if not exists provider_idempotency_key text
    generated always as ('foremention-alert:' || id::text) stored;

alter table public.application_email_deliveries
  drop constraint if exists application_email_deliveries_attempts_check,
  add constraint application_email_deliveries_attempts_check
    check (attempt_generation >= 0 and attempt_count >= 0 and max_attempts between 1 and 10 and attempt_count <= max_attempts);

create index if not exists application_email_deliveries_claimable_idx
  on public.application_email_deliveries (next_attempt_at, created_at)
  where status = 'pending' and enqueued_via_lease and not outcome_uncertain;

-- Note: the existing table-level SELECT grant + self-select policy means a
-- member can read their own row's lease columns. That is harmless (only
-- service_role can execute settle), and narrowing it would require replacing
-- the table grant with a column list - left to FM-00 to avoid grant drift.

create or replace function public.email_delivery_safe_error(p_code text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_code is null then null
    when p_code ~ '^[a-z0-9][a-z0-9_.:-]{0,79}$' then p_code
    else 'unclassified_error'
  end
$$;

create or replace function public.enqueue_application_email_delivery(
  p_organization_id uuid,
  p_user_id uuid,
  p_event_key text,
  p_kind text,
  p_max_attempts integer default 3
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_organization_id is null or p_user_id is null or coalesce(btrim(p_event_key), '') = '' or coalesce(btrim(p_kind), '') = '' then
    raise exception 'EMAIL_DELIVERY_INVALID_INPUT' using errcode = '22023';
  end if;
  insert into public.application_email_deliveries
    (organization_id, user_id, event_key, kind, status, enqueued_via_lease, max_attempts)
  values
    (p_organization_id, p_user_id, p_event_key, p_kind, 'pending', true, least(greatest(coalesce(p_max_attempts, 3), 1), 10))
  on conflict (organization_id, user_id, event_key) do nothing
  returning id into v_id;
  if v_id is not null then
    return jsonb_build_object('delivery_id', v_id, 'created', true);
  end if;
  select d.id into v_id from public.application_email_deliveries d
   where d.organization_id = p_organization_id and d.user_id = p_user_id and d.event_key = p_event_key;
  return jsonb_build_object('delivery_id', v_id, 'created', false);
end
$$;

create or replace function public.claim_application_email_delivery(
  p_delivery_id uuid,
  p_organization_id uuid,
  p_lease_seconds integer default 90,
  p_idempotency_window interval default interval '23 hours'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.application_email_deliveries%rowtype;
  v_now timestamptz := clock_timestamp();
  v_pref record;
  v_email text;
  v_lease integer := least(greatest(coalesce(p_lease_seconds, 90), 15), 900);
begin
  select * into d from public.application_email_deliveries
   where id = p_delivery_id and organization_id = p_organization_id
   for update;
  if not found then
    return jsonb_build_object('claimed', false, 'reason', 'not_found');
  end if;
  if d.status <> 'pending' then
    return jsonb_build_object('claimed', false, 'reason', 'already_settled', 'status', d.status);
  end if;
  if not d.enqueued_via_lease then
    return jsonb_build_object('claimed', false, 'reason', 'legacy_row_held');
  end if;
  if d.outcome_uncertain then
    return jsonb_build_object('claimed', false, 'reason', 'held_uncertain');
  end if;
  if d.lease_expires_at is not null and d.lease_expires_at > v_now then
    return jsonb_build_object('claimed', false, 'reason', 'leased_elsewhere', 'lease_expires_at', d.lease_expires_at);
  end if;
  if d.next_attempt_at is not null and d.next_attempt_at > v_now then
    return jsonb_build_object('claimed', false, 'reason', 'not_due', 'next_attempt_at', d.next_attempt_at);
  end if;
  -- A previous attempt holds an expired lease: it may or may not have reached
  -- the provider. Replay is safe only while the provider still dedupes on the
  -- stable idempotency key.
  if d.lease_token is not null and d.created_at < v_now - coalesce(p_idempotency_window, interval '23 hours') then
    update public.application_email_deliveries
       set outcome_uncertain = true, lease_token = null, lease_expires_at = null,
           error_code = 'lease_expired_outside_idempotency_window', updated_at = v_now
     where id = d.id;
    return jsonb_build_object('claimed', false, 'reason', 'held_uncertain');
  end if;
  if d.attempt_count >= d.max_attempts then
    update public.application_email_deliveries
       set status = 'failed', lease_token = null, lease_expires_at = null,
           error_code = coalesce(error_code, 'attempts_exhausted'), settled_at = v_now, updated_at = v_now
     where id = d.id;
    return jsonb_build_object('claimed', false, 'reason', 'attempts_exhausted', 'status', 'failed');
  end if;

  select p.email_enabled, p.weekly_digest_enabled, p.unsubscribed_at into v_pref
    from public.notification_preferences p
   where p.organization_id = d.organization_id and p.user_id = d.user_id;
  select nullif(lower(btrim(m.member_email)), '') into v_email
    from public.organization_members m
   where m.organization_id = d.organization_id and m.user_id = d.user_id;
  if v_pref is null or not coalesce(v_pref.email_enabled, false) or v_pref.unsubscribed_at is not null
     or (d.kind = 'weekly_digest' and not coalesce(v_pref.weekly_digest_enabled, false))
     or v_email is null then
    update public.application_email_deliveries
       set status = 'skipped', lease_token = null, lease_expires_at = null,
           error_code = 'recipient_not_eligible_at_delivery', settled_at = v_now, updated_at = v_now
     where id = d.id;
    return jsonb_build_object('claimed', false, 'reason', 'recipient_not_eligible', 'status', 'skipped');
  end if;

  update public.application_email_deliveries
     set attempt_generation = d.attempt_generation + 1,
         attempt_count = d.attempt_count + 1,
         lease_token = gen_random_uuid(),
         lease_expires_at = v_now + make_interval(secs => v_lease),
         last_attempt_at = v_now,
         next_attempt_at = null,
         updated_at = v_now
   where id = d.id
  returning * into d;
  return jsonb_build_object(
    'claimed', true,
    'delivery_id', d.id,
    'generation', d.attempt_generation,
    'attempt', d.attempt_count,
    'lease_token', d.lease_token,
    'lease_expires_at', d.lease_expires_at,
    'idempotency_key', d.provider_idempotency_key,
    'recipient_email', v_email,
    'kind', d.kind
  );
end
$$;

-- p_outcome: 'sent' | 'failed_permanent' | 'failed_retryable' | 'uncertain'
create or replace function public.settle_application_email_delivery(
  p_delivery_id uuid,
  p_organization_id uuid,
  p_generation integer,
  p_lease_token uuid,
  p_outcome text,
  p_provider_message_id text default null,
  p_error_code text default null,
  p_retry_after_seconds integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.application_email_deliveries%rowtype;
  v_now timestamptz := clock_timestamp();
  v_error text := public.email_delivery_safe_error(p_error_code);
  v_backoff integer;
begin
  if p_outcome not in ('sent', 'failed_permanent', 'failed_retryable', 'uncertain') then
    raise exception 'EMAIL_DELIVERY_INVALID_OUTCOME' using errcode = '22023';
  end if;
  if p_outcome = 'sent' and coalesce(btrim(p_provider_message_id), '') = '' then
    raise exception 'EMAIL_DELIVERY_SENT_REQUIRES_RECEIPT' using errcode = '22023';
  end if;
  select * into d from public.application_email_deliveries
   where id = p_delivery_id and organization_id = p_organization_id
   for update;
  if not found then
    return jsonb_build_object('settled', false, 'reason', 'not_found');
  end if;
  if d.attempt_generation <> p_generation then
    return jsonb_build_object('settled', false, 'reason', 'stale_generation', 'status', d.status);
  end if;
  -- Database-ACK loss retry by the same attempt: idempotent for 'sent'.
  if d.status = 'sent' and p_outcome = 'sent' and d.provider_message_id = p_provider_message_id then
    return jsonb_build_object('settled', true, 'reason', 'already_settled_same', 'status', 'sent');
  end if;
  if d.status <> 'pending' then
    return jsonb_build_object('settled', false, 'reason', 'already_settled', 'status', d.status);
  end if;
  if d.lease_token is distinct from p_lease_token or p_lease_token is null then
    return jsonb_build_object('settled', false, 'reason', 'lease_mismatch', 'status', d.status);
  end if;

  if p_outcome = 'sent' then
    update public.application_email_deliveries
       set status = 'sent', provider_message_id = left(btrim(p_provider_message_id), 200), error_code = null,
           outcome_uncertain = false, lease_token = null, lease_expires_at = null, settled_at = v_now, updated_at = v_now
     where id = d.id;
    return jsonb_build_object('settled', true, 'status', 'sent');
  elsif p_outcome = 'uncertain' then
    -- Provider may have accepted. Never failed, never auto-replayed.
    update public.application_email_deliveries
       set outcome_uncertain = true, error_code = coalesce(v_error, 'delivery_outcome_uncertain'),
           lease_token = null, lease_expires_at = null, updated_at = v_now
     where id = d.id;
    return jsonb_build_object('settled', true, 'status', 'pending', 'held', true);
  elsif p_outcome = 'failed_retryable' and d.attempt_count < d.max_attempts then
    v_backoff := least(greatest(coalesce(p_retry_after_seconds, 60 * power(2, greatest(d.attempt_count - 1, 0))::integer), 30), 3600);
    update public.application_email_deliveries
       set error_code = coalesce(v_error, 'retryable_provider_error'), next_attempt_at = v_now + make_interval(secs => v_backoff),
           lease_token = null, lease_expires_at = null, updated_at = v_now
     where id = d.id;
    return jsonb_build_object('settled', true, 'status', 'pending', 'retry_at', v_now + make_interval(secs => v_backoff));
  else
    update public.application_email_deliveries
       set status = 'failed',
           error_code = coalesce(v_error, case when p_outcome = 'failed_retryable' then 'attempts_exhausted' else 'provider_rejected' end),
           lease_token = null, lease_expires_at = null, settled_at = v_now, updated_at = v_now
     where id = d.id;
    return jsonb_build_object('settled', true, 'status', 'failed');
  end if;
end
$$;

revoke all on function public.email_delivery_safe_error(text) from public, anon, authenticated;
revoke all on function public.enqueue_application_email_delivery(uuid, uuid, text, text, integer) from public, anon, authenticated;
revoke all on function public.claim_application_email_delivery(uuid, uuid, integer, interval) from public, anon, authenticated;
revoke all on function public.settle_application_email_delivery(uuid, uuid, integer, uuid, text, text, text, integer) from public, anon, authenticated;
grant execute on function public.email_delivery_safe_error(text) to service_role;
grant execute on function public.enqueue_application_email_delivery(uuid, uuid, text, text, integer) to service_role;
grant execute on function public.claim_application_email_delivery(uuid, uuid, integer, interval) to service_role;
grant execute on function public.settle_application_email_delivery(uuid, uuid, integer, uuid, text, text, text, integer) to service_role;

commit;

-- Rollback (nonproduction first; only after the sender flag is off):
--   begin;
--   drop function if exists public.settle_application_email_delivery(uuid, uuid, integer, uuid, text, text, text, integer);
--   drop function if exists public.claim_application_email_delivery(uuid, uuid, integer, interval);
--   drop function if exists public.enqueue_application_email_delivery(uuid, uuid, text, text, integer);
--   drop function if exists public.email_delivery_safe_error(text);
--   drop index if exists public.application_email_deliveries_claimable_idx;
--   alter table public.application_email_deliveries drop constraint if exists application_email_deliveries_attempts_check;
--   -- Columns may be kept (inert) or dropped after exporting held rows for reconciliation.
--   commit;
