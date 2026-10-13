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


## Continue checkpoint — CI repair and bounded initial Paddle checkout grants

**Prior PR #566 head:** `1efcd592945ace7f3af1d7332253da4fd7d7bea9`. Original exact-head GitHub Actions: **CI failed 1 of 1,320 tests**. Precise failing case: `tests/paddle-checkout-reservation-contract.test.mjs`, which looked for inline subscription/customer comparisons that were intentionally extracted into `lib/paddle-lifecycle-admission.ts`. Seven other original GitHub Actions workflows finished successfully. This is a real verified test-contract drift, not a false claim that CI passed.

**Follow-up branch-only commits:**
- `1b34ab87575e4962d4ebbf71d3427ee2e77b3320` — update existing reservation regression to test exact identity comparisons in the factored helper; do not weaken checking.
- `0d08f8e7a890b22658a57e582877bd21d54b6f54` — `lib/paddle-paid-period.ts`: read-only Paddle subscription lookup and validated bounded expiry for initial paid transactions with null `billing_period`.
- `2b170186c27b1378e56b0810adef9efea19709d4` and `142a7f426fbc08bb0777eae85563986e97392dc5` — webhook route allows paid period lookup only **after** reserved checkout or recurring identity admission, only for verified Paddle transactions missing the period; fail closed with HTTP 503 if unreconciled and type-narrow to Core/Signal.
- `95463f0722b1bfa3c363fa84f3067a99f646fcf4` — new 5-case mocked fixture `tests/attach-v1-03-paddle-paid-period.test.mjs` covering valid first payment, forged subscription/customer/package/interval, invalid dates, unconfigured API, API failure and route ordering.

**Official Paddle contracts checked:** `transaction.completed` may have nullable `billing_period` (documented as set for renewals). `GET /subscriptions/{id}` includes `status`, `customer_id`, one/multiple `items` and `current_billing_period`. No API call was sent to Paddle to test this path; mocked read-only fixtures only. Verified period lookup requires active subscription, exact mapped price/package/interval, same customer and subscription, one unit, currently valid period starting before the event; provider API failures cannot grant unlimited paid entitlements.

**Latest CI at checkpoint:** `142a7f426fbc08bb0777eae85563986e97392dc5` had Billing Provider Contract, Security and Semgrep completed successfully while full CI/other workflows remained pending at read. Re-read exact HEAD current results; do not confuse other commit's canceled runs with passes. Terminal remains unable to clone GitHub; no local complete checkout/pnpm.

**Remaining bounded-period considerations:** If Paddle subscription read is delayed, the completed-payment webhook returns retryable 503 (no premature paid access); this needs an actual sandbox test for retries and first-purchase UX. Current historical-price cancellation behavior still requires separate FM-00 design/reconciliation. Source fixtures do not establish production settlement or merchant payouts.


## Continue checkpoint 2 — 2026-10-13 (full local checkout, real test runs)

