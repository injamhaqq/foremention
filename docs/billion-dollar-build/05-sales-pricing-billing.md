# 05 — Sales, Pricing, Business Model, and Billing

Status: implementation truth for `build/billion-dollar-05-commercial-engine`

## 1. Recovered commercial state

Base recovered before this build: `main` at `df92e0eb78edda5c8c621bb1388c5b519b8da1e8`.

Already correct and preserved:

- Core, Signal, and Intelligence are the package names.
- The public pricing page is value/coverage-led and does not invent dollar pricing.
- Core is the bounded one-brand/monthly package; Signal increases question/brand coverage and weekly comparable measurement; Intelligence remains custom-scoped for multi-brand/multi-market, governance, integrations, API/webhook scope, and enterprise controls.
- Founder-led design-partner intake already exists and is stored through trusted server/service-role processing.
- Self-serve paid billing is optional and configuration-gated.
- Stripe Checkout Sessions are created server-side for subscriptions.
- Stripe Customer Portal is the self-service billing-management surface when configured.
- Browser redirects never grant entitlement.
- Stripe webhooks are signature-verified, replay-bounded, idempotency-claimed, and persisted through an atomic database RPC.
- Billing and entitlement state are organization scoped; the browser cannot write billing state.

This build extends those foundations rather than replacing them.

## 2. Commercial truth model

Commercial claims must always be classified as one of:

| State | Meaning | Allowed use |
| --- | --- | --- |
| `current_fact` | Observed, sourced commercial fact | Can inform operating decisions; source and observation time are mandatory |
| `experiment` | Deliberate test in progress or completed | Can inform learning; must not be presented as validated truth before evidence exists |
| `hypothesis` | Belief worth testing | Planning only |
| `future_target` | Desired future condition | Goal-setting only; never reported as achieved |

`pricing_research_records` enforces that a `current_fact` has both an evidence source and observation time. No seed migration inserts willingness-to-pay, ACV, conversion, or gross-margin results.

### Pricing research dimensions

The durable research dimensions are:

- willingness to pay;
- value metric;
- package boundary;
- approved buyer-question limit;
- brand/workspace limit;
- measurement frequency;
- users/collaboration;
- integrations;
- API;
- enterprise controls;
- minimum ACV;
- annual contracts;
- overages;
- gross margin.

The package itself is not the value metric. Foremention should validate which combination of monitored buyer-question coverage, measurement frequency, brands/markets, workflow depth, governance, and integration surface best predicts willingness to pay and delivered value.

### Research protocol

For every pricing interview, proposal, negotiation, expansion, downgrade request, or loss:

1. Record what the buyer was trying to accomplish and the trigger that made the problem urgent.
2. Record the package/scope discussed, but do not rewrite it as accepted willingness to pay unless a real commercial action supports that conclusion.
3. Separate stated preference from behavior. A signed order, paid invoice, rejected proposal, procurement counter, or actual upgrade/downgrade is stronger evidence than a hypothetical survey answer.
4. Record constraints around buyer questions, brands, frequency, users, integrations, API/governance, and term length separately.
5. Classify the record as fact, experiment, hypothesis, or target.
6. Attach the source and observed time for facts.
7. Revisit package boundaries only after a pattern exists across real accounts; do not optimize around one anecdote.

## 3. Sales pipeline

The canonical stages are:

`prospect -> discovery -> qualified -> demo -> proposal -> security_review -> procurement -> negotiation -> won/lost`

Closed opportunities do not silently reopen. A renewal or expansion is a new opportunity linked to the existing account so the original win remains historically intact.

### Core objects

`commercial_accounts` stores the prospect/customer account, source, lifecycle, owner, market and optional qualification bands.

`commercial_contacts` stores people at an account and distinguishes champion, economic buyer, technical evaluator, security, procurement, legal, and other buying roles.

`commercial_opportunities` stores source, trigger, stage, qualification, package under discussion, commercial milestones, contract term, proposed/closed ACV, loss reason, renewal date, champion, and economic buyer.

`commercial_stage_events` is immutable stage history.

`commercial_activities` records discovery, qualification, demo, proposal, follow-up, security/procurement/negotiation, renewal/expansion review, and win/loss review.

These tables are founder/internal commercial data. They have RLS enabled but intentionally expose no authenticated browser policies. Until a dedicated internal admin surface is explicitly built, they are service-role-only.

## 4. Founder-led sales operating system

### Discovery

The discovery call should establish:

- what AI-mediated buying question or recommendation problem matters now;
- the decision or workflow affected by that problem;
- current measurement method and why it is insufficient;
- category, brand, markets, and buyer-question scope;
- who owns organic/SEO/GEO/product-marketing/revenue impact;
- how the team decides whether evidence is trustworthy enough to act on;
- how often change needs to be measured;
- what happens today when evidence changes;
- economic impact of delayed, wrong, or unauditable decisions;
- procurement, security, integration, SSO/API, and timing constraints;
- champion and economic buyer.

Do not lead discovery with a feature tour.

### Qualification

An opportunity is qualified when there is credible evidence of all of the following:

