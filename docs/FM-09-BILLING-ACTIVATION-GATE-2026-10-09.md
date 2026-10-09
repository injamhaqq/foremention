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

Preserve exactly one active provider selection for new checkout (`BILLING_PROVIDER_ID`). Keep the Stripe compatibility path; integrate Creem from PR #446 **only after verification and FM-00 approval**. Paddle, Polar and Lemon Squeezy remain eligibility-screening candidates, not implemented switches. **Dodo Payments is not eligible for new Bangladesh onboarding under its current 2026-08-27 country policy; do not treat it as a fallback without explicit written provider exception.** Never infer paid access from browser redirects.

`Verified provider webhook -> durable replay-safe receipt -> service-only atomic entitlement RPC -> billing state history`

Do not alter shared DB schema or other workstream files without FM-05 / FM-00 authorization.

## Merchant eligibility and fees: official evidence, not account approval

| Provider | Official merchant evidence | Commercial issue to verify | Source |
| --- | --- | --- | --- |
| Creem | Bangladesh marked ** on the supported merchant payout list | Bank-transfer partner may allow individual accounts but restrict business accounts; written decision required on actual account type; published fee 3.9% + $0.40, **plus bank transfer fee $7 or 1% of payout, whichever is higher** and potentially FX/hold/other charges | https://github.com/armitage-labs/creem/blob/main/packages/docs/merchant-of-record/supported-countries.mdx ; https://github.com/armitage-labs/creem/blob/main/packages/docs/merchant-of-record/finance/payout-accounts.mdx ; https://www.creem.io/pricing |
| Dodo Payments | **Not eligible for new Bangladesh merchants** as of current 2026-08-27 policy; Bangladesh appears only in grandfathering for existing accounts | DO NOT integrate for a new Bangladesh seller without explicit written eligibility exception. The separate merchant AUP also excludes prelaunch products, scraping/spam and certain manual services. Published Standard base 4% + $0.40 plus extras is irrelevant while ineligible | https://docs.dodopayments.com/miscellaneous/accepted-countries-and-territories ; https://docs.dodopayments.com/miscellaneous/merchant-acceptance ; https://dodopayments.com/pricing |
| Paddle | Bangladesh absent from supplier unsupported-country list | Approval remains discretionary, software versus manual-service classification, banking and payouts; payout threshold >= $100 and monthly payouts | https://www.paddle.com/help/start/intro-to-paddle/which-countries-are-supported-by-paddle ; https://www.paddle.com/help/start/intro-to-paddle/what-am-i-not-allowed-to-sell-on-paddle ; https://www.paddle.com/help/manage/get-paid/when-and-how-do-i-get-paid |
| Polar | Historical/current public supported-payout documentation lists Bangladesh via Stripe Connect Express; **no merchant-specific approval inferred** | Free Starter platform fee 5% + $0.50 per transaction for new orgs since 2026-05-27; +1.5% non-US card and Stripe payout/FX pass-through. Verify Bangladesh individual/business payout support before adopting | https://docs.polar.sh/documentation/polar-as-merchant-of-record/supported-countries ; https://polar.sh/resources/pricing ; https://polar.sh/features/finance |
| Lemon Squeezy | Official bank payout country list includes Bangladesh | Verify legal-entity/onboarding/bank acceptance; published 5% + $0.50 baseline plus possible international card, subscription and non-US payout fees | https://docs.lemonsqueezy.com/help/getting-started/supported-countries ; https://www.lemonsqueezy.com/pricing |

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
- DEFER: Dodo adapter (Bangladesh new-merchant eligibility currently blocked), Paddle/Polar/Lemon Squeezy adapters until the relevant merchant is independently approved, OpenMeter/Lago until usage-metered pricing is validated, multi-provider routing, public checkout without operator signoff.

## FM-09 -> FM-00 continuation

**Recommended disposition:** Hold live activation. Maintain draft PR #446 under FM-00. Obtain written provider merchant/payout approval; close checkout-concurrency and refund/dispute observability risks in existing billing lane, then rerun exact SHA gates. FM-05 owns shared migrations, FM-08 reviews security, FM-10 deploys, FM-07 covers billing metrics, FM-03 handles UI/communications. This document is an independent audit/checklist only: **no code changes and no deployment authorization**.

