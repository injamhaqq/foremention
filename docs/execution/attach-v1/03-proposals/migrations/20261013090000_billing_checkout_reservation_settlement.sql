-- Chat03 PROPOSAL for FM-00 (not in supabase/migrations; FM-00 owns final
-- migrations and the production ledger). Additive, service_role only.
--
-- Defect on main (20261010090000_fm09_paddle_checkout_reservations.sql):
-- reservations move reserved -> ready/uncertain and never leave those states,
-- while billing_checkout_unresolved_org_uidx (where state <> 'reconciled')
-- allows only one unresolved row per organization. Result: after the first
-- checkout (paid OR abandoned) the organization can never start another
-- Paddle checkout (reserve_paddle_checkout returns false -> HTTP 409).
--
-- These two functions are the only new transitions. Neither touches
-- organization_entitlements: paid access still comes only from
-- apply_billing_event_atomic_v2 after a signed transaction.completed.
begin;

-- ready -> reconciled once a verified payment for that exact transaction has
-- been applied (webhook) or Paddle reports it completed (owner reconcile).
create or replace function public.settle_paddle_checkout_reservation(
  p_organization_id uuid,
  p_transaction_id text,
  p_evidence text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows integer := 0;
begin
  if p_organization_id is null
     or p_transaction_id !~ '^txn_[a-z0-9]{26}$'
     or p_evidence is distinct from ('paid:' || p_transaction_id) then
    raise exception 'invalid Paddle checkout settlement';
  end if;
  update public.billing_checkout_reservations
     set state = 'reconciled', reconciliation_evidence = p_evidence
   where organization_id = p_organization_id
     and provider = 'paddle'
     and external_transaction_id = p_transaction_id
     and state = 'ready';
  get diagnostics v_rows = row_count;
  if v_rows = 1 then return true; end if;
  -- Idempotent: an already settled reservation for the same payment is success.
  return exists (
    select 1 from public.billing_checkout_reservations
     where organization_id = p_organization_id
       and provider = 'paddle'
       and external_transaction_id = p_transaction_id
       and state = 'reconciled'
       and reconciliation_evidence = p_evidence
  );
end;
$$;

-- ready -> reconciled for a checkout that Paddle reports canceled (or that the
-- application canceled after it was abandoned and re-read as canceled).
-- 'uncertain' / 'reserved' rows have no provable transaction and stay for
-- operator review (manual UPDATE with written evidence, see 03-proposals).
create or replace function public.release_paddle_checkout_reservation(
  p_reservation_id uuid,
  p_organization_id uuid,
  p_evidence text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows integer := 0;
begin
  if p_reservation_id is null or p_organization_id is null
     or p_evidence !~ '^released:(canceled|abandoned):txn_[a-z0-9]{26}$' then
    raise exception 'invalid Paddle checkout release';
  end if;
  update public.billing_checkout_reservations
     set state = 'reconciled', reconciliation_evidence = p_evidence
   where id = p_reservation_id
     and organization_id = p_organization_id
     and provider = 'paddle'
     and state = 'ready'
     and p_evidence like '%:' || external_transaction_id;
  get diagnostics v_rows = row_count;
  return v_rows = 1;
end;
$$;

revoke all on function public.settle_paddle_checkout_reservation(uuid, text, text) from public, anon, authenticated;
revoke all on function public.release_paddle_checkout_reservation(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.settle_paddle_checkout_reservation(uuid, text, text) to service_role;
grant execute on function public.release_paddle_checkout_reservation(uuid, uuid, text) to service_role;

comment on function public.settle_paddle_checkout_reservation(uuid, text, text) is
  'Chat03: settle a ready Paddle checkout reservation after its exact transaction was paid. Never grants entitlement.';
comment on function public.release_paddle_checkout_reservation(uuid, uuid, text) is
  'Chat03: release a ready Paddle checkout reservation whose transaction is canceled. Never grants entitlement.';

commit;

-- Rollback: drop function public.settle_paddle_checkout_reservation(uuid, text, text);
--           drop function public.release_paddle_checkout_reservation(uuid, uuid, text);
-- (no table/column changes; reservation rows already reconciled keep their evidence)
