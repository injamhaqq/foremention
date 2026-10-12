# Chat03 — Paddle and entitlements — execution checkpoint

## Identity
- Packet: **03**, role: Paddle and entitlements.
- Branch: `fm-attach-v1/03-billing`. Base main: `6b93c88cd22653fb17c9bec5ca91ca4e997d76b9` (checked 2026-10-12). Implementation checkpoint: `7caf3f9b0d52c3c897171e94f3c0472d04bd8f25` (prior to status/documentation commits). Query branch ref for current exact HEAD; never infer current production from this.
- Original historical IDs: **CV-06**, **A02** and **A03** in both `Foremention_Master_Backlog_29.csv` and `Foremention_Master_Backlog_24.csv`, **CV-15** merchant/payment portion shared with Chat02. Source index assignment rows CV-06 (Commercial_Backlog_18 row 6), A02/A03 (29 row 2/3; 24 row 2/3). Historical findings were re-evaluated against current main, not assumed current.
- Missing evidence: only seven metadata files were actually attached in this chat; the 18 original source documents claimed in the checklist were *not* attached. The historical index is available. `Foremention_Master_Backlog_28_v2.csv` is independently marked missing. FM-00 owns complete source reconciliation.

## Verified repository baseline
- Main has provider-neutral billing, Paddle sandbox and live adapters, checkout reservations, webhook verification/replay/ordering, adjustment intake and database-backed numeric entitlements. Historical #446 was merged; #499, #505, #511 and #482 were stacked/superseded, not individually merged. #544 live adapter, #531 numeric limits and #552 paid-period adjustment were merged to main, but no real live checkout or payout evidence follows from a merge.
- Current main code checked: `lib/billing-provider.ts`, `lib/paddle-billing.ts`, `lib/billing.ts`, `lib/product-limits.ts`, `app/api/billing/{checkout,webhook,portal,status}/route.ts`, `app/api/prompts/route.ts` and paid-capacity SQL.
- Current official Paddle docs checked for webhook event delivery/ordering, transaction completion and customer portal/ownership requirements. See proposal for live gates.

## Owned changes
1. **`lib/paddle-lifecycle-admission.ts`**: pure, strict exact-match admission predicate requiring a single existing provider-bound organization, customer and subscription; invalid or absent IDs fail closed.
2. **`app/api/billing/webhook/route.ts`**: authorize non-transaction Paddle subscription state changes only when a uniquely matched persisted billing account exists; reuse admission predicate for renewal charge identity. Orphans get a retryable HTTP 503 and cannot change entitlements via metadata alone.
3. **`tests/attach-v1-03-paddle-lifecycle-admission.test.mjs`**: three behavior tests and a source-level route integration contract. Root tests path ensures discovery by existing `pnpm test` glob.
4. **`docs/execution/attach-v1/03-proposals/paddle-configuration-and-integration.md`**: non-secret config map, merchant read-only facts, lifecycle and rollout dependency gates.
5. **`docs/execution/attach-v1/03-status.md`**: this checkpoint.

No migrations, shared root config, customer data, live catalog or payment-account changes; no deployment, outreach or billing activation.

## Actual test commands and results
- Local Node.js `v22.16.0`. `pnpm` unavailable locally and no full repository checkout/dependencies in the container (outbound git clone DNS blocked).
- **PASS: 3/3 pure identity-admission behavioral tests** from copied, identical test/helper source: `node --experimental-strip-types --test --test-name-pattern='^(a verified|metadata-only|cross-workspace)' /mnt/data/chat03-local/tests/attach-v1-03-paddle-lifecycle-admission.test.mjs`.
- **PASS: static source read-back** with current branch GitHub connection: webhook has strict identity match, subscription lifecycle guard, explicit 503 fail-closed behavior; uploaded helper and tests read back; test has four cases.
- **NOT RUN:** fourth source-contract test in a full repo checkout; `pnpm test`, lint, typecheck, build, SQL integration, real sandbox checkout/webhook, prod current-head CI, real live transaction and payout. Do not treat partial unit coverage as integration/production acceptance.

## Read-only Paddle account evidence
- Onboarding and domain verifications completed, `foremention.com` checkout approved.
- Active catalog lists 2 prices: monthly Core USD 99 and monthly Signal USD 299; $299 is an unapproved pricing hypothesis despite existence as catalog entry.
- One active destination observed with six transaction/subscription/adjustment events.
- **0 transactions returned**. No actual subscription receipt, live settlement or payout/bank verification observed; payment capacity remains unproved.
- No keys/secrets, payment PII or customer data stored.

## Scope disposition
- **CV-06 / A02:** existing implementation reused, Paddle lifecycle identity safety tightened; read-only merchant/catalog and webhook review done; real sandbox lifecycle, settlement and approvals remain pending.
- **A03:** existing verified-capacity and atomic org-wide admission SQL present; do not claim current prod test here. Noted explicit unresolved empty `billing_period` risk and historical-price cancel parser dependence for FM-00 hardening.
- **CV-15 merchant:** onboarding/domain verification checked; agreement/legal/payout/settlement/IP and authorized public offer remain external gates with Chat02 and founder.
- No global reconciliation or unrelated packet ownership claimed.

## Dependencies and next action
- FM-00: rebase/integrate this small patch after current exact-head diff review; validate migrations and ledger; resolve unbounded paid period and historical-price cancellation design, approve shared schemas and composed CI.
- Chat02: tenant/RLS verification; Chat06: retry/reconciliation recovery; Chat08: authoritative commercial metrics; Chat09: independent multi-tenant/replay/order sandbox acceptance. See `03-proposals/paddle-configuration-and-integration.md`.
- Founder's separate explicit approval required for live sellable offer, legal terms, commercial identity/bank/payout and live activation. Do not turn on live credentials or charge a customer in this task.
- Rollback: revert the helper, webhook guard and tests together; no migration rollback.

**Readiness:** narrowly tested, reviewable identity patch; **NOT** integrated release or live billing acceptance.
