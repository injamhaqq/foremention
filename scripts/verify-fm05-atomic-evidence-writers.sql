\set ON_ERROR_STOP on

-- FM-05 synthetic tenant and writer-boundary regression.
-- Must run only on a disposable local stack after full migration replay.
-- All fixture changes are rolled back.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $$
declare
  relation_name text;
begin
  foreach relation_name in array array['prompts','prompt_versions','run_attempts'] loop
    if has_table_privilege('authenticated', format('public.%I',relation_name),'INSERT')
       or has_table_privilege('authenticated', format('public.%I',relation_name),'UPDATE')
       or has_table_privilege('authenticated', format('public.%I',relation_name),'DELETE') then
      raise exception 'FM-05: authenticated still has direct DML on %', relation_name;
    end if;
    if not has_table_privilege('authenticated', format('public.%I',relation_name),'SELECT') then
      raise exception 'FM-05: authenticated lost required reader access to %', relation_name;
    end if;
  end loop;

  if not has_table_privilege('service_role','public.run_attempts','INSERT')
     or not has_table_privilege('service_role','public.run_attempts','UPDATE')
     or not has_table_privilege('service_role','public.run_attempts','DELETE') then
    raise exception 'FM-05: provider service-role receipts lost writer privileges';
  end if;
  if not has_function_privilege('authenticated',
    'public.create_prompt_versioned(uuid,uuid,uuid,uuid,text,text)', 'EXECUTE')
    or has_function_privilege('anon',
    'public.create_prompt_versioned(uuid,uuid,uuid,uuid,text,text)', 'EXECUTE') then
    raise exception 'FM-05: creation RPC privilege boundary incorrect';
  end if;
  if exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename in ('prompts','prompt_versions','run_attempts')
      and cmd <> 'SELECT'
  ) then
    raise exception 'FM-05: obsolete direct writer policy remains';
  end if;
end
$$;

-- Two organizations, two sibling projects in A, owner + viewer fixture users.
insert into auth.users (id) values
  ('f5100000-0000-4000-8000-000000000001'::uuid),
  ('f5100000-0000-4000-8000-000000000002'::uuid),
  ('f5100000-0000-4000-8000-000000000003'::uuid);

insert into public.organizations (id,name,slug,created_by) values
  ('f5200000-0000-4000-8000-000000000001'::uuid,'FM05 Tenant A','fm05-a','f5100000-0000-4000-8000-000000000001'::uuid),
  ('f5200000-0000-4000-8000-000000000002'::uuid,'FM05 Tenant B','fm05-b','f5100000-0000-4000-8000-000000000002'::uuid);

insert into public.organization_members (organization_id,user_id,role) values
  ('f5200000-0000-4000-8000-000000000001'::uuid,'f5100000-0000-4000-8000-000000000001'::uuid,'owner'),
  ('f5200000-0000-4000-8000-000000000001'::uuid,'f5100000-0000-4000-8000-000000000003'::uuid,'viewer'),
  ('f5200000-0000-4000-8000-000000000002'::uuid,'f5100000-0000-4000-8000-000000000002'::uuid,'owner');

insert into public.projects (id,organization_id,name,slug,client_brand,created_by) values
  ('f5300000-0000-4000-8000-000000000001'::uuid,'f5200000-0000-4000-8000-000000000001'::uuid,'Project A1','fm05-a1','FM05 brand A1','f5100000-0000-4000-8000-000000000001'::uuid),
  ('f5300000-0000-4000-8000-000000000002'::uuid,'f5200000-0000-4000-8000-000000000001'::uuid,'Project A2','fm05-a2','FM05 brand A2','f5100000-0000-4000-8000-000000000001'::uuid),
  ('f5300000-0000-4000-8000-000000000003'::uuid,'f5200000-0000-4000-8000-000000000002'::uuid,'Project B1','fm05-b1','FM05 brand B1','f5100000-0000-4000-8000-000000000002'::uuid);

insert into public.categories (id,organization_id,name) values
  ('f5400000-0000-4000-8000-000000000001'::uuid,'f5200000-0000-4000-8000-000000000001'::uuid,'FM05 category A'),
  ('f5400000-0000-4000-8000-000000000002'::uuid,'f5200000-0000-4000-8000-000000000002'::uuid,'FM05 category B');

