# Chat08 — Commercial proof and finance contracts (FM-00 proposals)

**State:** internal proposal, 2026-10-12. No real outreach, customer interview, live charge, agreement, customer record mutation, pricing activation, production migration or deployment performed by Chat08.

## Reconciliation

The active repository constitution and issue #283 retain a B2B SaaS 50–500 employee Stage-0 design-partner focus, with hypotheses of $3,000/$6,000 assisted pilots. The 2026-10-11 Foremention Commercial Investment Report favors 2–20-person B2B SEO/GEO agencies and a $299/four-week single-client pilot. These are **conflicting experiments**, not authority to silently change ICP, website, canonical category, live pricing or product scope. FM-00/founder should explicitly decide which target and price cohort is eligible for testing, with fixed comparable scope, separate records for quote, acceptance, signed agreement, cash settlement and continuation.

The earlier 108-row Financial_Model_36_Months.csv (Conservative, Base, Aggressive; $199/$299/$399 ARPA) was traced to Startup_Decision_Report.md §11 on **Supplier Quote Review**. Its monthly arithmetic (opening/new/lost, average billables, revenue, COGS, gross profit, OPEX, cash flow, MRR, ARR) reconciled in all 108 rows of the available historical CSV, but **its business assumptions and projections must not be applied to Foremention**. Customer_Evidence_100_Issue_Samples.csv contains independent GitHub issue research about other product ideas, not Foremention buyers or first-party interviews.

## Provenance and event integration boundary

Preserve one canonical commercial system; no secondary CRM/analytics store or migration created here.

| Scoped event | Authoritative owner | Minimum defensible proof |
| --- | --- | --- |
| design_partner_accepted / scoped_offer_delivered | Chat08 canonical commercial ledger | external legal org, explicit acceptance or actually delivered scoped offer |
| interview_completed | Chat08 founder research | actual confirmed participant, dated note, observed behavior, not an issue sample |
| first_record_reviewed | Chat04 Recommendation Record | real approved question/method, human evidence review |
| change_specification_approved | Chat04 canonical Change Specification | customer authorization, owner, documented next step |
| comparable_second_cycle_reviewed | Chat01/04 comparison contract | later than reviewed baseline and approved change, exact-comparable method and human review |
| pilot_commitment_signed | commercial executed agreement / legal | genuine executed agreement and pilot scope reference |
| payment_settled / refund_settled / renewal_payment_settled | Chat03 billing/merchant ledger | authoritative receipt, currency, org, dedupe, actual settlement |
| case_study_consent_granted | Chat08 legal/customer owner | specific publish/quote/logo permission and redaction review |

Every event must include canonical org, evidence reference, event ID, UTC time, first-party authoritative owner and classification. Explicitly exclude founder, synthetic, test, research-only, unknown, vendor case studies and competitor complaint samples. Count distinct organizations for activations, paid/signed pilot organizations and comparable second cycles. Count completed distinct confirmed interview sessions separately. MRR is **unavailable**, not zero or a pilot quote, without a reconciled recurring billing period and genuine paid entitlement. Even verified one-off cash is not necessarily recognized revenue.

An isolated read-only implementation is in lib/commercial-proof-economics.mjs and executable fixtures in tests/08-commercial-proof-economics.test.mjs. It consumes *normalized* facts only; it does not ingest live events or grant entitlements. Proposed additional fields if missing: external classification approval, pilotScopeRef, merchant settlement and currency, service-period boundary, support labor minutes/rate, evidence refs and consent. FM-00 owns schema/RLS and final shared interface. Chat01/04/03/06 must confirm authoritative event exports and security/quotas before connection.

## Four-week 1/5/20 stress test — SCENARIOS, NOT RESULTS

Assumptions for alternative $299 single-client pilot: full collection, $299/client, 5% + $0.50 fee, 1% refund reserve, $12 direct provider cost/client, 2h setup + 3h review + 1h support/client, $25/hour founder loaded cost, 2h selling + $20 acquisition cash per new account, fixed $100/four weeks. Fifty proposed calls/client under **hypothetical** pilot 60-call bound, not actual runtime permission. All 1/5/20 clients assumed newly acquired, no paid churn in this specific one-period illustration. Free-provider calls are disabled in this scenario. Acquired client hours include acquisition and service.

| Clients | Contract value | Delivery contribution before CAC/fixed | Margin | Founder hours including selling | After CAC and fixed |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | $299 | $118.56 | 39.7% | 8 | -$51.44 |
| 5 | $1,495 | $592.80 | 39.7% | 40 | $142.80 |
| 20 | $5,980 | $2,371.20 | 39.7% | 160 | $871.20 |

