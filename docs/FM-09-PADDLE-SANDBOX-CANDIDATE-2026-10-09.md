# FM-09 — Paddle standalone sandbox candidate

Date: 2026-10-09
Repository: \`injamhaqq/foremention\`
Branch: \`fm09/paddle-candidate-sandbox-20261009\`
Status: **NOT CONNECTED TO BILLING ROUTES, NOT APPROVED FOR LIVE CHECKOUT**

## Scope and ownership

This independent FM-09 branch adds only \`lib/paddle-billing.ts\`, \`tests/paddle-candidate-contract.test.mjs\` and this document. It must NOT modify the existing \`lib/billing-provider.ts\` or the checkout/portal/webhook/status routes owned by PR #446. FM-00 decides integration and merging after conflict checks and merchant approval.

**Do not merge and deploy this candidate with the expectation that Paddle checkout works.** It is a non-wired adapter under test: no route imports it, no prices are published, no live provider is activated, and no Postgres schema is modified.

## Critical payment distinction

Paddle automatically creates a subscription from either (1) paid \`automatic\` transactions (\`completed\`) or (2) \`manual\` transactions that have merely been marked \`billed\`. A subscription can therefore exist and become "active" **before the related manual invoice is paid**. For Foremention, the paid entitlement event must follow authoritative payment completion, not subscription creation/activation alone.

The candidate permits \`transaction.completed\` with exact server-configured single-price mapping to produce \`active\`. It permits \`subscription.past_due\`, \`subscription.paused\` and \`subscription.canceled\` to produce nonactive or grace-policy states. It intentionally does **not** grant on \`subscription.created\`, \`subscription.activated\`, \`subscription.updated\`, \`subscription.trialing\`, \`subscription.resumed\`, \`transaction.billed\` or \`transaction.paid\`.

There is an important deferred requirement: \`adjustment.created\`/\`adjustment.updated\` (refund, credit, chargeback) need their **own durable event receipts and owner-approved account / entitlement policy** before any activation. The candidate intentionally ignores those events because its parser is **not wired**. When FM-00 wires the provider, it must route adjustment events into durable case storage before acknowledging them, not drop them.

## Environment contract (examples only, never set live values without approval)

- \`BILLING_PROVIDER_ID=paddle\` (**currently not recognized by the active selector**).
- \`PADDLE_ENVIRONMENT=sandbox\`
- \`PADDLE_API_KEY=<from official Paddle sandbox account>\`
- \`PADDLE_WEBHOOK_SECRET=<from official Paddle sandbox notification destination>\`
- \`PADDLE_CORE_MONTHLY_PRICE_ID=pri_...\` (26-character Paddle ID suffix)
- \`PADDLE_CORE_ANNUAL_PRICE_ID=pri_...\`
- \`PADDLE_SIGNAL_MONTHLY_PRICE_ID=pri_...\`
- \`PADDLE_SIGNAL_ANNUAL_PRICE_ID=pri_...\`
- \`PADDLE_LIVE_ENABLED=0\`

The candidate rejects production sandbox configuration, live mode without \`PADDLE_LIVE_ENABLED=1\`, invalid price IDs, cross-offer price collisions and missing key/secret. **Do not set \`PADDLE_LIVE_ENABLED=1\`.** The real app ignores \`BILLING_PROVIDER_ID=paddle\` until a separately reviewed selector change.

Official base endpoints:
- Sandbox \`https://sandbox-api.paddle.com\`
- Production \`https://api.paddle.com\`

## Checkout and portal

The candidate creates an **automatic** transaction with exactly one server-configured catalog price, quantity 1, and correlation-only \`custom_data\`. Paddle's transaction response must include \`data.id\` and \`data.checkout.url\`. An official default payment-link page on an approved website **with Paddle.js** must be configured at Paddle. The candidate fails closed if an HTTPS checkout URL is not returned. Checkout success redirects never grant entitlements.

Paddle customer portal uses \`POST /customers/{customer_id}/portal-sessions\` and returns \`data.urls.general.overview\`; generated URLs contain temporary tokens and must not be persisted. Future integration must ensure the customer ID belongs to the authenticated workspace before calling it. The independent candidate accepts only already-verified Paddle-shaped customer IDs.

## Webhook security

Paddle sends a \`Paddle-Signature\` of \`ts=<Unix-seconds>;h1=<HMAC-SHA256 hex>\`. The candidate signs the exact \`ts:rawBody\` payload and uses five-second timestamp tolerance (official SDK default) and constant-time digest comparisons. The future HTTP route must retain the **raw** body, avoid inspecting before verification, store replay-safe event receipts, reconcile stored subscription/customer/organization identity and apply \`apply_billing_event_atomic_v2\` in one transaction.

## Mandatory open blockers for a genuinely live Paddle adapter

1. Paddle merchant acceptance for the actual Bangladesh seller, legal entity, owners and company website, especially its **marketing-related acceptable-use restrictions**; written approval required.
2. Payout/account approval for the intended Bangladesh bank arrangement, currencies, minimum settlement, FX and wire charges.
3. Approved product prices, financial/tax terms, buyer refund/cancellation policy, company invoicing flow and support arrangements. Do not issue competing merchant-of-record tax invoices.
4. **Atomic pending-checkout reservation and provider-safe idempotency** for simultaneous first-time requests. The non-wired candidate does not implement any durable reservation.
5. **Separate audit handling for adjustment events**, refunds, credits and chargebacks; cancellation paid-through policy and reconciled subscription/transaction IDs.
6. Customer portal and route-level session/owner authorization, CSRF-origin defenses, callback behavior, merchant account restrictions and historical Stripe subscription migration.
7. Full Node test suite, lint, typecheck, build, browser and security CI after integration; isolated authenticated sandbox full lifecycle; production exact SHA proof after owner approval.

## Merchant and API evidence

- Paddle supplier country rules (Bangladesh not in unsupported list): https://www.paddle.com/help/start/intro-to-paddle/which-countries-are-supported-by-paddle
- Paddle acceptable-use software vs marketing/service restrictions: https://www.paddle.com/help/start/intro-to-paddle/what-am-i-not-allowed-to-sell-on-paddle
- API base URLs, Bearer token, permissions: https://developer.paddle.com/api-reference/about
- Create transaction, automatic vs billed manual invoices, payment link: https://developer.paddle.com/api-reference/transactions/create-transaction and https://developer.paddle.com/build/transactions/default-payment-link
- Customer portal API: https://developer.paddle.com/api-reference/customer-portals/create-customer-portal-session
- Webhook verification: https://developer.paddle.com/webhooks/about/signature-verification
- Transaction and subscription event ordering: https://developer.paddle.com/webhooks/about/how-webhooks-work
- Refund/chargeback adjustments: https://developer.paddle.com/webhooks/adjustments/adjustment-created

## FM-00 integration interface note

PR #446's \`BillingProviderAdapter\` expects \`createCheckout({organizationId,packageKey,billingInterval,customerEmail,customerId,successUrl,cancelUrl})\`, \`createPortal\`, \`verifyWebhook\`, \`parseWebhook\`, \`configured\`, \`checkoutOffers\`. This candidate exports corresponding primitives **without importing or editing** PR #446's \`billing-provider.ts\`. FM-00 must implement the adapter wrapper and write route-level authorization, event receipts, adjustment persistence, concurrency tests and rollback-safe migration before enabling provider selection.

Weighted provider score (customer 20, compatibility 15, correctness 15, security 15, reliability 10, costs 10, reversibility 10, license/legal 5) is **not computed as merchant eligibility is unconfirmed**. Among providers, an ineligible seller means disqualification regardless of score. Commercial choice and deployment remain on HOLD.
