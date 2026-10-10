# FM-09 — Paddle sandbox payment-link acceptance

Date: 2026-10-10. Stacked on draft PR #505. NOT a production release.

## Confirmed missing component

Paddle requires a configured default payment link pointing to a real site page that loads Paddle.js. A transaction checkout URL contains a _ptxn transaction ID. Foremention had no /pay page.
Reference: https://developer.paddle.com/build/transactions/default-payment-link/

## Code added

- /pay is noindex, dynamically rendered, and strictly disables the payment script in any NODE_ENV=production build.
- Only explicit nonproduction Paddle sandbox configurations with an actual test_ client-side token render Paddle.js.
- Paddle.js v2 loads from the official CDN and initializes once. Its built-in _ptxn handler opens the transaction; the app does not invoke a duplicate Checkout.open call.
- The browser never receives the server-side Paddle API key or webhook signing secret.
- The sandbox token and source contract tests are documented.

## Required real sandbox acceptance — NOT YET RUN

1. Use a separate Paddle Sandbox merchant environment and its own catalog, test_ client token, sandbox API key, webhook secret, and a real isolated Supabase test database.
2. Set the Paddle Sandbox default payment link to the actual local nonproduction /pay URL supported by the dashboard (e.g., http://localhost:3000/pay), then verify it is reachable.
3. Run with BILLING_PROVIDER_ID=paddle, PADDLE_ENVIRONMENT=sandbox, PADDLE_SANDBOX_ADAPTER_ENABLED=1, PADDLE_LIVE_ENABLED=0, PADDLE_SANDBOX_CLIENT_TOKEN=test_... and sandbox-only credentials. Store secrets privately.
4. Initiate a workspace-owner checkout. Verify durable reservation precedes Paddle transaction creation, and _ptxn opens exactly the Paddle checkout for that sandbox transaction.
5. Exercise successful and declined test-card payments, verified webhook signature, retries, replay/out-of-order events, renewal, cancellation, refund/chargeback receipt, duplicate checkout attempt, database outage and uncertain transaction recovery.
6. Prove production /pay refuses Paddle checkout. Validate live billing only after FM-00/FM-05/FM-08 acceptance and a separate approved production activation PR.

## Account and release blockers

- The Paddle Live connector is working; live onboarding and foremention.com checkout domain are approved.
- Live catalog/products/prices, webhook destinations and client-side tokens were empty as of the read-only audit. Payout configuration was not verified.
- There is no paddle-sandbox connector available in this chat, so this PR cannot truthfully claim real sandbox payment proof.
- The production main branch remains Stripe-based; Paddle is stacked in #446 -> #499 -> #505. A new /pay route alone cannot accept payments.
- Draft refund/legal PR #509 is separately awaiting founder/legal review. Do not configure a live default link or enable checkout prematurely.
