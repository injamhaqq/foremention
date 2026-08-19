# Foremention CEO / Company Command Center

Status: operating contract for the private-beta customer-proof phase. This document defines decision-grade metrics; it does not manufacture data. When denominators are too small or a source is absent, report **insufficient data** rather than a percentage or estimate.

## Strategic operating thesis

Foremention should become the evidence system for AI recommendation change: diagnose why a competitor wins an important buyer question, preserve the exact answer/source evidence, register the intervention, and prove whether the same controlled question changes across repeated comparable measurements.

Working positioning: **Know why AI recommends competitors — and prove whether your fix changed the answer.**

Initial beachhead: English-language B2B SaaS companies with 50–500 employees, at least three direct competitors, high-intent comparison / “best X for Y” buyer questions, and an in-house SEO, content, organic-growth, or demand-generation team able to act on evidence.

## System-of-record boundaries

- **PostHog → product behavior.** Production-only, privacy-minimized behavioral events and funnels using internal UUID identity. Never store commercial PII, prompts, answers, citations, URLs, arbitrary error text, or customer content there.
- **Supabase → commercial, customer, product, outcome, and cost records** when Foremention is the first-party source. Commercial contacts remain service-only protected PII. Product organizations do not enter company KPIs until explicitly classified as KPI-eligible.
- **Billing provider → collected revenue, subscription state, refunds, and invoices** once a billing system exists. A manually verified payment may be recorded first-party, but must be labeled as such.
- **CRM → externally managed pipeline** if/when Foremention adopts one. Until then, the protected commercial tables are the pipeline source of truth.
- **Outcome Ledger → baseline, approved action, application, controlled remeasurement, outcome, and limitations.**
- **Runs / run attempts / AI cost events → reliability and provider economics.**

## North Star

**Weekly retained organizations reaching a verified decision insight.**

A qualifying organization must be explicitly marked `included_in_company_kpis = true` and classified `design_partner` or `customer`. It counts for the current ISO week only when:

1. a human-reviewed evidence path produced a new actionable product opportunity / decision insight during the week; and
2. the same organization had at least one qualifying verified-value week before the current week.

Exclude internal, synthetic, benchmark, demo, unknown, failed, partial, unreviewed, duplicate, and non-comparable activity.

The North Star rate denominator is KPI-eligible organizations with at least one earlier verified-value week and a reasonable opportunity to return. Until the denominator is large enough to be informative, display the raw count and `N/A` for the rate.

## Dashboard hierarchy

### Dashboard 1 — CEO / Company Command Center

Near-one-screen top row:

| Metric | Owner | Source of truth | Definition / action |
|---|---|---|---|
| Paying organizations | CEO | Billing / verified commercial opportunity | Distinct organizations with verified collected value. If zero, sales proof is the priority. |
| MRR / ARR | CEO + Finance | Billing; first-party only if manually verified | Contracted recurring revenue, never pipeline. If no billing exists, show zero/N/A. |
| Active pilots | CEO | Commercial opportunities | `pilot_active`. Every pilot must have baseline, success criteria, owner, and next action. |
| Qualified pipeline | CEO | Commercial accounts/opportunities | Qualified opportunities with real expected value. Inspect stage aging weekly. |
| Activated organizations | Product | First-party product DB | KPI-eligible orgs with first human-reviewed actionable decision insight. |
| Weekly retained value organizations | Product | First-party product DB | North Star count above. |
| Verified improvement organizations | Product + Customer Success | Outcome Ledger | Orgs with a completed comparable remeasurement and recorded outcome; change ≠ causation. |
| Gross margin | Finance | Billing + complete cost ledger | Report only after revenue and complete direct costs exist; otherwise N/A. |

Supporting company metrics: target accounts, qualified accounts, contacted accounts, replies, conversations, demos, pilot proposals, design partners, new customers, churned/expanded customers, new/expansion/churned ARR, ACV, pipeline value, weighted pipeline, win rate, sales-cycle length, lead source/channel, CAC, CAC payback, LTV when statistically meaningful, and customer concentration.

### Dashboard 2 — Product / Activation / Retention

Exact activation path:

`ACCOUNT CREATED → CONTEXT READY → FIRST ACTIVE BUYER QUESTION → FIRST WORKFLOW STARTED → WORKFLOW COMPLETE → SOURCE X-RAY OPENED/REVIEWED → VERIFIED DECISION INSIGHT → SECOND WORKFLOW`

Core metrics: stage counts, first-value count, median TTFV, p75 TTFV only with adequate sample, first-to-second-workflow conversion, 7-day/30-day retention once cohorts are large enough, and inactivity/at-risk counts.