## Final 2026-10-09 provider and SDK evidence refresh

The fallback should not be encoded as a hard-coded operational provider sequence before KYC. **Only the existing Creem adapter is implemented; alternatives require new adapters, FM-00 authorization, and account-level merchant approval.**

| Option | Bangladesh onboarding / payout evidence | Published base fee and meaningful extras | Engineering/licensing disposition |
| --- | --- | --- | --- |
| Creem | Bangladesh** listed; Wise/local transfer restrictions may prevent payouts to a Bangladesh business account; explicit approval of exact owner and bank type mandatory | 3.9% + $0.40 successful transaction; bank payout USD/EUR 7 or 1%, greater amount; potential FX conversion/hold. Payouts generally 1st/15th, subject to policy | **Conditional first** because tested adapter exists. Existing REST calls are acceptable. Maintained monorepo `armitage-labs/creem` is MIT; old `armitage-labs/creem-sdk` archived May 2026 and older `creem_io` frozen. Avoid deprecated packages |
| Polar | Official MoR supported-country page explicitly lists Bangladesh for Stripe Connect Express payouts to residents/businesses. Specific entity type and connected account must be verified | Starter 5% + $0.50; +1.5% non-US cards, and Stripe payout pass-through ($2 active payout month, 0.25% + $0.25/payout, cross-border percentage); paid tiers optional | **Eligibility-screening fallback**, not currently implemented. `polarsource/polar-js` archived Sep 17 2026; new TS SDK is in `polarsource/polar/sdk/typescript` |
| Lemon Squeezy | Bangladesh is explicitly listed in bank payout countries; identity/store activation still subject to approval | 5% + $0.50 platform; +1.5% international transactions; +0.5% subscriptions; 1% per payout outside US. $50 payout minimum; 13-day holding period and twice-monthly payout creation | **Eligibility-screening fallback** for SaaS, though service-heavy sellers may be rejected. Use API/webhooks only upon merchant confirmation |
| Paddle | Official supplier-country exclusions do not include Bangladesh; account review and bank-account/transfer approval remain necessary | 5% + $0.50 checkout. $100 payout threshold, monthly payout schedule; SWIFT $15 in certain configurations, up to 1.5% FX conversion spread | **Established SaaS-focused alternative** with `PaddleHQ/paddle-node-sdk`; no existing Foremention adapter |
| Dodo Payments | **Bangladesh excluded from new merchant eligibility**. Current official merchant list applies country of government identity documents to owners/directors and grandfathering covers certain existing merchants only | Published price irrelevant to Foremention while ineligible | **No integration** without explicit written exception |
| Stripe standalone | Bangladesh not on direct Payments merchant onboarding country list; Stripe Connect Express receiving via Polar does not change this | Merchant-country dependent | Retain compatibility adapter for historical data, not direct Bangladesh merchant onboarding |

Official source anchors:
- Creem supported countries and payout restrictions: https://docs.creem.io/merchant-of-record/supported-countries
- Creem payout fees/KYB: https://docs.creem.io/merchant-of-record/finance/payout-accounts and https://www.creem.io/pricing
- Polar Bangladesh Stripe Connect Express: https://polar.sh/docs/merchant-of-record/supported-countries
- Polar current pricing: https://polar.sh/resources/pricing
- Lemon Squeezy supported countries and terms: https://docs.lemonsqueezy.com/help/getting-started/supported-countries and https://docs.lemonsqueezy.com/help/getting-started/fees and https://docs.lemonsqueezy.com/help/getting-started/getting-paid
- Paddle seller eligibility, pricing and payout details: https://www.paddle.com/help/start/intro-to-paddle/which-countries-are-supported-by-paddle and https://www.paddle.com/pricing and https://www.paddle.com/help/manage/get-paid/when-and-how-do-i-get-paid and https://www.paddle.com/help/manage/get-paid/is-there-a-fee-taken-for-payouts
- Dodo eligibility cutoff and identity policy: https://docs.dodopayments.com/miscellaneous/accepted-countries-and-territories
- Maintained Creem SDK licensing/deprecations: https://github.com/armitage-labs/creem
- Polar SDK archived/deprecation notice: https://github.com/polarsource/polar-js

