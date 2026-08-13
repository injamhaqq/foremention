-- Keep Source Snapshot history append-only for customer-facing database roles.
-- Supabase default table grants can include TRUNCATE/REFERENCES/TRIGGER on new
-- tables even when RLS only exposes SELECT/INSERT policies. TRUNCATE bypasses
-- row-level policy evaluation, so narrow these two evidence-history tables to
-- the exact privileges the runtime requires.
begin;

revoke all privileges on table public.source_snapshots from anon, authenticated;
revoke all privileges on table public.source_snapshot_observations from anon, authenticated;

grant select, insert on table public.source_snapshots to authenticated;
grant select, insert on table public.source_snapshot_observations to authenticated;

commit;
