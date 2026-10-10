# FM-08/FM-06 — Atomic webhook claim and fenced settlement candidate
**2026-10-10 · Draft-only, not production-migration-ready · FM-00 integration authority**

Base: FM-08 stacked #485 at `3e62c7d2b64c836186946148e70efcf058d6449e`.

## Proven safety boundary
The prior webhook sender inserted `(endpoint_id,event_key)` with on-conflict-ignore then sent before acquiring an exclusive claim. This allowed two independent workers to send the same webhook. This draft replaces that behavior with two service-role-only RPCs:

- `claim_workspace_webhook_delivery`: validates the active project, active tenant-owned endpoint and allowed event type; inserts a receipt if absent; `SELECT ... FOR UPDATE` serializes claims; rejects delivered/exhausted claims; reports in-flight claims as `state: leased`; allows reclaim after 90 seconds; increments a monotonic attempt-number fencing token.
- `settle_workspace_webhook_delivery`: updates ONLY the pending receipt with the same organization, receipt ID and attempt-number token. Invalid status, wrong tenant and stale settlement fail closed.

The sender validates approved egress origin and public DNS, claims, signs and sends, and settles through the RPC. An in-flight lease returns an explicit deferred status; Inngest durably sleeps for 95 seconds and resumes the event with a new step ID, bounded to three lease waits. Successful external POST followed by failed DB acknowledgement remains **uncertain**, never rewritten as confirmed failure. Recipients must deduplicate by stable event ID. There is no promise of exactly-once effects.

## No deployment without migration reconciliation
`scripts/fm08-webhook-atomic-claims-candidate.sql` is deliberately an **isolated SQL candidate, NOT a migration**. The pinned Supabase CLI was not available in the authoring environment and production issue #332 remains open. CI applies the SQL to a disposable Supabase instance after replaying existing migrations and executes `scripts/verify-fm08-webhook-claims.sql` inside a rolled-back fixture transaction. This step proves *local contract only*.

The sender has an independent `WORKSPACE_WEBHOOK_ATOMIC_CLAIMS_ENABLED=0` default gate in addition to the operator-approved HTTPS-origin allowlist. It will not send webhooks when the migration gate is off. Enabling before RPC deployment produces an error; never fall back to direct unfenced PATCH. FM-05 must:
1. Reconcile exact production migration receipts #332 and generate a versioned migration with pinned `supabase migration new` on an isolated checkout, preserving this reviewed SQL.
2. Review `SECURITY DEFINER SET search_path = ''`, SQL role-grant semantics, event validation, org/project ownership and absence of user-token EXECUTE grants.
3. Repeat concurrent **PostgREST service-role** RPC calls in a disposable local test. CI now runs a real two-session PostgreSQL contention test and confirms only one active lease, alongside sequential stale-token/retry/exhaustion, tenant/project ownership and grant checks. PostgREST-specific concurrent requests and real external callbacks remain outstanding.
4. Verify real runtime connection-time private egress blocking; preflight DNS is not enough against rebinding.
5. Perform controlled smoke on a disposable synthetic HTTPS endpoint with both origin and atomic gates enabled only after approved migration and rollback proof.
6. Rerun full exact-head CI, security, browser and isolated auth; require FM-00/founder approval and exact-SHA release.

## Migration/recovery constraints
This candidate reuses the existing `status`, `attempt_count` and `updated_at` receipt fields and changes no existing table schema. A 90s lease is longer than the 5s DNS check and 8s request timeout, but scheduling pauses can still lead to late external acknowledgements. The old receipt row contract remains backward readable. As with any at-least-once distributed system, network outcomes can be ambiguous.

**Known constraints:** CI covers simultaneous independent PostgreSQL SQL sessions, real lock contention, sequential stale-token transitions and bounded Inngest wait-and-resume. It does not prove Cloudflare/PostgREST concurrency or end-to-end receiver behavior. Recovery requires the original Inngest event to remain durably replayable; absent an event-retention and sweeper proof, indefinite historical replay is not guaranteed. FM-05/FM-06 must confirm this before GA. Existing endpoint count was zero when read-only production inspected, not a permanent feature-usage guarantee.

## Release authority and scope
- Do not merge this stacked PR alone, push isolated SQL to production, modify live Supabase credentials or enable the feature without authorization.
- Main auth/egress candidate #481 and scheduler mitigation #485 remain draft.
- Issue #488 tracks GA atomic claim closure, #489 tracks direct prompt-edit RPC project scope, #490 tracks GitHub required security checks.
