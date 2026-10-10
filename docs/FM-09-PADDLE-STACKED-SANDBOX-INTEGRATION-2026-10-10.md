# FM-09 — Paddle adapter integration on top of PR #446 (sandbox only)

Date: 2026-10-10
Integration owner: FM-00
Parent PR: #446 (`billing/provider-neutral-creem-20261007`)
Candidate source: #482 (`fm09/paddle-candidate-sandbox-20261009`)
Decision and eligibility PR: #473

## What is implemented

The integration branch starts at exact PR #446 head `4ecadde62989300b4e69d095ba24e4837d1c7e5d` and adds the already tested Paddle REST/webhook candidate from PR #482. It extends `BillingProviderAdapter` with `paddle`, but **only for explicitly enabled local/nonproduction sandbox use**:

- `BILLING_PROVIDER_ID=paddle`
- `PADDLE_SANDBOX_ADAPTER_ENABLED=1`
- `PADDLE_ENVIRONMENT=sandbox`
- sandbox API key, notification secret, and at least one `pri_...` Core/Signal product price

`process.env.NODE_ENV === 'production'` **always causes Paddle `configured() === false`**, even with live API credentials and `PADDLE_LIVE_ENABLED=1`. Thus production checkout, billing portal and webhook route remain unavailable for Paddle. Nothing is deployed, charged or merged here.

In internal sandbox, the existing provider-neutral checkout, billing portal, billing status and webhook routes can invoke the Paddle adapter. A verified `transaction.completed` containing an approved positive-value charge and uniquely configured price can enter the existing atomic `apply_billing_event_atomic_v2` entitlement flow. Unpaid `transaction.billed`, subscription activation and zero-value payment-method changes **do not grant paid access**. HMAC is verified against raw HTTP request body with `Paddle-Signature` header and time tolerance. Metadata is a correlation hint, reconciled with stored provider identities.

**Financial adjustments** (`adjustment.created` and `adjustment.updated`) are recognized and deliberately cause a non-2xx webhook response rather than receiving a false success acknowledgment. Durable receipt/case handling and refund/chargeback policy must be implemented by FM-05/09 with FM-00 authority before any live activation.

An additional small security fix changes the existing portal route to respond HTTP 503 when the authorized billing identity cannot be read, instead of treating a database outage as an empty customer list.

## Key limitation: sandbox is not final production completion

Existing checkout lacks a durable pending-session reservation before external provider transaction creation. Two initial, simultaneous workspace owner requests could create multiple **sandbox** transactions before a verified webhook persists the account. **Do not flip the production gate before FM-05 has delivered an atomic, no-auto-expiry pending-checkout state and provider-specific cancellation/reconciliation protocol**.

A simple in-memory mutex, a lease that expires while a payable checkout can remain active, or an ordinary `billing_accounts` read-before-create is **insufficient** as a global duplicate-charge guarantee.

Refund/dispute cases require:
1. verified provider signature and persisted provider+event ID receipt;
2. durable adjustment ID, amount, currency, state, action and transaction ID;
3. provider subscription/customer to org mapping with unique identity constraints;
4. controlled owner-approved access policy;
5. replay/out-of-order correction and server-side-only service-role writes;
6. reconciliation with actual Paddle transaction and settlement evidence.

The current `parsePaddleCandidateAdjustment` classifies valid Paddle adjustment types but does not persist them, and must not be considered settlement proof.

## Customer product and legal gates

- Written Paddle approval for actual Foremention Bangladesh seller, product category under its marketing-related AUP restrictions, and intended bank account type.
- Verified web/domain/Paddle.js default payment link approval; tested payout rail, real price/catalog, invoice/FX/refund rules and operator support contact.
- No invented pricing, revenue, customers, Stripe migration, tax invoices or seller approvals.
- Sandbox end-to-end with Paddle notifications simulator plus actual sandbox catalog/checkout, including retries, duplicates, out-of-order, annual+monthly, cancellation and refund/chargeback cases.
- FM-00 integration into current main with FM-05 database migration, FM-08 security authorization, FM-07 billing metrics, FM-10 deployment and rollback evidence.
- Only after all commercial and engineering gates: a separate code PR removes the production Paddle block and obtains explicit founder release approval.

## Code ownership and merge order

This is a **stacked draft PR targeted at PR #446's branch**, not main. Keep it separate until FM-00 approves the parent provider-neutral branch and resolves conflict with active parallel work. The standalone candidate PR #482 contains only Paddle primitives and tests; merging both #482 and this stacked PR directly into main would duplicate files. Select one merge/rebase path, avoid double application.

Test with Node >=22.13 and pnpm 10.25:
`pnpm test && pnpm lint && pnpm typecheck && pnpm build`

Then run exact-SHA GitHub CI and authenticated/browser/security checks, followed by Paddle-specific sandbox verification with provider-controlled credentials (not stored in GitHub).

## Source references

- https://developer.paddle.com/webhooks/transactions/transaction-completed
- https://developer.paddle.com/webhooks/transactions/transaction-billed
- https://developer.paddle.com/webhooks/about/signature-verification
- https://developer.paddle.com/build/transactions/default-payment-link
- https://developer.paddle.com/api-reference/customer-portals/create-customer-portal-session
- https://developer.paddle.com/webhooks/adjustments/adjustment-created
- https://github.com/injamhaqq/foremention/pull/446
- https://github.com/injamhaqq/foremention/pull/473
- https://github.com/injamhaqq/foremention/pull/482
