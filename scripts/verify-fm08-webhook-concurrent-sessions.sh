#!/usr/bin/env bash
# Disposable CI ONLY: requires fm08-webhook-atomic-claims-candidate.sql applied.
set -euo pipefail
db() { docker exec -i supabase_db_foremention-mvp psql -XAt -v ON_ERROR_STOP=1 -U postgres -d postgres "$@"; }
TMP="$(mktemp -d)"
first_pid=""
second_pid=""
cleanup() {
  result=$?
  trap - EXIT
  if [ -n "$first_pid" ]; then wait "$first_pid" 2>/dev/null || true; fi
  if [ -n "$second_pid" ]; then wait "$second_pid" 2>/dev/null || true; fi
  db >/dev/null 2>&1 <<'SQL' || true
BEGIN;
DELETE FROM public.workspace_webhook_deliveries WHERE organization_id='f8620000-0000-4000-8000-000000000001'::uuid;
DELETE FROM public.workspace_webhook_endpoints WHERE organization_id='f8620000-0000-4000-8000-000000000001'::uuid;
DELETE FROM public.projects WHERE organization_id='f8620000-0000-4000-8000-000000000001'::uuid;
DELETE FROM public.organizations WHERE id='f8620000-0000-4000-8000-000000000001'::uuid;
DELETE FROM auth.users WHERE id='f8610000-0000-4000-8000-000000000001'::uuid;
COMMIT;
SQL
  rm -rf "$TMP"
  exit "$result"
}
trap cleanup EXIT

db >"$TMP/setup.log" <<'SQL'
BEGIN;
INSERT INTO auth.users(id) VALUES ('f8610000-0000-4000-8000-000000000001'::uuid);
INSERT INTO public.organizations(id,name,slug,created_by)
VALUES ('f8620000-0000-4000-8000-000000000001'::uuid,'FM08 Concurrent Claim','fm08-concurrent-claim','f8610000-0000-4000-8000-000000000001'::uuid);
INSERT INTO public.projects(id,organization_id,name,slug,client_brand,created_by)
VALUES ('f8630000-0000-4000-8000-000000000001'::uuid,'f8620000-0000-4000-8000-000000000001'::uuid,'Concurrent Claim','fm08-claim','FM08 Synthetic','f8610000-0000-4000-8000-000000000001'::uuid);
INSERT INTO public.workspace_webhook_endpoints
(id,organization_id,label,destination_url,event_types,secret_hint,created_by)
VALUES ('f8640000-0000-4000-8000-000000000001'::uuid,'f8620000-0000-4000-8000-000000000001'::uuid,'Test Receiver','https://example.invalid/webhook',ARRAY['collection.completed'],'synthetic','f8610000-0000-4000-8000-000000000001'::uuid);
COMMIT;
SQL

db >"$TMP/first.log" 2>&1 <<'SQL' &
BEGIN;
SELECT 'CLAIM1:' || COALESCE((public.claim_workspace_webhook_delivery(
  'f8620000-0000-4000-8000-000000000001'::uuid,
  'f8630000-0000-4000-8000-000000000001'::uuid,
  'f8640000-0000-4000-8000-000000000001'::uuid,
  'concurrent-event', 'collection.completed'
)->>'attempt_count'), 'null');
SELECT pg_sleep(15);
COMMIT;
SQL
first_pid=$!

# Only start claimant 2 once claimant 1 holds the uncommitted write lock.
ready=0
for i in $(seq 1 60); do
  observed="$(db -c "SELECT count(*) FROM pg_stat_activity WHERE state='active' AND query LIKE 'SELECT pg_sleep(15)%' AND pid<>pg_backend_pid();" 2>/dev/null)" || observed=0
  if [ "$observed" = "1" ]; then ready=1; break; fi
  sleep 0.1
done
if [ "$ready" != "1" ]; then echo "First SQL session did not acquire/hold a claim" >&2; cat "$TMP/first.log" >&2; exit 1; fi

db >"$TMP/second.log" 2>&1 <<'SQL' &
SELECT 'CLAIM2:' || COALESCE((public.claim_workspace_webhook_delivery(
  'f8620000-0000-4000-8000-000000000001'::uuid,
  'f8630000-0000-4000-8000-000000000001'::uuid,
  'f8640000-0000-4000-8000-000000000001'::uuid,
  'concurrent-event', 'collection.completed'
)->>'attempt_count'), 'null');
SQL
second_pid=$!

blocked=0
for i in $(seq 1 60); do
  observed="$(db -c "SELECT count(*) FROM pg_stat_activity WHERE wait_event_type='Lock' AND query LIKE '%claim_workspace_webhook_delivery%' AND pid<>pg_backend_pid();" 2>/dev/null)" || observed=0
  if [ "$observed" != "0" ]; then blocked=1; break; fi
  sleep 0.1
done
if [ "$blocked" != "1" ]; then echo "No observed DB lock contention between independent sessions" >&2; exit 1; fi

wait "$first_pid"; first_pid=""
wait "$second_pid"; second_pid=""
grep -Fqx 'CLAIM1:1' "$TMP/first.log" || { cat "$TMP/first.log"; exit 1; }
grep -Fqx 'CLAIM2:leased' "$TMP/second.log" || { cat "$TMP/second.log"; exit 1; }
count="$(db -c "SELECT count(*) || ':' || max(attempt_count) FROM public.workspace_webhook_deliveries WHERE endpoint_id='f8640000-0000-4000-8000-000000000001'::uuid AND event_key='concurrent-event';")"
if [ "$count" != "1:1" ]; then echo "Expected 1 receipt and 1 claim, got $count" >&2; exit 1; fi
echo "PASS: two independent SQL sessions contended; only one active event claim."
