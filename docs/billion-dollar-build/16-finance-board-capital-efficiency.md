# 16 — Finance, Board, Capital Efficiency, and Scenario Planning

**Status:** Finance operating architecture for Foremention.  
**Recovered base:** `main` at `df92e0eb78edda5c8c621bb1388c5b519b8da1e8` on 2026-08-30.  
**Scope:** 36-month model, SaaS metrics, cost architecture, budgeting, hiring economics, board reporting, cash controls, and scenario planning.  
**Primary metric companion:** `docs/CEO-COMPANY-COMMAND-CENTER.md`.  
**Customer-proof companion:** `docs/FOUNDER-CUSTOMER-PROOF-PLAYBOOK.md`.  
**Concurrent work noted but not treated as merged truth:** PR #174 (`09-company-operating-system.md`) and PR #175 (`05-sales-pricing-billing.md`).

This document is an operating model, not an assertion of financial performance. The repository contains product, billing, entitlement, usage, and provider-cost mechanisms, but it does **not** contain a verified accounting ledger, bank balance, payroll ledger, signed-contract register, or source-backed revenue actuals. Missing finance data therefore remains **UNKNOWN**.

---

## 0. Mandatory financial truth labels

Every financial number used in a model, dashboard, board pack, memo, hiring plan, or capital decision must carry exactly one of these labels:

- **ACTUAL** — observed and reconciled to a named source of truth such as bank/accounting ledger, billing provider, payroll, approved vendor invoice, or product cost ledger.
- **CONTRACTED** — legally/commercially committed under an executed agreement or provider subscription state, but not necessarily collected or recognized.
- **FORECAST** — leadership-approved expected outcome based on explicit assumptions and a dated forecast version.
- **ASSUMPTION** — planning input, hypothesis, scenario driver, or unverified commercial estimate.
- **TARGET** — desired future result; never historical performance.
- **UNKNOWN** — required input is absent, incomplete, stale, or unreconciled.

### Label rules

1. **UNKNOWN is never converted to zero for convenience.** Zero is valid only when a source proves zero.
2. **CONTRACTED is not ACTUAL cash.** Signed recurring value, invoices, collections, recognized revenue, and cash are separate schedules.
3. **Pipeline is never CONTRACTED revenue.** A proposal, verbal commitment, design-partner target, or CRM probability does not become contracted revenue.
4. **ASSUMPTION is never FORECAST automatically.** A scenario becomes a forecast only after leadership explicitly approves it for a named period/version.
5. **TARGET is never a forecast.** A board objective remains a target even when management hopes to achieve it.
6. **Financial labels survive exports.** Board slides, investor updates, spreadsheets, PDFs, and dashboards must preserve them.
7. Every number must also have `source`, `as_of`, `owner`, and `version` metadata where practical.

---

# A. Recovered financial reality

## 1. What is actually available on current `main`

### Revenue and commercial truth

| Item | Truth state | Recovered reality |
| --- | --- | --- |
| Public Core price | **UNKNOWN** | Current pricing page intentionally publishes no dollar amount. |
| Public Signal price | **UNKNOWN** | Current pricing page intentionally publishes no dollar amount. |
| Intelligence price | **UNKNOWN** | Sales-led/custom-scoped; no approved recurring dollar amount exists in current repo truth. |
| Paying organizations | **UNKNOWN** | Repository architecture can represent billing state, but no verified production billing dataset was available in this repo recovery. |
| Contracted ARR | **UNKNOWN** | No executed-contract register or verified recurring contract values were available. |
| MRR | **UNKNOWN** | No reconciled billing/accounting actuals were available. |
| ARR | **UNKNOWN** | No reconciled billing/accounting actuals were available. |
| Recognized revenue | **UNKNOWN** | No accounting revenue schedule or approved recognition policy was available. |
| ACV | **UNKNOWN** | No verified closed-contract values were available. |
| Expansion / contraction / churn revenue | **UNKNOWN** | No verified paid cohort schedule was available. |
| Cash balance | **UNKNOWN** | No bank/accounting source was available through the repository. |
| Payroll | **UNKNOWN** | No payroll ledger was available. |
| Sales and marketing spend | **UNKNOWN** | No accounting ledger was available. |
| G&A spend | **UNKNOWN** | No accounting ledger was available. |
| Current net burn | **UNKNOWN** | Cash inflows/outflows are unreconciled. |
| Runway | **UNKNOWN** | Cash and normalized burn are both unavailable. |

### Current pricing experiments

The founder customer-proof playbook contains pilot pricing hypotheses. These remain experiments, not traction and not public pricing:

- **ASSUMPTION — USD 3,000:** standard founder-assisted proof-pilot pricing hypothesis.
- **ASSUMPTION — USD 6,000:** expanded founder-assisted proof-pilot pricing hypothesis.

Do not use either value as ACV, ARR, MRR, bookings, contracted revenue, or forecast until supported by real accepted commercial evidence and the correct revenue classification.

### Billing architecture already present

**ACTUAL — implementation fact:** current main contains organization-scoped billing lifecycle records, entitlements, Stripe subscription Checkout/Portal support, verified webhook processing, and fail-closed configuration behavior. This proves billing capability, not revenue.

