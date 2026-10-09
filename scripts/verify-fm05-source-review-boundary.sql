\set ON_ERROR_STOP on

-- FM-05 #484: disposable synthetic authorization and provenance tests.
-- CI only: executed against isolated local Supabase after migration replay.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $$
declare t text;
begin
  if has_function_privilege('anon',
      'public.review_source_map_entry(uuid,uuid,uuid,uuid,boolean,text[],text,text,text,text)','EXECUTE') then
    raise exception 'FM-05: anonymous source review RPC access';
  end if;
  if not has_function_privilege('authenticated',
      'public.review_source_map_entry(uuid,uuid,uuid,uuid,boolean,text[],text,text,text,text)','EXECUTE') then
    raise exception 'FM-05: member source review RPC unavailable';
  end if;
  if has_table_privilege('authenticated','public.source_map_entries','INSERT')
     or has_table_privilege('authenticated','public.source_map_entries','UPDATE')
     or has_table_privilege('authenticated','public.source_map_entries','DELETE') then
    raise exception 'FM-05: member still has broad source-entry mutation privileges';
  end if;
  if not has_table_privilege('authenticated','public.source_map_entries','SELECT')
     or not has_table_privilege('service_role','public.source_map_entries','INSERT')
     or not has_table_privilege('service_role','public.source_map_entries','UPDATE')
     or not has_table_privilege('service_role','public.source_map_entries','DELETE') then
    raise exception 'FM-05: reader or collector role privileges were lost';
  end if;
  if exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='source_map_entries'
      and cmd in ('ALL','INSERT','UPDATE','DELETE')
  ) then
    raise exception 'FM-05: broad authenticated source map entry writer policy remains';
  end if;
end
$$;

insert into auth.users (id) values
('f6100000-0000-4000-8000-000000000001'::uuid),
('f6100000-0000-4000-8000-000000000002'::uuid),
('f6100000-0000-4000-8000-000000000003'::uuid);

insert into public.organizations (id,name,slug,created_by) values
('f6200000-0000-4000-8000-000000000001'::uuid,'FM05 Review A','fm05-review-a','f6100000-0000-4000-8000-000000000001'::uuid),
('f6200000-0000-4000-8000-000000000002'::uuid,'FM05 Review B','fm05-review-b','f6100000-0000-4000-8000-000000000002'::uuid);

insert into public.organization_members (organization_id,user_id,role) values
('f6200000-0000-4000-8000-000000000001'::uuid,'f6100000-0000-4000-8000-000000000001'::uuid,'owner'),
('f6200000-0000-4000-8000-000000000001'::uuid,'f6100000-0000-4000-8000-000000000003'::uuid,'viewer'),
('f6200000-0000-4000-8000-000000000002'::uuid,'f6100000-0000-4000-8000-000000000002'::uuid,'owner');

insert into public.categories (id,organization_id,name) values
('f6300000-0000-4000-8000-000000000001'::uuid,'f6200000-0000-4000-8000-000000000001'::uuid,'FM05 Review Category A'),
('f6300000-0000-4000-8000-000000000002'::uuid,'f6200000-0000-4000-8000-000000000002'::uuid,'FM05 Review Category B');

insert into public.projects (id,organization_id,name,slug,client_brand,created_by) values
('f6400000-0000-4000-8000-000000000001'::uuid,'f6200000-0000-4000-8000-000000000001'::uuid,'FM05 Review A1','fm05-review-a1','Synthetic A1','f6100000-0000-4000-8000-000000000001'::uuid),
('f6400000-0000-4000-8000-000000000002'::uuid,'f6200000-0000-4000-8000-000000000001'::uuid,'FM05 Review A2','fm05-review-a2','Synthetic A2','f6100000-0000-4000-8000-000000000001'::uuid),
('f6400000-0000-4000-8000-000000000003'::uuid,'f6200000-0000-4000-8000-000000000002'::uuid,'FM05 Review B1','fm05-review-b1','Synthetic B1','f6100000-0000-4000-8000-000000000002'::uuid);

