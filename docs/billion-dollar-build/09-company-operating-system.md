# Foremention Company Operating System

**Status:** Canonical company-operating strategy for Foremention.  
**Scope:** Strategy, company metrics, operating cadence, finance-model architecture, hiring gates, international readiness, and documentation authority.  
**Recovered base:** `main` at `df92e0eb78edda5c8c621bb1388c5b519b8da1e8` on 2026-08-30.  
**Product constitution remains authoritative:** `CLAUDE.md`.  
**Metric-definition companion:** `docs/CEO-COMPANY-COMMAND-CENTER.md`.  
**Customer-proof companion:** `docs/FOUNDER-CUSTOMER-PROOF-PLAYBOOK.md`.

This document is an operating system, not investor theater. It does not manufacture traction, revenue, willingness to pay, customer outcomes, market leadership, certifications, or financial performance. When evidence is missing, the correct state is **unknown**, **not yet measured**, or **N/A**.

---

## 0. Truth vocabulary and precedence

Every strategy, finance, hiring, or international-readiness statement must be understood through one of five labels:

- **CURRENT FACT** — verified in the repository, product, billing/CRM records, or another named source of truth.
- **OPERATING POLICY** — a company rule adopted to guide decisions. It is not a claim that an outcome has already happened.
- **ASSUMPTION / HYPOTHESIS** — an input to test. Never present it as customer evidence or an actual.
- **TARGET** — a desired future state. Never backfill it into historical reporting.
- **FUTURE-GATED** — structurally anticipated but intentionally disabled/deferred until a named trigger is met.

### Canonical authority order

When documents disagree, use this order:

1. `CLAUDE.md` for locked product, brand, evidence, security, and release constitution.
2. This document for company strategy, company metric hierarchy, finance modeling, hiring architecture, international-readiness policy, and documentation governance.
3. `docs/CEO-COMPANY-COMMAND-CENTER.md` for metric definitions and system-of-record boundaries.
4. `docs/FOUNDER-CUSTOMER-PROOF-PLAYBOOK.md` for founder-led sales/discovery experiments and pilot execution.
5. Product/package implementation and current public copy for what the live product actually exposes.
6. Dated plans, specs, war-room notes, and historical strategy documents as context only unless explicitly promoted to canonical status.

A newer document does **not** silently become authoritative just because it is newer. A decision changes only through the decision-log process defined below or an explicit update to a higher-authority document.

### Current reconciliation notes

- **CURRENT FACT:** Category is **Recommendation Intelligence**.
- **CURRENT FACT:** Signed-in product architecture is locked to **Attention → Questions → Records → Comparisons → Settings**; Recommendation Record is canonical and evidence inspection remains contained inside it.
- **CURRENT FACT:** Current product packaging is **Core / Signal / Intelligence**. Public dollar pricing is not established in the repository; founder-led design-partner terms remain under validation and billing fails closed when Stripe/package configuration is absent.
- **CURRENT FACT:** The founder customer-proof playbook contains **USD 3,000** and **USD 6,000** 30-day pilot hypotheses. Those are experiments, not validated willingness-to-pay results, not current public list prices, and not revenue actuals.
- **CURRENT FACT:** The existing North Star is **weekly retained organizations reaching a verified decision insight**.
- **CURRENT FACT:** Recurring measurement already stores/validates `timezone`, `locale`, and `market`; current defaults are `UTC`, `en-US`, and `global` where applicable.
- **CURRENT FACT:** No canonical company currency model is established by the product documentation reviewed for this operating system.
- **CURRENT FACT:** A separate PMF/activation/customer-proof branch may evolve product telemetry. This document must consume merged canonical definitions rather than create competing analytics semantics.

---

# A. Strategy system

## 1. Mission

**OPERATING POLICY — Mission**

> Give B2B software teams a defensible way to understand and improve how AI systems recommend them by turning buyer-question observations into reviewed evidence, decisions, actions, and comparable later measurements.

This mission deliberately avoids promising ranking gains, traffic, leads, revenue, or causation.

## 2. Long-term vision

**TARGET — Long-term vision**

Foremention becomes the trusted operating and evidence layer for AI-mediated buying: the system in which a B2B software company can see which buyer questions matter, how providers/models answer them, what evidence was returned, why a competitor may be winning, what the team decided to change, and what happened under later comparable measurement.

The long-term outcome is not “another AI visibility dashboard.” It is a durable recommendation-intelligence system of record that can support executive decisions, operating workflows, benchmarking, and eventually ecosystem/API use without weakening evidence integrity.

## 3. Category

**CURRENT FACT — Category:** **Recommendation Intelligence**.

Working category definition:

> Recommendation Intelligence is the discipline of observing how AI-mediated buyers are answered, preserving the recommendation and source evidence, converting that evidence into governed decisions/actions, and measuring later change only when the comparison remains defensible.

Foremention is intentionally different from:

- **SEO:** broader search-engine discovery and website optimization.
- **GEO/AEO:** techniques intended to improve appearance in generative/answer-engine outputs.
- **Rank tracking:** position monitoring without Foremention’s evidence/action/remeasurement contract.
- **Generic AI visibility:** aggregate mention/share dashboards that may stop before a reviewed decision and comparable later measurement.

## 4. Initial ICP

**CURRENT FACT — Current beachhead ICP**

English-language B2B SaaS companies with roughly **50–500 employees** that:

- operate in a category with at least three credible direct competitors;
- have high-intent comparison/evaluation buyer questions;
- have a team capable of acting on source/content/product-market evidence;
- have a clear internal owner in SEO, content, organic growth, growth marketing, demand generation, GEO/AEO, or an adjacent function;
- have an economic buyer such as VP Marketing, CMO, VP Growth, or another senior marketing/growth leader with budget authority;
- can repeat controlled buyer-question measurements over time.

Do not add an ARR band, geography promise, industry claim, or budget threshold to the canonical ICP until customer evidence supports it.

## 5. Wedge

**OPERATING POLICY — Wedge**

Win a narrow, high-stakes workflow before expanding coverage:

