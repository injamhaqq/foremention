-- Launch blocker "10-question cap" (Refs #516 #532): create_prompt_versioned
-- (20261009000100) still hard-coded 10 questions per project, so Core (25)
-- and Signal (100) workspaces stopped at 10 even with a verified-billing
-- entitlement. This replaces only the capacity check: the limit now comes
-- from organization_entitlements, counted across active questions in the
-- organization, matching enforce_buyer_question_capacity_v1
-- (20261011090000). Foundation access stays 10. Role, project, category and
-- cluster checks, and the atomic version-1 history, are unchanged.
-- Over-capacity raises PT429 (HTTP 429), the same as the admission trigger.
--
-- PRODUCTION: apply only after #332 reconciliation, a verified backup and
-- founder approval. Rollback: re-run the function body from
-- 20261009000100_create_atomic_buyer_question_rpc.sql.
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
  v_limit integer;
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

  -- Row lock keeps the project stable for the insert; the organization-wide
  -- advisory lock below (same key as enforce_buyer_question_capacity_v1)
  -- serializes admission so concurrent requests cannot exceed capacity.
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

  perform pg_advisory_xact_lock(hashtextextended('foremention.buyer_question_admission:' || p_organization_id::text, 0));

  -- Capacity = the persisted entitlement (verified billing via
  -- billing_package_capacity_v1, or an explicit founder grant) when active and
  -- unexpired; otherwise Foundation access (10). Counted across ACTIVE
  -- questions in the whole organization, exactly like the admission trigger.
  select case
           when e.status = 'active' and (e.expires_at is null or e.expires_at > now()) and e.max_prompts > 0
             then e.max_prompts
           else 10
         end
    into v_limit
    from public.organization_entitlements e
   where e.organization_id = p_organization_id;
  v_limit := coalesce(v_limit, 10);

  select count(*) into v_count
    from public.prompts
   where organization_id = p_organization_id and active;
  if v_count >= v_limit then
    raise sqlstate 'PT429' using message = 'Prompt limit exceeded for this workspace entitlement (' || v_limit || ' active buyer questions).';
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

commit;
