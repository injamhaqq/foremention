-- FM-08/FM-06 SQL candidate. NOT a deployable migration.
-- FM-05 must generate/reconcile a real migration with pinned Supabase CLI.
-- This file is applied ONLY to the isolated Supabase CI database.
BEGIN;

CREATE OR REPLACE FUNCTION public.claim_workspace_webhook_delivery(
  p_organization_id uuid,
  p_project_id uuid,
  p_endpoint_id uuid,
  p_event_key text,
  p_event_type text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_receipt public.workspace_webhook_deliveries%ROWTYPE;
  v_attempt integer;
BEGIN
  IF p_event_key IS NULL OR length(p_event_key) NOT BETWEEN 1 AND 180
    OR p_event_type NOT IN ('collection.completed','source.reviewed','action.completed','evidence.reviewed') THEN
    RETURN NULL;
  END IF;
  PERFORM 1 FROM public.projects p
  WHERE p.id = p_project_id
    AND p.organization_id = p_organization_id
    AND p.status = 'active';
  IF NOT FOUND THEN RETURN NULL; END IF;
  PERFORM 1 FROM public.workspace_webhook_endpoints e
  WHERE e.id = p_endpoint_id
    AND e.organization_id = p_organization_id
    AND e.active IS TRUE
    AND p_event_type = ANY(e.event_types);
  IF NOT FOUND THEN RETURN NULL; END IF;

  INSERT INTO public.workspace_webhook_deliveries
    (organization_id, endpoint_id, event_key, event_type, status, attempt_count)
  VALUES (p_organization_id, p_endpoint_id, p_event_key, p_event_type, 'pending', 0)
  ON CONFLICT (endpoint_id, event_key) DO NOTHING;

  SELECT * INTO v_receipt
  FROM public.workspace_webhook_deliveries d
  WHERE d.organization_id = p_organization_id
    AND d.endpoint_id = p_endpoint_id
    AND d.event_key = p_event_key
  FOR UPDATE;

  -- In READ COMMITTED, a competing INSERT ... ON CONFLICT DO NOTHING
  -- can wait for an uncommitted unique key and then see no row under its
  -- statement snapshot. Treat an invisible in-flight receipt as leased,
  -- never as a terminal/no-work acknowledgement.
  IF NOT FOUND THEN RETURN jsonb_build_object('state', 'leased'); END IF;
  IF v_receipt.event_type IS DISTINCT FROM p_event_type
    OR v_receipt.status = 'delivered' THEN RETURN NULL; END IF;

  -- An ACTIVE fourth/final attempt is leased, not yet exhausted. Check
  -- the in-flight lease before the terminal attempt ceiling.
  IF v_receipt.status = 'pending' AND v_receipt.attempt_count > 0
    AND v_receipt.updated_at > clock_timestamp() - interval '90 seconds' THEN
    RETURN jsonb_build_object('state', 'leased');
  END IF;
  -- After a final failed settlement (or expired fourth lease), no new send.
  IF v_receipt.attempt_count >= 4 THEN RETURN NULL; END IF;

  UPDATE public.workspace_webhook_deliveries d
  SET status = 'pending', attempt_count = d.attempt_count + 1,
      response_status = NULL, error_code = NULL, updated_at = clock_timestamp()
  WHERE d.id = v_receipt.id
  RETURNING d.attempt_count INTO v_attempt;

  -- Attempt number is a monotonic fencing token for this endpoint+event.
  RETURN jsonb_build_object('state', 'claimed', 'delivery_id', v_receipt.id, 'attempt_count', v_attempt);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_workspace_webhook_delivery(uuid,uuid,uuid,text,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_workspace_webhook_delivery(uuid,uuid,uuid,text,text)
  TO service_role;

CREATE OR REPLACE FUNCTION public.settle_workspace_webhook_delivery(
  p_organization_id uuid,
  p_delivery_id uuid,
  p_attempt_count integer,
  p_status text,
  p_response_status integer DEFAULT NULL,
  p_error_code text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_id uuid;
BEGIN
  IF p_status NOT IN ('delivered', 'failed')
    OR p_attempt_count NOT BETWEEN 1 AND 4
    OR (p_status = 'delivered' AND (p_response_status IS NULL OR p_response_status NOT BETWEEN 200 AND 299)) THEN
    RETURN FALSE;
  END IF;
  UPDATE public.workspace_webhook_deliveries d
  SET status = p_status,
      response_status = CASE WHEN p_status = 'delivered' THEN p_response_status ELSE NULL END,
      error_code = CASE WHEN p_status = 'failed' THEN left(coalesce(p_error_code,'delivery_failed'),200) ELSE NULL END,
      delivered_at = CASE WHEN p_status = 'delivered' THEN clock_timestamp() ELSE NULL END,
      updated_at = clock_timestamp()
  WHERE d.id = p_delivery_id
    AND d.organization_id = p_organization_id
    AND d.status = 'pending'
    AND d.attempt_count = p_attempt_count
  RETURNING d.id INTO v_id;
  RETURN v_id IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.settle_workspace_webhook_delivery(uuid,uuid,integer,text,integer,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_workspace_webhook_delivery(uuid,uuid,integer,text,integer,text)
  TO service_role;

COMMIT;
