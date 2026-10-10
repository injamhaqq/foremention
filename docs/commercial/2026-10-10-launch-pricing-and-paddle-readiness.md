# Foremention launch pricing and Paddle readiness
Date: 2026-10-10. Decision for the initial sales experiment, not evidence of willingness to pay. Documentation-only preparation; no account migration, checkout activation, verification submission, deployment, or charge.

## Decision
Offer Core at **USD 99/month**; Signal at **USD 249/month** once its delivery and capacity are demonstrated; Intelligence by written custom quote. Monthly auto-renewing subscriptions, with applicable tax disclosed separately before payment. No annual SKU, automatic overage, lifetime offer, separate pilot SKU, or launch discount in this experiment. Existing account entities and legacy annual IDs remain untouched.

Start with five paying B2B software customers. They can also be design partners: feedback is a relationship, not a reason to make the product free. Describe the first subscription month as a paid pilot and disclose automatic renewal and cancellation before checkout. Do not present it as a one-time purchase.

| Plan | Proposed coverage | Delivery gate |
|---|---|---|
| Core — $99/month | One brand/category; up to 25 approved buyer questions; monthly measurement; inspectable Recommendation Records, customer review and exports | Verify one real end-to-end cycle, actual provider/model coverage, limits and costs |
| Signal — $249/month | Up to three brand workspaces; 100 questions total across the subscription; weekly measurement and comparable review | Verify scheduling, aggregate capacity, isolation, comparison eligibility and advertised alerts |
| Intelligence — custom | Written scope and price; only demonstrated integrations and governance | No automatic entitlement or checkout until a supported contract exists |

These limits are proposed commercial scope, not a claim that enforcement or every feature has shipped. Do not substitute this document for testing. Keep public positioning “Recommendation intelligence for B2B software.” Launch Core first if Signal is not ready.

Do not sell raw prompt volume as Foremention's advantage. The current public plan source promises monthly/weekly measurement; several competitors supply daily tracking for less. The proposed value is inspectable evidence and a repeatable review/decision workflow. If buyers cannot demonstrate value from that distinction, fix the product/offer before scaling acquisition.

The current default configuration uses Cloudflare Workers AI and Bing retrieval. This does not establish measurement of actual ChatGPT, Perplexity or Google AI Overview experiences. Name the exact delivered provider/model and method in the demo, order and records. Do not quietly enable paid providers or claim unverified coverage.

## Competitor research
Primary vendor sources checked 2026-10-10. Representative direct and adjacent market coverage, not a claim to enumerate every competitor. USD unless noted; advertised prices are not checkout quotes. Prompt, answer and credit units are not interchangeable.

| Competitor | Advertised price / billing basis | Relevant scope / caution | Primary source |
|---|---|---|---|
| Otterly | $29 / $189 / $489 monthly | 15 / 100 / 400 prompts; daily; four included engines, others add-ons | https://otterly.ai/pricing |
| AIclicks | $59 Starter monthly | 30 prompts, daily, three LLMs, one website | https://aiclicks.io/pricing |
| Analyze AI | $99 Growth; $250 Pro monthly | Growth: 25 daily prompts and three engines; Pro: 35 and four | https://www.tryanalyze.ai/pricing |
| Rankscale | $99 / $229 / $385 / $780 monthly | Credits: 1,200 / 3,000 / 5,500 / 12,000; engine choice changes answer count; separate annual-only Essentials offer | https://rankscale.ai/pricing |
| Trakkr | $100 Growth; $500 Scale monthly | Growth: one brand, 50 prompts and eight models; annual terms separate | https://trakkr.ai/pricing |
| Scrunch | $250 Core; $500 Agency Core monthly | Core: 125 prompts, one brand, five seats, four LLMs | https://scrunch.com/faqs/what-is-the-pricing-for-scrunch-plans |
| AthenaHQ | $295 Starter monthly | 3,600 credits; Enterprise custom | https://athenahq.ai/plans |
| Peec | Vendor's July figures: $95 / $245 / $495 monthly | 50 / 150 / 350 daily prompts; three models. Current dynamic pricing page did not expose amounts; these are provisional, not a verified current quote | https://peec.ai/ai-instructions and https://peec.ai/pricing |
| Semrush | $99/month/domain in the displayed annual billing view | Do not label this a confirmed monthly-cancelable rate | https://www.semrush.com/pricing/ai/ |
| Ahrefs Brand Radar | Custom prompts from $50/month; AI index $199/month | Different products and bundle/base-plan conditions; not interchangeable entry tiers | https://ahrefs.com/brand-radar |
| Profound | Brand trial then custom Enterprise on the current page | Current page supersedes older search results showing $99/$399 brand tiers; agency offering is separate | https://www.tryprofound.com/pricing |
| Brandlight | Sales-led enterprise; no numeric public quote verified | Not a price anchor for an unvalidated early product | https://www.brandlight.ai/ |
| Hall | Now part of Tracksuit | Current landing page replaces the earlier standalone pricing comparison | https://usehall.com/ |

