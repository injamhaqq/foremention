#!/usr/bin/env bash
# Disposable CI ONLY: requires chat01-atomic-invite-candidate.sql applied.
# Proves independent sessions serialize on the invitation row in both orders:
#   A) accept holds the lock -> concurrent revoke waits, then changes nothing
#   B) revoke holds the lock -> concurrent accept waits, then is refused, no membership
#   C) accept holds the lock -> concurrent second accept waits, then is refused
set -euo pipefail
db() { docker exec -i supabase_db_foremention-mvp psql -XAt -v ON_ERROR_STOP=1 -U postgres -d postgres "$@"; }
TMP="$(mktemp -d)"
pids=()
USER_ID='c0210000-0000-4000-8000-000000000002'
OWNER_ID='c0210000-0000-4000-8000-000000000001'
ORG_ID='c0220000-0000-4000-8000-000000000001'

cleanup() {
  result=$?
  trap - EXIT
  for p in "${pids[@]:-}"; do [ -n "$p" ] && wait "$p" 2>/dev/null || true; done
  db >/dev/null 2>&1 <<SQL || true
BEGIN;
DELETE FROM public.notifications WHERE organization_id='$ORG_ID'::uuid;
DELETE FROM public.audit_logs WHERE organization_id='$ORG_ID'::uuid;
DELETE FROM public.invitations WHERE organization_id='$ORG_ID'::uuid;
DELETE FROM public.organization_members WHERE organization_id='$ORG_ID'::uuid;
DELETE FROM public.organizations WHERE id='$ORG_ID'::uuid;
DELETE FROM auth.users WHERE id IN ('$OWNER_ID'::uuid,'$USER_ID'::uuid);
COMMIT;
SQL
  rm -rf "$TMP"
  exit "$result"
}
trap cleanup EXIT

db >"$TMP/setup.log" <<SQL
BEGIN;
INSERT INTO auth.users(id,email,email_confirmed_at) VALUES
 ('$OWNER_ID'::uuid,'c02-owner@example.test',now()),
 ('$USER_ID'::uuid,'c02-invitee@example.test',now());
INSERT INTO public.organizations(id,name,slug,created_by)
VALUES ('$ORG_ID'::uuid,'C01 Concurrent Invite','c01-concurrent-invite','$OWNER_ID'::uuid);
INSERT INTO public.organization_members(organization_id,user_id,role) VALUES ('$ORG_ID','$OWNER_ID','owner');
COMMIT;
SQL

new_invite() { # $1 token
  db >/dev/null <<SQL
DELETE FROM public.organization_members WHERE organization_id='$ORG_ID'::uuid AND user_id='$USER_ID'::uuid;
UPDATE public.invitations SET status='revoked' WHERE organization_id='$ORG_ID'::uuid AND status='pending';
INSERT INTO public.invitations(organization_id,email,role,token_hash,invited_by,status,expires_at)
VALUES ('$ORG_ID','c02-invitee@example.test','analyst',encode(sha256('$1'),'hex'),'$OWNER_ID','pending',now()+interval '1 day');
SQL
}
accept_sql() { echo "SELECT 'ACCEPT:' || granted_role FROM public.accept_foremention_invitation(encode(sha256('$1'),'hex'),'$USER_ID'::uuid);"; }
revoke_sql() { echo "WITH r AS (UPDATE public.invitations SET status='revoked' WHERE token_hash=encode(sha256('$1'),'hex') AND status='pending' RETURNING 1) SELECT 'REVOKED:' || count(*) FROM r;"; }

wait_for() { # $1 sql count query, $2 message
  for _ in $(seq 1 80); do
    observed="$(db -c "$1" 2>/dev/null)" || observed=0
    if [ "$observed" != "0" ]; then return 0; fi
    sleep 0.1
  done
  echo "$2" >&2; return 1
}

run_case() { # $1 name, $2 first-sql, $3 second-sql
  local name="$1"
  { echo "BEGIN;"; echo "$2"; echo "SELECT pg_sleep(8);"; echo "COMMIT;"; } | db >"$TMP/$name.first.log" 2>&1 &
  local first=$!; pids+=("$first")
  wait_for "SELECT count(*) FROM pg_stat_activity WHERE state='active' AND query LIKE 'SELECT pg_sleep(8)%' AND pid<>pg_backend_pid();" "$name: first session never held its lock" || { cat "$TMP/$name.first.log" >&2; return 1; }
  echo "$3" | db >"$TMP/$name.second.log" 2>&1 &
  local second=$!; pids+=("$second")
  wait_for "SELECT count(*) FROM pg_stat_activity WHERE wait_event_type='Lock' AND pid<>pg_backend_pid() AND (query LIKE '%accept_foremention_invitation%' OR query LIKE '%UPDATE public.invitations%');" "$name: no lock contention observed"
  wait "$first" || true
  wait "$second" || true
}

# A) accept first, revoke second
new_invite c02-a
run_case A "$(accept_sql c02-a)" "$(revoke_sql c02-a)"
grep -Fqx 'ACCEPT:analyst' "$TMP/A.first.log" || { cat "$TMP/A.first.log"; exit 1; }
grep -Fqx 'REVOKED:0' "$TMP/A.second.log" || { cat "$TMP/A.second.log"; exit 1; }
[ "$(db -c "SELECT status FROM public.invitations WHERE token_hash=encode(sha256('c02-a'),'hex');")" = "accepted" ] || { echo "A: invite not accepted"; exit 1; }

# B) revoke first, accept second
new_invite c02-b
run_case B "$(revoke_sql c02-b)" "$(accept_sql c02-b)"
grep -Fqx 'REVOKED:1' "$TMP/B.first.log" || { cat "$TMP/B.first.log"; exit 1; }
grep -Fq 'INVITATION_UNAVAILABLE' "$TMP/B.second.log" || { cat "$TMP/B.second.log"; exit 1; }
[ "$(db -c "SELECT count(*) FROM public.organization_members WHERE organization_id='$ORG_ID'::uuid AND user_id='$USER_ID'::uuid;")" = "0" ] || { echo "B: membership granted after revoke"; exit 1; }

# C) two accepts of the same link
new_invite c02-c
run_case C "$(accept_sql c02-c)" "$(accept_sql c02-c)"
grep -Fqx 'ACCEPT:analyst' "$TMP/C.first.log" || { cat "$TMP/C.first.log"; exit 1; }
grep -Fq 'INVITATION_UNAVAILABLE' "$TMP/C.second.log" || { cat "$TMP/C.second.log"; exit 1; }
[ "$(db -c "SELECT count(*) FROM public.audit_logs WHERE organization_id='$ORG_ID'::uuid AND action='team.invitation.accepted' AND entity_id=(SELECT id FROM public.invitations WHERE token_hash=encode(sha256('c02-c'),'hex'));")" = "1" ] || { echo "C: duplicate acceptance audit"; exit 1; }

echo "PASS: independent sessions serialize invitation accept/revoke in both orders; double accept refused."