`critical buyer question → observed recommendation → returned references/evidence → human review → competitor/source gap → owned action → comparable later measurement → observed outcome/limitation`

The founder proof motion should generally begin with a small set of commercially important questions rather than maximum account coverage. The existing proof playbook uses five critical buyer questions as a controlled pilot starting point. Package entitlements may allow more questions; the wedge is about proof density, not entitlement size.

### Wedge success test

A customer should be able to answer:

1. What changed?
2. Why is the evidence trustworthy enough to discuss?
3. What did we decide?
4. What did we do?
5. What happened afterward under a comparable measurement?

If Foremention cannot help a customer complete this loop repeatedly, more dashboards, providers, pages, integrations, or markets do not fix the core problem.

## 6. Strategic moat

The moat must be treated as a sequence of assets with different maturity, not one vague claim.

| Moat layer | Current status | Why it matters | Rule |
| --- | --- | --- | --- |
| Evidence integrity and review contract | **CURRENT FACT / emerging asset** | Separates observation, returned reference, retrieval, evidence, human review, limitations, comparability, outcome, and causation | Never weaken for prettier metrics |
| Longitudinal comparable measurements | **CURRENT FACT / emerging asset** | Creates trustworthy change history rather than disconnected screenshots | Withhold invalid comparisons |
| Buyer-question / competitor / provider context | **CURRENT FACT / emerging asset** | Creates structured recommendation intelligence around real buying questions | Preserve identity and measurement context |
| Decision/action/outcome history | **CURRENT FACT / emerging asset** | Links intelligence to company behavior and later measurement | Human decision remains explicit |
| Proprietary cross-customer benchmark layer | **FUTURE-GATED** | Could create category/market intelligence at scale | Requires privacy, statistical, contractual, and minimum-sample safeguards |
| Recommendation graph / evidence graph / benchmark intelligence | **FUTURE-GATED / adjacent build track** | Can compound learning across questions, providers, evidence, and time | Do not claim a moat before enough proprietary observations exist |
| Workflow/integration ecosystem | **FUTURE-GATED** | Can make Foremention embedded in operating systems and increase switching cost | Build only after core value/retention is proven |

### Moat principle

**Data volume is not the moat by itself.** The valuable asset is trusted, structured, comparable, decision-linked observation history that is difficult to reproduce without the product workflow and customer participation.

## 7. Annual priorities

These are **TARGET priorities for the next operating year**, not achievements.

### Priority 1 — Prove customer value and willingness to pay

- Convert qualified customer pain into real design partners/pilots/customers.
- Record actual accepted/paid amounts separately from pricing hypotheses.
- Reach repeatable evidence that customers will return for another comparable cycle.
- Learn which buyer questions, evidence types, outputs, and actions are decision-relevant.

### Priority 2 — Make retained comparable value the product center

- Reduce time to first verified decision insight.
- Increase the share of activated organizations that complete a later comparable cycle.
- Increase meaningful Recommendation Record review and governed action completion.
- Preserve exact comparability and human-review boundaries even when doing so lowers vanity metrics.

### Priority 3 — Establish reliable unit economics

- Measure provider and infrastructure cost per workflow, question, Record, organization, and package where possible.
- Distinguish first-run cost, retry cost, background processing, storage, and support cost.
- Report gross margin only after both revenue and direct-cost inputs are complete.
- Do not scale acquisition into an economically unproven workload.

### Priority 4 — Become enterprise-buyable without pretending to be enterprise-complete

- Preserve tenant isolation, auditability, provider boundaries, billing safety, and evidence governance.
- Build SSO/API/webhooks/admin/data-governance capabilities only when genuinely configured and tested.
- Do not claim certifications, contractual guarantees, regional residency, or controls that are not real.

### Priority 5 — Build a company memory stronger than founder memory

- Run the operating cadence in this document.
- Keep decisions, metric definitions, finance assumptions, hiring gates, and internationalization choices versioned.
- Retire/annotate stale documents rather than letting multiple contradictory strategies accumulate.

## 8. Quarterly priority gates

These are sequential operating gates, not guaranteed calendar outcomes.

### Q1 — Customer proof

Primary question: **Do qualified teams complete the full evidence → decision → action loop and value it enough to pay or commit?**

Required evidence before advancing:

- real qualified customer conversations;
- real activated external organizations;
- at least one end-to-end reviewed evidence/action/remeasurement case when timing permits;
- pricing objections/acceptance captured as evidence;
- reliability/cost visibility good enough to understand the cost of serving a pilot.

### Q2 — Retention and economic proof

Primary question: **Do the right customers return for comparable value and can Foremention serve them with a defensible gross-margin path?**

Required evidence before advancing:

- repeated comparable cycles from external organizations;
- clear retained-value use cases;
- churn/inaction reasons recorded;
- revenue inputs verified where paid customers exist;
- direct provider/infrastructure costs complete enough for unit-economics review.

### Q3 — Repeatability and buyability

Primary question: **Can Foremention repeat the motion beyond founder heroics?**

Focus:

- repeatable onboarding and activation;
- repeatable commercial qualification/proposal process;
- customer-success operating model;
- enterprise blockers ranked by real deal impact;
- API/integration/governance priorities justified by customer evidence.

### Q4 — Selective scale

Primary question: **Which proven bottleneck should receive capital or headcount?**

Scale only channels, providers, markets, or roles with evidence that they improve retained value, revenue, reliability, or gross margin without weakening trust.

## 9. Decision principles

1. **Evidence before narrative.** Missing data stays missing.
2. **Customer value before feature count.** A feature must improve activation, retained value, outcomes, buyability, reliability, or economics.
3. **Comparable before convenient.** Invalid before/after comparisons are withheld.
4. **Human decision boundaries stay explicit.** Automation may assist; it must not fabricate approval or causality.
5. **One source of truth per fact.** Analytics systems may mirror or diagnose; they do not redefine the metric.
6. **Founder-led until repeatable.** Do not prematurely hire a team around an unproven motion.
7. **Gross-margin discipline before scale.** Growth that destroys contribution margin is not progress.
8. **Primary-market PMF before broad internationalization.** Architectural readiness is good; product sprawl is not.
9. **Security and trust are product constraints, not sales copy.** Fail closed when configuration is absent.
10. **Reversible decisions move faster than irreversible ones.** Record both.

