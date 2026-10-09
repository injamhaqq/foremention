-- FM-05 phase 1: install the new atomic buyer-question creation RPC while
-- the current application can still create prompts through its legacy path.
-- Production migration history is divergent: execute only after #332
-- reconciliation, independent backup and FM-00 owner-gated approval.
begin;

create or replace function public.create_prompt_versioned(
  p_organization_id uuid,
  p_project_id uuid,
  p_category_id uuid,
  p_cluster_id uuid,
  p_prompt_key text,
  p_prompt_text text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_count bigint;
  v_new_prompt record;
  v_text text := btrim(p_prompt_text);
begin
  if v_actor is null then
    raise exception 'Authentication required';
  end if;

  if not public.has_org_role(
    p_organization_id,
    array['owner','admin','analyst']::public.organization_role[]
  ) then
    raise exception 'Buyer-question creation requires workspace write access';
  end if;

  if p_project_id is null or p_category_id is null
     or p_prompt_key is null or length(p_prompt_key) > 160
     or p_prompt_key !~ '^customer-[a-z0-9-]+$'
     or v_text is null or char_length(v_text) < 10
     or char_length(v_text) > 1000 then
    raise exception 'Invalid buyer-question request';
  end if;

  -- Serializes question creation per project so concurrent requests cannot
  -- evade the Foundation plan's 10-question limit.
  perform 1 from public.projects
    where id = p_project_id and organization_id = p_organization_id
    for update;
  if not found then
    raise exception 'Project not found in this workspace';
  end if;

  perform 1 from public.categories
    where id = p_category_id and organization_id = p_organization_id;
  if not found then
    raise exception 'Category not found in this workspace';
  end if;

  if p_cluster_id is not null then
    perform 1 from public.prompt_clusters
      where id = p_cluster_id and organization_id = p_organization_id
        and project_id = p_project_id;
    if not found then
      raise exception 'Buyer-question cluster does not belong to the project';
    end if;
  end if;

  select count(*) into v_count
    from public.prompts
    where organization_id = p_organization_id and project_id = p_project_id;
  if v_count >= 10 then
    raise exception 'Foundation buyer-question limit reached';
  end if;

  insert into public.prompts (
    organization_id, project_id, category_id, cluster_id, prompt_key,
    prompt_text, buyer_stage, locale, market, version, active
  ) values (
    p_organization_id, p_project_id, p_category_id, p_cluster_id, p_prompt_key,
    v_text, 'evaluation', 'en-US', 'global', 1, true
  ) returning id, version, prompt_text, locale, market into v_new_prompt;

  insert into public.prompt_versions (
    organization_id, prompt_id, version, prompt_text, change_reason,
    created_by, locale, market
  ) values (
    p_organization_id, v_new_prompt.id, v_new_prompt.version, v_new_prompt.prompt_text,
    'Created by workspace member', v_actor, v_new_prompt.locale, v_new_prompt.market
  );

  return jsonb_build_object(
    'id', v_new_prompt.id,
    'version', v_new_prompt.version
  );
end;
$$;

revoke all on function public.create_prompt_versioned(uuid,uuid,uuid,uuid,text,text)
  from public, anon, authenticated;
grant execute on function public.create_prompt_versioned(uuid,uuid,uuid,uuid,text,text)
  to authenticated, service_role;

-- Provider response and cost facts are service-produced receipts; direct
-- writes by authenticated workspace members are not part of the customer API.
-- Preserve their SELECT access and service_role's DML permissions.
-- These tables hold provider-collected evidence. Their normal writes come
-- from service_role workers and authorized server-side review routes, NOT
-- directly from an authenticated member. Preserve member SELECT access.
revoke insert, update, delete on table
  public.run_attempts,
  public.run_answers,
  public.citations,
  public.source_maps,
  public.source_observations
from authenticated;

drop policy if exists run_attempts_write_admin on public.run_attempts;
drop policy if exists run_attempts_write_analyst on public.run_attempts;
drop policy if exists run_answers_write_admin on public.run_answers;
drop policy if exists run_answers_write_analyst on public.run_answers;
drop policy if exists citations_write_admin on public.citations;
drop policy if exists citations_write_analyst on public.citations;
drop policy if exists source_maps_write_admin on public.source_maps;
drop policy if exists source_maps_write_analyst on public.source_maps;
drop policy if exists source_observations_write_admin on public.source_observations;
drop policy if exists source_observations_write_analyst on public.source_observations;

commit;