- a meaningful recommendation-intelligence problem;
- a named workflow or decision that can improve;
- a person who will champion evaluation;
- a plausible economic buyer or budget path;
- a measurement scope Foremention can truthfully support;
- a timeline or trigger;
- no known evidence/comparability requirement the product cannot satisfy.

Use qualification JSON for structured notes rather than pretending one universal score is truth.

### Demo

The demo should follow the product truth chain:

`Buyer Question -> Observation -> Returned Reference -> Retrieved Evidence -> Review -> Comparison -> Decision -> Action -> Later Measurement`

Show the Recommendation Record as the canonical evidence object. Demonstrate uncertainty and limitations instead of hiding them. Tailor the demo to the prospect's buyer questions whenever legitimate data is available; never fabricate customer proof.

### Business case / ROI

Use a buyer-specific value model, not generic percentage claims. Candidate inputs include:

- analyst/operator hours currently spent collecting and reconciling evidence;
- number of buyer questions/markets/brands requiring repeat measurement;
- cost of duplicated tools or manual agency work;
- value of shortening time from observed change to reviewed decision;
- value of reducing decisions made from incomparable or weak evidence;
- revenue or pipeline exposure only when the buyer can provide a defensible relationship.

Record the inputs and assumptions. Label modeled value as modeled value, not observed outcome.

### Objection library

**“We already have SEO/GEO tools.”** Compare workflows: Foremention is about inspectable recommendation evidence and decision follow-through, not replacing every SEO or rank-tracking workflow.

**“AI answers change too much.”** Agree with the premise; explain exact-comparison controls, dated records, provider/model context, and why Foremention distinguishes comparable change from noise.

**“We can do this manually.”** Quantify manual coverage, repeatability, evidence review, coordination, and audit cost before making an automation argument.

**“Why should we trust the output?”** Show returned references, retrieval state, evidence review, limitations, and human-review boundaries.

**“Can you guarantee revenue impact?”** No. Foremention can record decisions/actions and later measurement; causal revenue claims require customer evidence.

**“We need security/procurement first.”** Move the opportunity into the explicit security/procurement stage and provide only controls actually implemented or verified.

### Competitive battlecard rule

A battlecard must distinguish:

- verified competitor capability;
- customer-reported perception;
- Foremention capability proven in the product;
- unverified assumption.

Never invent a competitor weakness or market-leader claim.

### Proposal structure

1. business problem and trigger;
2. agreed measurement scope;
3. package and explicit limits;
4. implementation/onboarding plan;
5. evidence/review workflow;
6. commercial term and payment schedule;
7. security/procurement dependencies;
8. success criteria and measurement dates;
9. exclusions and assumptions;
10. renewal/expansion review date.

### Follow-up sequence

Use human, opportunity-specific follow-up. Each follow-up should add one useful element: a clarified scope, requested security answer, business-case input, evidence example, procurement item, or decision deadline. Do not create generic spam sequences.

### Win/loss review

For every closed opportunity record:

- original trigger;
- champion strength;
- economic buyer access;
- package/scope discussed;
- proposal and procurement path;
- key objections;
- actual win/loss reason;
- pricing evidence created by the decision;
- product gap vs commercial/process gap;
- what should change, if anything.

A loss reason is evidence about that deal, not automatically a category-wide truth.

## 5. Commercial analytics

`commercial_metric_periods` stores observed period inputs and whether the period is draft or verified. `lib/commercial.ts` computes derived metrics without manufacturing missing denominators.

Tracked outputs when the required real data exists:

- leads;
- qualified opportunities;
- demos;
- design partners;
- qualified-to-won conversion;
- ACV from won contracts;
- sales cycle from real close durations;
- win rate from won + lost decisions;
- CAC from observed sales/marketing spend divided by new customers;
- payback from CAC and observed annual gross profit from new customers;
- expansion MRR;
- churned MRR;
- gross margin;
- GRR;
- NRR.

If a denominator or financial input is missing, the library returns `null`. Zero is not used as a substitute for unknown.

Definitions:

- `win rate = won / (won + lost)`;
- `qualified-to-won conversion = won / qualified opportunities`;
- `ACV = average closed ACV of won contracts`;
- `CAC = sales + marketing spend / new customers won`;
- `gross margin = (revenue - service COGS) / revenue`;
- `GRR = (starting MRR - contraction - churn) / starting MRR`;
- `NRR = (starting MRR + expansion - contraction - churn) / starting MRR`;
- new MRR is deliberately excluded from NRR.

## 6. Billing architecture

### Invariants

1. Checkout is created only on the server after authenticated workspace-owner and trusted-origin checks.
2. The server chooses the Stripe Price ID. The browser never supplies an amount or arbitrary Price ID.
3. Core/Signal self-serve offers exist only for configured Price IDs.
4. Intelligence/custom enterprise scope remains founder-led unless a future approved provisioning path exists.
5. A success redirect never grants access.
6. Only a verified billing webhook can change paid lifecycle/entitlement state.
7. Webhook events are idempotency-claimed and billing account + entitlement + immutable history + receipt completion commit atomically.
8. Unsupported or malformed provider events fail closed or are ignored without granting access.
9. Checkout completion grants only when Stripe reports `paid`, or `no_payment_required` with a subscription for a legitimate trial. `unpaid` completion never grants.
10. Demo workspaces cannot start billing.

