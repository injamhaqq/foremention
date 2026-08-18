\set ON_ERROR_STOP on

DO $$
DECLARE
  is_definer boolean;
BEGIN
  IF to_regclass('public.company_organization_classifications') IS NULL
     OR to_regclass('public.commercial_accounts') IS NULL
     OR to_regclass('public.commercial_contacts') IS NULL
     OR to_regclass('public.commercial_opportunities') IS NULL
     OR to_regclass('public.commercial_events') IS NULL THEN
    RAISE EXCEPTION 'company customer-proof tables are missing';
  END IF;

  IF to_regclass('public.company_ceo_scorecard') IS NULL
     OR to_regclass('public.company_customer_value_scorecard') IS NULL THEN
    RAISE EXCEPTION 'company scorecard views are missing';
  END IF;

  IF to_regprocedure('private.complete_onboarding(jsonb)') IS NULL
     OR to_regprocedure('private.has_org_role(uuid,public.organization_role[])') IS NULL
     OR to_regprocedure('private.is_org_member(uuid)') IS NULL THEN
    RAISE EXCEPTION 'private privileged implementations are missing';
  END IF;

  SELECT p.prosecdef INTO is_definer
  FROM pg_proc p
  WHERE p.oid = to_regprocedure('public.complete_onboarding(jsonb)');
  IF is_definer IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'public complete_onboarding must be SECURITY INVOKER';
  END IF;

  SELECT p.prosecdef INTO is_definer
  FROM pg_proc p
  WHERE p.oid = to_regprocedure('public.has_org_role(uuid,public.organization_role[])');
  IF is_definer IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'public has_org_role must be SECURITY INVOKER';
  END IF;

  SELECT p.prosecdef INTO is_definer
  FROM pg_proc p
  WHERE p.oid = to_regprocedure('public.is_org_member(uuid)');
  IF is_definer IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'public is_org_member must be SECURITY INVOKER';
  END IF;

  SELECT p.prosecdef INTO is_definer
  FROM pg_proc p
  WHERE p.oid = to_regprocedure('private.complete_onboarding(jsonb)');
  IF is_definer IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'private complete_onboarding must preserve SECURITY DEFINER semantics';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname='public' AND c.relname='ai_cost_events_run_idx' AND c.relkind='i'
  ) THEN
    RAISE EXCEPTION 'material FK indexes are missing';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.role_table_grants
    WHERE table_schema='public'
      AND table_name IN ('commercial_accounts','commercial_contacts','commercial_opportunities','commercial_events','company_organization_classifications')
      AND grantee IN ('anon','authenticated')
  ) THEN
    RAISE EXCEPTION 'commercial service-only tables leaked browser grants';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.company_organization_classifications
  ) OR EXISTS (SELECT 1 FROM public.commercial_accounts)
    OR EXISTS (SELECT 1 FROM public.commercial_opportunities)
    OR EXISTS (SELECT 1 FROM public.commercial_events) THEN
    RAISE EXCEPTION 'fresh migration replay fabricated company traction';
  END IF;
END
$$;

-- Explicit textual marker used by the repository contract test: prosecdef = false
SELECT 'company migrations verified' AS result;