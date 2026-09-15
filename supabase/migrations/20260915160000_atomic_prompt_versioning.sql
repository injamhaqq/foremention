-- F07: serialize buyer-question edits so canonical prompt state and immutable
-- version history cannot diverge under concurrent workspace edits.
begin;

create or replace function public.update_prompt_versioned(
  p_prompt_id uuid,
  p_organization_id uuid,
  p_prompt_text text default null,
  p_active boolean default null,
  p_change_reason text default 'Edited by workspace member'
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  current_prompt record;
  v_current_version integer;
  v_next_version integer;
  v_prompt_text text;
  final_prompt record;
begin
  if actor_id is null then
    raise exception 'Authentication required';
  end if;

  if not public.has_org_role(
    p_organization_id,
    array['owner','admin','analyst']::public.organization_role[]
  ) then
    raise exception 'Buyer-question edits require workspace write access';
  end if;

  select
    prompt.id,
    prompt.prompt_key,
    prompt.prompt_text,
    prompt.active,
    prompt.version,
    prompt.locale,
    prompt.market
  into current_prompt
  from public.prompts prompt
  where prompt.id = p_prompt_id
    and prompt.organization_id = p_organization_id
  for update;

  if current_prompt.id is null then
    raise exception 'Buyer question not found';
  end if;

  v_prompt_text := case when p_prompt_text is null then null else btrim(p_prompt_text) end;
  if v_prompt_text is not null and (char_length(v_prompt_text) < 10 or char_length(v_prompt_text) > 1000) then
    raise exception 'Buyer question must contain between 10 and 1000 characters';
  end if;

  v_current_version := current_prompt.version;
  v_next_version := v_current_version;
  if v_prompt_text is not null and v_prompt_text is distinct from current_prompt.prompt_text then
    v_next_version := v_current_version + 1;
  end if;

  if v_next_version <> v_current_version then
    update public.prompts
    set prompt_text = v_prompt_text,
        version = v_next_version,
        active = coalesce(p_active, active)
    where id = current_prompt.id
      and organization_id = p_organization_id;

    insert into public.prompt_versions (
      organization_id,
      prompt_id,
      version,
      prompt_text,
      change_reason,
      created_by,
      locale,
      market
    ) values (
      p_organization_id,
      current_prompt.id,
      v_next_version,
      v_prompt_text,
      left(coalesce(nullif(btrim(p_change_reason), ''), 'Edited by workspace member'), 500),
      actor_id,
      current_prompt.locale,
      current_prompt.market
    );
  elsif p_active is not null and p_active is distinct from current_prompt.active then
    update public.prompts
    set active = p_active
    where id = current_prompt.id
      and organization_id = p_organization_id;
  end if;

  select prompt.id, prompt.prompt_key, prompt.prompt_text, prompt.active, prompt.version
  into final_prompt
  from public.prompts prompt
  where prompt.id = current_prompt.id
    and prompt.organization_id = p_organization_id;

  return jsonb_build_object(
    'id', final_prompt.id,
    'prompt_key', final_prompt.prompt_key,
    'prompt_text', final_prompt.prompt_text,
    'active', final_prompt.active,
    'version', final_prompt.version
  );
end;
$$;

revoke all on function public.update_prompt_versioned(uuid, uuid, text, boolean, text) from public, anon, authenticated;
grant execute on function public.update_prompt_versioned(uuid, uuid, text, boolean, text) to authenticated, service_role;

commit;
