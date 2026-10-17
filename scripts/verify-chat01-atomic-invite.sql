\set ON_ERROR_STOP on
-- Disposable proof only. Runs against migration 20261017150000 on local Supabase.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $$
BEGIN
  IF has_function_privilege('anon', 'public.accept_foremention_invitation(text,uuid)', 'EXECUTE')
    OR has_function_privilege('authenticated', 'public.accept_foremention_invitation(text,uuid)', 'EXECUTE')
    OR NOT has_function_privilege('service_role', 'public.accept_foremention_invitation(text,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Invitation acceptance RPC grants are unsafe';
  END IF;
END $$;

-- Users: A owner, B owner, invitee (confirmed), unconfirmed, existing admin of A.
INSERT INTO auth.users(id, email, email_confirmed_at) VALUES
 ('c0110000-0000-4000-8000-000000000001'::uuid, 'owner-a@example.test', now()),
 ('c0110000-0000-4000-8000-000000000002'::uuid, 'owner-b@example.test', now()),
 ('c0110000-0000-4000-8000-000000000003'::uuid, 'invitee@example.test', now()),
 ('c0110000-0000-4000-8000-000000000004'::uuid, 'unconfirmed@example.test', NULL),
 ('c0110000-0000-4000-8000-000000000005'::uuid, 'admin-a@example.test', now()),
 ('c0110000-0000-4000-8000-000000000006'::uuid, 'late@example.test', now());
INSERT INTO public.organizations(id,name,slug,created_by) VALUES
 ('c0120000-0000-4000-8000-000000000001'::uuid,'C01 Invite A','c01-invite-a','c0110000-0000-4000-8000-000000000001'::uuid),
 ('c0120000-0000-4000-8000-000000000002'::uuid,'C01 Invite B','c01-invite-b','c0110000-0000-4000-8000-000000000002'::uuid);
INSERT INTO public.organization_members(organization_id,user_id,role) VALUES
 ('c0120000-0000-4000-8000-000000000001','c0110000-0000-4000-8000-000000000001','owner'),
 ('c0120000-0000-4000-8000-000000000002','c0110000-0000-4000-8000-000000000002','owner'),
 ('c0120000-0000-4000-8000-000000000001','c0110000-0000-4000-8000-000000000005','admin');

INSERT INTO public.invitations(id,organization_id,email,role,token_hash,invited_by,status,expires_at) VALUES
 -- happy path (mixed-case mailbox must still match)
 ('c0130000-0000-4000-8000-000000000001','c0120000-0000-4000-8000-000000000001','Invitee@Example.test','analyst',encode(sha256('c01-ok'),'hex'),'c0110000-0000-4000-8000-000000000001','pending',now()+interval '1 day'),
 -- expired
 ('c0130000-0000-4000-8000-000000000002','c0120000-0000-4000-8000-000000000002','invitee@example.test','viewer',encode(sha256('c01-expired'),'hex'),'c0110000-0000-4000-8000-000000000002','pending',now()-interval '1 second'),
 -- revoked
 ('c0130000-0000-4000-8000-000000000003','c0120000-0000-4000-8000-000000000002','other@example.test','viewer',encode(sha256('c01-revoked'),'hex'),'c0110000-0000-4000-8000-000000000002','revoked',now()+interval '1 day'),
 -- for unconfirmed user
 ('c0130000-0000-4000-8000-000000000004','c0120000-0000-4000-8000-000000000002','unconfirmed@example.test','viewer',encode(sha256('c01-unconfirmed'),'hex'),'c0110000-0000-4000-8000-000000000002','pending',now()+interval '1 day'),
 -- downgrade attempt: existing admin invited as viewer
 ('c0130000-0000-4000-8000-000000000005','c0120000-0000-4000-8000-000000000001','admin-a@example.test','viewer',encode(sha256('c01-downgrade'),'hex'),'c0110000-0000-4000-8000-000000000001','pending',now()+interval '1 day'),
 -- forced failure rollback, tenant B
 ('c0130000-0000-4000-8000-000000000006','c0120000-0000-4000-8000-000000000002','late@example.test','analyst',encode(sha256('c01-forced'),'hex'),'c0110000-0000-4000-8000-000000000002','pending',now()+interval '1 day'),
 -- owner role must never be grantable through an invitation
 ('c0130000-0000-4000-8000-000000000007','c0120000-0000-4000-8000-000000000002','owner-a@example.test','owner',encode(sha256('c01-owner'),'hex'),'c0110000-0000-4000-8000-000000000002','pending',now()+interval '1 day');

CREATE FUNCTION pg_temp.expect_unavailable(p_token text, p_user uuid, p_label text) RETURNS void
LANGUAGE plpgsql AS $f$
BEGIN
  BEGIN
    PERFORM * FROM public.accept_foremention_invitation(encode(sha256(convert_to(p_token,'UTF8')),'hex'), p_user);
  EXCEPTION WHEN SQLSTATE 'PT409' THEN
    IF SQLERRM <> 'INVITATION_UNAVAILABLE' THEN RAISE EXCEPTION '%: unexpected error %', p_label, SQLERRM; END IF;
    RETURN;
  END;
  RAISE EXCEPTION '%: acceptance should have been refused', p_label;
END $f$;

DO $$
DECLARE
  r record;
  invitee uuid := 'c0110000-0000-4000-8000-000000000003';
  org_a uuid := 'c0120000-0000-4000-8000-000000000001';
  org_b uuid := 'c0120000-0000-4000-8000-000000000002';
BEGIN
  -- 1. Happy path: one membership, invite accepted, one audit row, one notification.
  SELECT * INTO r FROM public.accept_foremention_invitation(encode(sha256('c01-ok'),'hex'), invitee);
  IF r.organization_id <> org_a OR r.granted_role <> 'analyst' THEN RAISE EXCEPTION 'Happy path receipt wrong: %', r; END IF;
  IF (SELECT status FROM public.invitations WHERE id='c0130000-0000-4000-8000-000000000001') <> 'accepted' THEN RAISE EXCEPTION 'Invite not consumed'; END IF;
  IF (SELECT count(*) FROM public.organization_members WHERE organization_id=org_a AND user_id=invitee AND role='analyst' AND member_email='invitee@example.test') <> 1 THEN RAISE EXCEPTION 'Membership not granted'; END IF;
  IF (SELECT count(*) FROM public.audit_logs WHERE entity_id='c0130000-0000-4000-8000-000000000001' AND action='team.invitation.accepted') <> 1 THEN RAISE EXCEPTION 'Audit row missing'; END IF;
  IF (SELECT count(*) FROM public.notifications WHERE event_key='workspace-joined:c0130000-0000-4000-8000-000000000001') <> 1 THEN RAISE EXCEPTION 'Notification missing'; END IF;

  -- 2. Replay of a consumed link is refused and changes nothing.
  PERFORM pg_temp.expect_unavailable('c01-ok', invitee, 'replay');
  IF (SELECT count(*) FROM public.audit_logs WHERE entity_id='c0130000-0000-4000-8000-000000000001') <> 1 THEN RAISE EXCEPTION 'Replay wrote audit'; END IF;

  -- 3. Refusals: expired, revoked, wrong mailbox, unconfirmed mailbox, owner role, bad token syntax, unknown token.
  PERFORM pg_temp.expect_unavailable('c01-expired', invitee, 'expired');
  PERFORM pg_temp.expect_unavailable('c01-revoked', invitee, 'revoked');
  PERFORM pg_temp.expect_unavailable('c01-downgrade', invitee, 'wrong mailbox');
  PERFORM pg_temp.expect_unavailable('c01-unconfirmed', 'c0110000-0000-4000-8000-000000000004', 'unconfirmed mailbox');
  PERFORM pg_temp.expect_unavailable('c01-owner', 'c0110000-0000-4000-8000-000000000001', 'owner role');
  PERFORM pg_temp.expect_unavailable('never-issued', invitee, 'unknown token');
  BEGIN
    PERFORM * FROM public.accept_foremention_invitation('NOT-A-HASH', invitee);
    RAISE EXCEPTION 'bad token syntax accepted';
  EXCEPTION WHEN SQLSTATE 'PT409' THEN
    IF SQLERRM <> 'INVITATION_UNAVAILABLE' THEN RAISE; END IF;
  END;
  IF EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id=org_b AND user_id=invitee) THEN RAISE EXCEPTION 'Refused invite leaked tenant B membership'; END IF;
  IF (SELECT status FROM public.invitations WHERE id='c0130000-0000-4000-8000-000000000002') <> 'pending' THEN RAISE EXCEPTION 'Expired invite mutated'; END IF;

  -- 4. Higher existing role is preserved (admin invited as viewer stays admin).
  SELECT * INTO r FROM public.accept_foremention_invitation(encode(sha256('c01-downgrade'),'hex'), 'c0110000-0000-4000-8000-000000000005');
  IF r.granted_role <> 'admin' THEN RAISE EXCEPTION 'Existing admin was downgraded to %', r.granted_role; END IF;
  IF (SELECT role FROM public.organization_members WHERE organization_id=org_a AND user_id='c0110000-0000-4000-8000-000000000005') <> 'admin' THEN RAISE EXCEPTION 'Stored admin role downgraded'; END IF;

  -- 5. A second pending invite for the same normalized mailbox+tenant is rejected; historical accepted rows coexist.
  BEGIN
    INSERT INTO public.invitations(organization_id,email,role,token_hash,status,expires_at)
    VALUES (org_b,'INVITEE@example.test','viewer',encode(sha256('c01-dup'),'hex'),'pending',now()+interval '1 day');
    RAISE EXCEPTION 'Duplicate normalized pending invite allowed';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
  INSERT INTO public.invitations(organization_id,email,role,token_hash,status,expires_at,accepted_at)
  VALUES (org_a,'invitee@example.test','viewer',encode(sha256('c01-hist'),'hex'),'accepted',now()+interval '1 day',now());