## 10. Explicitly what Foremention will not do

Until a later decision explicitly changes these policies, Foremention will not:

- become a general SEO suite;
- become a generic social-listening or reputation-monitoring platform;
- optimize for raw mention counts as the core value proposition;
- promise AI rankings, recommendations, citations, traffic, leads, or revenue;
- create fake benchmarks, customer proof, ARR, testimonials, or case studies;
- accept non-comparable measurements merely to show a trend line;
- expose customer evidence or sensitive content through unsafe analytics;
- make Source X-Ray a sixth global product object;
- build every provider/integration/locale/region before primary-market PMF;
- hire ahead of a proven bottleneck simply to look like a larger company;
- convert pricing hypotheses into public/forecast actuals without verified evidence;
- treat pipeline as revenue;
- treat contracted revenue as cash collected;
- treat cash collected as recognized revenue without an accounting policy;
- claim enterprise/compliance/data-residency capabilities that are not configured and verified.

---

# B. North-Star system

## 11. Metric hierarchy

Keep the company scorecard small. Detailed diagnostics live underneath these metrics and are pulled only when a top-level metric needs explanation.

### Level 1 — North Star

**Weekly retained organizations reaching a verified decision insight**.

Use the exact eligibility and small-sample rules from `docs/CEO-COMPANY-COMMAND-CENTER.md`. A login, page view, generated answer, or unreviewed output is not retained value.

### Level 2 — Customer-value drivers

1. **Activated organizations** — KPI-eligible organizations reaching first verified decision insight.
2. **Comparable-cycle retention** — activated organizations that later complete a valid comparable measurement and reach verified value again.
3. **Recommendation Records reviewed** — reviewed Records tied to real external organizations; separate creation from human review.
4. **Actions created** — evidence-linked customer/company actions created from a reviewed decision.
5. **Actions completed** — evidence-linked actions actually completed.
6. **Value-realization organizations** — organizations that complete baseline → reviewed action → later measurement with an observed outcome, regardless of whether the outcome is positive, neutral, or negative.

Do not optimize “Records reviewed” or “actions created” in isolation. They are leading indicators only when they correlate with retained value.

### Level 3 — Business health

Report only when real:

- paying organizations;
- verified MRR / ARR;
- logo retention and revenue retention;
- expansion revenue;
- contraction/churn revenue;
- ACV;
- gross margin;
- customer concentration;
- sales-cycle and win/loss evidence.

**Retained revenue** is preferable to gross bookings as a company-quality signal once a meaningful paid cohort exists. **Expansion** matters only after baseline retention is understood.

### Level 4 — Guardrails

- workflow completion/failure rate;
- provider failure rate;
- retry rate and retry cost;
- queue/background failure rate;
- p50/p95 latency where meaningful;
- cost per completed workflow/question/Record/organization;
- evidence review/comparability failure reasons;
- security/privacy incidents;
- support burden / unresolved customer blockers.

A growth metric never overrules a guardrail that protects evidence integrity, tenant isolation, billing correctness, or security.

## 12. Metric contract

Every metric must define:

- owner;
- decision it informs;
- exact source of truth;
- numerator;
- denominator;
- inclusion criteria;
- exclusion criteria;
- event date / cohort date / measurement window;
- update frequency;
- small-sample behavior;
- action threshold or review question.

If two dashboards show different definitions, the canonical definition wins and the conflicting dashboard is fixed or relabeled.

---

# C. Operating cadence

## 13. Weekly company review — 45 minutes

**Owner:** CEO/COO.  
**Purpose:** Decide what the company does next, not narrate activity.

### Inputs

- North Star and activated/retained-value counts;
- paying organizations/revenue if real;
- active pilots/opportunities;
- customer blockers and outcome evidence;
- reliability/cost exceptions;
- cash/runway only from the finance source of truth;
- previous decisions and due actions.

### Agenda

1. **5 min — Truth check:** what changed in facts since last week?
2. **10 min — Customer value:** activation, retained comparable cycles, reviewed Records, actions, outcomes.
3. **10 min — Commercial:** pipeline stage movement, decisions due, lost reasons, paid/renewal/expansion evidence.
4. **8 min — Reliability/economics:** failures, provider cost, abnormal usage, direct-cost exceptions.
5. **7 min — Top constraint:** choose the single largest bottleneck.
6. **5 min — Decisions:** owner + due date + expected evidence.

### Output

- one company constraint;
- no more than three company-level actions;
- decision-log entries for material changes;
- explicitly deferred work.

## 14. Weekly product review — 45 minutes

**Owner:** Product/engineering lead.  
**Question:** What is preventing qualified customers from reaching or repeating verified value?

Review:

- activation stages and TTFV;
- where users fail before Record review;
- review/action completion;
- second/comparable cycle completion;
- feature requests grouped by qualified customer/problem, not raw count;
- evidence/comparability failures;
- top reliability friction inside the customer journey.

Output: one primary product hypothesis, evidence required, owner, and stop/continue criteria.

## 15. Weekly customer review — 30 minutes

**Owner:** Founder/Customer Success.  
**Question:** Which customers are progressing, blocked, at risk, or proving value?

For every active external organization record:

- stage;
- owner;
- success criteria;
- last verified value moment;
- next comparable measurement date if applicable;
- open action and owner;
- blocker;
- renewal/continuation decision date;
- outcome evidence and limitations.

No account should live in “active” status without a dated next action.

## 16. Weekly pipeline review — 30 minutes

**Owner:** Founder/Sales.  
**Question:** Which opportunities deserve time and why?

Review only:

- qualified accounts;
- stage aging;
- last/next action;
- verified pain and trigger;
- champion/economic buyer status;
- proposal/pilot decision date;
- lost reason;
- price/WTP evidence.

Pipeline value is not revenue. Weighted pipeline is a planning heuristic and must not appear as ARR.

## 17. Weekly reliability review — 30 minutes

