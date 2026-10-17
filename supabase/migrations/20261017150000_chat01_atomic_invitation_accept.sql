-- Chat 01: atomic invitation acceptance (FM360-20261017).
-- Proven in disposable CI Supabase by scripts/verify-chat01-atomic-invite.sql
-- and scripts/verify-chat01-atomic-invite-concurrent-sessions.sh.
-- Refusals raise SQLSTATE PT409 so PostgREST answers HTTP 409 without detail.
-- Ships together with the route cutover in app/api/team/invitations/accept.
-- Legacy UNIQUE (organization_id,email,status) blocks accepting two historical
-- invitations for the same mailbox and tenant. Preserve history and allow only
-- one current pending invitation for the normalized address.
DO $preflight$
BEGIN
  IF EXISTS(
    SELECT 1 FROM public.invitations WHERE status='pending'
    GROUP BY organization_id, lower(email) HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Normalized pending invitation duplicates exist; review first';
  END IF;
END $preflight$;

ALTER TABLE public.invitations
  DROP CONSTRAINT IF EXISTS invitations_organization_id_email_status_key;
CREATE UNIQUE INDEX IF NOT EXISTS invitations_one_pending_normalized_mailbox
  ON public.invitations (organization_id, lower(email))
  WHERE status='pending';

CREATE OR REPLACE FUNCTION public.accept_foremention_invitation(
  p_token_hash text,
  p_user_id uuid
)
RETURNS TABLE (
  invitation_id uuid,
  organization_id uuid,
  granted_role public.organization_role
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $body$
-- OUT columns (organization_id, ...) share names with table columns used in
-- ON CONFLICT targets; resolve bare identifiers in SQL to columns.
#variable_conflict use_column
DECLARE
  v_email text;
  v_invite public.invitations%rowtype;
  v_role public.organization_role;
  v_rank public.organization_role[] := ARRAY[
    'owner','admin','analyst','viewer','reviewer','stakeholder'
  ]::public.organization_role[];
BEGIN
  IF p_user_id IS NULL OR p_token_hash IS NULL
    OR p_token_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'INVITATION_UNAVAILABLE' USING ERRCODE='PT409';
  END IF;

  -- Never trust the mailbox in an HTTP body, client JWT metadata or an invite
  -- accept request; resolve and require its confirmation from auth.users.
  SELECT lower(u.email) INTO v_email FROM auth.users u
   WHERE u.id=p_user_id AND u.email IS NOT NULL
     AND u.email_confirmed_at IS NOT NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVITATION_UNAVAILABLE' USING ERRCODE='PT409';
  END IF;

  SELECT i.* INTO v_invite FROM public.invitations i
   WHERE i.token_hash=p_token_hash FOR UPDATE;
  IF NOT FOUND OR v_invite.status <> 'pending'
    OR v_invite.expires_at <= clock_timestamp()
    OR lower(v_invite.email) <> v_email
    OR v_invite.role NOT IN ('admin','analyst','viewer') THEN
    RAISE EXCEPTION 'INVITATION_UNAVAILABLE' USING ERRCODE='PT409';
  END IF;

  INSERT INTO public.organization_members AS m
    (organization_id,user_id,member_email,role,invited_by)
  VALUES (v_invite.organization_id,p_user_id,v_email,v_invite.role,v_invite.invited_by)
  ON CONFLICT (organization_id,user_id) DO UPDATE
    SET role=CASE
       WHEN array_position(v_rank,m.role) <= array_position(v_rank,EXCLUDED.role)
         THEN m.role ELSE EXCLUDED.role END,
      member_email=EXCLUDED.member_email,
      invited_by=coalesce(m.invited_by,EXCLUDED.invited_by)
  RETURNING m.role INTO v_role;

  UPDATE public.invitations AS i
    SET status='accepted', accepted_at=clock_timestamp()
    WHERE i.id=v_invite.id AND i.status='pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVITATION_UNAVAILABLE' USING ERRCODE='PT409';
  END IF;

  INSERT INTO public.audit_logs
    (organization_id,actor_id,action,entity_type,entity_id,after_state)
  VALUES (v_invite.organization_id,p_user_id,'team.invitation.accepted',
    'invitation',v_invite.id,
    jsonb_build_object('role',v_role::text,'invited_role',v_invite.role::text));

  INSERT INTO public.notifications
    (organization_id,user_id,event_key,kind,title,body,href)
  VALUES(v_invite.organization_id,p_user_id,
    'workspace-joined:' || v_invite.id::text,'workspace',
    'Workspace access confirmed',
    'You joined the workspace with ' || v_role::text || ' access.','/app')
  ON CONFLICT (organization_id,event_key,user_id) DO NOTHING;

  invitation_id := v_invite.id;
  organization_id := v_invite.organization_id;
  granted_role := v_role;
  RETURN NEXT;
END;
$body$;

-- An exposed-schema SECURITY DEFINER RPC requires explicit grant restriction.
REVOKE ALL ON FUNCTION public.accept_foremention_invitation(text,uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.accept_foremention_invitation(text,uuid)
  TO service_role;
