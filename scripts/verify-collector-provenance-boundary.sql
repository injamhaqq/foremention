\set ON_ERROR_STOP on

-- A11 / FM-05 phase 4: disposable synthetic two-tenant, two-project proof that
-- member mutations cannot rewrite collector provenance on sources/placements.
-- CI only: executed against isolated local Supabase after migration replay and
-- scripts/release-gates/FM05-collector-provenance-columns-activation.sql.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $$
begin
  if has_table_privilege('authenticated','public.sources','INSERT')
     or has_table_privilege('authenticated','public.sources','UPDATE')
     or has_table_privilege('authenticated','public.sources','DELETE') then
    raise exception 'A11: member still has broad source mutation privileges';
  end if;
  if has_column_privilege('authenticated','public.sources','canonical_url','UPDATE')
     or has_column_privilege('authenticated','public.sources','domain','UPDATE')
     or has_column_privilege('authenticated','public.sources','organization_id','UPDATE')
     or has_column_privilege('authenticated','public.sources','first_observed_at','UPDATE')
     or has_column_privilege('authenticated','public.sources','last_observed_at','UPDATE')
     or has_column_privilege('authenticated','public.sources','source_type','UPDATE') then
    raise exception 'A11: member can rewrite collector-owned source columns';
  end if;
  if not has_column_privilege('authenticated','public.sources','crawler_access','UPDATE')
     or not has_column_privilege('authenticated','public.sources','page_title','UPDATE') then
    raise exception 'A11: member lost bounded source inspection writes';
  end if;
  if has_table_privilege('authenticated','public.placements','UPDATE')
     or has_column_privilege('authenticated','public.placements','source_id','UPDATE')
     or has_column_privilege('authenticated','public.placements','source_url','UPDATE')
     or has_column_privilege('authenticated','public.placements','organization_id','UPDATE')
     or has_column_privilege('authenticated','public.placements','baseline_run_id','UPDATE')
     or has_column_privilege('authenticated','public.placements','remeasurement_run_id','UPDATE')
     or has_column_privilege('authenticated','public.placements','target_prompt_ids','UPDATE')
     or has_column_privilege('authenticated','public.placements','created_by','UPDATE')
     or has_column_privilege('authenticated','public.placements','first_cited_at','UPDATE') then
    raise exception 'A11: member can rewrite collector-owned placement provenance';
  end if;
  if not has_column_privilege('authenticated','public.placements','stage','UPDATE')
     or not has_table_privilege('authenticated','public.placements','INSERT') then
    raise exception 'A11: member lost the action workflow writes the app uses';
  end if;
  if not has_table_privilege('service_role','public.sources','UPDATE')
     or not has_table_privilege('service_role','public.sources','INSERT')
     or not has_table_privilege('service_role','public.placements','UPDATE') then
    raise exception 'A11: collector service role privileges were lost';
  end if;
end
$$;

insert into auth.users (id) values
('a1100000-0000-4000-8000-000000000001'::uuid),
('a1100000-0000-4000-8000-000000000002'::uuid),
('a1100000-0000-4000-8000-000000000003'::uuid);

insert into public.organizations (id,name,slug,created_by) values
('a1200000-0000-4000-8000-000000000001'::uuid,'A11 Provenance A','a11-provenance-a','a1100000-0000-4000-8000-000000000001'::uuid),
('a1200000-0000-4000-8000-000000000002'::uuid,'A11 Provenance B','a11-provenance-b','a1100000-0000-4000-8000-000000000002'::uuid);

insert into public.organization_members (organization_id,user_id,role) values
('a1200000-0000-4000-8000-000000000001'::uuid,'a1100000-0000-4000-8000-000000000001'::uuid,'owner'),
('a1200000-0000-4000-8000-000000000001'::uuid,'a1100000-0000-4000-8000-000000000003'::uuid,'analyst'),
('a1200000-0000-4000-8000-000000000002'::uuid,'a1100000-0000-4000-8000-000000000002'::uuid,'owner');

insert into public.categories (id,organization_id,name) values
('a1300000-0000-4000-8000-000000000001'::uuid,'a1200000-0000-4000-8000-000000000001'::uuid,'A11 Category A'),
('a1300000-0000-4000-8000-000000000002'::uuid,'a1200000-0000-4000-8000-000000000002'::uuid,'A11 Category B');

insert into public.projects (id,organization_id,name,slug,client_brand,created_by) values
('a1400000-0000-4000-8000-000000000001'::uuid,'a1200000-0000-4000-8000-000000000001'::uuid,'A11 Project A1','a11-project-a1','Synthetic A1','a1100000-0000-4000-8000-000000000001'::uuid),
('a1400000-0000-4000-8000-000000000002'::uuid,'a1200000-0000-4000-8000-000000000001'::uuid,'A11 Project A2','a11-project-a2','Synthetic A2','a1100000-0000-4000-8000-000000000001'::uuid),
('a1400000-0000-4000-8000-000000000003'::uuid,'a1200000-0000-4000-8000-000000000002'::uuid,'A11 Project B1','a11-project-b1','Synthetic B1','a1100000-0000-4000-8000-000000000002'::uuid);

