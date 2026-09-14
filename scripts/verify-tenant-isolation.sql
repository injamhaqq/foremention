\set ON_ERROR_STOP on

begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- Disposable identities and tenants. The surrounding transaction is always rolled back.
insert into auth.users (id) values
  ('f0100000-0000-4000-8000-000000000001'::uuid),
  ('f0100000-0000-4000-8000-000000000002'::uuid),
  ('f0100000-0000-4000-8000-000000000003'::uuid);

insert into public.organizations (id, name, slug, created_by) values
  ('f0200000-0000-4000-8000-000000000001'::uuid, 'Tenant Isolation A', 'tenant-isolation-a', 'f0100000-0000-4000-8000-000000000001'::uuid),
  ('f0200000-0000-4000-8000-000000000002'::uuid, 'Tenant Isolation B', 'tenant-isolation-b', 'f0100000-0000-4000-8000-000000000002'::uuid);

insert into public.organization_members (organization_id, user_id, role) values
  ('f0200000-0000-4000-8000-000000000001'::uuid, 'f0100000-0000-4000-8000-000000000001'::uuid, 'owner'),
  ('f0200000-0000-4000-8000-000000000001'::uuid, 'f0100000-0000-4000-8000-000000000003'::uuid, 'analyst'),
  ('f0200000-0000-4000-8000-000000000002'::uuid, 'f0100000-0000-4000-8000-000000000002'::uuid, 'owner');

insert into public.categories (id, organization_id, name) values
  ('f0300000-0000-4000-8000-000000000001'::uuid, 'f0200000-0000-4000-8000-000000000001'::uuid, 'Tenant A Category'),
  ('f0300000-0000-4000-8000-000000000002'::uuid, 'f0200000-0000-4000-8000-000000000002'::uuid, 'Tenant B Category');

insert into public.prompts (id, organization_id, category_id, prompt_key, prompt_text) values
  ('f0400000-0000-4000-8000-000000000001'::uuid, 'f0200000-0000-4000-8000-000000000001'::uuid, 'f0300000-0000-4000-8000-000000000001'::uuid, 'tenant-a-question', 'Tenant A question?'),
  ('f0400000-0000-4000-8000-000000000002'::uuid, 'f0200000-0000-4000-8000-000000000002'::uuid, 'f0300000-0000-4000-8000-000000000002'::uuid, 'tenant-b-question', 'Tenant B question?');

insert into public.runs (id, organization_id, category_id, created_by) values
  ('f0500000-0000-4000-8000-000000000001'::uuid, 'f0200000-0000-4000-8000-000000000001'::uuid, 'f0300000-0000-4000-8000-000000000001'::uuid, 'f0100000-0000-4000-8000-000000000001'::uuid),
  ('f0500000-0000-4000-8000-000000000002'::uuid, 'f0200000-0000-4000-8000-000000000002'::uuid, 'f0300000-0000-4000-8000-000000000002'::uuid, 'f0100000-0000-4000-8000-000000000002'::uuid);

insert into public.run_answers (id, run_id, organization_id, prompt_id, prompt_key, provider, model, answer_text, collected_at) values
  ('f0600000-0000-4000-8000-000000000001'::uuid, 'f0500000-0000-4000-8000-000000000001'::uuid, 'f0200000-0000-4000-8000-000000000001'::uuid, 'f0400000-0000-4000-8000-000000000001'::uuid, 'tenant-a-question', 'fixture', 'fixture-v1', 'Tenant A answer', now()),
  ('f0600000-0000-4000-8000-000000000002'::uuid, 'f0500000-0000-4000-8000-000000000002'::uuid, 'f0200000-0000-4000-8000-000000000002'::uuid, 'f0400000-0000-4000-8000-000000000002'::uuid, 'tenant-b-question', 'fixture', 'fixture-v1', 'Tenant B answer', now());

insert into public.sources (id, organization_id, canonical_url, domain) values
  ('f0700000-0000-4000-8000-000000000001'::uuid, 'f0200000-0000-4000-8000-000000000001'::uuid, 'https://tenant-a.invalid/source', 'tenant-a.invalid'),
  ('f0700000-0000-4000-8000-000000000002'::uuid, 'f0200000-0000-4000-8000-000000000002'::uuid, 'https://tenant-b.invalid/source', 'tenant-b.invalid');

insert into public.citations (id, organization_id, run_answer_id, source_id, ordinal) values
  ('f0800000-0000-4000-8000-000000000001'::uuid, 'f0200000-0000-4000-8000-000000000001'::uuid, 'f0600000-0000-4000-8000-000000000001'::uuid, 'f0700000-0000-4000-8000-000000000001'::uuid, 1),
  ('f0800000-0000-4000-8000-000000000002'::uuid, 'f0200000-0000-4000-8000-000000000002'::uuid, 'f0600000-0000-4000-8000-000000000002'::uuid, 'f0700000-0000-4000-8000-000000000002'::uuid, 1);

