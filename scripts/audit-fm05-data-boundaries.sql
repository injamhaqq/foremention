-- FM-05 — evidence-only database boundary preflight.
-- No customer rows, SQL bodies, tokens, secrets or permissions are exported.
-- Run only against the explicitly verified Foremention project in an
-- authorized read-only SQL session. Never treat this as a migration.
BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '15s';

-- 1. RLS surface: all public tables should be RLS-enabled.
SELECT count(*) AS public_tables,
       count(*) FILTER (WHERE c.relrowsecurity) AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p');

-- 2. Project identity is not implied by a single-column project FK.
-- A missing composite FK does not prove that existing data is inconsistent.
SELECT c.conrelid::regclass::text AS child_table,
       c.conname AS fk_name,
       pg_get_constraintdef(c.oid) AS fk_contract,
       position('organization_id' IN pg_get_constraintdef(c.oid)) > 0
         AS references_organization_and_project
FROM pg_constraint c
WHERE c.contype = 'f'
  AND c.confrelid = 'public.projects'::regclass
ORDER BY child_table, fk_name;

-- 3. Actual authenticated grants: a policy does not revoke table privileges.
SELECT c.relname AS table_name,
       has_table_privilege('authenticated', c.oid, 'SELECT') AS can_select,
       has_table_privilege('authenticated', c.oid, 'INSERT') AS can_insert,
       has_table_privilege('authenticated', c.oid, 'UPDATE') AS can_update,
       has_table_privilege('authenticated', c.oid, 'DELETE') AS can_delete,
       c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN
    ('prompt_versions', 'prompts', 'run_attempts', 'run_answers',
     'source_observations', 'source_maps', 'source_map_entries',
     'jobs', 'ai_cost_events', 'integration_credentials')
ORDER BY c.relname;

-- 4. Policies controlling the integrity-sensitive write path.
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('prompt_versions', 'run_attempts',
                    'source_observations', 'jobs')
ORDER BY tablename, policyname;

-- 5. Privileged RPCs callable from the exposed schema.
SELECT p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS arguments,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anonymous_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE')
         AS authenticated_execute
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prosecdef
ORDER BY p.proname;

-- 6. Six representative relationships; report counts only.
SELECT 'runs_to_projects' AS relation, count(*) AS mismatches
FROM public.runs a JOIN public.projects b ON b.id = a.project_id
WHERE a.organization_id IS DISTINCT FROM b.organization_id
UNION ALL
SELECT 'prompts_to_projects', count(*)
FROM public.prompts a JOIN public.projects b ON b.id = a.project_id
WHERE a.organization_id IS DISTINCT FROM b.organization_id
UNION ALL
SELECT 'jobs_to_projects', count(*)
FROM public.jobs a JOIN public.projects b ON b.id = a.project_id
WHERE a.organization_id IS DISTINCT FROM b.organization_id
UNION ALL
SELECT 'run_answers_to_runs', count(*)
FROM public.run_answers a JOIN public.runs b ON b.id = a.run_id
WHERE a.organization_id IS DISTINCT FROM b.organization_id
UNION ALL
SELECT 'source_maps_to_runs', count(*)
FROM public.source_maps a JOIN public.runs b ON b.id = a.run_id
WHERE a.organization_id IS DISTINCT FROM b.organization_id
UNION ALL
SELECT 'support_tickets_to_projects', count(*)
FROM public.support_tickets a JOIN public.projects b ON b.id = a.project_id
WHERE a.organization_id IS DISTINCT FROM b.organization_id;

-- 7. Reconciliation receipts only: recorded SQL stays inside the database.
-- Hash-only evidence is NOT permission to rewrite migration history.
SELECT version, name, cardinality(statements) AS statement_count,
  CASE WHEN cardinality(statements)=1 AND statements[1] IS NOT NULL
    THEN encode(extensions.digest(
      convert_to(statements[1], 'UTF8'), 'sha256'), 'hex') END
    AS sql_sha256,
  CASE WHEN cardinality(statements)=1 AND statements[1] IS NOT NULL
    THEN encode(extensions.digest(
      convert_to('blob ' || octet_length(statements[1])::text, 'UTF8')
      || decode('00','hex') || convert_to(statements[1], 'UTF8'),
      'sha1'), 'hex') END AS git_blob_sha
FROM supabase_migrations.schema_migrations
ORDER BY version;

ROLLBACK;
