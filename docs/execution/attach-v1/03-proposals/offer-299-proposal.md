# Chat03 proposal — scoped $299 offer (PROPOSAL ONLY, not approved, not live)

Status: **hypothesis for founder/FM-00 decision**. `CLAUDE.md` says "Pricing remains a hypothesis until
validated", and `SHARED_RULES.md` says "$299/agency focus and budget scenarios remain hypotheses, not
approved live prices." Nothing in this branch publishes, activates or sells this offer.

## What already exists (read-only facts, 2026-10-13)
- Live Paddle catalog (`api.paddle.com`, read-only GET): product **Foremention Signal** `pro_01m4nrzf3m954gcwj5r2qp6bej`, price **Signal monthly** `pri_01m4ns078841ssg39eg15vz3m4`, **USD 299.00 / 1 month**, `status=active`, `tax_mode=internal`, no trial, quantity min 1 / **max 999999**, created 2026-10-11. Core monthly is `pri_01m4nryn477avd2rv8tpr5kbb2`, USD 99.00.
- `lib/paddle-billing.ts` `LIVE_PRICE_DEFAULTS` hard-codes both IDs for live mode, used when no env override exists.
- Public `/pricing` (production GET) shows Core "$99 / month" and Signal "$299 / month" labelled **"Proposed · not yet purchasable"**.
- Live Paddle: 0 transactions, 0 customers, 0 subscriptions, 0 adjustments, 0 client-side tokens.

An active live catalog price is **not** approval, a sale, revenue or settlement evidence.

## Proposed scope for the $299 offer
| Element | Proposal | Enforced by |
|---|---|---|
| Package | `signal` | `PACKAGE_CAPACITY.signal` / `billing_package_capacity_v1` |
| Price | USD 299 / month, tax-inclusive (`tax_mode=internal`), monthly only | Paddle price `pri_01m4ns078841ssg39eg15vz3m4`; annual left **unset** |
| Capacity | 100 active buyer questions org-wide, 500 run units/month, 3 brands | DB trigger + atomic admission (verified in pglite fixtures, see `verification/`) |
| Access start | Only after a signed `transaction.completed` matching a Foremention reservation | webhook route + `reservationAdmitsPaidTransaction` |
| Access end | Paid period end + 3-day renewal buffer (+ optional grace) unless renewed | `entitlementGrantForBillingEvent` |
| Cancellation | Paddle customer portal / Paddle emails; access stays until period end | `subscription.canceled` handling |
| Refund/dispute | Recorded as an immutable review case; no automatic revocation | `billing_financial_adjustment_events` |
| Who can buy | Workspace owner only, one unresolved checkout per org | checkout route + reservation index |

### Agency variant (if FM-00 picks the "agency focus")
Signal's 3 brands may fit an agency pilot. Selling "per client brand" would need a quantity-based or
separate price and multi-workspace entitlements. **Not implemented**; the current code rejects quantity ≠ 1
on purpose, and the founder would have to approve a new price.

## Founder decisions needed before the offer is live
1. Approve or reject USD 299/month as a public, purchasable price (and Core USD 99).
2. Approve customer terms, the refund/cancellation policy (draft PR #509 is still open) and the subprocessor disclosure (Chat02, A20).
3. Decide whether a free design-partner pilot stays the default CTA (Stage-0 founder-led posture) or self-serve checkout is shown.
4. Set the live price **quantity maximum to 1** in Paddle (account action) so checkout cannot sell more than one unit.