Current package architecture is Core / Signal / Intelligence, with Core and Signal eligible for self-serve subscription plumbing when real Stripe Price IDs are configured and Intelligence remaining custom-scoped.

### Provider-cost architecture already present

**ACTUAL — implementation fact:** Foremention records provider attempts, token usage when returned, provider-reported billed cost when available, estimated cost otherwise, `ai_cost_events`, and run-level `actual_cost_usd` derived from recorded cost events. Failed attempts can also record estimated cost, so retry/failure economics are observable rather than hidden.

Current code-level cost controls are guardrails, not observed vendor spend:

- **ACTUAL — code control, not realized spend: USD 0.25** general `LIVE_COLLECTION_LIMITS.maxRunCostUsd` safety constant.
- **ACTUAL — code control, not realized spend: USD 0.10** Groq `maxRunCostUsd` runtime budget value.
- **ACTUAL — code control, not realized spend: USD 5.00** Groq `maxMonthlyOrgSpendUsd` runtime budget value.

Important implementation note: Groq scheduled-run reservation uses `prompt_count ×` the **ACTUAL — code control: USD 0.10** value, while live provider execution receives that same value as the Groq run budget. Finance/engineering should keep the terminology and reservation semantics under review so “per run,” “per prompt,” “reserved,” and “realized” cost cannot be confused.

### Cost data that can become ACTUAL when production records exist

The product data model can support:

- provider cost by attempt;
- provider cost by run;
- retry/failure cost;
- organization monthly AI cost;
- estimated versus provider-reported cost source;
- prompt/question volume;
- run volume;
- completion/failure state;
- package/entitlement context.

The repo recovery does **not** provide the production rows required to state realized totals. Therefore current realized provider spend remains **UNKNOWN**.

---

# B. Finance source-of-truth architecture

## 2. One source of truth per financial fact

| Financial fact | Canonical source | Secondary/reconciliation source | Rule |
| --- | --- | --- | --- |
| Bank cash | Bank/accounting ledger | Bank statement | Never infer from Stripe balance or ARR. |
| Collected customer cash | Bank/accounting + billing provider | Invoice/payment export | Refunds/fees must reconcile. |
| Contracted recurring value | Executed contract/order form + commercial system | Billing subscription | Provider state alone does not replace the signed contract for negotiated enterprise deals. |
| Recognized revenue | Accounting ledger/revenue schedule | Contract + billing | Must follow approved accounting policy. |
| Deferred revenue | Accounting ledger | Prepaid invoice/contract schedule | Separate from cash and ARR. |
| Accounts receivable | Accounting ledger | Billing/invoice system | Aging must be explicit. |
| Provider AI COGS | `ai_cost_events` reconciled to vendor invoices | run/run-attempt records | Preserve estimated vs provider-reported vs invoiced states. |
| Infrastructure COGS | Vendor invoice/usage export | internal usage allocation | Do not infer vendor bills solely from request counts. |
| Payroll | Payroll/accounting | employment/contract records | Loaded-cost planning is not payroll actual. |
| S&M spend | Accounting ledger | card/vendor systems | CAC requires reconciled spend. |
| G&A spend | Accounting ledger | card/vendor systems | Keep legal/accounting/insurance/admin explicit. |
| Pipeline | Commercial/CRM system | founder commercial records | Never appears as revenue actual. |
| Product activity | Supabase / product DB | PostHog diagnostics | Product usage is not customer/revenue truth by itself. |

## 3. Minimum monthly close package

Before a month is marked finance-closed, reconcile:

- opening cash;
- customer invoices/billings;
- collections and refunds;
- contracted recurring schedule;
- recognized revenue and deferred revenue according to approved policy;
- accounts receivable if applicable;
- provider invoices and product cost ledger;
- infrastructure invoices;
- payroll/contractor payments;
- sales and marketing spend;
- G&A spend;
- financing inflows/outflows;
- taxes and payment fees where applicable;
- closing cash;
- actual versus approved budget;
- unresolved reconciliation items.

A month with material unreconciled balances is labeled **UNKNOWN / provisional** for affected metrics, not silently finalized.

---

# C. 36-month financial model

## 4. Model structure

Build monthly periods `M1` through `M36`, with quarterly and annual rollups. The canonical workbook/data-model structure should be:

1. `README_VERSION_CONTROL`
2. `FINANCIAL_TRUTH_REGISTER`
3. `ACTUALS_IMPORT`
4. `CONTRACTS_AND_BILLING`
5. `ASSUMPTIONS`
6. `CUSTOMERS`
7. `ARR_MRR_REVENUE`
8. `USAGE_AND_PROVIDER_COST`
9. `INFRASTRUCTURE_COGS`
10. `SUPPORT_IMPLEMENTATION_COGS`
11. `HEADCOUNT`
12. `SALES_AND_MARKETING`
13. `G_AND_A`
14. `P_AND_L`
15. `WORKING_CAPITAL`
16. `CASH_FLOW`
17. `RUNWAY`
18. `SAAS_METRICS`
19. `SCENARIOS`
20. `SENSITIVITIES`
21. `HIRING_GATES`
22. `BOARD_VIEW`
23. `CHECKS_AND_RECONCILIATION`

Every model input should store:

