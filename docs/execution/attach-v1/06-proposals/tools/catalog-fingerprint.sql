-- Chat06 (A05): read-only catalog fingerprint of schema `public`.
-- Returns one row per catalog object: (kind, key, def_md5). No customer data,
-- no SQL bodies leave the database; only md5 digests of definitions.
-- Runs unchanged on Supabase production (read-only query endpoint) and on a
-- local PGlite replay of the repository migrations.
with
cols as (
  select 'column' as kind, table_name || '.' || column_name as key,
         md5(concat_ws('|', udt_name, is_nullable, coalesce(column_default, ''))) as def_md5
  from information_schema.columns where table_schema = 'public'
),
cons as (
  select 'constraint', c.conrelid::regclass::text || '.' || c.conname, md5(pg_get_constraintdef(c.oid))
  from pg_constraint c join pg_namespace n on n.oid = c.connamespace
  where n.nspname = 'public' and c.conrelid <> 0 and c.contype <> 'n' -- PG18 catalogs NOT NULL as constraints; PG17 production does not
),
idx as (
  select 'index', tablename || '.' || indexname, md5(indexdef) from pg_indexes where schemaname = 'public'
),
fns as (
  select 'function', p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')',
         md5(concat_ws('|', p.prosrc, p.prosecdef::text, p.provolatile::text, coalesce(array_to_string(p.proconfig, ','), '')))
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prokind in ('f', 'p')
    and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
),
fns_ws as (
  -- Whitespace/comment-insensitive body digest: separates formatting-only
  -- drift from semantic drift when the exact digest differs.
  select 'function_body_normalized', p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')',
         md5(concat_ws('|', lower(regexp_replace(regexp_replace(p.prosrc, '--[^\n]*', '', 'g'), '\s+', '', 'g')), p.prosecdef::text, p.provolatile::text, coalesce(array_to_string(p.proconfig, ','), '')))
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prokind in ('f', 'p')
    and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
),
pols as (
  select 'policy', tablename || '.' || policyname,
         md5(concat_ws('|', permissive, cmd, roles::text, coalesce(qual, ''), coalesce(with_check, '')))
  from pg_policies where schemaname = 'public'
),
trg as (
  select 'trigger', c.relname || '.' || t.tgname, md5(pg_get_triggerdef(t.oid))
  from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and not t.tgisinternal
),
rls as (
  select 'rls', c.relname, md5(concat_ws('|', c.relrowsecurity::text, c.relforcerowsecurity::text))
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p')
),
tgrants as (
  -- pg_class ACLs (information_schema hides grants from read-only roles).
  select 'table_grant', c.relname || ':' || r.rolname, md5(string_agg(a.privilege_type, ',' order by a.privilege_type))
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  cross join lateral aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) a
  join pg_roles r on r.oid = a.grantee
  where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm') and r.rolname in ('anon', 'authenticated', 'service_role')
  group by c.relname, r.rolname
),
fgrants as (
  select 'function_grant', p.proname || '(' || pg_get_function_identity_arguments(p.oid) || '):' || r.rolname,
         md5(has_function_privilege(r.oid, p.oid, 'EXECUTE')::text)
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  cross join (select oid, rolname from pg_roles where rolname in ('anon', 'authenticated', 'service_role')) r
  where n.nspname = 'public' and p.prokind in ('f', 'p')
    and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
),
enums as (
  select 'enum', t.typname, md5(string_agg(e.enumlabel, ',' order by e.enumsortorder))
  from pg_type t join pg_enum e on e.enumtypid = t.oid join pg_namespace n on n.oid = t.typnamespace
  where n.nspname = 'public' group by t.typname
),
views as (
  select 'view', viewname, md5(definition) from pg_views where schemaname = 'public'
)
select * from cols union all select * from cons union all select * from idx union all select * from fns union all select * from fns_ws
union all select * from pols union all select * from trg union all select * from rls
union all select * from tgrants union all select * from fgrants union all select * from enums union all select * from views
order by 1, 2;