**Owner:** Engineering/SRE.  
**Question:** Can Foremention deliver the promised evidence loop reliably and economically?

Review:

- completion and partial/failure rate;
- provider availability/failure/rate-limit behavior;
- retry volume and retry cost;
- queue/background failures;
- high-latency workflows;
- cost/run and cost/completed workflow;
- tenant/security anomalies;
- incident follow-ups;
- capacity/quota risks.

Every recurring failure has an owner, severity, next proof point, and expiry/review date.

## 18. Monthly financial review — 60 minutes

**Owner:** CEO/CFO or finance owner.  
**Question:** Is the company converting customer value into durable economics and sufficient runway?

Review:

- cash opening/closing balance;
- collections;
- recognized/contracted revenue according to chosen accounting policy;
- new/expansion/contraction/churn revenue;
- provider and direct infrastructure COGS;
- gross profit/margin when inputs are complete;
- payroll/headcount;
- sales/marketing spend;
- other operating expenses;
- net burn;
- runway;
- accounts receivable/payable if material;
- actual vs plan vs prior forecast;
- scenario changes and assumption evidence.

Never “smooth” missing data. Add a completeness note to each financial review.

## 19. Quarterly strategy review — 90 minutes

**Owner:** CEO.  
**Question:** What became true this quarter that changes strategy?

1. Re-read mission, ICP, wedge, and “will not do.”
2. Review customer proof, retention, revenue, economics, and reliability.
3. Review which assumptions were validated, invalidated, or remain unknown.
4. Identify the top strategic constraint.
5. Decide whether to maintain, narrow, or expand ICP/wedge/package/market.
6. Review hiring gates.
7. Review international-readiness gate.
8. Retire obsolete documents/targets.
9. Publish next-quarter priorities and explicit non-priorities.

## 20. Decision log template

Every material decision gets one entry:

```text
Decision ID: DEC-YYYY-MM-DD-###
Date:
Owner:
Status: proposed | adopted | superseded | reversed
Decision:
Problem / constraint:
Evidence used:
Alternatives considered:
Why this option:
What remains unchanged:
Risks / downside:
Reversibility: easy | moderate | hard
Success evidence:
Review / expiry date:
Supersedes:
Superseded by:
Links:
```

A material decision includes changes to category, ICP, pricing architecture, packaging, metric definitions, revenue recognition policy, hiring thresholds, market expansion, major provider strategy, data-residency promise, or security/compliance posture.

---

# D. Finance model — configurable 36-month framework

## 21. Finance-model principles

1. **Actuals and assumptions are stored separately.**
2. **Monthly model first, annual summaries second.** Use M1–M36 with Year 1/2/3 rollups.
3. **No invented starting cash, revenue, ACV, churn, salary, or growth rate.**
4. **Three scenarios are allowed:** Conservative, Base, Upside. A scenario is not a forecast until inputs are approved.
5. **Revenue, bookings, billings, collections, and cash are distinct.**
6. **Gross margin is withheld when direct costs or revenue are incomplete.**
7. **Provider costs must scale with actual product usage assumptions, not only customer count.**
8. **Headcount is triggered by bottlenecks and modeled from an approved hiring month.**

## 22. Model workbook/tab architecture

The finance model should eventually live in a spreadsheet or finance system with these canonical tabs/tables:

1. `README_AND_VERSION`
2. `ACTUALS_IMPORT`
3. `ASSUMPTIONS`
4. `CUSTOMERS_AND_REVENUE`
5. `USAGE_AND_PROVIDER_COST`
6. `INFRASTRUCTURE_AND_COGS`
7. `HEADCOUNT`
8. `SALES_AND_MARKETING`
9. `G_AND_A`
10. `P_AND_L`
11. `CASH_AND_RUNWAY`
12. `UNIT_ECONOMICS`
13. `SCENARIOS`
14. `SENSITIVITIES`
15. `MONTHLY_BOARD_VIEW`

Each assumption must include `value`, `unit`, `scenario`, `effective_month`, `source`, `owner`, `evidence_status`, and `last_reviewed_at`.

## 23. Core assumptions schema

### Customer / revenue assumptions

- opening paying customers;
- new customers by month;
- starting ACV or package-specific ACV;
- billing cadence;
- logo churn;
- gross revenue churn;
- expansion rate / expansion events;
- contraction rate;
- pilot-to-subscription treatment;
- implementation/services revenue if it ever becomes real;
- discounts/credits/refunds;
- payment timing / collection lag.

### Usage / COGS assumptions

- active questions per customer/package;
- measurements per question per month;
- providers/models per measurement;
- provider token/search/tool usage where priced that way;
- provider cost per call/token/search or measured cost per workflow;
- retry rate and retry cost;
- background-processing cost;
- database/storage/egress cost;
- observability/queue cost;
- customer-specific direct operational cost if classified as COGS.

### Headcount assumptions

For each approved role:

- start month;
- base cash compensation;
- payroll taxes/benefits load;
- recruiting/sign-on/equipment one-time costs;
- contractor vs employee status;
- department;
- allocation policy if a role is partly direct COGS.

### Sales / marketing assumptions

- founder-led selling cost if explicitly modeled;
- paid media;
- events;
- content/SEO;
- tooling/data;
- commissions;
- partner/referral cost;
- travel;
- agency/contractor spend.

### G&A assumptions

- legal;
- accounting/bookkeeping;
- insurance;
- banking/payment fees;
- software/admin tools;
- office/remote operations;
- compliance/audit expenses;
- taxes where appropriate.

## 24. Monthly customer model formulas

For month `t`:

```text
Opening Customers[t] = Ending Customers[t-1]
Churned Customers[t] = model-input or cohort-based churn calculation
New Customers[t] = approved scenario input or derived from a validated acquisition model
Ending Customers[t] = Opening Customers[t] + New Customers[t] - Churned Customers[t]
```

Do not derive new customers from website traffic or leads until conversion assumptions are supported by real data.

## 25. Monthly recurring-revenue formulas

Where subscription revenue exists:

```text
Opening MRR[t] = Ending MRR[t-1]
New MRR[t] = verified/modelled new subscription MRR
Expansion MRR[t] = verified/modelled expansion
Contraction MRR[t] = verified/modelled contraction
Churned MRR[t] = verified/modelled churn
Ending MRR[t] = Opening MRR[t] + New MRR[t] + Expansion MRR[t] - Contraction MRR[t] - Churned MRR[t]
ARR[t] = Ending MRR[t] × 12
```

If contracts are annual/prepaid, maintain separate schedules for **contracted ARR**, **recognized revenue**, **billings**, **collections**, and **deferred revenue** as required by the company’s accounting policy.

## 26. ACV

```text
New Logo ACV[t] = annualized contracted value of new recurring customer contracts / new recurring customers
Portfolio ACV[t] = annualized recurring contract value / paying customers
```

Do not mix one-time pilot/service fees into recurring ACV unless the accounting definition explicitly includes them and the label makes that clear.

## 27. Provider-cost model

Model usage bottom-up wherever possible:

```text
Questions Measured[t] = Σ active customer/package question volume
Provider Executions[t] = Questions Measured[t] × provider/model coverage factor
Base Provider Cost[t] = Σ execution units × measured/configured unit price
Retry Cost[t] = retry executions × measured/configured unit price
Provider COGS[t] = Base Provider Cost[t] + Retry Cost[t]
```

Prefer actual `AI cost events` / provider execution records over generic cost-per-customer assumptions once enough data exists.

## 28. Infrastructure and direct cost

Direct product COGS may include, according to the accounting policy:

- AI/provider inference/search;
- customer-serving compute;
- database/storage/egress attributable to service delivery;
- background jobs/queues;
- direct third-party APIs;
- customer-specific support/operations if the company deliberately classifies them as COGS.

Shared engineering tools, corporate software, R&D payroll, and general admin should not be silently hidden inside provider COGS.

## 29. Gross profit and gross margin

Only calculate when the denominator is real and direct costs are complete enough:

```text
Gross Profit[t] = Recognized Revenue[t] - Direct COGS[t]
Gross Margin %[t] = Gross Profit[t] / Recognized Revenue[t]
```

If recognized revenue is zero or direct COGS is materially incomplete: **Gross Margin = N/A**.

Also monitor contribution layers when useful:

```text
Contribution 1 = Revenue - provider cost - direct infrastructure
Contribution 2 = Contribution 1 - variable support/CS/payment costs
```

Do not call Contribution 1 or Contribution 2 “GAAP gross margin” unless the accounting policy supports that classification.

## 30. Headcount model

For role `r` starting in month `s`:

```text
Monthly Loaded Cost[r,t] = 0, t < s
Monthly Loaded Cost[r,t] = salary/12 + benefits/tax load + recurring role-specific cost, t >= s
One-time Hiring Cost[r,t] = recruiting + equipment + sign-on in approved start month
```

Open a hiring row only after the role passes the hiring gates in Section E.

## 31. Operating expenses and burn

```text
Operating Expenses[t] = R&D + Sales & Marketing + G&A + other approved Opex
Operating Loss[t] = Gross Profit[t] - Operating Expenses[t]
Net Cash Burn[t] = Cash Outflows[t] - Cash Inflows[t]
Ending Cash[t] = Opening Cash[t] - Net Cash Burn[t] + Financing Inflows[t]
```

Financing inflows are not revenue.

## 32. Runway

Use at least two views:

```text
Static Runway = Current Cash / current normalized monthly net burn
Forward Runway = month in which modeled ending cash falls below minimum operating reserve
```

If the company is cash-flow positive, report runway as **not constrained by current burn** rather than an artificial infinite number.

A forward 3-month or 6-month average burn can reduce noise, but the method must remain consistent and disclosed.

## 33. Scenario framework

| Variable | Conservative | Base | Upside | Actual/source |
| --- | --- | --- | --- | --- |
| New paying customers | assumption | assumption | assumption | blank until observed |
| ACV/package mix | assumption | assumption | assumption | billing/contract source |
| Churn | assumption | assumption | assumption | cohort source when real |
| Expansion | assumption | assumption | assumption | billing source when real |
| Question/run volume | assumption | assumption | assumption | product DB |
| Provider unit cost | configured/measured | configured/measured | configured/measured | provider/cost ledger |
| Retry rate | assumption | assumption | assumption | run-attempt data |
| Infrastructure growth | assumption | assumption | assumption | vendor billing |
| Hiring months | gated plan | gated plan | gated plan | payroll after hire |
| Sales/marketing spend | approved plan | approved plan | approved plan | accounting/bank |

Do not automatically make “Upside” the board plan. The board/operating plan is whichever scenario leadership explicitly approves after reviewing evidence.

## 34. Finance-model QA

Before any forecast is called decision-grade:

- every historical month reconciles to source records;
- actuals and assumptions have distinct formatting/fields;
- model formulas are not hard-coded over actual cells;
- no pipeline amount appears in recognized revenue;
- no design-partner target appears in paying-customer actuals;
- provider cost ties to execution/usage or vendor invoices;
- revenue and cash are not conflated;
- headcount starts only in approved months;
- scenario changes have a decision-log entry when material;
- gross margin shows N/A when inputs are incomplete;
- runway ties to cash, not ARR.

---

# E. Hiring architecture

## 35. Company-wide hire gate

A role may open only when all applicable conditions are true:

1. **Proven bottleneck:** the constraint has appeared in repeated operating reviews and is supported by customer, revenue, reliability, risk, or execution evidence.
2. **Durable workload:** the work is recurring enough to justify a role rather than a short contractor/project.
3. **Opportunity cost is material:** the bottleneck delays retained value, revenue, reliability, security, or a strategically critical build.
4. **Role clarity:** the company can define outcomes, decision rights, interfaces, and a 90-day scorecard.
5. **Financial capacity:** the 36-month model can absorb the loaded cost under the approved scenario without hiding runway impact.
6. **Founder substitution test:** the role removes a real bottleneck rather than merely making the org chart look complete.

Emergency security/reliability risk can accelerate a role even before revenue scale, but the risk and rationale must be documented.

## 36. Role scorecards and triggers

