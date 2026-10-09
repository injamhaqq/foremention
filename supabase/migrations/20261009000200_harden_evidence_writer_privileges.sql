-- FM-05 phase 2: activate append-only buyer-question provenance.
-- DEPLOY ORDER: install phase 1, verify the new RPC, deploy the application
-- route that calls it, verify real onboarding/creation/edits, then apply this.
-- DO NOT apply to existing production until #332 and owner-gated review pass.
begin;

-- Authenticated clients may read questions/history, but must use:
--   create_prompt_versioned() to create a question + immutable version 1;
--   update_prompt_versioned() to edit a question and atomically append history.
-- The existing onboarding definer workflow and privileged export/delete
-- procedures remain able to perform their authorized operations.
revoke insert, update, delete on table public.prompts from authenticated;
revoke insert, update, delete on table public.prompt_versions from authenticated;

drop policy if exists prompts_write_admin on public.prompts;
drop policy if exists prompts_write_analyst on public.prompts;
drop policy if exists prompt_versions_write_admin on public.prompt_versions;
drop policy if exists prompt_versions_write_analyst on public.prompt_versions;

commit;