**Inference:** $99 is a defensible price experiment for a differentiated workflow, not proof of competitiveness. $249 belongs to demonstrated higher-value recurring use. Do not launch at $499 merely to look enterprise-ready, or try to beat $29 monitoring on price.

## Acquisition and funding experiment
Initial ICP hypothesis: a B2B software founder or product-marketing lead with existing customers, an active category-content program and a concrete buying question they need to understand. Prioritize one narrow segment; avoid custom enterprise procurement and multi-client agency scope initially.

1. Build a list of 30 qualified companies. Use a short personalized invitation to a 15-minute demo; do not send messages automatically.
2. Demonstrate five customer-approved buyer questions with real dated evidence and limitations. Show one completed review and a supportable next action.
3. After delivery and payment gates pass, offer Core for $99/month. Include one 30-minute onboarding session; customer owns routine review. No unlimited founder consulting.
4. Record payment, activation, first reviewed value, objections, cancellation/refund, support time and later comparable use. Separate signed interest from money received.
5. Seek five initial paid subscriptions and their first renewals. These are targets, not forecasts. Five Core customers would be $495 gross MRR; ten would be $990. Present refunds/churn and cohort sizes honestly.
6. Reassess after ten qualified sales conversations or 30 days. Fix missing provider coverage/value first when that is the objection. If wins are strong and delivery margin healthy, test a higher price for new customers; preserve existing contracts.

For funding, assemble the working demo, verified receipts/renewals, customer problem evidence, usage cohorts, delivery economics and a clear use of funds. Begin suitable investor conversations while collecting this evidence. No price or customer target guarantees funding or its timing; do not inflate pilot fees into recurring revenue.

## Unit economics check
Paddle's standard advertised fee is 5% + $0.50 per checkout transaction: https://www.paddle.com/pricing .
Illustration assumes fee applied to the listed USD amount; excludes taxes, FX/payout charges, refunds, disputes and custom terms.

| Plan | Price | Illustrative Paddle fee | After fee | Maximum other variable cost for an 80% contribution target |
|---|---:|---:|---:|---:|
| Core | $99 | $5.45 | $93.55 | $14.35 |
| Signal | $249 | $12.95 | $236.05 | $36.85 |

80% is a planning target, not actual margin. Include model calls, retrieval, storage and delivery/support labor. First-month onboarding may lower the margin. Instrument actual costs before expanding limits or models.

## Account and code audit
- No callable paddle-sandbox or paddle-live tools are exposed in this session. Catalog, notifications, credentials, approvals, existing customers and payout configuration remain UNKNOWN. No sandbox-to-live ID mapping can truthfully be produced.
- Main .env.example remains Stripe-oriented; local Paddle credentials were not available. Do not paste API keys, endpoint secrets or bank details into issues/PRs/chat.
- Provider-neutral foundation is draft PR #446; Paddle adapter draft #499; reservation/adjustment intake draft #505. These are not proof that production has Paddle integrated.
- PR #505 head c26a990d72c7c6d6c5903c847e60fb0adadfb3f6 had seven successful CI workflows when inspected. Real sandbox checkout/payment, webhook lifecycle and database concurrency evidence remain unverified.
- Candidate provider deliberately rejects production activation. Keep that boundary until actual sandbox proof and a separately verified live preparation change.
- Existing HMAC verification is not proof of source-IP filtering. No dynamic IP allowlist was installed.
- Do not merge duplicate standalone Paddle PR #482 alongside the provider-neutral stack.

