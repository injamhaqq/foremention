# FM-09 — Merchant-of-Record Billing Activation Gate

Date: 2026-10-09
Owner: FM-09 (review/eligibility); integration and release authority: FM-00
Status: **NOT APPROVED FOR LIVE CHECKOUT**
Canonical repository: `injamhaqq/foremention`

## Verified repository checkpoint (not production verification)

- Main as returned by latest GitHub commit search: `d4fea60a7bb8e047f2282cea9134121e9496c67e`.
- Existing billing: Stripe-compatible checkout/portal/webhook, `billing_webhook_events` receipts, `apply_billing_event_atomic_v2`, `billing_accounts`, and `organization_entitlements`.
- Candidate: draft PR #446, `billing/provider-neutral-creem-20261007`, exact head `4ecadde62989300b4e69d095ba24e4837d1c7e5d`, 20 changed files.
- Seven exact-head GitHub Actions families reported `success`: Billing Provider Contract (37782589650), Browser Acceptance (37782589879), AI Safety and Code Health (37782589823), Isolated Authenticated Journey (37782589620), CI (37782589682), Security (37782589807), CodeQL (37782589537).
- Current main is one commit ahead of the PR's recorded base `58c3e1d55a3d1a91a970b2b2c54cd35d7dd867a4`, modifying only `components/change-specification-detail.tsx`, `scripts/browser-decision-draft.mjs`, `scripts/isolated-authenticated-journey.mjs`, `tests/decision-uncertain-save.test.mjs`, `tests/helpers/decision-editor-fixture.mjs`. No direct changed-filename overlap with PR #446; still rerun CI on rebased head.
- No payment account, merchant approval, banking arrangement, live payment, migration, or deployed PR #446 is established by this review.

## Architecture decision

Preserve exactly one active provider selection for new checkout (`BILLING_PROVIDER_ID`). Keep the Stripe compatibility path; integrate Creem from PR #446 **only after verification and FM-00 approval**. Dodo Payments and Paddle are onboarding candidates, not implemented switches. Never infer paid access from browser redirects.

`Verified provider webhook -> durable replay-safe receipt -> service-only atomic entitlement RPC -> billing state history`

Do not alter shared DB schema or other workstream files without FM-05 / FM-00 authorization.

## Merchant eligibility and fees: official evidence, not account approval

| Provider | Official merchant evidence | Commercial issue to verify | Source |
| --- | --- | --- | --- |
| Creem | Bangladesh marked ** on the supported merchant payout list | Bank-transfer partner may allow individual accounts but restrict business accounts; written decision required on actual account type; published fee 3.9% + $0.40, **plus bank transfer fee $7 or 1% of payout, whichever is higher** and potentially FX/hold/other charges | https://github.com/armitage-labs/creem/blob/main/packages/docs/merchant-of-record/supported-countries.mdx ; https://github.com/armitage-labs/creem/blob/main/packages/docs/merchant-of-record/finance/payout-accounts.mdx ; https://www.creem.io/pricing |
| Dodo Payments | Bangladesh on accepted merchant list | May reject prelaunch products with no usable value, excessive manual services, scraping, mass outreach/spam or certain marketing products. Direct compliance review required for Foremention. Standard base 4% + $0.40, plus applicable international card, subscription, payouts, FX, refund/dispute charges | https://docs.dodopayments.com/miscellaneous/countries-eligible-for-merchant-acceptance ; https://docs.dodopayments.com/miscellaneous/merchant-acceptance ; https://dodopayments.com/pricing |
| Paddle | Bangladesh absent from supplier unsupported-country list | Approval remains discretionary, software versus manual-service classification, banking and payouts; payout threshold >= $100 and monthly payouts | https://www.paddle.com/help/start/intro-to-paddle/which-countries-are-supported-by-paddle ; https://www.paddle.com/help/start/intro-to-paddle/what-am-i-not-allowed-to-sell-on-paddle ; https://www.paddle.com/help/manage/get-paid/when-and-how-do-i-get-paid |

**Do not choose by published nominal transaction fee alone.** Fees above are directional, country/customer/payment-method and bank specific. Merchant onboarding and payout eligibility must be proved first. Merchant-of-Record indirect-tax handling does not remove Foremention's local Bangladesh tax, foreign-exchange, recordkeeping or legal obligations.

## P0 release blockers

