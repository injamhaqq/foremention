# Provider-Neutral Billing + Creem Adapter

Date: 2026-10-07

## Goal

Refactor Foremention billing so checkout, customer portal, webhook verification/parsing, and billing status no longer depend directly on Stripe.

Keep Foremention's existing commercial truth unchanged:

Verified provider event -> billing_webhook_events -> apply_billing_event_atomic_v2 -> billing_accounts + organization_entitlements.

Add Creem as the primary candidate adapter while preserving Stripe as a dormant compatibility adapter.

This slice does not activate live Creem payments. Live Creem remains fail-closed until merchant/KYC/payout verification and explicit production configuration are completed.

## Provider contract

Create a provider-neutral adapter exposing:

- id
- configured()
- checkoutOffers()
- createCheckout(...)
- createPortal(...)
- verifyWebhook(...)
- parseWebhook(...)

Supported provider IDs in this slice:

- stripe
- creem

Unknown/unconfigured providers fail closed.

## Creem configuration

Creem uses official REST endpoints:

- POST /v1/checkouts
- POST /v1/customers/billing

Authentication uses x-api-key.

Webhook authenticity uses the raw body and creem-signature HMAC-SHA256 hex digest.

Environment:

- BILLING_PROVIDER_ID=creem
- CREEM_ENVIRONMENT=test|live
- CREEM_API_KEY
- CREEM_WEBHOOK_SECRET
- CREEM_CORE_MONTHLY_PRODUCT_ID
- CREEM_CORE_ANNUAL_PRODUCT_ID
- CREEM_SIGNAL_MONTHLY_PRODUCT_ID
- CREEM_SIGNAL_ANNUAL_PRODUCT_ID
- CREEM_LIVE_ENABLED=0|1

Safety:

- test uses https://test-api.creem.io
- live uses https://api.creem.io
- live mode is unavailable unless CREEM_LIVE_ENABLED=1
- in NODE_ENV=production, test-mode self-serve billing must fail closed
- at least one configured Core/Signal product is required

No prices are invented by application code.

## Checkout

Server derives organizationId from authenticated workspace context, customer email from the authenticated viewer, any existing external customer ID from billing_accounts, the product mapping from server environment, and the canonical success URL from NEXT_PUBLIC_SITE_URL.

Creem checkout metadata contains organizationId, packageKey, billingInterval.

Metadata is correlation context only. Package authorization comes from the configured Creem product ID.

## Portal

Creem portal uses POST /v1/customers/billing with the verified external Creem customer ID stored in billing_accounts.

## Webhook normalization

Supported lifecycle mappings:

- checkout.completed -> active when paid; trialing when returned subscription is trialing
- subscription.active -> active
- subscription.paid -> active
- subscription.trialing -> trialing
- subscription.paused -> paused
- subscription.canceled -> cancelled
- subscription.expired -> cancelled
- subscription.past_due -> past_due
- subscription.unpaid -> past_due
- subscription.update -> map from documented status
- subscription.scheduled_cancel -> ignored
- refund.created/dispute.created -> ignored in this slice pending explicit entitlement policy

Product/package is derived from configured Creem product IDs, not packageKey metadata.

Initial organization identity may come from validated checkout/subscription metadata. Later lifecycle events that omit metadata resolve organizationId from Foremention billing_accounts using verified provider + external subscription/customer IDs.

No browser success redirect grants entitlement.

## UI

Billing UI uses provider-neutral copy such as "billing portal" and "hosted checkout", not Stripe-specific wording.

## Existing authority

Do not alter billing_webhook_events idempotency, apply_billing_event_atomic_v2, organization_entitlements, grace-period behavior, or usage_events as Foremention's authoritative product usage ledger.

No multi-provider routing is enabled in this slice.
