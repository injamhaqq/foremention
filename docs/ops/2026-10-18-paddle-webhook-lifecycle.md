# Paddle webhook lifecycle coverage (Oct 18 2026)

Live notification setting `ntfset_01m4nvb7zpft45y9gx4f6z2nsh` -> `https://foremention.com/api/billing/webhook`.

## Event policy

| Event | Effect on access |
| --- | --- |
| `transaction.completed` (positive total, admitted reservation or verified subscription identity) | Only event that grants or extends paid access; bounded by the billed period end. |
| `subscription.updated` | May only REDUCE: applied when the single configured price is a strictly lower package than the stored verified Paddle entitlement (Signal -> Core). Renewal, same plan, upgrade, scheduled change, non-active status: acknowledged, no write. |
| `subscription.past_due` / `paused` / `canceled` | Grace / pause / cancel (cancel keeps paid-through access). |
| `adjustment.created` / `updated` | Stored in `billing_financial_adjustment_events`; never changes access. |
| `subscription.created` / `activated` / `resumed`, `transaction.payment_failed` | Not subscribed on purpose: activation can precede payment; failed renewals arrive as `past_due`; a failed first payment grants nothing. |

Dedup: `billing_webhook_events (provider, event_id)`. Out-of-order: `apply_billing_event_atomic_v2` records older events as `stale_event` without applying them.

## Destination settings
- Subscribed events must include `subscription.updated` (added Oct 18 2026).
- `traffic_source` must be `platform` on the live destination, so simulator events never reach production. Run lifecycle simulations against a sandbox destination.

## Operator rules
- Resume a paused subscription with the default `on_resume` (start a new billing period). Its immediate charge arrives as `transaction.completed` and restores access. Resuming with `continue_existing_billing_period` charges nothing, so the workspace stays paused until the next renewal charge.
- Customers manage billing through the Paddle customer portal (cancel, payment method). Plan changes are operator-only.