```text
metric_key
period
value
unit
truth_label
scenario
source
source_reference
owner
approved_by
observed_or_effective_at
last_reviewed_at
notes
```

## 5. Customer schedule

For month `t`:

```text
Opening Paying Logos[t] = Ending Paying Logos[t-1]
New Logos[t] = ACTUAL / CONTRACTED / FORECAST / ASSUMPTION according to source
Churned Logos[t] = logos that ended recurring paid relationship in period
Ending Paying Logos[t] = Opening Paying Logos[t] + New Logos[t] - Churned Logos[t]
```

Keep separate populations for:

- prospects;
- design partners;
- pilots;
- contracted paying customers not yet live;
- live paying customers;
- paused/past-due customers;
- churned customers.

A design partner becomes a paying customer only when verified commercial evidence supports that state.

## 6. New-logo schedule

Do not derive new logos from arbitrary funnel conversion assumptions until the funnel has real data.

Preferred progression:

1. **ACTUAL:** use verified wins for historical months.
2. **CONTRACTED:** use signed future-start customers separately.
3. **FORECAST:** once enough evidence exists, derive near-term starts from named late-stage contracted/decision-ready opportunities plus a cohort-based acquisition model.
4. **ASSUMPTION:** for longer-range scenario planning, use explicitly editable acquisition drivers.

The model should expose new logos by package, segment, source/channel, market, and contract type only when source data is reliable enough.

## 7. MRR and ARR bridge

Where recurring subscription revenue exists:

```text
Opening MRR[t] = Ending MRR[t-1]
New MRR[t] = recurring MRR from new paying customers
Expansion MRR[t] = additional recurring MRR from existing customers
Contraction MRR[t] = recurring MRR lost from downgrades/partial reductions
Churned MRR[t] = recurring MRR lost from fully churned customers
Ending MRR[t] = Opening MRR[t] + New MRR[t] + Expansion MRR[t] - Contraction MRR[t] - Churned MRR[t]
ARR[t] = Ending MRR[t] × 12
```

Historical bridge values must be **ACTUAL**. Future approved expected values are **FORECAST**. Scenario-only values are **ASSUMPTION**.

Annual or multi-year prepaid contracts require separate schedules for:

- contracted ARR;
- annual contract value;
- total contract value where useful;
- billings;
- collections;
- recognized revenue;
- deferred revenue;
- renewal date.

Do not multiply cash collected by a period factor and call it ARR.

## 8. Contracted revenue versus recognized revenue

### Contracted recurring value

A value is **CONTRACTED** only when there is an executed agreement/order or an approved self-serve subscription with sufficient evidence of the commercial commitment.

Maintain:

```text
contract_id
organization_id
package/scope
contract_start
contract_end
billing_interval
currency
recurring_contract_value
one_time_value
discount/credit terms
renewal terms
status
source document
```

### Recognized revenue

Recognized revenue should be calculated only after Foremention adopts an accounting policy appropriate to its legal/entity/tax context and receives professional accounting guidance where needed.

Until then, recognized revenue for board-grade financial statements is **UNKNOWN** rather than approximated from collections.

## 9. Gross profit and gross margin

```text
Direct COGS[t] = Provider COGS + Direct Infrastructure + Variable Support/Implementation + Direct Payment/Third-Party Costs classified as COGS
Gross Profit[t] = Recognized Revenue[t] - Direct COGS[t]
Gross Margin %[t] = Gross Profit[t] / Recognized Revenue[t]
```

If recognized revenue is missing or material direct COGS is incomplete:

```text
Gross Margin = UNKNOWN / N/A
```

Do not label a provider-only margin as total gross margin.

## 10. Operating expense schedule

Track separately:

### R&D / Product / Engineering

- engineering payroll/contractors;
- product/design;
- development tooling;
- non-customer-specific test infrastructure;
- research/evaluation work.

### Sales

- sales payroll/contractors;
- commissions;
- sales tools/data;
- travel/events directly attributable to sales.

### Marketing

- paid acquisition;
- content/SEO;
- sponsorships/events;
- creative/agency spend;
- marketing tools.

### G&A

- finance/accounting;
- legal;
- insurance;
- banking/payment administration;
- corporate software;
- compliance/audit;
- office/remote operations;
- founder/admin costs properly classified.

## 11. Burn and cash

```text
Net Cash Burn[t] = Operating Cash Outflows[t] + Investing Cash Outflows[t] - Operating Cash Inflows[t]
Ending Cash[t] = Opening Cash[t] + Financing Inflows[t] - Financing Outflows[t] - Net Cash Burn[t]
```

Use a cash-flow statement structure rather than deriving cash from ARR.

Financing inflows are capital, not revenue.

## 12. Runway

Use two views:

```text
Static Runway = Current Reconciled Cash / Normalized Monthly Net Burn
Forward Runway = first modeled month where Ending Cash falls below the approved minimum operating reserve
```

Both cash and burn must be **ACTUAL** for the historical starting point. Future burn may contain **FORECAST** values after approval.

If cash or burn is unreconciled, runway is **UNKNOWN**.

## 13. Working capital

As Foremention moves beyond card subscriptions, model:

- accounts receivable;
- invoice issue date;
- contractual due date;
- actual collection date;
- overdue aging;
- accounts payable;
- vendor payment terms;
- deferred revenue;
- tax liabilities where applicable.

Enterprise ARR can grow while cash deteriorates if collections slow. Board reporting must show both.

---

# D. Scenario planning

## 14. Scenario truth rule

Foremention must maintain at least three model scenarios:

- **Conservative**
- **Base**
- **Aggressive**

All scenario driver values begin as **ASSUMPTION**. None is a **FORECAST** until leadership explicitly approves that scenario/version as the operating forecast.

## 15. Scenario driver framework

| Driver | Conservative | Base | Aggressive |
| --- | --- | --- | --- |
| New-logo pace | Lower evidence-supported acquisition assumption | Central evidence-supported assumption | Higher acquisition assumption requiring stronger pipeline/capacity proof |
| ACV/package mix | Lower accepted value / more entry package mix | Central observed/approved mix | Higher enterprise/expansion mix only with real evidence |
| Logo churn | Higher downside assumption | Central cohort assumption | Lower churn assumption only when retention evidence supports it |
| Expansion | None/minimal until observed | Central evidence-based assumption | Higher expansion only after real expansion behavior exists |
| Usage per customer | Higher safety usage for cost planning | Expected usage | Higher-value/higher-coverage usage plus capacity requirement |
| Provider unit cost | Current measured/configured cost with adverse sensitivity | Current measured/configured cost | Current measured/configured cost with negotiated-efficiency case only when credible |
| Retry/failure cost | Worse reliability case | Expected reliability | Better reliability only after proven improvements |
| Hiring | Delayed; only critical bottlenecks | Gated planned hiring | Earlier hiring only when revenue/capital and workload gates are satisfied |
| S&M spend | Minimal/founder-led | Approved repeatable channel budget | Higher spend only behind proven CAC/payback signal |
| Collections | Slower | Expected | Faster only with evidence/contract terms |
| Fundraising | No assumed raise unless explicitly modeled | Approved capital plan if any | Capital-forward case, separately identified as financing assumption |

## 16. Sensitivity analysis

Every board forecast should show the variables that can break the plan fastest:

- new-logo pace;
- ACV;
- churn;
- expansion;
- provider cost per completed question/workflow;
- retry rate;
- infrastructure cost growth;
- support/implementation burden;
- hiring start dates;
- collection timing;
- payment failure/refund risk;
- sales/marketing efficiency.

Preferred sensitivity outputs:

- ending cash;
- runway;
- ARR;
- gross margin;
- net burn;
- burn multiple;
- headcount affordability.

Do not hide downside cases because the base plan looks better without them.

---

# E. Canonical SaaS metrics

## 17. ARR

```text
ARR = annualized recurring subscription value active at period end
```

For a pure monthly subscription base:

```text
ARR = Ending MRR × 12
```

Exclude one-time pilot/services value unless the metric is explicitly labeled total annualized contract value rather than ARR.

Current Foremention ARR: **UNKNOWN**.

## 18. MRR

```text
MRR = normalized recurring monthly subscription value active at period end
```

Annual subscriptions are normalized to a monthly recurring amount for MRR reporting while cash/billings stay on their actual schedules.

Current Foremention MRR: **UNKNOWN**.

## 19. ACV

Two useful views:

```text
New Logo ACV = annualized recurring contract value from new recurring contracts / new recurring customers
Portfolio ACV = total annualized recurring contract value / paying recurring customers
```

One-time pilot fees must not silently inflate recurring ACV.

Current Foremention ACV: **UNKNOWN**.

## 20. ARPA

```text
Monthly ARPA = Ending MRR / Ending Paying Accounts
Annualized ARPA = ARR / Ending Paying Accounts
```

Use account/organization as the canonical denominator unless finance deliberately creates another customer unit.

Current Foremention ARPA: **UNKNOWN**.

## 21. GRR

```text
GRR = (Starting MRR - Contraction MRR - Churned MRR) / Starting MRR
```

Expansion is excluded.

If starting recurring revenue is absent or the cohort is not meaningful, GRR is **UNKNOWN / N/A**.

## 22. NRR

```text
NRR = (Starting MRR + Expansion MRR - Contraction MRR - Churned MRR) / Starting MRR
```

New-logo revenue is excluded.

If starting recurring revenue is absent or the cohort is not meaningful, NRR is **UNKNOWN / N/A**.

## 23. Logo retention

```text
Logo Retention = (Starting Paying Logos - Churned Paying Logos) / Starting Paying Logos
```

Use a clearly defined cohort/period and exclude newly acquired logos from the numerator/denominator.

Current Foremention logo retention: **UNKNOWN / N/A**.

## 24. CAC

Canonical company view:

```text
Fully Loaded CAC = attributable Sales + Marketing acquisition cost / New Paying Logos
```

The spend policy must state whether it includes founder selling time, allocated tooling, commissions, agencies, and overhead. A second “paid-channel CAC” may be shown for channel optimization, but it must not replace company CAC.

Current Foremention CAC: **UNKNOWN / N/A**.

## 25. CAC payback

Preferred recurring-revenue view:

```text
Monthly Gross Profit per New Logo = New-Logo Monthly Recurring Revenue × Gross Margin %
CAC Payback Months = Fully Loaded CAC / Monthly Gross Profit per New Logo
```

Use cohort economics where possible. If gross margin or CAC is unavailable, payback is **UNKNOWN / N/A**.

## 26. LTV

Do not use an early-stage vanity LTV based on unstable churn.

When a sufficiently mature paid cohort exists, a simple recurring-revenue approximation can be:

```text
LTV = Monthly ARPA × Gross Margin % / Monthly Revenue Churn Rate
```

Prefer cohort contribution-margin LTV when enough history exists. If churn, retention, or margin is immature, LTV is **UNKNOWN / N/A**.

## 27. Magic Number

Canonical definition:

```text
SaaS Magic Number = Net New ARR in Current Quarter / Prior Quarter Sales & Marketing Spend
```

Use the same currency and exclude financing. State whether “net new ARR” includes expansion net of contraction/churn.

At Foremention’s current unknown revenue scale, Magic Number is **UNKNOWN / N/A** and should not drive decisions until recurring revenue and S&M spend are real.

## 28. Burn multiple

```text
Burn Multiple = Net Cash Burn / Net New ARR
```

Use the same measurement period for both. If net new ARR is non-positive or unavailable, report **UNKNOWN / N/A** rather than forcing a favorable ratio.

Current Foremention burn multiple: **UNKNOWN / N/A**.

## 29. Gross margin

```text
Gross Margin = (Recognized Revenue - Direct COGS) / Recognized Revenue
```

Provider-only margin is a diagnostic, not full company gross margin.

Current Foremention gross margin: **UNKNOWN / N/A**.

## 30. Rule of 40

Use only after Foremention has a meaningful recurring-revenue base and a stable annual growth measurement.

Canonical version:

```text
Rule of 40 = Year-over-Year Recurring Revenue Growth % + EBITDA Margin %
```

A free-cash-flow-margin variant may be used, but the board must pick one and remain consistent.

Current Foremention Rule of 40: **UNKNOWN / N/A**.

---

# F. Product cost architecture

## 31. Cost taxonomy

### Provider variable cost

Track by:

- provider;
- model/version;
- request/attempt;
- question/prompt;
- run;
- workspace/organization;
- package;
- success/failure/retry;
- provider-reported versus estimated cost;
- period.

### Direct infrastructure

Track customer-serving portions of:

- application compute;
- database/storage;
- egress;
- queues/background jobs;
- observability required for service delivery;
- direct third-party APIs;
- email/webhook delivery where material.

Allocation methods must be documented. Do not invent precision that vendor billing cannot support.

### Support cost

Track:

```text
Support Cost per Account = attributable support labor + support tooling/third-party cost allocated to account
```

Founder support time may be modeled as **ASSUMPTION** for planning even when no cash payroll is paid, but it must remain separate from **ACTUAL** cash expense.

### Implementation cost

Track onboarding/setup work separately from ongoing support:

- kickoff/scoping;
- buyer-question setup;
- competitor setup;
- integrations;
- data/security/procurement work;
- training;
- founder/CS/engineering implementation labor.

This is essential for enterprise deals where healthy recurring margin can be obscured by heavy onboarding burden.

## 32. Unit-cost formulas

### Cost per run

```text
Provider Cost per Run = sum(ai_cost_events for run)
Fully Loaded Direct Cost per Run = provider cost + allocated direct compute/queue/storage + directly attributable operations
```

Separate failed-run and completed-run economics.

### Cost per question

```text
Cost per Completed Question Observation = direct cost attributable to successful question observations / completed question observations
```

Also report:

```text
Wasted Attempt Cost = cost of failed/retried attempts not producing a completed observation
```

### Cost per Recommendation Record

```text
Cost per Reviewable Record = direct cost for runs reaching reviewable-record state / reviewable Recommendation Records
```

### Cost per workspace / account

```text
Direct Cost per Account = provider + direct infrastructure + variable support + implementation amortization policy where appropriate
```

Report by package and usage cohort once real paid accounts exist.

## 33. Provider-cost reconciliation

Monthly process:

1. Sum `ai_cost_events` by provider/model/cost source.
2. Reconcile to vendor billing statement.
3. Measure variance between internal estimate/provider-reported amount and invoiced amount.
4. Investigate material differences.
5. Update configured rates only with dated source evidence.
6. Preserve historical rate versions; do not rewrite old economics with new prices.

## 34. Gross-margin bridge

Board/finance should be able to explain:

```text
Revenue
- Provider AI/search cost
- Customer-serving compute/database/queue/storage
- Variable support/implementation classified as COGS
- Other direct third-party cost
= Gross Profit
```

Then show the operational drivers:

```text
Gross Margin change
= price/mix effect
+ usage effect
+ provider-rate effect
+ retry/reliability effect
+ infrastructure-efficiency effect
+ support-burden effect
```

---

# G. Budgeting and capital allocation

## 35. Annual budget architecture

Build the annual budget from monthly drivers, not annual lump sums.

Every budget line must include:

```text
department
owner
vendor/role/program
accounting category
monthly budget
truth label
scenario
business purpose
metric/decision supported
start/end date
renewal/termination date
committed versus discretionary
approval level
```

