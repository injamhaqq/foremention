\set ON_ERROR_STOP on
-- Disposable proof only. Run AFTER the candidate functions on local Supabase.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $$
BEGIN
  IF has_function_privilege('anon', 'public.claim_workspace_webhook_delivery(uuid,uuid,uuid,text,text)', 'EXECUTE')
    OR has_function_privilege('authenticated', 'public.claim_workspace_webhook_delivery(uuid,uuid,uuid,text,text)', 'EXECUTE')
    OR NOT has_function_privilege('service_role', 'public.claim_workspace_webhook_delivery(uuid,uuid,uuid,text,text)', 'EXECUTE')
    OR has_function_privilege('anon', 'public.settle_workspace_webhook_delivery(uuid,uuid,integer,text,integer,text)', 'EXECUTE')
    OR has_function_privilege('authenticated', 'public.settle_workspace_webhook_delivery(uuid,uuid,integer,text,integer,text)', 'EXECUTE')
    OR NOT has_function_privilege('service_role', 'public.settle_workspace_webhook_delivery(uuid,uuid,integer,text,integer,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Webhook privileged RPC grants are unsafe';
  END IF;
END $$;

INSERT INTO auth.users(id) VALUES
 ('f8100000-0000-4000-8000-000000000001'::uuid),
 ('f8100000-0000-4000-8000-000000000002'::uuid);
INSERT INTO public.organizations(id,name,slug,created_by) VALUES
 ('f8200000-0000-4000-8000-000000000001'::uuid,'FM08 Webhook A','fm08-webhook-a','f8100000-0000-4000-8000-000000000001'::uuid),
 ('f8200000-0000-4000-8000-000000000002'::uuid,'FM08 Webhook B','fm08-webhook-b','f8100000-0000-4000-8000-000000000002'::uuid);
INSERT INTO public.projects(id,organization_id,name,slug,client_brand,created_by) VALUES
 ('f8300000-0000-4000-8000-000000000001'::uuid,'f8200000-0000-4000-8000-000000000001'::uuid,'FM08 A1','fm08-a1','FM08 A','f8100000-0000-4000-8000-000000000001'::uuid),
 ('f8300000-0000-4000-8000-000000000002'::uuid,'f8200000-0000-4000-8000-000000000002'::uuid,'FM08 B1','fm08-b1','FM08 B','f8100000-0000-4000-8000-000000000002'::uuid);
INSERT INTO public.workspace_webhook_endpoints(id,organization_id,label,destination_url,event_types,secret_hint,created_by) VALUES
 ('f8400000-0000-4000-8000-000000000001'::uuid,'f8200000-0000-4000-8000-000000000001'::uuid,'FM08 A webhook','https://hooks.example.com/ingest',array['collection.completed'],'test01','f8100000-0000-4000-8000-000000000001'::uuid),
 ('f8400000-0000-4000-8000-000000000002'::uuid,'f8200000-0000-4000-8000-000000000002'::uuid,'FM08 B webhook','https://hooks.example.com/ingest',array['collection.completed'],'test02','f8100000-0000-4000-8000-000000000002'::uuid);

DO $$
DECLARE
  org_a uuid := 'f8200000-0000-4000-8000-000000000001';
  org_b uuid := 'f8200000-0000-4000-8000-000000000002';
  project_a uuid := 'f8300000-0000-4000-8000-000000000001';
  project_b uuid := 'f8300000-0000-4000-8000-000000000002';
  endpoint_a uuid := 'f8400000-0000-4000-8000-000000000001';
  endpoint_b uuid := 'f8400000-0000-4000-8000-000000000002';
  c1 jsonb;
  c2 jsonb;
  c3 jsonb;
  c4 jsonb;
BEGIN
  IF public.claim_workspace_webhook_delivery(org_a,project_b,endpoint_a,'wrong-project','collection.completed') IS NOT NULL
    OR public.claim_workspace_webhook_delivery(org_a,project_a,endpoint_b,'wrong-endpoint','collection.completed') IS NOT NULL
    OR public.claim_workspace_webhook_delivery(org_b,project_a,endpoint_a,'wrong-org','collection.completed') IS NOT NULL
    OR public.claim_workspace_webhook_delivery(org_a,project_a,endpoint_a,'wrong-type','source.reviewed') IS NOT NULL
    OR public.claim_workspace_webhook_delivery(org_a,project_a,endpoint_a,'','collection.completed') IS NOT NULL THEN
    RAISE EXCEPTION 'Cross-tenant/project/type or empty-event claim accepted';
  END IF;

  c1 := public.claim_workspace_webhook_delivery(org_a,project_a,endpoint_a,'shared-event','collection.completed');
  IF c1 IS NULL OR (c1->>'attempt_count')::int <> 1 THEN
    RAISE EXCEPTION 'Failed to claim the first attempt';
  END IF;
  IF public.claim_workspace_webhook_delivery(org_a,project_a,endpoint_a,'shared-event','collection.completed') IS NOT NULL THEN
    RAISE EXCEPTION 'Second active claim was not blocked';
  END IF;
  IF public.settle_workspace_webhook_delivery(org_a,(c1->>'delivery_id')::uuid,2,'delivered',200,NULL)
    OR public.settle_workspace_webhook_delivery(org_b,(c1->>'delivery_id')::uuid,1,'delivered',200,NULL)
    OR public.settle_workspace_webhook_delivery(org_a,(c1->>'delivery_id')::uuid,1,'delivered',500,NULL) THEN
    RAISE EXCEPTION 'Invalid/stale/cross-tenant settlement accepted';
  END IF;

  UPDATE public.workspace_webhook_deliveries
  SET updated_at = clock_timestamp() - interval '91 seconds'
  WHERE id = (c1->>'delivery_id')::uuid;
  c2 := public.claim_workspace_webhook_delivery(org_a,project_a,endpoint_a,'shared-event','collection.completed');
  IF c2 IS NULL OR (c2->>'attempt_count')::int <> 2 THEN RAISE EXCEPTION 'Lost lease was not reclaimable'; END IF;
  IF public.settle_workspace_webhook_delivery(org_a,(c1->>'delivery_id')::uuid,1,'delivered',200,NULL) THEN
    RAISE EXCEPTION 'Stale token settlement accepted';
  END IF;
  IF NOT public.settle_workspace_webhook_delivery(org_a,(c2->>'delivery_id')::uuid,2,'failed',NULL,'synthetic timeout') THEN
    RAISE EXCEPTION 'Current claim could not record failure';
  END IF;
  c3 := public.claim_workspace_webhook_delivery(org_a,project_a,endpoint_a,'shared-event','collection.completed');
  IF c3 IS NULL OR (c3->>'attempt_count')::int <> 3 THEN RAISE EXCEPTION 'Failed-attempt retry not available'; END IF;
  IF NOT public.settle_workspace_webhook_delivery(org_a,(c3->>'delivery_id')::uuid,3,'failed',NULL,'synthetic timeout') THEN
    RAISE EXCEPTION 'Retry failure not finalized';
  END IF;
  c4 := public.claim_workspace_webhook_delivery(org_a,project_a,endpoint_a,'shared-event','collection.completed');
  IF c4 IS NULL OR (c4->>'attempt_count')::int <> 4 THEN RAISE EXCEPTION 'Attempt 4 rejected'; END IF;
  IF public.claim_workspace_webhook_delivery(org_a,project_a,endpoint_a,'shared-event','collection.completed') IS NOT NULL THEN
    RAISE EXCEPTION 'Actively leased attempt was reclaimed';
  END IF;
  IF NOT public.settle_workspace_webhook_delivery(org_a,(c4->>'delivery_id')::uuid,4,'failed',NULL,'synthetic exhaustion') THEN
    RAISE EXCEPTION 'Fourth attempt settlement failed';
  END IF;
  IF public.claim_workspace_webhook_delivery(org_a,project_a,endpoint_a,'shared-event','collection.completed') IS NOT NULL THEN
    RAISE EXCEPTION 'Exhausted receipt claimed for a fifth attempt';
  END IF;

  c1 := public.claim_workspace_webhook_delivery(org_a,project_a,endpoint_a,'other-event','collection.completed');
  IF c1 IS NULL OR NOT public.settle_workspace_webhook_delivery(org_a,(c1->>'delivery_id')::uuid,1,'delivered',204,NULL) THEN
    RAISE EXCEPTION 'Independent event could not be delivered';
  END IF;
  IF public.claim_workspace_webhook_delivery(org_a,project_a,endpoint_a,'other-event','collection.completed') IS NOT NULL THEN
    RAISE EXCEPTION 'Delivered receipt was reclaimed';
  END IF;
END $$;
ROLLBACK;
