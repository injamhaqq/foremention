# Chat06 — recovery, external gates and operations acceptance (2026-10-12; updated 2026-10-13)

2026-10-13 additions: `job-recovery-contract.md` (fenced terminal states, interrupted runs, model pin, bounded schedule catch-up), `restore-and-rollback-plan.md` (A05 lineage, catalog parity, local restore/rollback receipt, **no production backup exists**), `capacity-model-1-5-20.md`, `a17-runtime-503.md`.

This is an evidence-backed proposal, not an authorization for SQL, spending, email sends, migrations, customer changes, deployment or webhook activation.

## Assigned original IDs and current disposition

- **CV-12 (owned):** Alert ledger uniqueness exists, but no atomic reclaimable email lease/RPC. This branch now adds provider idempotency, app-internal URL validation and a persisted pending/uncertain classification. Duplicate events remain suppressed; blind re-delivery is prohibited until a fenced claim/settle design is approved.
- **A13 (owned):** #512 is merged; outbound webhooks have explicit allowlist, DNS public-host preflight, atomic receipt claim/settle and opt-in activation flag. **Keep flag off** until authoritative production migration verification, synthetic lost-ACK/lease races and connection-time DNS/SSRF tests pass. At-least-once receivers must deduplicate stable event IDs.
- **A05 (owned prep):** #332 still open. October 12 read-only evidence: 100 production migration rows vs 97 repo SQL files, 10 differing SQL records, 4 empty-statement entries, 2 production-only views. The customer-confirmed value validation function and corresponding trigger are missing in production. FM-00 must handle approved DDL/lineage after verified backup+nonproduction restore; never blanket database push or rewrite migration history.
- **A17 (owned investigation):** #504 updated Oct 12 with Cloudflare invocation evidence of two exceededResources failures at 2026-10-10 06:33 UTC (Workers Free 10ms CPU budget; 503/error 1102). Bounded historical 39/145397 invocations (~0.027%) is not future incidence. Recheck exact-SHA production with authenticated viewport 470/375/320 px. Paid Worker plan requires owner spend approval; #554 mitigates the form error state, not underlying CPU exhaustion.
- **A14 (support Chat04):** Verify pinned model/approved questions/locale/settings across scheduled retry, cancellation, DST, multi-cron overlap and 7+ day comparable second cycle. No shared schema/feature-route edit here.
- **A18 (support Chat01):** Current source contract is max 10 questions/provider-run, one provider, output budget 1200 tokens per answer, provider timeout 45s, 2 retries, $0.50 run cap. Groq reservation is $0.10/question and $5/org-month. Live quotas, invoices, costs, card overage and retry accounting remain unverified.

## Email delivery lease/RPC proposal (FM-00; do not implement without lineage approval)

Preserve unique (organization,user,event_key). Add a privileged, tenant-scoped atomic claim and settle pair with immutable delivery ID, generation/attempt fencing, 90s example lease (duration to be tested), bounded attempts/backoff, next retry time, stable provider idempotency key, opaque provider receipt and sanitized error. A late worker cannot settle another worker's generation. Provider-success/database-ACK-loss is uncertain, not failed. Respect unsubscribe/membership/preferences at delivery time. Do not reclaim or replay already-pending old rows without outcome reconciliation and known Resend idempotency retention window. If no proof, keep delivery held and escalate.

Synthetic verification: simultaneous claims, HTTP-lost-ACK, database-lost-ACK, lease expiry, stale attempt settling after new claim, mid-flight opt-out, duplicate event, webhook DNS rebinding/redirect to private host, explicit zero-send behavior when gates off. Log request IDs and rate-limited errors without URLs, secret headers, raw content or PII. Independent current-head CI and real migration/application checks belong to FM-00/Chat09.

## Restore/rollback rehearsal (not performed)

Capture a verifiable production-derived backup (timestamp/hash, documented custody, retention/encryption), instantiate an **existing authorized disposable isolated database**, disable jobs/outbound/provider senders, restore there only, reconcile ordered executed statement hashes with repository SQL many-to-many, and compare catalog DDL, grants, RLS, policies, functions, constraints and triggers. Prove two synthetic organization flows including reviewed decision and second-cycle eligibility. Record replay receipts and rollback/teardown proof. No production restore, no production history patch, no claim of restore success.

## 1 / 5 / 20 organization planning scenarios

**Superseded 2026-10-13** by `capacity-model-1-5-20.md` (measured storage per answer is ~4.4 KiB incl. indexes, not the 25 KiB assumed here; measured retry ratio 1.35 attempts/answer; Inngest executions and founder time added). The restore rehearsal is no longer "not performed": a local disposable rehearsal and production catalog parity are in `restore-and-rollback-plan.md`.

## Contract handoffs

Chat01: provider attempt/model pin, quotas/budget/receipt. Chat02: DNS and origin security, preferences authorization. Chat04: approved snapshot, cancellation and exact second-cycle comparability. FM-00: immutable shared contracts, migration lineage, lease RPC and production gates. Chat09: independent acceptance/restore/race fixtures. Shared files are proposals, not simultaneous edits.