### Merchant decision scoring contract (weighted, gated)

Before numeric scoring, require: (1) seller government-ID KYC/KYB supported, (2) intended exact receiving bank account/biz type approved, (3) B2B software category/terms accepted, (4) real recurring subscription and webhook contract accepted. Any fail => **ineligible**, regardless of nominal rating.

Among confirmed eligible choices, score each criterion 0–5 and calculate `SUM(score / 5 * weight)`:

| Criterion | Weight |
| --- | ---: |
| Customer value (checkout/payment methods/invoices/portal) | 20 |
| Existing technical compatibility | 15 |
| Billing correctness and replay/identity contracts | 15 |
| Security & privacy | 15 |
| Operational reliability and support | 10 |
| Complete transaction/FX/payout/refund/chargeback cost | 10 |
| Data portability and reversibility | 10 |
| Licensing / legal / merchant terms | 5 |

No account-level merchant decisions or payout details have been supplied. Therefore every provider's **merchant eligibility remains unproven**, and publishing numerical overall scores or claiming a commercially approved winner would be misleading. Creem is first engineering candidate, not a verified merchant.

### SDK license and deployment cost disposition

- Maintained Creem `creem` monorepo: MIT, with retired `creem-sdk` and `creem_io` predecessors; no new SDK needed while tested REST integration is sufficient.
- Dodo official TypeScript SDK: Apache-2.0, documented Cloudflare Workers compatibility; not worth integrating for new Bangladesh merchant until policy changes.
- Polar old `polar-js` archived; only evaluate active monorepo TypeScript SDK if needed.
- React Email templates: MIT, can render for provider-agnostic delivery.
- OpenMeter: Apache-2.0, but Kafka/ClickHouse/PostgreSQL runtime is excessive for current fixed-tier pilot and existing usage accounting. Defer.
- Lago: AGPLv3 platform and nontrivial billing operations; defer.
- Resend free published tier: 3,000 emails/month, 100/day and 3 domains; check actual quota at activation. Use only for verified transactional email, avoid double-sending MoR-owned receipts.

Sources: https://github.com/armitage-labs/creem ; https://github.com/dodopayments/dodopayments-typescript ; https://github.com/polarsource/polar-js ; https://github.com/resend/react-email ; https://github.com/openmeterio/openmeter ; https://github.com/getlago/lago ; https://resend.com/pricing .

### Minimal safe customer-communication model

- Keep payment receipts and tax invoices from the merchant of record as accounting truth; do not falsely issue duplicate tax invoices.
- Resend/react-email may send Foremention-only operational notices once a verified billing state is persisted: change in entitlement, retry window, paid-through cancellation, customer-portal link, action-needed/support.
- Queue notices from idempotent committed billing events. On email delivery failure, retry independently without touching paid status. Record provider message ID, delivery/bounce metadata, and a stable deduplication key; redact invoice/bank/PII from logs.
- User-facing email must never claim a successful charge before authoritative provider confirmation.
- Keep billing mailing separate from consent-based product/marketing email.

### Owner-facing merchant eligibility inquiry (not sent)

Subject: Bangladesh-based B2B SaaS Merchant of Record — eligibility and business-bank payout confirmation

We operate Foremention (https://foremention.com), a B2B software product that enables teams to monitor and review AI recommendations with linked evidence and human approval. We plan recurring self-serve software subscriptions alongside founder-led design-partner engagements. No card payments are active.

Before integration, please confirm whether your service can onboard our actual Bangladesh-based seller (individual or registered business as applicable), the required owner/director government-ID KYC/KYB, and whether you can approve payouts to the **specific type of Bangladesh bank account** in the matching legal name. Please also confirm whether our B2B recommendation-intelligence software category is eligible and any restrictions involving third-party AI-powered data collection.

Please specify permitted payout currencies and rails, full transaction/FX/international-card/recurring/payout/refund/dispute fees, reserves, payout cadence/holds, supported sandbox checkout and recurring webhook events, invoice/tax responsibilities, and required terms/customer support disclosures. We will provide non-public seller documents only through your official secure onboarding process.

Do not send this inquiry, upload documents, or activate checkout without the owner's approval.
