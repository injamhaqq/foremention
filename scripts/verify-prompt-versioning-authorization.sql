\set ON_ERROR_STOP on

begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- Disposable identities and tenants. The transaction is always rolled back.
insert into auth.users (id) values
  ('fb100000-0000-4000-8000-000000000001'::uuid),
  ('fb100000-0000-4000-8000-000000000002'::uuid),
  ('fb100000-0000-4000-8000-000000000003'::uuid),
  ('fb100000-0000-4000-8000-000000000004'::uuid);

insert into public.organizations (id, name, slug, created_by) values
  ('fb200000-0000-4000-8000-000000000001'::uuid, 'Prompt RPC Tenant A', 'prompt-rpc-a', 'fb100000-0000-4000-8000-000000000001'::uuid),
  ('fb200000-0000-4000-8000-000000000002'::uuid, 'Prompt RPC Tenant B', 'prompt-rpc-b', 'fb100000-0000-4000-8000-000000000004'::uuid);

insert into public.organization_members (organization_id, user_id, role) values
  ('fb200000-0000-4000-8000-000000000001'::uuid, 'fb100000-0000-4000-8000-000000000001'::uuid, 'owner'),
  ('fb200000-0000-4000-8000-000000000001'::uuid, 'fb100000-0000-4000-8000-000000000002'::uuid, 'analyst'),
  ('fb200000-0000-4000-8000-000000000001'::uuid, 'fb100000-0000-4000-8000-000000000003'::uuid, 'viewer'),
  ('fb200000-0000-4000-8000-000000000002'::uuid, 'fb100000-0000-4000-8000-000000000004'::uuid, 'owner');

insert into public.categories (id, organization_id, name) values
  ('fb300000-0000-4000-8000-000000000001'::uuid, 'fb200000-0000-4000-8000-000000000001'::uuid, 'Prompt RPC A'),
  ('fb300000-0000-4000-8000-000000000002'::uuid, 'fb200000-0000-4000-8000-000000000002'::uuid, 'Prompt RPC B');

insert into public.prompts (
  id, organization_id, category_id, prompt_key, prompt_text, locale, version, active
) values
  ('fb400000-0000-4000-8000-000000000001'::uuid, 'fb200000-0000-4000-8000-000000000001'::uuid, 'fb300000-0000-4000-8000-000000000001'::uuid, 'rpc-a', 'Original Tenant A buyer question?', 'en-US', 1, true),
  ('fb400000-0000-4000-8000-000000000002'::uuid, 'fb200000-0000-4000-8000-000000000002'::uuid, 'fb300000-0000-4000-8000-000000000002'::uuid, 'rpc-b', 'Original Tenant B buyer question?', 'en-US', 1, true);

-- Privilege surface: authenticated and service_role are intentionally allowed;
-- anon/PUBLIC must not be able to execute this SECURITY DEFINER RPC.
do $$
begin
  if has_function_privilege('anon', 'public.update_prompt_versioned(uuid,uuid,text,boolean,text)', 'EXECUTE') then
    raise exception 'anon unexpectedly has EXECUTE on update_prompt_versioned';
  end if;
  if not has_function_privilege('authenticated', 'public.update_prompt_versioned(uuid,uuid,text,boolean,text)', 'EXECUTE') then
    raise exception 'authenticated role lost the intentionally exposed prompt-versioning RPC';
  end if;
  if not has_function_privilege('service_role', 'public.update_prompt_versioned(uuid,uuid,text,boolean,text)', 'EXECUTE') then
    raise exception 'service_role lost prompt-versioning RPC access';
  end if;
end
$$;

-- An authorized analyst may edit only the prompt in their own organization.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'fb100000-0000-4000-8000-000000000002', true);

select public.update_prompt_versioned(
  'fb400000-0000-4000-8000-000000000001'::uuid,
  'fb200000-0000-4000-8000-000000000001'::uuid,
  'Analyst-authorized Tenant A buyer question?',
  true,
  'Isolated authorization proof'
);

do $$
begin
  if not exists (
    select 1 from public.prompts
    where id = 'fb400000-0000-4000-8000-000000000001'::uuid
      and organization_id = 'fb200000-0000-4000-8000-000000000001'::uuid
      and prompt_text = 'Analyst-authorized Tenant A buyer question?'
      and version = 2
  ) then
    raise exception 'Authorized analyst edit did not atomically update the scoped prompt';
  end if;
  if not exists (
    select 1 from public.prompt_versions
    where prompt_id = 'fb400000-0000-4000-8000-000000000001'::uuid
      and organization_id = 'fb200000-0000-4000-8000-000000000001'::uuid
      and version = 2
      and created_by = 'fb100000-0000-4000-8000-000000000002'::uuid
  ) then
    raise exception 'Authorized analyst edit did not append attributable prompt history';
  end if;
end
$$;

-- Same analyst cannot target Tenant B by supplying Tenant B's organization ID.
do $$
declare
  denied boolean := false;
begin
  begin
    perform public.update_prompt_versioned(
      'fb400000-0000-4000-8000-000000000002'::uuid,
      'fb200000-0000-4000-8000-000000000002'::uuid,
      'Forged cross-tenant buyer question?',
      true,
      'Must be denied'
    );
  exception when others then
    denied := position('workspace write access' in sqlerrm) > 0;
  end;
  if not denied then
    raise exception 'Cross-tenant RPC call was not rejected by organization-role authorization';
  end if;
end
$$;

-- Supplying Tenant A (where the analyst is authorized) cannot launder Tenant B's prompt ID.
do $$
declare
  denied boolean := false;
begin
  begin
    perform public.update_prompt_versioned(
      'fb400000-0000-4000-8000-000000000002'::uuid,
      'fb200000-0000-4000-8000-000000000001'::uuid,
      'Forged mismatched prompt organization?',
      true,
      'Must be denied'
    );
  exception when others then
    denied := position('Buyer question not found' in sqlerrm) > 0;
  end;
  if not denied then
    raise exception 'Mismatched prompt/org IDs escaped the scoped row lookup';
  end if;
end
$$;

-- A viewer is authenticated but still cannot use the definer RPC for writes.
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'fb100000-0000-4000-8000-000000000003', true);

do $$
declare
  denied boolean := false;
begin
  begin
    perform public.update_prompt_versioned(
      'fb400000-0000-4000-8000-000000000001'::uuid,
      'fb200000-0000-4000-8000-000000000001'::uuid,
      'Viewer-forged buyer question?',
      true,
      'Must be denied'
    );
  exception when others then
    denied := position('workspace write access' in sqlerrm) > 0;
  end;
  if not denied then
    raise exception 'Authenticated viewer gained definer-RPC write access';
  end if;
end
$$;

-- Verify every denied path left Tenant B untouched and created no foreign history.
reset role;
do $$
begin
  if not exists (
    select 1 from public.prompts
    where id = 'fb400000-0000-4000-8000-000000000002'::uuid
      and organization_id = 'fb200000-0000-4000-8000-000000000002'::uuid
      and prompt_text = 'Original Tenant B buyer question?'
      and version = 1
  ) then
    raise exception 'Denied RPC path mutated Tenant B prompt state';
  end if;
  if exists (
    select 1 from public.prompt_versions
    where prompt_id = 'fb400000-0000-4000-8000-000000000002'::uuid
  ) then
    raise exception 'Denied RPC path wrote Tenant B prompt history';
  end if;
end
$$;

rollback;