Primary source: durable product DB for company KPIs; PostHog for product behavior, drop-off diagnosis, and privacy-safe funnel interaction.

### Dashboard 3 — Customer Outcomes / Moat

Track only evidence-linked longitudinal records:

`QUESTION × ORGANIZATION × COMPETITOR × PROVIDER × MODEL × METHODOLOGY × ANSWER OBSERVATION × CITATION/SOURCE × TIME × SOURCE GAP × ACTION × REMEASUREMENT × OUTCOME`

Report baseline presence, follow-up presence, citation/source gains or losses, competitor changes, resolved source gaps, action dates, repeated measurement count, comparability status, outcome direction, stability, and limitations.

### Dashboard 4 — Reliability / Cost / Engineering

Track completion/failure rate, provider failure rate, queue failure rate, retry rate, latency buckets, AI cost per workflow, AI cost per completed workflow, provider cost mix, cost per organization, and infrastructure cost. Gross margin appears only when verified revenue and the direct-cost denominator are complete.

## Metric truth contract

Every company metric must have: owner, definition, source, numerator, denominator, inclusion criteria, exclusion criteria, update frequency, and an action triggered by movement. If nobody changes behavior because a metric moved, remove or demote it.

### Funnel scorecard definitions

1. **Qualified Account → Demo** — accounts meeting the ICP rubric that hold a completed demo / qualified accounts with a reasonable sales opportunity.
2. **Demo → Pilot** — opportunities entering `pilot_active` / completed demos.
3. **Pilot → Activation** — KPI-eligible pilot organizations reaching first verified decision insight / active pilots old enough to activate.
4. **Activation → First Verified Insight** — synonymous during the current phase: activation requires the first verified decision insight.
5. **First Insight → Second Workflow** — activated organizations completing another controlled workflow after first value / activated organizations old enough to return.
6. **Weekly Retained Organization Rate** — North Star count / eligible previously valuable organizations.
7. **Pilot → Paid** — pilots with verified payment / completed or decision-ready pilots presented with commercial terms.
8. **Paid → Retained** — paying organizations returning to verified value in a later period / paying organizations eligible to return.
9. **Paid → Expansion** — paying organizations with verified expansion / paying organizations eligible for expansion.
10. **Customer Outcome Improvement Rate** — KPI-eligible organizations with a comparable recorded positive outcome / KPI-eligible organizations with completed comparable remeasurement. Show raw counts until sample size is meaningful.

## Time to first value

TTFV starts at first durable organization/account creation and stops at the first human-reviewed actionable decision insight. Do not stop the timer at signup, login, page view, workflow queueing, or unreviewed AI output.

Median TTFV is the default. p75 is withheld until the cohort is large enough to avoid false precision. The protected aggregate view returns `NULL` for median TTFV until five KPI-eligible activated organizations exist.

## Retention

A weekly retained organization is not “someone logged in.” It is a KPI-eligible external organization that reaches verified decision value in the current week after having reached verified decision value in an earlier week. Separate current-week value organizations from genuinely retained organizations.

Monthly retention should use the same value milestone at monthly grain once cohorts support it.

## Outcome / causality language

Use four distinct evidence labels:

- **Observed change** — a comparable baseline and follow-up differ. No claim about why.
- **Correlated change** — the recorded action preceded a comparable change and the timing/context are relevant, but uncontrolled alternatives remain.
- **Plausibly influenced change** — repeated comparable measurements show a stable directional change after an intervention that directly addressed the documented gap; still not causal proof.
- **Causally established change** — only when a controlled experiment or defensible quasi-experimental design isolates the intervention sufficiently to support causality.

Default customer reporting should stop at the strongest level actually supported by evidence.

## Small-sample policy

- Counts are always preferred at very small `n`.
- Conversion percentages are withheld or accompanied by numerator/denominator.
- CAC, payback, LTV, gross margin, retention curves, and outcome-improvement rates are `N/A` until their inputs are complete and statistically meaningful.
- Internal/synthetic/benchmark organizations are never relabeled as customers.
- Missing CRM/billing data is missing, not zeroed into a favorable ratio.

## Operating cadence

- Daily: new qualified accounts, next actions due, replies, demos/pilots scheduled, pilot activation blockers.
- Weekly CEO review: pipeline, activation, North Star, pilot outcomes, costs, reliability, lost reasons, next 10 target accounts.
- Monthly: cohort retention only when sample permits, win/loss synthesis, pricing evidence, customer-outcome evidence, gross-margin readiness, and ICP refinement.

The command center is an operating instrument, not investor theater. Real zero > fake growth.