-- Every directly tenant-owned table exposed to authenticated users must have RLS and a policy.
do $$
declare
  row_record record;
begin
  for row_record in
    select c.oid, c.relname, c.relrowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid and a.attname = 'organization_id' and not a.attisdropped
    where n.nspname = 'public' and c.relkind = 'r'
  loop
    if not row_record.relrowsecurity then
      raise exception 'Tenant table % does not have RLS enabled', row_record.relname;
    end if;
    if has_table_privilege('authenticated', format('public.%I', row_record.relname), 'SELECT')
       and not exists (select 1 from pg_policy p where p.polrelid = row_record.oid) then
      raise exception 'Authenticated tenant table % has no RLS policy', row_record.relname;
    end if;
  end loop;
end
$$;

-- Browser-path reciprocal isolation, using a non-owner analyst in Tenant A.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'f0100000-0000-4000-8000-000000000003', true);

do $$
declare
  changed integer;
  denied boolean := false;
begin
  if (select count(*) from public.organizations where id = 'f0200000-0000-4000-8000-000000000001'::uuid) <> 1
     or (select count(*) from public.organizations where id = 'f0200000-0000-4000-8000-000000000002'::uuid) <> 0 then
    raise exception 'Organization read isolation failed for Tenant A';
  end if;
  if (select count(*) from public.prompts where organization_id = 'f0200000-0000-4000-8000-000000000001'::uuid) <> 1
     or (select count(*) from public.prompts where organization_id = 'f0200000-0000-4000-8000-000000000002'::uuid) <> 0 then
    raise exception 'Prompt read isolation failed for Tenant A';
  end if;
  if (select count(*) from public.runs where organization_id = 'f0200000-0000-4000-8000-000000000001'::uuid) <> 1
     or (select count(*) from public.runs where organization_id = 'f0200000-0000-4000-8000-000000000002'::uuid) <> 0 then
    raise exception 'Run read isolation failed for Tenant A';
  end if;
  if (select count(*) from public.run_answers where organization_id = 'f0200000-0000-4000-8000-000000000001'::uuid) <> 1
     or (select count(*) from public.run_answers where organization_id = 'f0200000-0000-4000-8000-000000000002'::uuid) <> 0 then
    raise exception 'Answer read isolation failed for Tenant A';
  end if;
  if (select count(*) from public.sources where organization_id = 'f0200000-0000-4000-8000-000000000001'::uuid) <> 1
     or (select count(*) from public.sources where organization_id = 'f0200000-0000-4000-8000-000000000002'::uuid) <> 0 then
    raise exception 'Source read isolation failed for Tenant A';
  end if;
  if (select count(*) from public.citations where organization_id = 'f0200000-0000-4000-8000-000000000001'::uuid) <> 1
     or (select count(*) from public.citations where organization_id = 'f0200000-0000-4000-8000-000000000002'::uuid) <> 0 then
    raise exception 'Citation read isolation failed for Tenant A';
  end if;

  update public.prompts set prompt_text = 'forged cross-tenant update'
  where id = 'f0400000-0000-4000-8000-000000000002'::uuid;
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'Cross-tenant update was permitted'; end if;

  delete from public.sources where id = 'f0700000-0000-4000-8000-000000000002'::uuid;
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'Cross-tenant delete was permitted'; end if;

  begin
    insert into public.categories (organization_id, name)
    values ('f0200000-0000-4000-8000-000000000002'::uuid, 'forged cross-tenant insert');
  exception when insufficient_privilege then
    denied := true;
  end;
  if not denied then raise exception 'Cross-tenant insert was permitted'; end if;
end
$$;

-- Reverse the read test under Tenant B's owner.
select set_config('request.jwt.claim.sub', 'f0100000-0000-4000-8000-000000000002', true);

do $$
begin
  if (select count(*) from public.prompts where organization_id = 'f0200000-0000-4000-8000-000000000002'::uuid) <> 1
     or (select count(*) from public.prompts where organization_id = 'f0200000-0000-4000-8000-000000000001'::uuid) <> 0 then
    raise exception 'Reciprocal prompt isolation failed for Tenant B';
  end if;
end
$$;

-- Role downgrade must take effect immediately; a viewer cannot keep analyst write power.
reset role;
update public.organization_members
set role = 'viewer'
where organization_id = 'f0200000-0000-4000-8000-000000000001'::uuid
  and user_id = 'f0100000-0000-4000-8000-000000000003'::uuid;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'f0100000-0000-4000-8000-000000000003', true);

do $$
declare
  changed integer := 0;
begin
  begin
    update public.prompts
    set prompt_text = 'viewer must not write'
    where id = 'f0400000-0000-4000-8000-000000000001'::uuid;
    get diagnostics changed = row_count;
  exception when insufficient_privilege then
    changed := 0;
  end;
  if changed <> 0 then
    raise exception 'Role downgrade did not revoke prompt write access';
  end if;