## 36. Quarterly reforecast

At quarter end:

1. lock historical actuals;
2. compare actual versus prior forecast;
3. explain variance by driver;
4. update remaining months with new evidence;
5. re-run Conservative/Base/Aggressive scenarios;
6. review runway and hiring gates;
7. approve a new forecast version explicitly;
8. archive the prior version without overwriting it.

## 37. Budget owners

| Budget area | Primary owner | Required operating linkage |
| --- | --- | --- |
| Provider + infrastructure | Engineering/SRE + Finance | usage, reliability, gross-margin path |
| Product/R&D | Product/Engineering | activation, retained value, reliability, strategic moat |
| Sales | Founder/Sales lead | qualified pipeline, wins, sales cycle, CAC evidence |
| Marketing | Growth/Marketing | qualified demand, channel economics, CAC evidence |
| Customer success/support | CS/Founder | activation, retention, outcomes, support burden |
| G&A | CEO/Finance | legal/entity/accounting/security/company operations |
| Hiring | CEO + function owner + Finance | bottleneck, workload, revenue/cash/runway gate |

A budget being approved does not require it to be spent. Unused budget is not a failure.

## 38. Capital allocation hierarchy

Prioritize spend in this order unless an explicit decision changes it:

1. keep the service secure, available, and legally/operationally viable;
2. protect evidence integrity and tenant isolation;
3. unblock real customer activation/retention/revenue;
4. fix material unit-economics/reliability bottlenecks;
5. build repeatability in proven GTM/customer workflows;
6. invest in compounding data/product moat;
7. expand markets/channels only after primary motion shows evidence.

Avoid hiring or marketing spend that increases burn without a measurable bottleneck or learning objective.

---

# H. Hiring plan linked to economics

## 39. Required hire gate

No role enters the approved hiring plan until all are answered:

- What bottleneck exists now?
- What evidence proves it is recurring rather than temporary?
- What customer/revenue/reliability risk does it create?
- Can product/process/automation/contractors solve it first?
- What output will the role own?
- What metric should improve if the hire works?
- What is the fully loaded monthly cash cost?
- What one-time recruiting/equipment cost exists?
- What month is the cash outflow expected to start?
- How does the hire change runway under all scenarios?
- What happens if the hire is delayed?
- What evidence cancels the hire before start date?

If compensation is not approved, the cost is **UNKNOWN**. Placeholder market salary values are **ASSUMPTION**, never payroll actuals.

## 40. Hiring trigger categories

### Engineering / platform

Trigger only when customer value/reliability/security work exceeds sustainable capacity and the bottleneck is not mostly poor prioritization.

### AI/data/evaluation

Trigger when provider/evaluation quality, cost optimization, benchmark integrity, or data-model work becomes a material customer/retention/economics constraint.

### Customer success / implementation

Trigger when active customer onboarding, evidence review, implementation, or renewal workload risks retention and cannot be made repeatable through product/process first.

### Sales

Trigger after founder-led selling has a repeatable ICP, qualification motion, close process, and enough qualified opportunity volume to justify dedicated capacity.

### Marketing/growth

Trigger after at least one channel or content/distribution motion shows evidence of producing qualified demand economically enough to scale.

### Finance/operations

Trigger when close, tax/accounting, vendor controls, contracting operations, payroll, board reporting, and cash management exceed safe founder/manual capacity.

## 41. Hiring affordability test

For every proposed hire, scenario-test:

```text
Incremental Monthly Cash Burn
New Forward Runway
Minimum Cash Month
Required Revenue / Gross Profit contribution where applicable
Workload removed or capacity added
```

A role may be strategically necessary even without immediate revenue contribution, but the tradeoff must be explicit.

---

# I. Board reporting system

## 42. Board pack principles

The board pack should be short enough to drive decisions and deep enough to preserve truth. Every financial table must show truth labels and comparison periods.

Never present:

- targets as actuals;
- pipeline as ARR;
- billings as recognized revenue;
- collections as ARR;
- internal/demo organizations as customers;
- provider-only margin as gross margin;
- a scenario as forecast unless explicitly approved;
- synthetic customer evidence as traction.

## 43. Canonical board pack structure

### 1. Company overview

- mission/category/wedge;
- current strategic constraint;
- what materially changed since prior board meeting;
- top decisions needed.

### 2. KPI dashboard

Show only decision-grade metrics:

- paying organizations — **ACTUAL / UNKNOWN**;
- MRR / ARR — **ACTUAL / CONTRACTED / FORECAST** side by side where available;
- activated organizations;
- weekly retained-value organizations;
- gross margin — **ACTUAL / UNKNOWN**;
- cash — **ACTUAL / UNKNOWN**;
- net burn — **ACTUAL / UNKNOWN**;
- runway — **ACTUAL-derived / FORECAST / UNKNOWN**;
- major reliability/cost guardrails.

### 3. Customers

- new wins/losses;
- active pilots/design partners;
- activation/retention cohorts;
- renewals/expansions/churn;
- customer concentration;
- verified outcome evidence;
- key customer risks.

### 4. Product

- activation path;
- retained comparable cycles;
- Recommendation Records reviewed;
- actions completed;
- reliability/evidence/comparability issues;
- highest-value roadmap decisions.