### Product engineering

**Bottleneck:** qualified customer/revenue work repeatedly waits on core product execution.

**Hire trigger:** multiple P0/P1 customer-value items remain capacity-blocked across consecutive product reviews, or founder engineering becomes the binding constraint on activation/retention/revenue.

**90-day scorecard:** ship the agreed activation/retention bottleneck safely; reduce cycle time on P0/P1 work; preserve tests/RLS/evidence/release gates; improve maintainability in owned areas.

**Do not hire when:** roadmap demand is mostly speculative feature ideas.

### AI / data

**Bottleneck:** provider evaluation, measurement quality, evidence extraction, comparability, data modeling, or benchmark rigor is blocking customer trust/value.

**Hire trigger:** repeated qualified customer/product needs require specialized experimentation/statistics/data systems beyond general engineering capacity, or data-quality work becomes a sustained roadmap constraint.

**90-day scorecard:** establish measurable evaluation baselines; improve provider/data quality under explicit acceptance criteria; reduce invalid/ambiguous intelligence; document model/provider/data lineage.

**Do not hire when:** the goal is merely to add “AI” headcount or chase model novelty.

### Infrastructure / security

**Bottleneck:** reliability, cost, incident load, enterprise security, capacity, or operational risk is consuming disproportionate engineering time or blocking qualified deals.

**Hire trigger:** recurring incidents/on-call burden or verified enterprise security blockers become sustained, material constraints that cannot be handled safely as part-time ownership.

**90-day scorecard:** reduce incident frequency/MTTR; make cost/capacity observable; close the highest verified security/reliability risks; strengthen deployment/rollback/backup controls.

**Do not hire when:** enterprise requirements are hypothetical and reliability is not yet a material constraint.

### Product / design

**Bottleneck:** users repeatedly fail to understand or complete the evidence/value workflow despite technically working features.

**Hire trigger:** activation/retention evidence shows durable UX/product-discovery problems and engineering/founder interpretation is no longer sufficient.

**90-day scorecard:** improve a defined activation/retention step; reduce user confusion/support burden; establish reusable research/design patterns without breaking the locked five-object architecture.

**Do not hire when:** the request is primarily aesthetic novelty or brand reinvention.

### Customer success

**Bottleneck:** retained value, onboarding, action follow-through, renewal, and outcome evidence depend on founder heroics.

**Hire trigger:** a meaningful active customer/pilot base exists and the founder cannot maintain the required cadence without delaying sales/product, or customer value/renewal risk is visibly increasing because ownership is unclear.

**90-day scorecard:** every account has success criteria/next action; improve time to value and comparable-cycle completion; surface risks early; produce clean outcome/renewal evidence.

**Do not hire when:** there are too few external customers to establish a repeatable success motion.

### Sales

**Bottleneck:** qualified pipeline exists but founder capacity—not product proof or demand quality—is limiting conversion.

**Hire trigger:** the founder has demonstrated a repeatable ICP, pain, sales narrative, qualification process, and paid close pattern; there is enough qualified opportunity volume to support a dedicated seller.

**90-day scorecard:** preserve qualification quality; progress real opportunities; maintain stage hygiene; learn objections; close within the proven motion without inventing pipeline.

**Do not hire when:** founder-led sales has not yet proved who buys, why, and at what real terms.

### Growth

**Bottleneck:** one or more acquisition/distribution channels show qualified demand but experimentation/content/operations capacity limits repeatability.

**Hire trigger:** there is evidence that a channel produces ICP-qualified conversations/opportunities and the next constraint is execution scale, not message/PMF uncertainty.

**90-day scorecard:** increase qualified pipeline or product-led activation from the proven channel; maintain measurement integrity; show CAC/payback only when inputs are sufficient.

**Do not hire when:** the company is trying to use marketing volume to compensate for unclear customer pain.

### Operations / finance

**Bottleneck:** billing, collections, close, vendor management, contracting workflow, compliance operations, planning, or reporting consumes material founder time or creates control risk.

**Hire trigger:** financial/operational complexity becomes recurring and error-prone, or the company needs a reliable close/forecast/control function to support headcount, customers, fundraising, or enterprise procurement.

**90-day scorecard:** monthly close cadence; reconciled cash/revenue/cost reporting; 36-month forecast hygiene; vendor/billing controls; reduced founder administrative burden.

**Do not hire when:** basic bookkeeping/finance operations can still be handled reliably with a lightweight external provider.

## 37. Hiring decision record

Every approved hire must include:

- bottleneck evidence;
- why now;
- why this role vs contractor/tool/process change;
- loaded annual/monthly cost in the model;
- start-month assumption;
- 30/60/90-day outcomes;
- hiring manager;
- interfaces/decision rights;
- what work should stop or move after the hire;
- review date after 90 days.

---

# F. International readiness

## 38. Principle

**OPERATING POLICY:** Architect for future international measurement without turning the current product into a fully localized, multi-currency, regionally hosted platform before primary-market PMF.

Internationalization has three different meanings and they must not be conflated:

1. **Measurement context:** buyer question language/locale/market/timezone/provider availability.
2. **Product localization:** translated UI, content, emails, legal copy, support, formatting.
3. **Commercial/regulatory expansion:** currency, tax, contracting entity, privacy/compliance, data residency, regional infrastructure, support coverage.

Foremention can be partially ready for (1) while intentionally deferring (2) and (3).

## 39. Current architecture audit