## Exact remaining payment work
1. Restore both named Paddle connectors. Read every page of sandbox/live products, prices, discounts, notification settings and checkout domains. Match by price, currency, interval, tax mode, scope and status, not name alone. Ignore clearly identified test items; ask about ambiguous entries.
2. Record actual sandbox test evidence: successful and declined checkout, signature failure, duplicate/reordered retries, renewal, cancellation, refund/adjustment handling, reservation recovery, database concurrency and no double entitlement. Existing sandbox entities are read-only under the user's guardrail; do not change catalog to force this experiment. Escalate any required sandbox entity mutation.
3. Only after the sandbox gate, recreate missing catalog entries additively. The accompanying JSON is a commercial proposal, not an import script or account snapshot. If sandbox amounts differ, report the conflict before treating this as a pure migration.
4. Produce a sandbox-to-live ID table from actual reads. Do not invent pri_/pro_/dsc_ identifiers. Leave existing live prices unchanged; create a new price for a genuinely new amount and update code only after matching.
5. Reuse every existing live notification destination and signing secret. Never rotate, delete or recreate. If a destination appears wrong, report the exact entity/configuration and pause that change. If none exists, create one for the confirmed live webhook URL and store the secret directly in the deployment secret store. Secret retrieval should use supported notification-settings reads where available, never log values.
6. Have the owner create any missing live API key at Developer tools > Authentication, scoped to required operations; store server-side as PADDLE_API_KEY. Create a live client token if supported and use a framework-appropriate public env variable, e.g. NEXT_PUBLIC_PADDLE_CLIENT_TOKEN. Set PADDLE_WEBHOOK_SECRET, PADDLE_CORE_MONTHLY_PRICE_ID and PADDLE_SIGNAL_MONTHLY_PRICE_ID from verified live values. Update the existing billing branch's .env.example with empty placeholders. Do not add secrets to Git.
7. In isolated local/staging live preparation, map all referenced IDs, use api.paddle.com server-side and the live client token, and remove frontend sandbox selection only for live builds. Preserve explicit sandbox support for testing. Retain pwCustomer must come from the authenticated customer's stored Paddle ctm_ ID, never an internal ID/email. No authenticated Paddle customer means omit it rather than guess.
8. Implement webhook-route-only dynamic filtering from https://api.paddle.com/ips data.ipv4_cidrs. Validate fetched CIDRs, refresh atomically on a schedule, use trusted proxy source-IP handling and a last-known-good cache during transient failures; fail closed with an alert if no valid list exists. Reject nonmatches; retain raw-body HMAC verification and replay/idempotency checks. Do not trust arbitrary X-Forwarded-For or hard-code today's IPs.
9. Dashboard: Checkout > Checkout configuration > Payment methods. Recommend cards and available wallets/PayPal after checking eligibility; do not assume all are enabled. Set the default payment link manually to the confirmed approved HTTPS page that loads Paddle.js, not automatically to /pricing.
10. Dashboard: My account > Settings > Website approval. Submit each actual checkout host after site gaps are fixed; website approval is distinct from completing identity/business checks. Business account > Payouts > Payout settings: owner supplies verified bank details and threshold privately. Choose a balance currency compatible with the receiving account and confirm fees. No same-day payout promise.
11. Keep public live checkout disabled. Finish account verification as the next separate step, then the separately authorized live test and launch. No real payment in this preparation task.

Primary implementation sources:
- https://developer.paddle.com/build/go-live-checklist/
- https://developer.paddle.com/build/transactions/default-payment-link/
- https://developer.paddle.com/api-reference/checkout-domains/
- https://www.paddle.com/help/start/account-verification/what-is-account-verification

## Site verification gaps
Paddle's current domain guidance explicitly calls for product description, pricing, deliverables, accessible Terms/Refund/Privacy pages, business/sole-proprietor identification in Terms, HTTPS and custom pricing documentation where applicable:
https://www.paddle.com/help/start/account-verification/what-is-domain-verification .
The “contact in two clicks” check is our usability target, not asserted as that page's exact requirement.

| Area | Observed status | Specific fix / verification |
|---|---|---|
| https://foremention.com/ | Fetch returned 403 in this environment; cannot conclude whether buyers see a block | Test anonymous external desktop/mobile access and HTTPS; fix WAF only if actual visitors are blocked |
| https://foremention.com/pricing | Source contains plan limits but no monetary prices | After approval, publish $99/$249 and exact deliverable/billing terms, with plan availability gates; compare to actual live catalog |
| https://foremention.com/terms | Source exists; paid terms and contracting identity need reconciliation | Use verified issued business details and subscription/cancellation terms, not an inferred trade-license status |
| https://foremention.com/privacy | Source exists; external status unverified | Verify direct anonymous access and reflect actual billing/data providers |
| Refund/cancellation policy | No linked standalone policy demonstrated in inspected public shell | Prepare /refund-policy covering request channel, cancellation timing, refund eligibility, renewal handling and statutory/Paddle rights; add footer navigation |
| https://foremention.com/contact | Source exposes hello@foremention.com; header/footer contact paths are short | Verify actual mailbox delivery and public route behavior; update free design-partner framing to paid pilot terms when available |
| Actual checkout hosts | Not established from account access | Enumerate hosts from real code and Paddle settings; verify product content, HTTPS and separate approval for each |
| Intelligence custom offer | No exact custom agreement verified | Produce a downloadable scope/pricing document for the actual quote if requested by Paddle; do not fabricate enterprise promises |

Observed 403s on /terms, /privacy, /contact and /pricing prevent an external pass claim. They are not evidence of 404 or a generic redirect. Price-to-live-catalog discrepancies cannot be assessed until live reads are available.

## Completion boundary
This change records the pricing decision, research, catalog proposal and actionable blockers. It does not make Foremention payment-ready. Next dependency: both Paddle connectors and real sandbox evidence; then complete additive migration and exact-SHA release checks. No public copy, runtime config, customer records, sandbox/live account entities, or bank settings were changed.
