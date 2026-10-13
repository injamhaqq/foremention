# Chat03 — Paddle configuration, reconciliation and FM-00 integration proposal

Evidence observed 2026-10-12; no live account mutations, checkout, charges, refunds, payouts, migrations or deployment.

## Source and scope
- Packet 03: CV-06; A02 and A03 (both `Foremention_Master_Backlog_29.csv` and `Foremention_Master_Backlog_24.csv` rows 2–3), plus the merchant/payment portion of CV-15 (the original row is primarily Chat02).
- The seven attachments expose the role rules, index and 19-name checklist, but **not** the 18 historical original files claimed by that checklist. In particular `Foremention_Master_Backlog_28_v2.csv` is explicitly missing. Historical assertions were not treated as fresh verification.
- Current main at branch creation: `6b93c88cd22653fb17c9bec5ca91ca4e997d76b9`. Existing implementations already incorporate provider-neutral #446, Paddle #499/#505/#511 (not direct merges of their old heads), live adapter #544 and paid-capacity hardening #531/#552. Preserve those; do not merge stale overlapping PR #482.
- PR #508 proposes prices, PR #509 proposes legal copy; neither grants publication authority. FM-00 must reconcile both and confirm legal terms.

## Actual read-only Paddle account findings
- Onboarding verification: `completed`. Domain verification: `completed`. `foremention.com` checkout domain: `approved`.
- Two active SaaS products/prices: Core USD 99 per month (`pri_01m4nryn477avd2rv8tpr5kbb2`), Signal USD 299 per month (`pri_01m4ns078841ssg39eg15vz3m4`). The $299 proposal is **not** user approval to advertise or activate sales; an existing active catalog price is not a sold product or revenue evidence.
- One observed active webhook destination at `foremention.com`, subscribed to `transaction.completed`, `subscription.canceled`, `subscription.past_due`, `subscription.paused`, `adjustment.created`, `adjustment.updated`. Secret and endpoint path were not read or recorded.
- Transaction list returned zero records. No actual checkout, bank settlement, payout, refund, merchant bank ownership or customer-paid access has been verified. Payout/bank configuration is not exposed by the available read-only client actions. Treat production merchant readiness as **not accepted** despite verification status.

## Current architecture / controls observed in main
- `lib/billing-provider.ts`: explicit provider selection; separate sandbox-host gate and `PADDLE_ENVIRONMENT=live` plus `PADDLE_LIVE_ENABLED=1`/live-token-prefix gate.
- `lib/paddle-billing.ts`: sandbox and live API hosts; environment-specific price mapping, signed HMAC with timestamp freshness, priced line-item matching, completed-charge-only entitlement grants, adjustment parser and portal.
- `app/api/billing/checkout/route.ts`: owner auth, durable transaction reservation, uncertain-state failure closed; redirect does not grant entitlement.
- `app/api/billing/webhook/route.ts`: verified signatures, replay/dedup receipts, atomic billing-ledger RPC, financial-adjustment intake, checkout transaction reservation or exact renewal-subscription correlation.
- `supabase/migrations/20261011090000_package_capacity_from_verified_billing.sql`: paid numeric question limits and organization-scoped advisory lock for concurrent admission, per older PR #552 report. New production readiness still requires exact migration fingerprint and two-tenant concurrency receipts.
- This Chat03 branch tightens **non-transaction Paddle lifecycle events** to require an established unique exact customer+subscription+organization match. Previously an event could be reconciled solely from provider `custom_data.organizationId` without a persisted subscription mapping.

## Non-secret configuration map (not values)
| Setting | Required use | Release protection |
|---|---|---|
| `BILLING_PROVIDER_ID` | `paddle` only after FM-00 review | Remain unset/disabled for unapproved activation |
| `PADDLE_ENVIRONMENT` | Explicit `sandbox` or `live` | Never mix environments |
| `PADDLE_SANDBOX_ADAPTER_ENABLED` | Isolated sandbox-only adapter | Not a live enablement switch |
| `PADDLE_SANDBOX_STAGING_HOST` | Nonproduction, noncanonical isolated host | Host gate required |
| `PADDLE_LIVE_ENABLED` | Explicit operator live switch | Leave off until final authorization |
| `PADDLE_API_KEY` | Correct environment, secret storage only | Never in code/reports |
| `PADDLE_WEBHOOK_SECRET` | Exact destination/environment signing key | Never in code/reports |
| `PADDLE_CORE_MONTHLY_PRICE_ID`, `PADDLE_SIGNAL_MONTHLY_PRICE_ID` | Explicit reviewed catalog mappings | Keep unambiguous |
| `PADDLE_CORE_ANNUAL_PRICE_ID`, `PADDLE_SIGNAL_ANNUAL_PRICE_ID` | Only if future annual plans are approved | No annual offer implied |
| `NEXT_PUBLIC_SITE_URL` and billing origin | Canonical redirect and payment-link origin | HTTPS and reviewed site, no cross-host checkout |
| Supabase service-role/admin credentials | Verified event intake only | Server-only, RLS and least privilege |