### 5. GTM

- qualified pipeline, clearly separate from revenue;
- stage movement and aging;
- win/loss reasons;
- pricing/WTP evidence;
- sales-cycle evidence;
- channel/CAC evidence only when real.

### 6. Finance

- P&L actual versus budget/forecast;
- ARR/MRR bridge;
- recognized revenue/billings/collections bridge;
- COGS and gross-margin bridge;
- cash-flow bridge;
- burn/runway;
- scenario/sensitivity changes;
- material accounting/reconciliation gaps.

### 7. Hiring

- current headcount by function;
- approved openings;
- proposed roles and bottleneck evidence;
- loaded cash impact;
- runway effect;
- roles deferred/cancelled.

### 8. Risks

Use a small risk register:

```text
risk
probability
impact
leading indicator
mitigation
owner
due date
truth/evidence state
```

Include customer concentration, provider dependency, cost anomalies, runway, security, legal/compliance, hiring, product reliability, and GTM risks when material.

### 9. Asks

Every ask should specify:

- decision/advice/introduction required;
- context;
- evidence;
- deadline;
- consequence of delay.

### 10. Next-quarter priorities

No more than a few company priorities, each with:

- owner;
- success evidence;
- leading indicators;
- budget impact;
- stop/defer criteria.

## 44. Board KPI bridge format

For every important finance metric show, when available:

```text
Prior ACTUAL
Current ACTUAL
Current CONTRACTED
Prior FORECAST
Current FORECAST
Variance
Reason
Action
```

Do not force blank truth states into the table. **UNKNOWN** is an acceptable board answer when accompanied by a plan to close the data gap.

---

# J. Cash controls

## 45. Approval-limit architecture

No currency thresholds are invented here. Set them only after current cash, operating scale, banking setup, and governance are known.

Required tiers:

| Tier | Amount | Approval |
| --- | --- | --- |
| Routine in-budget spend | **UNKNOWN — approval threshold A** | Budget owner within approved category |
| Material in-budget spend | **UNKNOWN — threshold A to threshold B** | Budget owner + Finance/CEO |
| Large/new/unbudgeted commitment | **UNKNOWN — above threshold B** | CEO + Finance; board approval when governance requires it |
| Multi-period/strategic obligation | **UNKNOWN — threshold C or contract-duration trigger** | CEO + Finance + legal/procurement review; board where required |

Rules:

- approvals are based on total contractual commitment, not just first invoice;
- splitting invoices to evade limits is prohibited;
- auto-renewing contracts count at the expected renewal commitment;
- unbudgeted spend requires a named funding source or offset;
- security/privacy/legal review is separate from financial approval.

## 46. Vendor management

Every vendor record should include:

```text
vendor
owner
purpose
category
contract start/end
renewal date
auto-renewal
billing cadence
currency
committed value
actual spend
truth label
payment method
system/data access
security/privacy review
cancellation notice period
replacement/exit plan
```

Quarterly vendor review:

- still used?
- duplicate capability?
- current owner?
- price changed?
- security scope changed?
- contract can be reduced/cancelled?
- spend matches approved budget?

## 47. Subscription controls

- Maintain one canonical subscription register.
- Use company-controlled payment methods.
- Avoid personal-card shadow subscriptions where possible.
- Record renewal/cancellation date at purchase time.
- Require owner reassignment before employee/contractor offboarding.
- Review unused seats and duplicate tools regularly.
- Annual prepayment requires a cash/runway and vendor-lock-in decision, not just nominal discount logic.

## 48. Reimbursements

Policy must require:

- business purpose;
- receipt/invoice where available;
- date/vendor/currency;
- correct budget category;
- approver other than claimant for material spend;
- timely submission;
- treatment of taxes/FX/fees according to accounting policy.

Reimbursement thresholds remain **UNKNOWN** until finance policy is approved.

## 49. Contractor spend

Before engagement:

- scope/deliverable;
- owner;
- rate/fee and total commitment;
- contract/IP/confidentiality terms where appropriate;
- data/system access;
- start/end date;
- acceptance criteria;
- budget source;
- worker-classification/accounting review where required.

Every contractor renewal must be re-approved; no indefinite “temporary” spend by default.

## 50. Infrastructure anomaly controls

Create alerts/review for:

- provider spend spikes;
- retry/failure cost spikes;
- cost per completed run/question deterioration;
- unexpected model/provider mix;
- monthly organization spend approaching entitlement cap;
- database/storage/egress step changes;
- queue/background-job anomalies;
- duplicated or runaway scheduled work;
- billing-provider/entitlement mismatch.

An anomaly alert is not a finance actual until reconciled, but it should trigger immediate operational review.

## 51. Payment and banking controls

When banking/accounting operations are established:

- least-privilege bank access;
- dual approval for high-risk/large transfers according to approved thresholds;
- no shared credentials;
- MFA/hardware-key protection where available;
- controlled beneficiary changes;
- separate approval from payment execution where practical;
- monthly bank reconciliation;
- documented emergency-payment process;
- immediate offboarding of former staff/contractors from financial systems.

Threshold amounts remain **UNKNOWN** until governance is approved.

---

# K. Capital efficiency and financing discipline

