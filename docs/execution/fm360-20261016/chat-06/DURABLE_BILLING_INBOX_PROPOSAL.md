# FM360 Chat 06 -> Chat 01: verified webhook inbox and recovery design

**Status:** architecture / shared-schema proposal only, not deployed or tested against real provider. **Owner:** Chat 01 (shared SQL and worker wiring). This file supplements [draft PR #598](https://github.com/injamhaqq/foremention/pull/598), which addresses one wrong-ACK path but not the complete async architecture.

## Existing checked production contract

On 2026-10-16, a read-only production catalog query confirmed `public.billing_webhook_events(provider,event_id,organization_id,received_at,processed_at)` with primary key `(provider,event_id)` and **no durable verified raw body**. `apply_billing_event_atomic_v2` requires an exact unprocessed matching receipt and applies entitlements, state history and processed timestamp in one database transaction. Thus a pending receipt alone is insufficient to reconstitute the original event after process crash. The existing route can synchronously perform multiple PostgREST requests and a Paddle paid-period GET, so it does not guarantee Paddle's HTTP 200 within 5 seconds.

## Non-negotiable invariants

1. Authenticate Paddle from *exact raw bytes* using HMAC and configured environment-specific signing secret, with timestamp tolerance; reject unsigned/stale/tampered payload before database mutation.
2. Only a **successful, committed, durable verified-event insert** can produce HTTP 200. Database timeout/failure returns non-2xx; memory-only buffering never counts as accepted.
3. A replay with the same provider+event ID+canonical raw-body SHA-256 (and same verified metadata) can return 200 regardless of pending/leased/applied state, because replay will be driven from **durably stored bytes**. A different digest/identity for the same ID is an integrity conflict (non-2xx + operator alert), not a harmless duplicate.
4. A 200 acknowledgment means *accepted for durable processing*, **not entitlement applied**. Do not claim completed billing in the UI before the existing atomic RPC commits.
5. Keep positive-value completed transactions unmapped to one current SKU in a `needs_review` durable state; never silently ignore or grant. Persist adjustment/refund/chargeback cases durably and route to accounting review, not automatic entitlement mutation absent an approved policy.
6. Preserve provider/subscription/customer/organization resolution checks, period bounds, out-of-order stale-event logic, tenant isolation and the existing `apply_billing_event_atomic_v2` contract.
7. Worker may crash anywhere: lease with fencing token/generation, retry bounded with jitter/backoff, reclaim expired lease, and operator-visible dead letter after exhaustion. Bounded queue drain without unbounded API calls.
8. Do not log raw event bodies, signatures, PII, secret keys, generated checkout URLs or portal session tokens; use IDs, digest fragments and reason codes.

## Suggested schema (Chat 01 drafts & tests migration; this is NOT executable migration)

Add a private, service-role-only table or an appropriately RLS-protected public table `billing_verified_event_inbox` with:

- key `(provider, event_id)`; immutable verified `event_type`, `event_occurred_at`, `payload_sha256`, `payload_json` (or encrypted exact byte representation), `verified_at`, `source_mode` (`live` or `sandbox`, never inferred from raw IDs).
- `status`: `pending | leased | applied | needs_review | dead_letter`.
- `attempt_count`, `next_attempt_at`, `lease_expires_at`, `generation`, `lease_token`, `last_error_code`, `processed_at`, `created_at`, `updated_at`.
- indexed `(status,next_attempt_at)`, `(lease_expires_at)` for reclaim; conservative body-size bound (e.g. 256 KiB) checked before parsing. Versioned retention: hold unresolved, review, and dead-letter records until reconciled; redact/delete processed payload only according to an approved legal retention schedule.
- `RLS ENABLED`, *no* `anon`/`authenticated` privileges or policies; revoke `PUBLIC`, `anon`, `authenticated` on table and on SECURITY DEFINER RPCs; narrowly grant to `service_role`, fixed `search_path`, and schema-qualified relations. Never expose a raw-payload endpoint to a customer session.

**Atomics** (name/parameter choices belong to Chat 01):

`enqueue_verified_billing_event(provider,event_id,payload_digest,payload,metadata)`:
- Require service role; reject invalid IDs and bodies over bound.
- `INSERT ... ON CONFLICT ...` protected by unique `(provider,event_id)`.
- On conflict, compare digest, source mode and meaningful identity; reject mutation on mismatch; return `accepted_existing` only when identical.
- Transaction commits before HTTP 2xx.

`claim_verified_billing_batch(limit,lease_duration)`:
- `SELECT ... FOR UPDATE SKIP LOCKED` due pending/retry rows (or expired leases), issue fresh unguessable token and monotonic `generation`; commit atomically; per-provider concurrency limit.

`settle_verified_billing_event(id,token,generation,outcome,error_code)`:
- Require exact lease and service role. Reject stale generations; apply existing billing atomic RPC once; mark `applied` only after receipt is `processed_at IS NOT NULL`. On unresolvable paid payments, mark `needs_review`, not success; on transient failure bounded retry; after cap `dead_letter` with a nonsecret alert.

## Fast-route sketch

1. Read body with size bound; verify HMAC and timestamp against correct environment. Parse envelope; validate unique event ID and event type minimally. Do not call Paddle API or lookup the user's subscription in the incoming HTTP handler.
2. Commit verified envelope to inbox through one bounded database call. If the database is unavailable, respond 503. For identical replay accepted by storage, respond 200.
3. Queue a best-effort wake-up after commit. A scheduled periodic sweeper must exist, because the wake-up may be lost; no correctness dependency on transient queue event.
4. Worker performs full provider parsing, amount/price matching, checkout reservation admission, account identity match and paid-period lookup. Reuses existing atomic entitlement apply. Durable review records for unmappable funds, adjustments and unexpected lifecycle types.

## Required deterministic tests (no remote mutations)

- good/bad/tampered/stale signature, large body, malformed JSON; mismatched sandbox/live secret.
- insert succeeds + worker unavailable => ACK and sweeper recovers; DB insert fails => 503.
- duplicate equal body in pending, leased, applied and dead-letter states; duplicate event ID with different digest => integrity alert/no grant.
- simultaneous deliveries and worker contention, stale lease generation, worker crash before/after entitlement commit, missing wake-up, retry exhaustion, negative tests for wrong org/customer/subscription.
- lost or delayed Paddle GET; out-of-order canceled/past-due/paused vs newer paid transaction; legacy archived price; later refund/chargeback.
- >5-second *simulated processing* under delayed downstream DB/Paddle calls does not affect fast route's 5-second response budget; also test DB insert timeout fail closed.
- RLS grants, service-only RPC EXECUTE and schema search path; verify no user-readable raw payload.

## Acceptance evidence before self-serve payments

- Exact-sha CI, route-level local timings for p50/p95/max under deterministic injection, isolated Postgres replay/probe, job replay/no-double-grant and dead-letter operator dry run.
- Read-only provider notification log or explicitly authorized sandbox receipt showing a stored verified receipt and eventual event application; do not send live charges or mutate real customer state without separate authorization.
- Repeatable rollback that **does not drop unprocessed accepted inbox events**. Before rollback, drain/reconcile stored deliveries and maintain an alternate consumer; silently reverting to a route that cannot consume stored events is not safe.

## External gates untouched

Merchant onboarding completed, but verified payout account, default payment link, legal seller/refund contract and real paid customer lifecycle remain outside Chat 06's permitted authority. Backup RPO/RTO likewise requires an isolated restoration of genuine production-format backup, not a synthetic PGlite replay. Do not mark those gates closed by implementing the inbox.