| Area | Current state | Readiness assessment | Action now |
| --- | --- | --- | --- |
| Locale | `locale` exists in measurement scheduling and relevant measurement snapshots; defaults include `en-US` | **Partially ready** | Keep locale explicit in measurement identity/comparability |
| Language | Product/marketing motion is English-first; no canonical full UI i18n system is established here | **Not fully internationalized** | Do not build broad translation framework until market evidence |
| Market | `market` exists in schedules/prompts/snapshots with `global` default | **Partially ready** | Treat market as measurement context, not a promise of regional support |
| Timezone | Measurement schedules require a valid IANA timezone; timestamps remain server-safe | **Reasonably ready for scheduling** | Preserve IANA identifiers and UTC storage; test DST behavior before scale |
| Currency | No canonical multi-currency company model is established in reviewed product docs | **Not ready** | Keep finance-model reporting currency explicit; do not expose currency promises until billing/accounting policy is approved |
| Provider availability | Multiple provider adapters exist but availability/model/cost differs by provider/configuration | **Partially ready** | Maintain provider capability/availability registry and fail closed when unsupported |
| Regional measurement | Locale + market + provider/model/methodology context can be captured | **Partially ready** | Require measurement identity to include market/locale where they can affect answers |
| Compliance | Security/privacy controls exist; no new certification claim is created by this document | **Foundational only** | Answer procurement from verified controls; track blockers before building |
| Data residency | No canonical customer-selectable regional residency promise is established here | **Not ready** | Do not promise residency; document actual vendor regions when enterprise need becomes real |
| Tax/legal contracting | Public billing readiness is gated pending legal/tax/contract facts | **Not ready for broad international commerce** | Establish entity/tax/accounting rules before multi-country billing |

## 40. International measurement contract

Where locale/market can materially affect an answer, comparison identity should include at least:

`organization × question × language/locale × market × provider × model/version × methodology × relevant search/tool configuration × observation time`

A later observation may be “new data” without being a valid comparison. Changing market, language, provider, model, or methodology can invalidate a direct delta.

## 41. What to do now

- keep locale, market, and timezone explicit in measurement/storage APIs;
- use IANA timezones and UTC timestamps;
- avoid hard-coding US-only assumptions into core domain models where a low-cost abstraction exists;
- keep provider availability/cost configuration data-driven;
- keep currency outside the evidence domain and inside billing/finance boundaries;
- record the customer’s primary market/language need during discovery;
- log real international deal blockers separately from generic feature requests;
- preserve Unicode and content-length/safety behavior for buyer questions/evidence;
- keep legal/compliance claims factual and vendor-region claims specific.

## 42. What should wait until primary-market PMF

Do **not** build these merely for theoretical global readiness:

- full UI translation/localization framework across every route;
- dozens of locale-specific marketing sites;
- automatic translation of buyer questions/evidence as a default workflow;
- multi-currency pricing/checkout;
- complex tax engines beyond actual selling needs;
- regional data planes or customer-selectable residency;
- 24/7 multilingual support staffing;
- country-specific compliance programs with no qualified revenue requirement;
- every regional AI provider/model;
- market-specific benchmark products without enough trustworthy sample and privacy clearance.

## 43. Market-expansion gate

A new market/language should receive dedicated product investment only when:

1. qualified customer demand is real and repeated;
2. the current ICP/wedge is working well enough to distinguish localization problems from PMF problems;
3. required providers are legally/technically available;
4. measurement comparability can be defined;
5. customer-support/sales ownership exists;
6. billing/tax/legal/privacy implications are understood;
7. expected value justifies operational complexity;
8. the decision is logged with success and stop criteria.

---

# G. Documentation architecture

## 44. Canonical source-of-truth structure

Use a small set of living canonical documents; everything else is supporting evidence or history.

```text
CLAUDE.md
  └─ Product/brand/security/release constitution

docs/billion-dollar-build/09-company-operating-system.md
  └─ Company strategy, metrics hierarchy, cadence, finance, hiring, international readiness, docs governance

docs/CEO-COMPANY-COMMAND-CENTER.md
  └─ Metric definitions and system-of-record boundaries

docs/FOUNDER-CUSTOMER-PROOF-PLAYBOOK.md
  └─ Founder sales/discovery/pilot experiments

docs/ARCHITECTURE.md + security/deployment/testing docs
  └─ Technical truth and operational implementation details

docs/superpowers/specs/* + docs/superpowers/plans/* + dated war-room docs
  └─ Historical design/execution context; non-canonical after implementation unless promoted
```

## 45. Required header for strategic documents

Any new strategy/finance/commercial/operating document should begin with:

```text
Status: canonical | experiment | target | historical | superseded
Owner:
Effective date:
Source of truth for:
Depends on:
Supersedes:
Superseded by:
Review date:
```

Without a `Status`, the document defaults to **historical/supporting**, not canonical.

## 46. Conflict rule

When a lower-authority document conflicts with a higher-authority one:

1. Do not “average” the two positions.
2. Follow the higher-authority rule for current operation.
3. Open a decision-log entry if the lower-authority evidence suggests the strategy should change.
4. If changed, update the canonical document and mark the old statement superseded.
5. Link the decision both ways.

## 47. Experiment vs policy rule

Pilot prices, acquisition targets, feature hypotheses, benchmark ideas, hiring plans, and expansion ideas are experiments/targets unless explicitly promoted.

Examples:

- `USD 3,000 pilot` in the proof playbook = **ASSUMPTION/HYPOTHESIS**, not list price.
- `100 target accounts → 40 conversations → ...` = **TARGET**, not funnel actuals.
- `Core / Signal / Intelligence` = **CURRENT FACT** as package architecture, but package dollar pricing remains unvalidated/unpublished unless billing/public copy proves otherwise.
- future SSO/residency/certification = **FUTURE-GATED** until configured/verified.

## 48. Staleness policy

At each quarterly strategy review:

- list strategic documents changed in the quarter;
- identify duplicates/conflicts;
- mark obsolete documents `superseded` rather than deleting useful history;
- update links from canonical docs;
- remove stale claims from public/product copy when necessary;
- confirm the next review date for this operating system.

---

# H. Operating templates

## 49. Weekly company review template

```text
Week ending:
North Star count:
Activated organizations:
Comparable retained-value organizations:
Paying organizations / verified revenue (if real):
Active pilots:
Top customer-value movement:
Top pipeline movement:
Top reliability/cost movement:
Cash/runway exception (if material):
Single biggest constraint:
Decision 1 / owner / due:
Decision 2 / owner / due:
Decision 3 / owner / due:
Explicitly not doing:
Evidence links:
```

## 50. Product review template