## Acceptance gates / open risks for FM-00 and Chat09
1. Run existing Paddle test suite and this branch's admission tests on exact candidate head; full repo lint, typecheck, build, migrations, security tests and external sandbox lifecycle simulation on an isolated environment. Local unit tests are not real provider receipts.
2. Run a **real sandbox** checkout against approved sandbox-only host with sandbox credentials and catalog; verify Paddle `transaction.completed` receipt; replay/reorder and retry, renewal, past-due, cancellation, refund/chargeback case intake, duplicate concurrent checkout and crash/uncertain transaction recovery. No charges in live mode.
3. Verify initial and renewal completed transactions always provide bounded `billing_period.ends_at` or add fail-closed reconciled subscription period before paid entitlements. Current parser can grant an unbounded active period when `billing_period` is absent, despite #552's positive-path bounds. This is an unclosed A03 risk; do not invent a billing period.
4. Validate `subscription.canceled` and `subscription.past_due` event shapes under current catalog and archived/historical price IDs. Existing parser requires exactly one **currently configured** price row even for cancellation; if an old price is no longer configured, lifecycle handling might be ignored. Resolve with authoritative stored subscription mapping while preserving anti-spoof boundaries.
5. Verify actual Paddle webhook retry/ordering/ledger persistence, database out-of-order guards, and alerting when adjustment creates a review case. Cases must not be silently auto-closed or mistakenly grant paid access.
6. Check actual database production migration fingerprint, tenant RLS, service-role misuse boundaries and provider-owned event write path with Chat02/FM-00. No production writes here.
7. Founder's independent approval of terms, live offer/prices, refunds/cancellation copy, entity/IP ownership, jurisdiction, merchant eligibility, domain branding and payouts; independently confirm first settlement before scaling. No public claim of paid buyers or approved pricing until supported.

## Dependency-ordered plan
1. Chat03 patch (subscription lifecycle guard) is isolated and may be considered independently. No shared migrations or CI config changed.
2. FM-00 integrates with Chat02 auth/RLS and Chat03 current billing; resolve any contracts with Chat06 recovery and Chat08 financial events.
3. FM-00 owns migration/SQL proposals above, package entitlement contract, exact-head CI and staging configuration; Chat09 runs independent lifecycle and tenant admission acceptance.
4. Only after owner decisions and all evidence: separately consider live checkout activation and deployed production receipt verification. No implied approval from catalog entries.

## Rollback
Revert this branch's `lib/paddle-lifecycle-admission.ts`, its import/checks in the Paddle billing webhook route, and its namespaced tests; no database or account rollback is needed. Reverting removes the added identity guard and should not be performed to bypass unresolved webhook reconciliation.


---

## Refresh — 2026-10-13 (second Chat03 run, exact read-only re-check)

### Read-only Paddle live account (GET only; `sandbox-api.paddle.com` answers 403 `forbidden` to the connected key, so it is a **live-only** key)
| Item | Observed | Meaning |
|---|---|---|
| Products | 2 active (`Foremention Core`, `Foremention Signal`), `tax_category=saas` | catalog not empty (CV-06 "empty catalog" is historical) |
| Prices | Core monthly USD 99.00 `pri_01m4nryn477avd2rv8tpr5kbb2`; Signal monthly USD 299.00 `pri_01m4ns078841ssg39eg15vz3m4`; `tax_mode=internal`, no trial, **quantity max 999999** | set quantity max = 1 (account action) |
| Notification destination | 1 active, `https://foremention.com/api/billing/webhook`, api_version 1, `traffic_source=all`, events: transaction.completed, subscription.canceled/past_due/paused, adjustment.created/updated (secret not read or stored) | live deliveries would hit production now; production billing is not configured (`/pay` shows "Online checkout is not yet available"), so the route answers 503 and Paddle would retry for 3 days |
| Checkout domain | `foremention.com` **approved**; Apple Pay **verified** | |
| Client-side tokens (live) | **0** | live Paddle.js/`/pay` cannot work until one is created |
| Transactions / customers / subscriptions / adjustments / discounts / notifications / reports | **0 / 0 / 0 / 0 / 0 / 0 / 0** | no sale, no settlement, no payout evidence |
| Event types available | include `payout.created`, `payout.paid` | settlement evidence could be subscribed later (proposal) |
| Payout / bank / seller-entity configuration | not exposed by the API | must be checked in the Paddle dashboard by the founder |

Supabase Management API (read-only metadata): project `Foremention` (`ap-northeast-2`, ACTIVE_HEALTHY). Its migration ledger lists `20261010090000 fm09_paddle_checkout_reservations` and `20261011090000 package_capacity_from_verified_billing`. A ledger entry is **not** proof of DDL parity (A05 / Chat06).

Production `/api/health` reported build `b13e5327…` (an ancestor of main `6b93c88…`).

