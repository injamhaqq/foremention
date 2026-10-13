-- FM-00 A11 phase 2 (backlog A11 / CV-04): projects are an authorization
-- boundary for buyer-question edits.
--
-- Phase 1 (20261013100000) added update_prompt_versioned_in_project, a
-- SECURITY DEFINER wrapper that locks the prompt row and re-checks
-- organization + project + active project before delegating to
-- update_prompt_versioned. The app route only calls the wrapper.
--
-- Phase 2 (this migration): authenticated clients can no longer call the
-- org-only update_prompt_versioned directly over PostgREST, which let any
-- workspace writer edit a sibling project's question by id. The wrapper is
-- SECURITY DEFINER (runs as the function owner), so it still reaches the
-- inner function after this revoke; service_role keeps direct access for
-- server-side maintenance.
--
-- PRODUCTION: apply only after a verified backup and only after the app
-- build that drops the PGRST202 legacy fallback is live (see
-- docs/execution/attach-v1/00-proposals/release-and-rollback-plan.md).
-- Rollback: grant execute on function public.update_prompt_versioned(uuid, uuid, text, boolean, text) to authenticated;

begin;

revoke execute on function public.update_prompt_versioned(uuid, uuid, text, boolean, text) from public, anon, authenticated;
grant execute on function public.update_prompt_versioned(uuid, uuid, text, boolean, text) to service_role;

commit;