1. **KYC/KYB and seller of record:** Approval for actual Foremention seller (individual or registered entity) with truthful product website, legal name, business category, location, ownership, and required IDs.
2. **Payout account:** Written approval for exact Bangladesh bank name/account *type*, beneficiary match, currency, transfer rail, settlement cadence, net fees, reserves, refund netting, and withdrawal minimum. Never rely solely on 'Bangladesh supported'.
3. **Pricing/terms:** Founder-approved Core/Signal recurring products, refund/cancellation and dispute policies, privacy, invoice and customer support identity. Do not invent public prices.
4. **Webhook readiness:** Authenticated signed raw-body verification, replay protection, event chronology, identity collision denial, persistent event audit, retained historical state. No success-redirect entitlement mutation.
5. **Refund/dispute policy:** PR #446 currently ignores `refund.created` and `dispute.created` by returning `null` and acknowledging 200. Before launch, require auditable event intake and explicit owner-approved entitlement / case-management policy; avoid losing notifications.
6. **Checkout concurrency:** PR #446 checks prior `billing_accounts` state before session creation, but does not visibly persist a pending checkout reservation before contacting Creem. Two near-simultaneous first checkouts before any provider webhook could create two sessions. Require a deterministic concurrent POST red test and an atomic reservation/provider idempotency mitigation with FM-05 coordination before launch.
7. **Lifecycle proofs:** Test paid initial, subsequent renewal, payment failure, retries, grace, cancellation with paid-through end, dispute, refund, duplicated / out-of-order events, incompatible IDs, malformed signature and transient DB errors. Confirm no two active payable subscriptions per organization.
8. **Exact-SHA gate:** FM-00 rebase PR #446 after main changes and rerun full CI, CodeQL, browser/security checks and migration-replay verification. FM-10 separately proves production after an explicitly authorized deployment.
9. **Accounting reconciliation:** Match provider statement, invoice IDs, tax amounts, fees, settlements, FX, refunds and receipts to Foremention historical records; no fabricated payments or ARR.
10. **Customer comms:** Billing email authentication, suppression, verified-invoice/failed-payment/cancellation templates and delivery receipts must be tested before automating messages.

## Offline / sandbox-only verification acceptance

- Same verified webhook delivered twice -> one atomic application, auditable duplicate response.
- Billing write fails after receipt -> provider retries and ultimately applies exactly once.
- Webhook metadata organization differs from stored external subscription/customer organization -> no entitlement mutation.
- Two first-time concurrent checkout POSTs -> at most one usable pending checkout or effective payment for the organization.
- Invalid HMAC, malformed body, missing provider config -> no entitlement mutations.
- Nonterminal subscription and active paid-through cancellation -> no new payable checkout.
- Prior subscription with delayed event -> cannot overwrite a newer state.
- Refund/dispute event -> durable case/receipt and explicit policy outcome, not silently dropped.
- Provider outage -> no inferred successful payment.
- Mailer outage -> payment state unaffected and notification delivery retried independently.

## Decision questions for merchant onboarding

Send to each provider *before enabling live API access*:

1. Do you approve a Bangladesh-based individual seller or registered business selling self-serve B2B SaaS subscription access to a Recommendation Intelligence application?
2. Can the exact intended Bangladesh bank-account type receive payouts? Is personal versus business acceptance different?
3. What exact KYC/KYB and website information is required, and are there product category constraints on recommendation/marketing intelligence?
4. What currencies can be charged and settled, payout thresholds/cadence/holds/reserves, and all transaction, international-card, subscription, FX, bank/wire, payout, dispute, refund and chargeback charges?
5. Are hosted recurring checkout, customer portal, invoicing, tax collection, retries, plan changes, webhook replays and sandbox testing supported for this specific merchant?
6. Are there restrictions on founder-assisted pilots, service components, or models powered by third-party AI provider research?

Record actual written provider responses and approved banking details in a **private** operational system, not this public repo. Never commit account details, ID documents, API keys, webhook secrets or bank records.

## KEEP / IMPROVE / ADOPT / DEFER

- KEEP: `apply_billing_event_atomic_v2`, historical Stripe integration and replay receipts.
- IMPROVE: PR #446 after concurrency/refund review, current-main rebase, exact-head checks.
- ADOPT: first *approved* eligible MoR; minimal transactional emails after deliverability proof.
- DEFER: Dodo/Paddle adapter code until primary provider fails eligibility, OpenMeter/Lago until usage-metered pricing is validated, multi-provider routing, public checkout without operator signoff.

## FM-09 -> FM-00 continuation

**Recommended disposition:** Hold live activation. Maintain draft PR #446 under FM-00. Obtain written provider merchant/payout approval; close checkout-concurrency and refund/dispute observability risks in existing billing lane, then rerun exact SHA gates. FM-05 owns shared migrations, FM-08 reviews security, FM-10 deploys, FM-07 covers billing metrics, FM-03 handles UI/communications. This document is an independent audit/checklist only: **no code changes and no deployment authorization**.