insert into public.runs (id,organization_id,project_id,category_id,created_by) values
('a1500000-0000-4000-8000-000000000001'::uuid,'a1200000-0000-4000-8000-000000000001'::uuid,'a1400000-0000-4000-8000-000000000001'::uuid,'a1300000-0000-4000-8000-000000000001'::uuid,'a1100000-0000-4000-8000-000000000001'::uuid),
('a1500000-0000-4000-8000-000000000002'::uuid,'a1200000-0000-4000-8000-000000000001'::uuid,'a1400000-0000-4000-8000-000000000002'::uuid,'a1300000-0000-4000-8000-000000000001'::uuid,'a1100000-0000-4000-8000-000000000001'::uuid),
('a1500000-0000-4000-8000-000000000003'::uuid,'a1200000-0000-4000-8000-000000000002'::uuid,'a1400000-0000-4000-8000-000000000003'::uuid,'a1300000-0000-4000-8000-000000000002'::uuid,'a1100000-0000-4000-8000-000000000002'::uuid);

insert into public.sources (id,organization_id,canonical_url,domain,page_title) values
('a1600000-0000-4000-8000-000000000001'::uuid,'a1200000-0000-4000-8000-000000000001'::uuid,'https://a11-provenance-a.invalid/collected','a11-provenance-a.invalid','Collected A'),
('a1600000-0000-4000-8000-000000000002'::uuid,'a1200000-0000-4000-8000-000000000002'::uuid,'https://a11-provenance-b.invalid/collected','a11-provenance-b.invalid','Collected B');

-- Service/collector writers keep explicit values (trigger binds members only).
insert into public.placements (id,organization_id,source_id,source_url,page_title,entry_route,stage,baseline_run_id) values
('a1700000-0000-4000-8000-000000000001'::uuid,'a1200000-0000-4000-8000-000000000001'::uuid,'a1600000-0000-4000-8000-000000000001'::uuid,'https://a11-provenance-a.invalid/collected','Collected A','editorial outreach','identified','a1500000-0000-4000-8000-000000000001'::uuid),
('a1700000-0000-4000-8000-000000000002'::uuid,'a1200000-0000-4000-8000-000000000002'::uuid,'a1600000-0000-4000-8000-000000000002'::uuid,'https://a11-provenance-b.invalid/collected','Collected B','editorial outreach','identified','a1500000-0000-4000-8000-000000000003'::uuid);

set local role authenticated;
select set_config('request.jwt.claim.sub','a1100000-0000-4000-8000-000000000003',true);

do $$
declare
  changed integer;
  denied boolean;
  bound record;
