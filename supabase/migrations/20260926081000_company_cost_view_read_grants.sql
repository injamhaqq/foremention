-- Supabase default privileges can grant service_role ALL on newly created views
-- even when an initial migration states GRANT SELECT. Tighten this company-only
-- aggregate to explicit read-only service_role privileges.
begin;

revoke all on table public.company_operational_cost_readiness from public, anon, authenticated;
revoke all on table public.company_operational_cost_readiness from service_role;
grant select on table public.company_operational_cost_readiness to service_role;

commit;
