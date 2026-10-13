-- PROPOSAL ONLY (Chat02 -> FM-00). Not a migration file; FM-00 owns
-- supabase/migrations/. Verified in the local PGlite replay
-- (rls-replay/proposal-probe.mjs). Do NOT apply to production directly.
--
-- A11: public.update_prompt_versioned(p_prompt_id, p_organization_id, ...)
-- authorizes on organization role only. Any owner/admin/analyst of the org can
-- edit a prompt of ANY project in that org through PostgREST /rpc, regardless
-- of the active project selected in the UI. This adds a project-bound entry
-- point; the application caller (Chat04's prompt route) passes the
-- server-resolved loadWorkspaceContext().projectId. After callers migrate,
-- FM-00 may revoke EXECUTE on the old signature from `authenticated`.
--
-- NOTE: project is NOT an RLS boundary anywhere else today (all 215 public
-- policies are organization-scoped). This closes the one privileged write path
-- that ignores project; it does not create per-project access control.
begin;

create or replace function public.update_prompt_versioned_in_project(
  p_prompt_id uuid,
  p_organization_id uuid,
  p_project_id uuid,
  p_prompt_text text default null,
  p_active boolean default null,
  p_change_reason text default 'Edited by workspace member'
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  perform 1
  from public.prompts prompt
  join public.projects project
    on project.id = prompt.project_id
   and project.organization_id = prompt.organization_id
  where prompt.id = p_prompt_id
    and prompt.organization_id = p_organization_id
    and prompt.project_id = p_project_id
    and project.status = 'active'
  for update of prompt;
  if not found then
    raise exception 'Buyer question not found in this project';
  end if;
  -- Re-uses the existing role check, versioning and audit semantics.
  return public.update_prompt_versioned(p_prompt_id, p_organization_id, p_prompt_text, p_active, p_change_reason);
end;
$$;

revoke all on function public.update_prompt_versioned_in_project(uuid, uuid, uuid, text, boolean, text) from public, anon, authenticated;
grant execute on function public.update_prompt_versioned_in_project(uuid, uuid, uuid, text, boolean, text) to authenticated, service_role;

-- Phase 2 (separate FM-00 migration, after the caller ships and a compatibility
-- audit shows no remaining direct callers):
-- revoke execute on function public.update_prompt_versioned(uuid, uuid, text, boolean, text) from authenticated;

commit;
