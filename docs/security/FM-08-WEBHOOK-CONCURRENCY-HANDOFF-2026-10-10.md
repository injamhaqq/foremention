# FM-08 — Webhook concurrent delivery mitigation and durable claim gap

**Status:** draft-only, no production changes, no merge or deployment. **Authority:** FM-00.
**Stacked base:** FM-08 combined auth/egress candidate PR #481 at `944d5bb3edb1de738cb585a35841ee8b584176a8`.

## Narrow fix

The existing Inngest v4 `deliver-workspace-webhook-events` function has a single `step.run("deliver-signed-webhooks", ...)` wrapper and retries on failures. It previously had no function-keyed concurrency constraint. This change adds:

`concurrency: { limit: 1, key: 'event.data.organizationId + ":" + event.data.eventKey' }`

The scheduler serializes **active steps** for the same tenant/event combination in a single Inngest function execution environment. Different events and tenants may run independently. No API response contract, SQL schema, endpoint configuration, signature scheme, or other Inngest functions change.

## This does not establish exactly-once webhook delivery

- The database has `unique(endpoint_id, event_key)`, but the current worker reads an existing pending row and sends before a transactionally claimed lease is persisted. Direct concurrent callers, other function deployments, an Inngest dev runtime or a restarted execution path can bypass this scheduler-only mitigation.
- Even with an atomic database claim, a process can send successfully and crash before marking the receipt delivered. Its recovery retry can send a second time. Treat effects as **at least once**; consumers must deduplicate the stable event key.
- Inngest concurrency applies to **step execution**, not to whole function runs. Verify the deployed provider's function configuration after an approved release.
- A future database-only lease must be fenced (token + deadline) and confirm organization/endpoint ownership; a stale worker must not be allowed to finalize the newer worker's claim.
- No customer-configured endpoints or existing delivery rows were present in the read-only production counts from 2026-10-09. This is not evidence that third-party transport is globally unused.

## Required FM-06/FM-05 atomic solution (not implemented by this PR)

1. Generate an ordered Supabase migration via the repository's pinned CLI **after migration-lineage reconciliation** and verify against a disposable local DB; never manually guess an applied production version.
2. Extend receipt state with a bounded claim token/lease expiry or equivalent transactional, fenced attempt model, without weakening RLS.
3. Implement a service-role-only atomic claim RPC using `SECURITY DEFINER SET search_path = ''` and explicit `REVOKE EXECUTE FROM PUBLIC, anon, authenticated`; confirm endpoint belongs to the event organization and allows the event type.
4. Refuse claims for delivered, exhausted or currently leased receipts; use a unique event+endpoint constraint and bounded retry counters; capture sanitized, non-secret failure diagnostics.
5. Make the sender call claim **before** any external fetch and settle only with matching token. A lost token must never overwrite a newer claim.
6. In disposable tests, run two concurrent claims for the same endpoint/event and prove exactly one owns the active lease; verify sibling-org forgery, invalid event type, exhausted attempts, lease recovery, stale-token settlement and provider timeout. Test late-success / lost-acknowledgement uncertainty explicitly.
7. Verify secrets, logs, signature timestamp, DNS/egress checks and recipient deduplication; require original idempotency key and no fabricated delivery status.

## Integration and release conditions

- PR #481 is the combined authentication, demo, DNS, and outbound-origin gate. This branch is stacked on it to avoid duplicate merges or file conflicts.
- FM-00 chooses the authoritative candidate, verifies all exact-head CI, quality, browser, security and isolated-auth checks, and approves release separately.
- FM-06 owns durable orchestration and receipt handling. FM-05 owns migration lineage, DB ownership and role grants. FM-11 owns required status checks and repository protection.
- No production policies, secrets, database records, external webhook destinations, billing or paid AI services were changed or exercised.