```text
Period:
Activation stages:
Median TTFV / sample:
First insight → second/comparable cycle:
Records reviewed:
Actions created / completed:
Top 3 friction points:
Evidence/comparability failures:
Repeated qualified feature requests:
Primary product hypothesis:
Expected customer-value effect:
Success/stop criterion:
Owner / due:
```

## 51. Customer review template

```text
Organization:
Classification: design partner | customer | other
Success criteria:
Last verified value:
Current stage:
Next action:
Owner:
Comparable remeasurement due:
Blocker/risk:
Observed outcome / evidence level:
Commercial decision date:
Renewal/continuation status:
```

## 52. Pipeline review template

```text
Account:
ICP score / reason:
Verified trigger:
Stage:
Champion:
Economic buyer:
Pain / urgency evidence:
Current substitute:
Price/WTP evidence:
Last action:
Next action / due:
Decision date:
Lost reason if closed:
```

## 53. Reliability review template

```text
Period:
Completed workflows:
Failed / partial workflows:
Provider failures by provider:
Retry count / retry cost:
Queue/background failures:
Latency exceptions:
Cost per completed workflow:
Cost anomaly:
Security/tenant anomaly:
Incidents:
Top reliability constraint:
Owner / due / verification:
```

## 54. Monthly finance review template

```text
Month:
Actuals completeness:
Opening cash:
Collections:
Recognized revenue:
New ARR / expansion / contraction / churn (if real):
Provider COGS:
Other direct COGS:
Gross profit / margin or N/A:
Payroll/headcount:
Sales & marketing:
G&A:
Net cash burn:
Ending cash:
Static runway:
Forward-model runway:
Actual vs plan variance:
Assumptions changed:
Decision required:
```

## 55. Quarterly strategy template

```text
Quarter:
What became true:
What was disproven:
North Star / retention evidence:
Customer value evidence:
Revenue/economics evidence:
Reliability/trust evidence:
ICP change needed? yes/no + evidence
Wedge change needed? yes/no + evidence
Package/pricing change needed? yes/no + evidence
Hiring gate crossed? role + evidence
International market gate crossed? market + evidence
Top constraint next quarter:
Top 3 priorities:
Top 3 explicit non-priorities:
Decisions logged:
Documents superseded:
```

---

# I. Company operating dashboard — minimum viable view

## 56. One-screen CEO view

The company should be understandable from a compact sequence:

1. **Customer value:** North Star, activated orgs, comparable retained-value orgs.
2. **Commercial:** paying orgs, verified recurring revenue, active pilots, qualified pipeline.
3. **Outcomes:** value-realization orgs and outcome evidence levels.
4. **Economics:** provider/direct cost, gross margin when complete, burn, runway.
5. **Reliability:** completion/failure, cost anomalies, critical incidents.
6. **Constraint:** one sentence describing the current company bottleneck.

Everything else is drill-down.

---

# J. 36-month model operating instructions

## 57. Model version control

Every monthly forecast freeze gets:

```text
Forecast version: YYYY-MM
Approved by:
Scenario used for operating plan:
Actual-through month:
Assumption changes since prior version:
Material decisions linked:
```

Never overwrite a prior board/operating forecast without preserving the previous version.

## 58. Sensitivities to model first

Once real inputs exist, test sensitivity to:

- ACV/package mix;
- new customer rate;
- logo/revenue churn;
- expansion;
- measurements per customer;
- providers/models per measurement;
- provider unit cost;
- retry rate;
- headcount timing;
- sales/marketing spend;
- collection timing.

The highest-value sensitivity is the variable that changes runway/gross margin most **and** is uncertain enough to matter.

## 59. Unit-economics outputs

Only when denominators are real:

- provider cost / run;
- provider cost / question;
- direct cost / Recommendation Record;
- direct cost / workspace/organization;
- direct cost / package;
- retry cost % of provider cost;
- gross profit / organization;
- gross margin / package/customer cohort;
- CAC;
- CAC payback;
- LTV or LTV:CAC only when churn/gross-margin history is meaningful.

Do not use early-stage LTV math to create false precision from one or two customers.

---

# K. Open evidence gaps

## 60. Facts that remain intentionally blank until verified

This operating system does **not** assert:

- current MRR or ARR;
- customer count;
- paid pilot count;
- validated ACV;
- validated list price;
- churn or retention rate;
- expansion rate;
- CAC or payback;
- LTV;
- gross margin;
- current burn or runway;
- headcount plan;
- legal entity/jurisdiction details;
- tax treatment;
- certifications;
- data residency;
- market leadership;
- benchmark size/coverage;
- international PMF.

As these become real, update source systems first, then the operating dashboard/model. Do not edit a narrative document to manufacture the appearance of actuals.

---

# L. Adoption checklist

## 61. Immediate operating actions

- [ ] Treat this document as the canonical company-OS layer below `CLAUDE.md`.
- [ ] Keep the CEO Command Center as the exact metric-definition companion; do not fork metric semantics here.
- [ ] Label older pricing/pilot numbers as hypotheses wherever they could be mistaken for current public pricing.
- [ ] Start the weekly company, product, customer, pipeline, and reliability reviews using the templates above.
- [ ] Establish a monthly finance close even if many metrics initially show zero/N/A.
- [ ] Build the 36-month spreadsheet only from explicit assumptions and imported actuals; version every monthly freeze.
- [ ] Open no role without a bottleneck record and loaded-cost impact.
- [ ] Record locale/market/timezone as measurement context; defer broad localization/multi-currency/residency until a real market gate is crossed.
- [ ] Use the decision log for any category, ICP, package, pricing, metric, finance, hiring, or market-expansion change.
- [ ] At each quarterly review, mark stale strategy docs superseded rather than letting them silently compete.

## 62. Company OS success criterion

This operating system is working when a new executive or functional owner can answer, without relying on founder memory:

- what Foremention is and is not;
- who it serves first;
- what value loop must repeat;
- which metrics matter and where they come from;
- what the company reviews each week/month/quarter;
- which financial inputs are actual vs assumed;
- why each hire is justified;
- what international capabilities exist vs remain deferred;
- which document wins when two documents disagree;
- what the company’s single current constraint is and who owns the next decision.