begin
  -- Collector-owned source columns are not writable by a member reviewer.
  denied:=false;
  begin
    update public.sources set canonical_url='https://forged.invalid/'
      where id='a1600000-0000-4000-8000-000000000001'::uuid;
  exception when insufficient_privilege then denied:=true;
  end;
  if not denied then raise exception 'A11: member rewrote collector source URL'; end if;

  denied:=false;
  begin
    update public.sources set first_observed_at=now() - interval '10 years', domain='forged.invalid'
      where id='a1600000-0000-4000-8000-000000000001'::uuid;
  exception when insufficient_privilege then denied:=true;
  end;
  if not denied then raise exception 'A11: member rewrote collector source observation history'; end if;

  denied:=false;
  begin
    insert into public.sources (organization_id,canonical_url,domain)
      values ('a1200000-0000-4000-8000-000000000001'::uuid,'https://forged.invalid/new','forged.invalid');
  exception when insufficient_privilege then denied:=true;
  end;
  if not denied then raise exception 'A11: member fabricated a collector source'; end if;

  denied:=false;
  begin
    delete from public.sources where id='a1600000-0000-4000-8000-000000000001'::uuid;
  exception when insufficient_privilege then denied:=true;
  end;
  if not denied then raise exception 'A11: member deleted a collector source'; end if;

  -- Bounded inspection writes remain available in-tenant only.
  update public.sources set crawler_access='blocked', crawler_checked_at=now()
    where id='a1600000-0000-4000-8000-000000000001'::uuid;
  get diagnostics changed = row_count;
  if changed <> 1 then raise exception 'A11: member lost in-tenant source inspection write'; end if;

  update public.sources set crawler_access='blocked'
    where id='a1600000-0000-4000-8000-000000000002'::uuid;
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'A11: cross-tenant source inspection write permitted'; end if;

  -- Placement provenance is immutable to members; stage stays editable in-tenant.
  denied:=false;
  begin
    update public.placements set source_url='https://forged.invalid/'
      where id='a1700000-0000-4000-8000-000000000001'::uuid;
  exception when insufficient_privilege then denied:=true;
  end;
  if not denied then raise exception 'A11: member rewrote placement source URL'; end if;

  denied:=false;
  begin
    update public.placements set baseline_run_id='a1500000-0000-4000-8000-000000000002'::uuid
      where id='a1700000-0000-4000-8000-000000000001'::uuid;
  exception when insufficient_privilege then denied:=true;
  end;
  if not denied then raise exception 'A11: member moved placement baseline to a sibling project run'; end if;

  denied:=false;
  begin
    update public.placements set source_id='a1600000-0000-4000-8000-000000000002'::uuid
      where id='a1700000-0000-4000-8000-000000000001'::uuid;
  exception when insufficient_privilege then denied:=true;
  end;
  if not denied then raise exception 'A11: member rebound placement source'; end if;

  update public.placements set stage='qualified'
    where id='a1700000-0000-4000-8000-000000000001'::uuid;
  get diagnostics changed = row_count;
  if changed <> 1 then raise exception 'A11: member lost in-tenant action stage update'; end if;

  update public.placements set stage='qualified'
    where id='a1700000-0000-4000-8000-000000000002'::uuid;
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'A11: cross-tenant action stage update permitted'; end if;

  -- A member insert has its source URL/title/author derived from the bound source.
  insert into public.placements (id,organization_id,source_id,source_url,page_title,entry_route,stage,created_by)
    values ('a1700000-0000-4000-8000-000000000003'::uuid,'a1200000-0000-4000-8000-000000000001'::uuid,
            'a1600000-0000-4000-8000-000000000001'::uuid,'https://forged.invalid/claimed','Forged title',
            'editorial outreach','identified','a1100000-0000-4000-8000-000000000001'::uuid);
  select source_url,page_title,created_by into bound
    from public.placements where id='a1700000-0000-4000-8000-000000000003'::uuid;
  if bound.source_url <> 'https://a11-provenance-a.invalid/collected'
     or bound.page_title is distinct from 'Collected A'
     or bound.created_by <> 'a1100000-0000-4000-8000-000000000003'::uuid then
    raise exception 'A11: member insert forged placement provenance';
  end if;

  denied:=false;
  begin
    insert into public.placements (organization_id,source_id,source_url,entry_route)
      values ('a1200000-0000-4000-8000-000000000001'::uuid,'a1600000-0000-4000-8000-000000000002'::uuid,
              'https://a11-provenance-b.invalid/collected','editorial outreach');
  exception when insufficient_privilege or foreign_key_violation then denied:=true;
  end;
  if not denied then raise exception 'A11: member bound an action to a cross-tenant source'; end if;

  denied:=false;
  begin
    insert into public.placements (organization_id,source_id,source_url,entry_route)
      values ('a1200000-0000-4000-8000-000000000002'::uuid,'a1600000-0000-4000-8000-000000000002'::uuid,
              'https://a11-provenance-b.invalid/collected','editorial outreach');
  exception when insufficient_privilege then denied:=true;
  end;
  if not denied then raise exception 'A11: member created an action in another tenant'; end if;

  denied:=false;
  begin
    insert into public.placements (organization_id,source_id,source_url,entry_route)
      values ('a1200000-0000-4000-8000-000000000001'::uuid,null,'https://forged.invalid/unbound','editorial outreach');
  exception when insufficient_privilege then denied:=true;
  end;
  if not denied then raise exception 'A11: member created an action without a mapped source'; end if;
end
$$;

reset role;

do $$
begin
  if not exists (
    select 1 from public.sources
    where id='a1600000-0000-4000-8000-000000000001'::uuid
      and canonical_url='https://a11-provenance-a.invalid/collected'
      and domain='a11-provenance-a.invalid'
  ) or not exists (
    select 1 from public.sources
    where id='a1600000-0000-4000-8000-000000000002'::uuid
      and crawler_access is distinct from 'blocked'
  ) then
    raise exception 'A11: collector source provenance changed after member attempts';
  end if;
  if not exists (
    select 1 from public.placements
    where id='a1700000-0000-4000-8000-000000000001'::uuid
      and source_id='a1600000-0000-4000-8000-000000000001'::uuid
      and source_url='https://a11-provenance-a.invalid/collected'
      and baseline_run_id='a1500000-0000-4000-8000-000000000001'::uuid
  ) or exists (
    select 1 from public.placements
    where id='a1700000-0000-4000-8000-000000000002'::uuid and stage <> 'identified'
  ) then
    raise exception 'A11: collector placement provenance changed after member attempts';
  end if;
end
$$;

rollback;