### Defects found and fixed on this branch (code), with FM-00 migration proposal
1. **Reservations never settle → organization permanently blocked from checkout.** `billing_checkout_reservations` moves reserved→ready/uncertain and never leaves those states. `billing_checkout_unresolved_org_uidx` (state <> 'reconciled') then blocks every later reservation, after a paid subscription is cancelled and after any abandoned checkout. Reproduced in pglite against the real main migration. Fix: webhook settles on verified payment (`rpc/settle_paddle_checkout_reservation`), plus owner reconcile route `POST /api/billing/checkout/reconcile` (settle / cancel-abandoned-then-release / release-canceled / manual review). The RPCs are in `migrations/20261013090000_billing_checkout_reservation_settlement.sql` (proposal; pglite 8/8).
2. **Paid but unmappable Foremention transaction was acknowledged as `ignored` (200).** Quantity ≠ 1, extra items or a non-configured price with our custom_data: the customer is charged with no access and no record. Now 503, so the event stays visible and retried in Paddle's notification log for operator review.
3. **Subscription state changes for archived/repriced prices were ignored**, which left cancelled or paused subscriptions active until the period bound. They are now admitted only by the exact stored subscription+customer identity, and the package comes from the persisted verified Paddle entitlement. Subscriptions Foremention never verified are still ignored.
4. **Redelivery after settlement** would have returned 503 for 3 days. A settled reservation now admits only its own `paid:<txn>` redelivery, which is acknowledged as a duplicate.
5. **Live default payment link page missing.** `/pay` rendered only Sandbox, so live `checkout.url` and Paddle's payment-method-update emails would land on "not available". Added a fail-closed live gate (`lib/paddle-payment-page.ts`). The CSP change it needs is in `live-pay-csp.patch.md` (FM-00/Chat06 file).
6. **Pending UX.** The status API exposes `checkoutPending` and the effective `buyerQuestionLimit`. The settings billing panel shows "confirmation pending" on `?billing=success` without ever inferring paid access, and offers "Check checkout status".

### Configuration map additions (names only, never values)
| Setting | Use | Protection |
|---|---|---|
| `PADDLE_LIVE_CLIENT_TOKEN` | browser-safe live token (`live_…`) for `/pay` | read server-side only by the live gate; none exists yet |
| `PADDLE_LIVE_CHECKOUT_PAGE_ENABLED` | separate switch for the live `/pay` branch | default unset/0 |
| `PADDLE_SANDBOX_CLIENT_TOKEN` | existing sandbox `/pay` token (`test_…`) | sandbox host gate |
| `BILLING_GRACE_PERIOD_DAYS` | optional past-due grace (0–30) | default 0 = paused on past_due |
| Paddle dashboard: default payment link | must be `https://foremention.com/pay` (live) / staging host (sandbox) | value not readable by API, founder to confirm |

### Webhook latency budget (official requirement)
Paddle requires HTTP 200 within **5 seconds** and retries 60 times over 3 days for live accounts
(https://developer.paddle.com/webhooks/about/respond-to-webhooks). The route runs synchronously: 2–5 PostgREST calls, plus a ≤3 s Paddle GET only for an initial payment that has no `billing_period`. This is acceptable for low volume. Chat06 should confirm p95 latency in staging, or move to receipt-then-queue processing. Paddle's live webhook source IPs (34.232.58.13, 34.195.105.136, 34.237.3.244, 35.155.119.135, 52.11.166.252, 34.212.5.7) can be allow-listed at the edge (FM-00/Chat06).

### Contract offered to Chat08 (commercial events)
Authoritative sources on this branch: `billing_state_history` (each verified lifecycle event, including stale ones not applied), `billing_webhook_events` (dedupe receipt), `billing_financial_adjustment_events` (refund/chargeback/credit cases, immutable) and settled reservations (`reconciliation_evidence = paid:<txn>`).
- `payment_collected` (customer charged): a Paddle `transaction.completed` with a positive `grand_total`. **Amount and currency are not persisted today.** Proposal: FM-00 adds `amount_minor`, `currency_code` and `transaction_id` to `billing_state_history` (or a `billing_payments` table) filled from the verified payload.
- `refund_settled` / `chargeback`: the adjustment receipt with `status=approved` (refund approval can take Paddle review time on live).
- `merchant_settlement`: **not available**. It needs a `payout.paid` subscription plus a payout ledger (proposal). A completed transaction is not settlement.

### PR dependency plan (exact)
1. Chat03 PR #566 (this branch) is independent of the other workers' code. It touches only billing files, the `/pay` page/component and `tests/attach-v1-03-*`. It does not touch `app/api/prompts/route.ts`, which Chat04 is editing for A28/A03 question validation: leave it to Chat04 and keep the DB trigger as the atomic authority.
2. FM-00 applies `03-proposals/migrations/20261013090000_…sql` (additive functions only) **before** the reconcile route or webhook settlement can succeed. Until then the webhook still applies entitlements: settlement is best-effort and errors are swallowed. Reconcile answers 503.
3. FM-00/Chat06 apply `live-pay-csp.patch.md` before any live checkout test.
4. Chat02: RLS/tenant review of service-role reads added here (reservation reads are scoped by the server-side `context.organizationId`).
5. Chat09: run the real sandbox lifecycle on an isolated staging host (see the acceptance gates above) on the exact composed head.
6. Founder account actions and approvals (status file, final list), then a separate live activation decision.