END $$;

-- 6. Forced late failure (notification insert) rolls back membership, invite consumption and audit.
CREATE FUNCTION pg_temp.c01_fail_notification() RETURNS trigger LANGUAGE plpgsql AS $f$
BEGIN
  IF NEW.event_key = 'workspace-joined:c0130000-0000-4000-8000-000000000006' THEN
    RAISE EXCEPTION 'C01_FORCED_FAILURE';
  END IF;
  RETURN NEW;
END $f$;
CREATE TRIGGER c01_fail_notification BEFORE INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION pg_temp.c01_fail_notification();

DO $$
BEGIN
  BEGIN
    PERFORM * FROM public.accept_foremention_invitation(encode(sha256('c01-forced'),'hex'), 'c0110000-0000-4000-8000-000000000006');
    RAISE EXCEPTION 'Forced failure did not surface';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'C01_FORCED_FAILURE' THEN RAISE; END IF;
  END;
  IF (SELECT status FROM public.invitations WHERE id='c0130000-0000-4000-8000-000000000006') <> 'pending' THEN RAISE EXCEPTION 'Invite consumed despite failure'; END IF;
  IF EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id='c0120000-0000-4000-8000-000000000002' AND user_id='c0110000-0000-4000-8000-000000000006') THEN RAISE EXCEPTION 'Membership kept despite failure'; END IF;
  IF EXISTS (SELECT 1 FROM public.audit_logs WHERE entity_id='c0130000-0000-4000-8000-000000000006') THEN RAISE EXCEPTION 'Audit kept despite failure'; END IF;
END $$;
DROP TRIGGER c01_fail_notification ON public.notifications;

SELECT 'PASS: chat01 atomic invitation acceptance (grants, refusals, role preservation, normalized uniqueness, forced-failure rollback)';
ROLLBACK;
