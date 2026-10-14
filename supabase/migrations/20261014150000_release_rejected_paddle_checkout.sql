-- Launch readiness 2026-10-14: release a Paddle checkout reservation when
-- Paddle definitively REJECTED the transaction create (HTTP 4xx validation
-- error such as transaction_default_checkout_url_not_set). No payable Paddle
-- transaction exists in that case, so keeping the reservation 'uncertain'
-- only strands the workspace behind "needs reconciliation" forever.
--
-- Additive: one new SECURITY DEFINER function, service_role only.
-- Only rows that never received a Paddle transaction id are eligible.
-- Rollback: drop function public.release_rejected_paddle_checkout(uuid, uuid, text);

begin;

create or replace function public.release_rejected_paddle_checkout(
  p_reservation_id uuid,
  p_organization_id uuid,
  p_evidence text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows integer := 0;
begin
  if p_reservation_id is null or p_organization_id is null
     or p_evidence !~ '^released:rejected:paddle_http_4[0-9]{2}_[a-z0-9_]{1,80}$' then
    raise exception 'invalid Paddle checkout rejection release';
  end if;
  update public.billing_checkout_reservations
     set state = 'reconciled', reconciliation_evidence = p_evidence
   where id = p_reservation_id
     and organization_id = p_organization_id
     and provider = 'paddle'
     and state in ('reserved', 'uncertain')
     and external_transaction_id is null;
  get diagnostics v_rows = row_count;
  return v_rows = 1;
end;
$$;

revoke all on function public.release_rejected_paddle_checkout(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.release_rejected_paddle_checkout(uuid, uuid, text) to service_role;

commit;
