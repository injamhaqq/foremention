-- ACTIVATION CANDIDATE ONLY. This file must not be auto-applied by migration replay to production.
-- Materialize as a separately approved forward-only migration after the RPC app rollout, #332 reconciliation and restore proof.
-- FM-05 / #484 phase 2: activate narrow review-RPC-only writes.
-- Do not apply before deployment and verification of the RPC-backed review route.
-- Keep RLS SELECT and service_role INSERT/UPDATE/DELETE untouched.
begin;

revoke insert, update, delete on table public.source_map_entries from authenticated;
drop policy if exists source_map_entries_write_admin on public.source_map_entries;
drop policy if exists source_map_entries_write_analyst on public.source_map_entries;

commit;