## 52. Capital efficiency hierarchy

Track capital efficiency through progressively stronger evidence:

1. cost to create a usable Recommendation Record;
2. cost to activate an external organization;
3. cost to produce a retained comparable cycle;
4. cost to acquire a paying customer;
5. gross profit generated per customer/cohort;
6. payback and retention;
7. burn multiple once recurring revenue is meaningful.

Do not optimize CAC before Foremention knows which customers retain and what they cost to serve.

## 53. Fundraising and cash-planning rule

A financing scenario must be separated from the operating business:

```text
Operating Cash Flow before Financing
Financing Inflow
Financing Fees/Costs
Ending Cash after Financing
```

Any modeled raise amount is **ASSUMPTION** until an executed financing commitment exists; once legally committed it may be **CONTRACTED** according to counsel/accounting treatment, and once received/reconciled it is **ACTUAL** cash financing.

Fundraising should be tied to milestones and runway, not vanity headcount. The board should be able to answer:

- what milestone the capital buys;
- what evidence would justify accelerating spend;
- what downside plan exists if financing is delayed;
- which hires/commitments are reversible;
- what minimum cash reserve is protected.

---

# L. Finance data implementation backlog

## 54. Immediate source-of-truth gaps

Until these are connected/reconciled, affected metrics stay **UNKNOWN**:

- bank/cash source;
- accounting ledger;
- production billing/subscription export;
- signed-contract/order-form register;
- invoice/collections/refund schedule;
- payroll/contractor ledger;
- vendor/subscription register;
- infrastructure vendor invoices;
- provider cost ledger reconciliation to invoices;
- S&M spend ledger;
- approved revenue-recognition/accounting policy.

## 55. Required finance data mart

Create a finance-safe reporting layer only after authoritative sources exist. Minimum derived tables/views:

```text
finance_months
finance_contracts
finance_subscription_snapshots
finance_revenue_bridge
finance_cash_ledger
finance_vendor_spend
finance_headcount_cost
finance_provider_cost
finance_infrastructure_cost
finance_customer_cogs
finance_budget
finance_forecast_versions
finance_metric_snapshots
finance_board_snapshots
```

Do not duplicate sensitive PII into product analytics. Finance reporting should use internal account/organization IDs and secure access boundaries.

## 56. Forecast-version contract

Each forecast version needs:

```text
forecast_id
name
created_at
approved_at
approved_by
base_actual_period
scenario_source
assumption_set_version
notes
supersedes_forecast_id
```

Once approved, a forecast is immutable. New information creates a new version.

## 57. Model QA checklist

Before any board/investor/leadership use:

- actual periods reconcile to authoritative sources;
- every financial value has a truth label;
- contracted revenue ties to contracts/subscriptions;
- recognized revenue follows approved accounting policy;
- cash ties to bank/accounting;
- provider costs reconcile to cost events/vendor statements;
- infrastructure allocation method is documented;
- one-time revenue is not hidden inside ARR/MRR;
- pipeline is excluded from actual/contracted revenue;
- new-logo, churn, contraction, and expansion bridges balance;
- ARR bridge ties beginning to ending ARR;
- gross-margin denominator is real and COGS is complete enough;
- headcount costs start in the correct month;
- financing is excluded from revenue;
- scenario cells are assumptions unless explicitly approved as forecast;
- runway ties to cash flow;
- board metrics tie back to the model, not a separate spreadsheet.

---

# M. Current decision register

## 58. Decisions that are safe now

- **ACTUAL:** Foremention has product-level provider-cost instrumentation and cost-control architecture sufficient to support bottom-up unit economics once production data is reconciled.
- **ACTUAL:** current public package structure is Core / Signal / Intelligence with no fabricated public dollar pricing.
- **UNKNOWN:** verified paying-customer count.
- **UNKNOWN:** MRR.
- **UNKNOWN:** ARR.
- **UNKNOWN:** recognized revenue.
- **UNKNOWN:** ACV.
- **UNKNOWN:** gross margin.
- **UNKNOWN:** CAC and CAC payback.
- **UNKNOWN:** LTV.
- **UNKNOWN:** GRR and NRR.
- **UNKNOWN:** net burn.
- **UNKNOWN:** current cash.
- **UNKNOWN:** runway.
- **UNKNOWN:** approved salary/hiring budget.
- **UNKNOWN:** approved cash-approval thresholds.

## 59. Finance operating sequence

1. Establish bank/accounting source of truth.
2. Reconcile billing/contracts/collections.
3. Reconcile provider and infrastructure cost.
4. Close the first complete monthly actual period.
5. Populate the 36-month model with **ACTUAL** history and explicitly labeled **ASSUMPTION** drivers.
6. Run Conservative/Base/Aggressive scenarios.
7. Approve one version as **FORECAST** only when leadership is ready.
8. Link hiring and discretionary spend to runway and bottlenecks.
9. Produce the first truth-labeled board pack.
10. Repeat monthly close, quarterly reforecast, and board review without rewriting history.

The financial system is successful when Foremention can answer, from reconciled sources: **what is contracted, what was earned, what was collected, what it cost to serve, what cash remains, how long it lasts, and which next dollar of spend most improves durable customer value.**