insert into public.runs (id,organization_id,project_id,category_id,created_by) values
('f6500000-0000-4000-8000-000000000001'::uuid,'f6200000-0000-4000-8000-000000000001'::uuid,'f6400000-0000-4000-8000-000000000001'::uuid,'f6300000-0000-4000-8000-000000000001'::uuid,'f6100000-0000-4000-8000-000000000001'::uuid),
('f6500000-0000-4000-8000-000000000002'::uuid,'f6200000-0000-4000-8000-000000000001'::uuid,'f6400000-0000-4000-8000-000000000002'::uuid,'f6300000-0000-4000-8000-000000000001'::uuid,'f6100000-0000-4000-8000-000000000001'::uuid),
('f6500000-0000-4000-8000-000000000003'::uuid,'f6200000-0000-4000-8000-000000000002'::uuid,'f6400000-0000-4000-8000-000000000003'::uuid,'f6300000-0000-4000-8000-000000000002'::uuid,'f6100000-0000-4000-8000-000000000002'::uuid),
('f6500000-0000-4000-8000-000000000004'::uuid,'f6200000-0000-4000-8000-000000000001'::uuid,'f6400000-0000-4000-8000-000000000001'::uuid,'f6300000-0000-4000-8000-000000000001'::uuid,'f6100000-0000-4000-8000-000000000001'::uuid);

insert into public.sources (id,organization_id,canonical_url,domain) values
('f6600000-0000-4000-8000-000000000001'::uuid,'f6200000-0000-4000-8000-000000000001'::uuid,'https://fm05-review-a.invalid/proof','fm05-review-a.invalid'),
('f6600000-0000-4000-8000-000000000002'::uuid,'f6200000-0000-4000-8000-000000000002'::uuid,'https://fm05-review-b.invalid/proof','fm05-review-b.invalid');

insert into public.source_maps
(id,organization_id,category_id,run_id,name,status,review_state)
values
('f6700000-0000-4000-8000-000000000001'::uuid,'f6200000-0000-4000-8000-000000000001'::uuid,'f6300000-0000-4000-8000-000000000001'::uuid,'f6500000-0000-4000-8000-000000000001'::uuid,'FM05 Map A1','published','reviewed'),
('f6700000-0000-4000-8000-000000000002'::uuid,'f6200000-0000-4000-8000-000000000001'::uuid,'f6300000-0000-4000-8000-000000000001'::uuid,'f6500000-0000-4000-8000-000000000002'::uuid,'FM05 Map A2','published','reviewed'),
('f6700000-0000-4000-8000-000000000003'::uuid,'f6200000-0000-4000-8000-000000000002'::uuid,'f6300000-0000-4000-8000-000000000002'::uuid,'f6500000-0000-4000-8000-000000000003'::uuid,'FM05 Map B1','published','reviewed'),
('f6700000-0000-4000-8000-000000000004'::uuid,'f6200000-0000-4000-8000-000000000001'::uuid,'f6300000-0000-4000-8000-000000000001'::uuid,'f6500000-0000-4000-8000-000000000004'::uuid,'FM05 Draft A1','draft','observed');

insert into public.source_map_entries
(id,organization_id,source_map_id,source_id,rank,citation_observations,engines,page_presence_state)
values
('f6800000-0000-4000-8000-000000000001'::uuid,'f6200000-0000-4000-8000-000000000001'::uuid,'f6700000-0000-4000-8000-000000000001'::uuid,'f6600000-0000-4000-8000-000000000001'::uuid,1,7,array['fixture'], 'present'),
('f6800000-0000-4000-8000-000000000002'::uuid,'f6200000-0000-4000-8000-000000000001'::uuid,'f6700000-0000-4000-8000-000000000002'::uuid,'f6600000-0000-4000-8000-000000000001'::uuid,1,5,array['fixture'], 'unknown'),
('f6800000-0000-4000-8000-000000000003'::uuid,'f6200000-0000-4000-8000-000000000002'::uuid,'f6700000-0000-4000-8000-000000000003'::uuid,'f6600000-0000-4000-8000-000000000002'::uuid,1,4,array['fixture'],'absent'),
('f6800000-0000-4000-8000-000000000004'::uuid,'f6200000-0000-4000-8000-000000000001'::uuid,'f6700000-0000-4000-8000-000000000004'::uuid,'f6600000-0000-4000-8000-000000000001'::uuid,1,2,array['fixture'],'unknown');

set local role authenticated;
select set_config('request.jwt.claim.sub','f6100000-0000-4000-8000-000000000001',true);

do $$
declare
  result jsonb;
  denied boolean;
  review_row record;
