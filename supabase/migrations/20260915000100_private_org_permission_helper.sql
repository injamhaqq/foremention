-- Keep the SECURITY DEFINER organization-permission implementation available
-- to RLS without exposing it as a PostgREST RPC in the public schema.
begin;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

-- PostgreSQL policies depend on the function OID, so moving the existing
-- function preserves every RLS policy dependency without rewriting policy
-- predicates or changing authorization semantics.
alter function public.has_org_permission(uuid, text) set schema private;

revoke all on function private.has_org_permission(uuid, text) from public, anon;
grant execute on function private.has_org_permission(uuid, text) to authenticated, service_role;

commit;
