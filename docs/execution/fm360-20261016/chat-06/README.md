# Chat 06 — billing safety branch (FM360, 2026-10-16)

## Scope and release posture

Base: `6bf8bfda6ec0573dbbf432b831eff45688f8f47b`. This isolated branch contains a narrow, reversible webhook-duplicate safety fix and regression tests. It is **not merged, deployed or proven on production**. No customer state, credentials or payment settings were mutated.

## Confirmed code-path risk addressed

The old `claimBillingEvent()` returned `false` when PostgREST inserted no row due to `ON CONFLICT (provider,event_id) DO NOTHING`. `processBillingEvent()` treated this as a successfully processed duplicate and the route replied HTTP 200, even if a pending receipt (`processed_at IS NULL`) remained after a failure.

The change checks the existing row using the provider, event ID, organization and `processed_at`. Only a single matching processed record receives duplicate 200. A pending, mismatched or unreadable collision now returns retryable 503. No entitlement is granted from that path.

## Exact changed paths

- `lib/billing-webhook-receipt.ts` — pure, tenant-aware duplicate resolution.
- `app/api/billing/webhook/route.ts` — read and classify a conflict before acknowledging.
- `tests/billing-webhook-receipt.test.mjs` — seven directly executed local tests; 7/7 pass using Node 22.16 `--experimental-strip-types`.
- `tests/attach-v1-03-billing-webhook-runtime.test.mjs` — real route harness cases for processed/pending/wrong-org/failed-read conflicts; **not executed here** because the full repository dependencies were unavailable locally.

## Actual commercial and operations evidence (read-only)

- Live Paddle: active $99/month Core and $299/month Signal prices; zero customers/subscriptions; two draft transactions; `foremention.com` checkout domain approved; one active notification destination; zero visible notification deliveries on an unfiltered list. Paddle's onboarding verification and domain verification both report completed, but this does not establish a verified payout bank, default payment-link setting, webhook receipt or paid checkout.
- Production Supabase: `billing_accounts=0`, `billing_webhook_events=0`, `billing_financial_adjustment_events=0`, `billing_checkout_reservations=13`, `organization_entitlements WHERE billing_source='paddle'=0`. These are counts, not customer records.
- Previous Oct 13 PGlite restore receipt is synthetic; current Supabase backup status/production-format RPO and RTO are not demonstrated.
- Operator alert: a durable `sent` record was observed, not recipient inbox or Sentry-delivery proof.
- Default evidence admission: 100 daily calls, 900 monthly Brave calls. 20 narrow customers with five questions and one collection on the same day, plus 20% retries, imply 120 attempts before public tools. Published free tiers are not current balance.

## Required owner/integration actions (Chat 01)

1. Run the new route tests on the exact branch head in an isolated checkout. Also run tests, lint, typecheck, build and relevant security/migration gates on a review candidate.
2. Implement **durable verification-first inbox and asynchronous processing** in shared SQL/Worker-owned files before promising the under-five-second Paddle contract; queue exhaustion and unmapped positive-value paid transactions need durable operator-visible cases.
3. Reconcile completed merchant onboarding with actual default-payment-link/payout settings non-destructively and complete a mode-separated, authorized lifecycle trace before paid self-service activation.
4. Verify actual Supabase backup retention and one isolated representative restore; retain measured RPO/RTO, encryption, access, deletion and restore receipts.
5. Confirm legal seller/jurisdiction, cancellation/refund terms, data recipients, recipient-scoped notifications, Sentry inbox and provider quota before published promises.

Paddle's official requirement is `200` within five seconds with at-least-once/out-of-order delivery. This branch removes a wrong-ACK case but **does not** make synchronous webhooks meet that requirement. Keep self-serve paid release **NO-GO** until its remaining gates pass.

## How to review safely

Compare `main...work/fm360-20261016/chat-06-billing-receipt-0cf9a7`. No PR is opened: the repo's `pull_request` workflows can trigger paid GitHub Actions, and the remaining free CI allowance was not verified. Do not merge or deploy this unverified branch.