begin
  result := public.review_source_map_entry(
    'f6800000-0000-4000-8000-000000000001'::uuid,
    'f6200000-0000-4000-8000-000000000001'::uuid,
    'f6400000-0000-4000-8000-000000000001'::uuid,
    'f6300000-0000-4000-8000-000000000001'::uuid,
    true,array['Competitor One'],'editorial outreach','high','low','Synthetic verified review'
  );
  if result->>'reviewed_by' <> 'f6100000-0000-4000-8000-000000000001'
     or result->>'client_present' <> 'true' then
    raise exception 'FM-05: returned review actor or state is forged';
  end if;
  select client_present,reviewed_by,rank,citation_observations,engines,page_presence_state,
      reference_origin,analyst_note,feasibility::text as feasibility
    into review_row
    from public.source_map_entries
    where id='f6800000-0000-4000-8000-000000000001'::uuid;
  if review_row.reviewed_by <> 'f6100000-0000-4000-8000-000000000001'::uuid
     or not review_row.client_present or review_row.feasibility <> 'high'
     or review_row.analyst_note <> 'Synthetic verified review'
     or review_row.rank<>1 or review_row.citation_observations<>7
     or review_row.engines<>array['fixture']
     or review_row.page_presence_state<>'present'
     or review_row.reference_origin<>'provider_citation' then
    raise exception 'FM-05: human review mutated collector evidence or failed to persist review';
  end if;

  denied:=false;
  begin
    update public.source_map_entries set rank=777
      where id='f6800000-0000-4000-8000-000000000001'::uuid;
  exception when insufficient_privilege then denied:=true;
  end;
  if not denied then raise exception 'FM-05: member mutated collector-owned ranking'; end if;

  denied:=false;
  begin
    perform public.review_source_map_entry(
      'f6800000-0000-4000-8000-000000000002'::uuid,
      'f6200000-0000-4000-8000-000000000001'::uuid,
      'f6400000-0000-4000-8000-000000000001'::uuid,
      'f6300000-0000-4000-8000-000000000001'::uuid,
      true,array[]::text[],'editorial outreach','high','low','Sibling project forged access'
    );
  exception when raise_exception then denied:=true;
  end;
  if not denied then raise exception 'FM-05: sibling-project source review permitted'; end if;

  denied:=false;
  begin
    perform public.review_source_map_entry(
      'f6800000-0000-4000-8000-000000000003'::uuid,
      'f6200000-0000-4000-8000-000000000002'::uuid,
      'f6400000-0000-4000-8000-000000000003'::uuid,
      'f6300000-0000-4000-8000-000000000002'::uuid,
      true,array[]::text[],'editorial outreach','high','low','Cross-tenant forged access'
    );
  exception when raise_exception then denied:=true;
  end;
  if not denied then raise exception 'FM-05: cross-tenant source review permitted'; end if;

  denied:=false;
  begin
    perform public.review_source_map_entry(
      'f6800000-0000-4000-8000-000000000004'::uuid,
      'f6200000-0000-4000-8000-000000000001'::uuid,
      'f6400000-0000-4000-8000-000000000001'::uuid,
      'f6300000-0000-4000-8000-000000000001'::uuid,
      true,array[]::text[],'editorial outreach','high','low','Unpublished map forged access'
    );
  exception when raise_exception then denied:=true;
  end;
  if not denied then raise exception 'FM-05: unpublished source review permitted'; end if;

  denied:=false;
  begin
    perform public.review_source_map_entry(
      'f6800000-0000-4000-8000-000000000001'::uuid,
      'f6200000-0000-4000-8000-000000000001'::uuid,
      'f6400000-0000-4000-8000-000000000001'::uuid,
      'f6300000-0000-4000-8000-000000000001'::uuid,
      true,array[]::text[],'editorial outreach','high','emerging','Invalid enum must be denied'
    );
  exception when raise_exception then denied:=true;
  end;
  if not denied then raise exception 'FM-05: unsupported enum level permitted'; end if;
end
$$;

select set_config('request.jwt.claim.sub','f6100000-0000-4000-8000-000000000003',true);
do $$
declare denied boolean:=false;
begin
  begin
    perform public.review_source_map_entry(
      'f6800000-0000-4000-8000-000000000001'::uuid,
      'f6200000-0000-4000-8000-000000000001'::uuid,
      'f6400000-0000-4000-8000-000000000001'::uuid,
      'f6300000-0000-4000-8000-000000000001'::uuid,
      true,array[]::text[],'editorial outreach','high','low','Viewer role blocked'
    );
  exception when raise_exception then denied:=true;
  end;
  if not denied then raise exception 'FM-05: viewer gained source review power'; end if;
end
$$;

rollback;
