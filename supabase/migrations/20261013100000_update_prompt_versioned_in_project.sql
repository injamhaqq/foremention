-- FM-00 adopted 2026-10-13 from Chat02 proposal
-- (docs/execution/attach-v1/02-proposals/proposed-migration-update-prompt-in-project.sql @ 56d6591c), backlog A11 / CV-04.
-- Additive project-bound entry point wrapping update_prompt_versioned; callers move in a Chat04-owned change.
-- Phase 2 (revoke the org-only signature from authenticated) is a separate later migration.
-- PRODUCTION: apply only after a verified backup (see 00-proposals/release-and-rollback-plan.md).

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