### Monthly and annual contracts

Monthly and annual self-serve terms use independent configured Stripe recurring Price IDs. No annual offer is shown simply because monthly billing exists.

Supported environment names:

- `STRIPE_CORE_MONTHLY_PRICE_ID` (legacy fallback: `STRIPE_CORE_PRICE_ID`);
- `STRIPE_SIGNAL_MONTHLY_PRICE_ID` (legacy fallback: `STRIPE_SIGNAL_PRICE_ID`);
- `STRIPE_CORE_ANNUAL_PRICE_ID`;
- `STRIPE_SIGNAL_ANNUAL_PRICE_ID`.

No amount is embedded in application code. The provider Price is the commercial source of truth after finance/legal approval.

### Failed payment and grace

`BILLING_GRACE_PERIOD_DAYS` is optional, integer `0..30`, and defaults to `0`.

- `0`: payment failure pauses paid entitlement immediately.
- `>0`: a verified `past_due` event may keep entitlement active only until the recorded grace expiry.
- recurring measurement explicitly checks entitlement expiry, so scheduled provider spend cannot continue after grace expiration.
- a later verified paid/active event clears expiry/grace.
- grace is an operational policy, not a promise to customers; customer-facing terms require legal/commercial approval.

### Customer Portal

When a verified Stripe customer exists, Customer Portal is used for payment methods, invoice access, and any upgrade/downgrade/cancellation controls actually enabled in Stripe. Application code does not imitate Stripe's renewal/dunning engine with manual PaymentIntent loops.

### Enterprise provisioning

Until real contracting/provisioning configuration exists, Intelligence/custom access remains founder-led. Enterprise SSO, API, governance, invoicing, tax terms, minimum commitments, overages, and negotiated annual/multi-year contracts must be explicitly scoped and recorded; none are inferred from a browser payment state.

## 7. Current fact / experiment / hypothesis / future target register

### Current facts from the repository

- Core / Signal / Intelligence packaging exists.
- Public pricing is not expressed as fabricated dollars.
- Founder-led design-partner intake exists.
- Stripe recurring Checkout, Customer Portal, verified webhooks, organization entitlement mapping, and fail-closed configuration gates exist.
- Core and Signal are the only self-serve package keys; Intelligence is custom-scoped.

### Experiments

- design-partner commercial terms with real teams;
- package boundary validation;
- monthly vs annual offer acceptance once real Prices and terms are approved;
- willingness-to-pay interviews/proposals.

No result is recorded here until observed.

### Hypotheses to validate

- buyer-question coverage and measurement frequency are primary value/usage metrics;
- multi-brand/workspace and collaboration depth can separate Core from Signal;
- API/integrations/governance can support enterprise willingness to pay;
- annual terms can improve cash efficiency/retention without requiring commodity pricing;
- overages may be useful only if they are predictable, value-aligned, and gross-margin safe.

### Future targets

Minimum ACV, target ACV, gross-margin target, annual mix, sales-cycle target, CAC/payback target, GRR/NRR target, and expansion targets remain unset until the founder explicitly approves them. Do not backfill targets as historical facts.

## 8. Pricing-page truth rules

The existing value-first pricing page remains the correct public direction. It must continue to communicate:

- intended audience and use case;
- buyer-question/brand/frequency limits;
- differentiated evidence/review/comparison capability;
- founder-led Intelligence/enterprise path;
- truthful commercial availability.

Do not publish a low-cost commodity number to fill visual whitespace. Publish a price only after the amount, currency, billing interval, taxes/refunds/cancellation terms, legal entity, and corresponding provider Price have been approved.

## 9. Security and QA gates

Before merging/releasing this commercial engine:

- run the complete repository test suite;
- run billing checkout/portal, webhook signature/replay, webhook idempotency, billing atomicity, commercial-engine, and billing-hardening tests;
- run typecheck;
- run lint;
- run production build;
- confirm commercial tables expose no browser/authenticated policies;
- confirm billing-history mutation is blocked;
- confirm browser payloads cannot provide organization ID, customer ID, amount, or arbitrary Stripe Price ID;
- confirm an unpaid Checkout completion grants nothing;
- confirm default grace is zero;
- confirm expired grace stops recurring measurement;
- confirm annual buttons appear only for actual configured annual Price IDs;
- confirm the pricing page still contains no invented public dollar price;
- confirm exact branch/PR head SHA after all fixes;
- require CI/security checks on that exact head before merge.

## 10. What this build intentionally does not claim

This build does **not** claim validated willingness to pay, a validated value metric, a minimum ACV, a target ACV, a validated annual discount, an overage rate, CAC, payback, gross margin, win rate, GRR, NRR, churn, expansion, or a pricing winner. The system now has places to record and calculate those facts when real commercial evidence exists.