**Tooling now verified:** full clone over HTTPS with push access, Node v22.23.3, pnpm 10.25.0, `pnpm install --frozen-lockfile --ignore-scripts` succeeded. The earlier "no clone / no pnpm" limits no longer apply. Base main is unchanged at `6b93c88cd22653fb17c9bec5ca91ca4e997d76b9`. The branch was resumed from `fbf321618ca3a12151de91fecc8887023eb7af5d` (PR #566 head) and was not recreated.

**Source boundary (unchanged):** only the package metadata (START_HERE, PROMPT, SHARED_RULES, OWNERSHIP, PACKAGE_ID, Source_File_Checklist_19.csv, Backlog_Source_Index.csv) was available. The 18 original Source_Files were not attached, so every historical row was re-verified against current code instead. `Foremention_Master_Backlog_28_v2.csv` is still missing.

### Original IDs covered in this checkpoint
- **A02** (Backlog_29 row 2 / Backlog_24 row 2): reservation lifecycle recovery (settle / cancel-abandoned / release / manual review), settled-reservation redelivery, paid-but-unmappable payments fail closed, archived-price lifecycle, live default-payment-link page gate, pending-confirmation UX (redirect never grants).
- **A03** (rows 3): status API exposes the effective server-side `buyerQuestionLimit`. Existing capacity trigger + org-wide advisory-lock admission executed in pglite (sequential cap 25, expiry → 10, cancel → 10, client-written `max_prompts` clamped to the package). True concurrent race: **not executable** in single-connection pglite. It still needs a two-connection Postgres run (Chat09/FM-00).
- **CV-06** (Commercial_Backlog_18 row 6): catalog/destination/domain/token state re-read (read-only). Reconciliation now exists. Ledger, duplicates, order, refund and cancel are covered by runtime fixtures.
- **CV-15** (row 15, merchant/payment part): domain approved, Apple Pay verified, 0 transactions, 0 client tokens. Payout, bank, entity and agreement are not visible by API, so they stay founder gates.

### Changed paths (this checkpoint)
- `lib/paddle-checkout-reconciliation.ts` (new): pure reservation decision + webhook reservation predicate.
- `lib/paddle-billing.ts`: exact-ID transaction GET, documented abandoned-checkout cancel (PATCH status=canceled), catalog-independent lifecycle parser, unmapped-payment detector.
- `lib/billing-provider.ts`: optional adapter methods so routes stay provider-neutral (no route imports `paddle-billing`).
- `app/api/billing/webhook/route.ts`: settlement after apply, reservation predicate, unmapped-payment 503, archived-price lifecycle.
- `app/api/billing/checkout/reconcile/route.ts` (new): owner-only, trusted-origin recovery route. It never writes entitlements.
- `app/api/billing/status/route.ts`: `checkoutPending` (service-role read scoped to the caller's org, owner only) and `buyerQuestionLimit`. Offers are hidden while a checkout is pending.
- `components/billing-control.tsx`, `lib/billing-return-notice.ts` (new): pending/return notices and the "Check checkout status" action.
- `app/pay/page.tsx`, `components/paddle-sandbox-payment.tsx`, `lib/paddle-payment-page.ts` (new): fail-closed live `/pay` branch. The sandbox gate is unchanged.
- Tests: `tests/attach-v1-03-billing-webhook-runtime.test.mjs` (12), `tests/attach-v1-03-checkout-reconciliation.test.mjs` (12), `tests/attach-v1-03-billing-status-and-pay.test.mjs` (9), test-only loader `tests/attach-v1-03-support/*`. Updated the factored-predicate contract in `tests/paddle-checkout-reservation-contract.test.mjs` (same guarantees, now asserted in the helper) and one call-site string in `tests/attach-v1-03-paddle-paid-period.test.mjs`.
- Proposals: `03-proposals/migrations/20261013090000_billing_checkout_reservation_settlement.sql`, `03-proposals/live-pay-csp.patch.md`, `03-proposals/offer-299-proposal.md`, `03-proposals/verification/*.mjs` (pglite harnesses), and a refresh section in `03-proposals/paddle-configuration-and-integration.md`.
- No `supabase/migrations`, root config, CI, `worker/index.ts` or `app/api/prompts/route.ts` edits.

### Commands actually run, with results
- `node --experimental-strip-types --test tests/*.test.mjs` across 349 files (run in 4 batches because of the 120 s shell limit): **1,358 tests, 1,358 pass, 0 fail**.
- Billing subset (`attach-v1-03-*`, `*paddle*`, `*billing*`, `package-capacity`): **123/123 pass**.
- RED check: the new webhook runtime fixtures run against the previous head `fbf32161` fail 5/11 (settlement, settled redelivery, unmapped payment, archived-price cancel ×2). On this head: 12/12 pass.
- `npx tsc --noEmit`: **0 errors**. `pnpm lint`: **0 errors** (10 pre-existing warnings in untouched files). `npx vinext build`: **build complete**.
- pglite 0.2.17 in a scratch dir (not a repo dependency): main reservation migration + proposed settlement SQL **8/8**, including reproducing the permanent-block defect on main; package capacity/admission migration **5/5**.
- **NOT run:** a real Paddle sandbox checkout (the connected key is live-only; sandbox API returns 403), a staging deployment, browser/a11y/responsive QA of the billing panel, a two-connection concurrency race, production CI on the new head (check PR checks), or any live transaction, refund or payout.

### Rollback
Revert the branch commits. No database/account rollback is needed: nothing was applied, and the proposal SQL has its own drop statements.
