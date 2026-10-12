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