Formulas: collection = contracted × collection fraction; fees = collection × processing percent + paid receipts × flat fee; direct cost = direct provider + founder setup/review/support labor + refund reserve + processing; CAC = selling-hour labor + attributable acquisition cash; after-cost contribution subtracts CAC and fixed infrastructure. Non-collection, paid retries, currency/tax, refunds, free-tier load, support overrun and customer churn remain stress inputs rather than ignored assumptions. At 20 customers, 160 founder hours in four weeks before any incident is an operational capacity flag. CV-13 target is recurring <=4h/client/period, separately recording setup and acquisition.

The Stage-0 $3,000/$6,000 assisted pilot hypotheses cannot inherit $299 delivery-hour assumptions: scope is wider. Do not present mathematically attractive gross profits from identical hours as achievable earnings. The pilot itself is not automatic MRR; forecast rows are not receipts.

## Operational templates and 14/30/60/90 gates

Reuse docs/FOUNDER-CUSTOMER-PROOF-PLAYBOOK.md, docs/company-evidence/RESEARCH-OPERATIONS.md and the canonical company scorecard. Source 25 dated 2026 account triggers and permitted contact paths; require ICP>=65 + trigger + actual lawful route; old 100 candidates and seven labeled targets are **not** qualified fresh prospects. Complete 8 real qualified interviews, 5 with urgent current job/spend (CV-09) with issue #283's stronger 20–30 interviews / 10 economic buyers as Stage-0 targets. Ask for last concrete incident, tools, person-hours, budget owner, actual spend, authority, urgency, objections and next action, not survey praise.

15-minute demo: 2m one approved buyer question; 3m preserved actual observation, provider/method and source-type limitations; 3m human Recommendation Record review; 3m customer-owned approved Change Specification; 2m eligibility of a later exactly comparable reviewed cycle; 2m scoped pilot success/next step. Demo or mock cannot count as a sale or customer value.

Scoped pilot: one org/client, five approved questions, explicitly permitted observation method, named model, max three competitor profiles, baseline and later comparison when eligible, at most three reviewed findings, one Change Specification, human owner, two reviews, written result including unavailability. Price/term/quota/charge/refund/cancel/support/legal responsibilities to be *approved*; no ranking, revenue or consumer-app coverage promises.

All six message drafts to be used only as approved, human-personalized drafts, never sent by this packet:
1. Research: "I saw {{dated-public-trigger}}. How did your team handle the last buyer AI-recommendation question? Could we discuss the real process for 20 minutes?"
2. Agency: "You work with {{verified-client-segment}}. How do you document AI recommendation evidence before proposing a change to a client?"
3. Role-routing: "Who owns source-reviewed AI recommendation questions at {{company}}, or is this not a priority?"
4. Follow-up: "I'm asking about the specific {{buyer-question}} review process, not a visibility-score promise. If timing is wrong, I'll close out."
5. Demo: "I can show one Recommendation Record, its source caveats and a human-approved Change Specification in 15 minutes."
6. Offer decision: "You identified {{verbatim-success-criterion}}; would a written capped pilot scope be appropriate, or should we record no fit?"

Log onboarding, research, selling, evidence review, support, comparisons, incidents and retention as dated founder minutes/cost by account and evidence case; never claim a support SLA not approved. Escalate security/privacy to Chat02, payments to Chat03, evidence/comparability to Chat01/04, jobs to Chat06. Weekly decision: one bottleneck, one owner, one next-week action. End every pilot as continue/renew/expand/refer/cancel/lost reason, never a default renewal.

- Day 14 target: 25 evidence-qualified accounts, 8 verified interviews, one truthful demo packet and pricing/ICP disposition.
- Day 30 target: five genuinely made (approval-gated) written offers, 3–5 external activated partners, separately evidenced signed and cash outcomes.
- Day 60 target: two reviewed comparable second cycles at distinct external organizations, actual hours/provider receipts and next-cycle evidence.
- Day 90 target: >=1 verified paid/signed pilot plus measured continuation/cancellation, privacy/commercial approvals, evidenced capacity and founder scorecard.

**Investor evidence checklist:** dated target-source ledger; real interviews; price/acceptance/settlement receipts; exact human-reviewed Recommendation Record and Change Specification; distinct comparable remeasurements; verified period-aligned billing and cash payout; actual source-supported CAC/support/hosting and bank runway; legal company/IP/consent/license documentation; scoped permission for any case-study quotes/logo. Never manufacture TAM, ARR, profits, traction, testimonials or causal uplift.

CV-15: obtain appropriate founder/IP/tax/merchant/settlement, software vs assisted-service offer, deletion/retention, privacy/subprocessor, refund/cancellation and qualified legal reviews before paid activation. FM-00 retains the final company/readiness verdict.