insert into public.prompt_clusters (id,organization_id,project_id,name,intent) values
  ('f5500000-0000-4000-8000-000000000001'::uuid,'f5200000-0000-4000-8000-000000000001'::uuid,'f5300000-0000-4000-8000-000000000001'::uuid,'FM05 buyer cluster A1','Verified local fixture'),
  ('f5500000-0000-4000-8000-000000000002'::uuid,'f5200000-0000-4000-8000-000000000001'::uuid,'f5300000-0000-4000-8000-000000000002'::uuid,'FM05 buyer cluster A2','Verified local fixture');

set local role authenticated;
select set_config('request.jwt.claim.sub','f5100000-0000-4000-8000-000000000001',true);

do $$
declare
  created jsonb;
  edited jsonb;
  new_prompt uuid;
  count_records integer;
  denied boolean;
  i integer;
begin
  created := public.create_prompt_versioned(
    'f5200000-0000-4000-8000-000000000001'::uuid,
    'f5300000-0000-4000-8000-000000000001'::uuid,
    'f5400000-0000-4000-8000-000000000001'::uuid,
    'f5500000-0000-4000-8000-000000000001'::uuid,
    'customer-fm05-first',
    'Which verified provider delivers the best buyer outcomes?'
  );
  new_prompt := (created->>'id')::uuid;
  if (created->>'version')::integer <> 1 then
    raise exception 'FM-05: version 1 was not returned';
  end if;

  select count(*) into count_records
  from public.prompt_versions
  where prompt_id = new_prompt and version = 1
    and organization_id = 'f5200000-0000-4000-8000-000000000001'::uuid;
  if count_records <> 1 then
    raise exception 'FM-05: prompt version 1 not persisted atomically';
  end if;

  edited := public.update_prompt_versioned(
    new_prompt, 'f5200000-0000-4000-8000-000000000001'::uuid,
    'Which validated provider has the strongest independently reviewed outcomes?',
    null, 'FM-05 isolated regression'
  );
  if (edited->>'version')::integer <> 2 then
    raise exception 'FM-05: editing broke atomic version history';
  end if;

  select count(*) into count_records from public.prompt_versions where prompt_id = new_prompt;
  if count_records <> 2 then
    raise exception 'FM-05: expected exactly two immutable versions';
  end if;

  denied := false;
  begin
    perform public.create_prompt_versioned(
      'f5200000-0000-4000-8000-000000000001'::uuid,
      'f5300000-0000-4000-8000-000000000002'::uuid,
      'f5400000-0000-4000-8000-000000000001'::uuid,
      'f5500000-0000-4000-8000-000000000001'::uuid,
      'customer-fm05-cross-project',
      'How does a different sibling project evaluate trustworthiness?'
    );
  exception when raise_exception then
    denied := true;
  end;
  if not denied then raise exception 'FM-05: accepted sibling-project cluster'; end if;

  denied := false;
  begin
    perform public.create_prompt_versioned(
      'f5200000-0000-4000-8000-000000000002'::uuid,
      'f5300000-0000-4000-8000-000000000003'::uuid,
      'f5400000-0000-4000-8000-000000000002'::uuid,
      null,
      'customer-fm05-cross-tenant',
      'Can a member of tenant A create questions for tenant B?'
    );
  exception when raise_exception then
    denied := true;
  end;
  if not denied then raise exception 'FM-05: accepted cross-tenant creation'; end if;

  -- Lock-on-project enforces the plan ceiling even for direct RPC clients.
  for i in 2..10 loop
    perform public.create_prompt_versioned(
      'f5200000-0000-4000-8000-000000000001'::uuid,
      'f5300000-0000-4000-8000-000000000001'::uuid,
      'f5400000-0000-4000-8000-000000000001'::uuid,
      'f5500000-0000-4000-8000-000000000001'::uuid,
      'customer-fm05-cap-' || i,
      'Which provider meets the required review standard in evaluation?'
    );
  end loop;
  denied := false;
  begin
    perform public.create_prompt_versioned(
      'f5200000-0000-4000-8000-000000000001'::uuid,
      'f5300000-0000-4000-8000-000000000001'::uuid,
      'f5400000-0000-4000-8000-000000000001'::uuid,
      null,
      'customer-fm05-cap-11',
      'Can the workspace exceed its permitted ten buyer questions?'
    );
  exception when raise_exception then denied := true;
  end;
  if not denied then raise exception 'FM-05: bypassed buyer-question limit'; end if;
