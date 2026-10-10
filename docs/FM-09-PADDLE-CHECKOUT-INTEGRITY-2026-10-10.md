# FM-09 / FM-05 — Paddle checkout integrity and adjustment receipts

Date: 2026-10-10
Branch: `fm09/paddle-reservation-adjustment-intake-20261010`
Stacked on sandbox-only Paddle adapter PR #499, itself stacked on provider-neutral PR #446.
Review owners: FM-00 (integration/release), FM-05 (migration/RLS), FM-08 (security), FM-09 (provider correctness).

## What is implemented

1. Additive `billing_checkout_reservations` table and three service-role-only RPCs:
   - `reserve_paddle_checkout` acquires a PostgreSQL organization row lock, checks prior active/paid-through billing and inserts one unresolved checkout reservation.
   - `record_paddle_checkout_session` binds a successful Paddle transaction ID and hosted URL to that reservation.
   - `mark_paddle_checkout_uncertain` retains the reservation if Paddle creation or persistence fails.
2. The owner-authorized checkout route calls `reserve_paddle_checkout` **before** `provider.createCheckout`, and it fails closed on a conflict, missing migration or DB outage. No browser success response is returned unless the provider transaction has been durably recorded.
3. A server-generated reservation ID is included in Paddle transaction `custom_data` for future provider-side reconciliation. It is only correlation metadata; it is not proof that an organization can receive entitlements.
4. A separate service-only, append-only `billing_financial_adjustment_events` receipt table is keyed uniquely by provider+event ID.
5. After Paddle HMAC verification, the webhook route classifies financial adjustments, resolves organization from already persisted provider subscription/customer identifiers, persists the event and only then acknowledges HTTP 200. It does not mutate entitlements.
6. Added source/contract regression tests and isolated DB migration replay through GitHub CI.

**Production Paddle remains hard-disabled** in `billingProvider.configured()` when `NODE_ENV === "production"`. There is no merchant account approval, live payout, pricing, deployment, charge or recorded revenue.

## Why the reservation does not expire automatically

Official Paddle SDK guidance: no general client-provided API idempotency key. A provider transaction may be created even when the API call times out. A checkout link may remain payable after an arbitrary application lease expires.

Therefore the unique pending organization index covers `reserved`, `ready` and `uncertain`, with **no TTL**. New checkout requests remain blocked until the original Paddle transaction has been reconciled and (when applicable) safely canceled or the verified subscription's terminal/paid-through lifecycle is resolved.

The table permits the state `reconciled`, but the application exposes **no route or automatic process that can assign it**. This is intentional. FM-00 must authorize an operator-reviewed provider cancellation/reconciliation workflow, including evidence, after FM-05 validates its permissions and invariants. The current implementation is safer to block additional checkout than to risk a duplicate charge.

Docs: https://developer.paddle.com/sdks/libraries/ ; https://developer.paddle.com/api-reference/transactions/update-transaction/

## Refund and dispute policy boundary

Adjustment receipts record provider, event ID, adjustment ID, transaction/subscription/customer identity, action, status, type and event time. They are review-required and append-only; **currency and amount are not inferred or fabricated** from incomplete adjustment payloads. Before production, implement amount/currency enrichment from Paddle official adjustment/transaction records and actual financial statement reconciliation, plus an owner-approved entitlement/grace/refund/chargeback policy.

Only service_role has insert/select permissions. Neither authenticated clients nor webhook metadata can designate an organization as final financial truth.

## Paid-transaction ownership verification (2026-10-10 additional hardening)

The signed `transaction.completed` payload is not enough, by itself, to select a Foremention organization. The adapter now carries `externalTransactionId`, `transactionOrigin`, and the server-resolved `billingInterval`. The webhook route then checks these against **service-only stored identity**:

- **Initial `api` or `web` transaction:** must match one `ready` Paddle checkout reservation with exactly the same external transaction ID, organization, Core/Signal package and monthly/annual interval. Unmatched events return retryable 503 and cannot change entitlements.
- **`subscription_recurring` or `subscription_update`:** must match the exact previously verified Paddle subscription, customer and organization in `billing_accounts`. Mere customer metadata is insufficient.
- Unsupported origins, unknown transaction IDs, missing product/amount/identity fields, unready reservations, database errors, and absent subscriptions deny paid activation.

This is intentionally conservative. Paddle manual invoicing, credits, grandfathered/foreign subscription migration, and transactions created outside the reserved Foremention checkout must have an independently designed and approved billing identity workflow before onboarding. The current setup is sandbox-only and does **not** activate live paid checkout. The first `transaction.completed` arriving before the provider transaction ID is durably stored will be rejected for retry; an uncertain/lost response requires separate operator reconciliation.

## Verified live-account observations (read-only)

On the connected Paddle live account, onboarding verification and domain verification were reported `completed`. The checkout domain `foremention.com` was `approved`; Apple Pay domain verification was `verified`. The live product catalog, price catalog and webhook notification destination list each returned zero records. The connected Foremention Supabase production database has the older billing tables and `apply_billing_event_atomic_v2` function but **does not contain** this draft's checkout reservation and adjustment tables or reservation RPC. These are observations only and do **not** prove merchant bank payout readiness or customer payment functionality.

## External and integration gates

- FM-05 must approve, replay and performance-test the new migration in an isolated database, including two concurrent reservation transactions, DB crash/retry, no expired lease, duplicate provider transaction IDs and RLS denial to unrelated tenants.
- FM-08 must review service-role RPC exposure, signature verification, provider identity mapping, webhook replay and accidental auth bypass.
- FM-00 must prevent duplicates across prior Stripe/Creem billing history and reconcile any outstanding reservations before permitting provider switch.
- Paddle sandbox must demonstrate actual transaction creation, successful webhook entitlement, portal, cancellation, adjustment, failed payment, retries, delayed events and operator reconciliation. Static source tests are **not** a substitute for true concurrent database or provider tests.
- Production Paddle is disabled until Paddle merchant/KYC, business category/AUP and Bangladesh bank payouts are expressly approved for the actual seller, and company policy/pricing/terms are approved.
- FM-10 must verify exact deployed SHA, rollback and webhook notifications after an explicitly approved production release.

Do not mark this stacked draft ready for live use merely because CI passes. It is a secure engineering dependency and can require refinement by FM-00/FM-05.

## Branch ownership and merge order

#446 is the provider-neutral foundation. #482 is a standalone Paddle candidate for review. #499 incorporates that candidate on #446 with a sandbox-only selector. This PR adds database integrity and financial adjustment recording on #499. FM-00 must **choose a single merge/rebase pathway**, not merge overlapping snapshots independently into main.

No shared production migrations were applied by authoring this GitHub candidate.
