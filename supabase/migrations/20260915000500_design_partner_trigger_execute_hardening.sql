-- Keep the design-partner validation trigger callable only through its trigger
-- path, not as a public PostgREST RPC.
begin;

revoke execute on function public.validate_design_partner_execution_cycle()
  from public, anon, authenticated;
grant execute on function public.validate_design_partner_execution_cycle()
  to service_role;

commit;