end
$$;

-- Viewer cannot call the privileged RPC even when they can read the workspace.
select set_config('request.jwt.claim.sub','f5100000-0000-4000-8000-000000000003',true);
do $$
declare denied boolean := false;
begin
  begin
    perform public.create_prompt_versioned(
      'f5200000-0000-4000-8000-000000000001'::uuid,
      'f5300000-0000-4000-8000-000000000002'::uuid,
      'f5400000-0000-4000-8000-000000000001'::uuid,
      'f5500000-0000-4000-8000-000000000002'::uuid,
      'customer-fm05-viewer',
      'Could a viewer quietly alter the buyer evidence workflow?'
    );
  exception when raise_exception then denied := true;
  end;
  if not denied then raise exception 'FM-05: viewer could create a question'; end if;
end
$$;

-- Root graph isolation: privileged job/measurement writers must not forge
-- an organization/project pairing, even when RLS is bypassed.
reset role;

do $
declare
  relation_name text;
  expected_name text;
  fk_def text;
  valid_fk boolean;
begin
  foreach relation_name in array array['prompts','prompt_clusters','runs','jobs'] loop
    expected_name := relation_name || '_project_id_fkey';
    select pg_get_constraintdef(c.oid), c.convalidated into fk_def, valid_fk
      from pg_constraint c
      where c.conrelid = format('public.%I',relation_name)::regclass
        and c.conname = expected_name
        and c.contype = 'f';
    if fk_def is null
       or position('FOREIGN KEY (organization_id, project_id)' in fk_def) <> 1
       or position('REFERENCES projects(organization_id, id)' in fk_def) = 0
       or position('ON DELETE CASCADE' in fk_def) = 0
       or not coalesce(valid_fk, false) then
      raise exception 'FM-05: composite root FK missing or unvalidated on %', relation_name;
    end if;
  end loop;
end
$;

do $
declare
  rejected boolean;
begin
  rejected := false;
  begin
    insert into public.prompts (organization_id,project_id,category_id,prompt_key,prompt_text)
    values ('f5200000-0000-4000-8000-000000000001'::uuid,
      'f5300000-0000-4000-8000-000000000003'::uuid,
      'f5400000-0000-4000-8000-000000000001'::uuid,
      'fm05-forged-cross-org-prompt',
      'Attempted project contamination must be blocked here');
  exception when foreign_key_violation then rejected := true;
  end;
  if not rejected then raise exception 'FM-05: project mismatch accepted in prompts'; end if;

  rejected := false;
  begin
    insert into public.prompt_clusters (organization_id,project_id,name,intent)
    values ('f5200000-0000-4000-8000-000000000001'::uuid,
      'f5300000-0000-4000-8000-000000000003'::uuid,
      'FM05 forged cross-org cluster','Must not be persisted');
  exception when foreign_key_violation then rejected := true;
  end;
  if not rejected then raise exception 'FM-05: project mismatch accepted in clusters'; end if;

  rejected := false;
  begin
    insert into public.runs (organization_id,project_id,category_id,created_by)
    values ('f5200000-0000-4000-8000-000000000001'::uuid,
      'f5300000-0000-4000-8000-000000000003'::uuid,
      'f5400000-0000-4000-8000-000000000001'::uuid,
      'f5100000-0000-4000-8000-000000000001'::uuid);
  exception when foreign_key_violation then rejected := true;
  end;
  if not rejected then raise exception 'FM-05: project mismatch accepted in runs'; end if;

  rejected := false;
  begin
    insert into public.jobs (organization_id,project_id,job_type,status)
    values ('f5200000-0000-4000-8000-000000000001'::uuid,
      'f5300000-0000-4000-8000-000000000003'::uuid,
      'fm05-root-fk-negative','queued');
  exception when foreign_key_violation then rejected := true;
  end;
  if not rejected then raise exception 'FM-05: project mismatch accepted in jobs'; end if;
end
$;

-- Confirm a valid same-org pairing remains writable for the service executor.
insert into public.jobs (organization_id,project_id,job_type,status)
values ('f5200000-0000-4000-8000-000000000001'::uuid,
  'f5300000-0000-4000-8000-000000000001'::uuid,
  'fm05-root-fk-positive','queued');

rollback;