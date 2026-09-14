-- Restrict direct execution of SECURITY DEFINER helpers to the roles that
-- actually require it. Trigger functions remain callable by their triggers;
-- service_role is retained for privileged operational compatibility.

revoke execute on function public.capture_opportunity_ownership_outcome_event() from public, anon, authenticated;
grant execute on function public.capture_opportunity_ownership_outcome_event() to service_role;

revoke execute on function public.capture_resolution_evidence_outcome_event() from public, anon, authenticated;
grant execute on function public.capture_resolution_evidence_outcome_event() to service_role;

revoke execute on function public.capture_resolution_follow_up_outcome_event() from public, anon, authenticated;
grant execute on function public.capture_resolution_follow_up_outcome_event() to service_role;

revoke execute on function public.capture_resolution_outcome_event() from public, anon, authenticated;
grant execute on function public.capture_resolution_outcome_event() to service_role;

-- RLS policies invoke has_org_permission for signed-in users, so authenticated
-- and service_role retain execute while PUBLIC/anon are denied.
revoke execute on function public.has_org_permission(uuid, text) from public, anon;
grant execute on function public.has_org_permission(uuid, text) to authenticated, service_role;