end
$$;

-- Membership revocation must remove tenant visibility without waiting for a new session.
reset role;
delete from public.organization_members
where organization_id = 'f0200000-0000-4000-8000-000000000001'::uuid
  and user_id = 'f0100000-0000-4000-8000-000000000003'::uuid;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'f0100000-0000-4000-8000-000000000003', true);

do $$
declare
  denied boolean := false;
begin
  if exists (select 1 from public.organizations where id = 'f0200000-0000-4000-8000-000000000001'::uuid)
     or exists (select 1 from public.runs where organization_id = 'f0200000-0000-4000-8000-000000000001'::uuid)
     or exists (select 1 from public.run_answers where organization_id = 'f0200000-0000-4000-8000-000000000001'::uuid) then
    raise exception 'Revoked member retained tenant read access';
  end if;
  begin
    insert into public.categories (organization_id, name)
    values ('f0200000-0000-4000-8000-000000000001'::uuid, 'revoked member write');
  exception when insufficient_privilege then
    denied := true;
  end;
  if not denied then raise exception 'Revoked member retained tenant write access'; end if;
end
$$;

-- Service-role/database invariant: privileged writers cannot attach a tenant-owned
-- child to another tenant's parent merely by knowing the parent's UUID.
reset role;

do $$
declare
  rejected boolean;
begin
  rejected := false;
  begin
    insert into public.run_answers (
      id, run_id, organization_id, prompt_id, prompt_key, provider, model, answer_text, collected_at
    ) values (
      'f0600000-0000-4000-8000-000000000099'::uuid,
      'f0500000-0000-4000-8000-000000000002'::uuid,
      'f0200000-0000-4000-8000-000000000001'::uuid,
      'f0400000-0000-4000-8000-000000000001'::uuid,
      'forged-cross-tenant', 'fixture', 'fixture-v1', 'must be rejected', now()
    );
  exception when foreign_key_violation or check_violation or raise_exception then
    rejected := true;
  end;
  if not rejected then
    raise exception 'Database accepted a cross-tenant run_answers -> runs attachment';
  end if;

  rejected := false;
  begin
    insert into public.citations (id, organization_id, run_answer_id, source_id, ordinal)
    values (
      'f0800000-0000-4000-8000-000000000098'::uuid,
      'f0200000-0000-4000-8000-000000000001'::uuid,
      'f0600000-0000-4000-8000-000000000002'::uuid,
      'f0700000-0000-4000-8000-000000000001'::uuid,
      2
    );
  exception when foreign_key_violation or check_violation or raise_exception then
    rejected := true;
  end;
  if not rejected then
    raise exception 'Database accepted a cross-tenant citation -> run_answer attachment';
  end if;

  rejected := false;
  begin
    insert into public.citations (id, organization_id, run_answer_id, source_id, ordinal)
    values (
      'f0800000-0000-4000-8000-000000000097'::uuid,
      'f0200000-0000-4000-8000-000000000001'::uuid,
      'f0600000-0000-4000-8000-000000000001'::uuid,
      'f0700000-0000-4000-8000-000000000002'::uuid,
      3
    );
  exception when foreign_key_violation or check_violation or raise_exception then
    rejected := true;
  end;
  if not rejected then
    raise exception 'Database accepted a cross-tenant citation -> source attachment';
  end if;

  rejected := false;
  begin
    insert into public.run_attempts (
      id, organization_id, run_id, prompt_id, provider, attempt_number, status
    ) values (
      'f0900000-0000-4000-8000-000000000099'::uuid,
      'f0200000-0000-4000-8000-000000000001'::uuid,
      'f0500000-0000-4000-8000-000000000002'::uuid,
      'f0400000-0000-4000-8000-000000000001'::uuid,
      'fixture', 1, 'queued'
    );
  exception when foreign_key_violation or check_violation or raise_exception then
    rejected := true;
  end;
  if not rejected then
    raise exception 'Database accepted a cross-tenant run_attempt -> run attachment';
  end if;

  rejected := false;
  begin
    insert into public.source_observations (
      id, organization_id, source_id, run_answer_id, prompt_id, provider, observed_at
    ) values (
      'f0a00000-0000-4000-8000-000000000099'::uuid,
      'f0200000-0000-4000-8000-000000000001'::uuid,
      'f0700000-0000-4000-8000-000000000002'::uuid,
      'f0600000-0000-4000-8000-000000000001'::uuid,
      'f0400000-0000-4000-8000-000000000001'::uuid,
      'fixture', now()
    );
  exception when foreign_key_violation or check_violation or raise_exception then
    rejected := true;
  end;
  if not rejected then
    raise exception 'Database accepted a cross-tenant source_observation -> source attachment';
  end if;
end
$$;

rollback;
