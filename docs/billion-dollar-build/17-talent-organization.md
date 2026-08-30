# Foremention — Talent, Organization, Culture, and Founder Leverage

Status: operating design for future organizational scale. This document is a hiring and management system, not evidence that the described roles, teams, compensation plans, or headcount already exist.

Audit date: 2026-08-30

Repository baseline inspected: `main` at `df92e0eb78edda5c8c621bb1388c5b519b8da1e8` before this document was created.

## 0. Truth contract

Foremention must apply the same evidence discipline to organization design that it applies to Recommendation Intelligence.

Use these labels throughout this document:

- **VERIFIED REPO FACT** — directly supported by current repository documentation or implementation.
- **UNKNOWN** — the repository does not establish the fact. Do not infer it from activity, commits, tooling, contributors, or ambition.
- **OPERATING DESIGN** — a recommended organizational mechanism to adopt when needed.
- **HIRE TRIGGER** — an observable condition that justifies adding capacity or specialization. It is not a date or fundraising promise.
- **ASSUMPTION** — a planning hypothesis that requires validation before it is used for a real employment, compensation, or financial decision.

### Current company facts recovered from the repository

1. **VERIFIED REPO FACT — founder-led commercial motion.** Foremention currently uses founder-led design-partner/customer-proof work rather than a scaled sales organization.
2. **VERIFIED REPO FACT — founder/operator incident ownership.** The controlled private-beta policy names Founder / Operator as the primary incident owner until a named security or operations role is formally delegated.
3. **VERIFIED REPO FACT — founder approval authority.** The repository constitution requires founder review before material UI, product, brand, SEO, investor, accelerator, or design-system changes.
4. **VERIFIED REPO FACT — current phase is controlled private beta/customer proof.** The operating system emphasizes real customer evidence, verified value, activation, repeated comparable measurement, and honest commercial proof.
5. **VERIFIED REPO FACT — evidence integrity, human review, tenant isolation, security, exact-state verification, and no fabricated business proof are non-negotiable product principles.
6. **UNKNOWN — employee roster.** The repository does not establish a complete real-world employee roster.
7. **UNKNOWN — whether engineering, product, support, finance, marketing, design, security, sales, or operations currently have separately employed human owners.** Repository authorship, automation, tools, agents, commits, and integrations are not employee evidence.
8. **UNKNOWN — payroll, salary bands, equity grants, option pool, geographic compensation policy, commissions, benefits, or employment jurisdictions.** None may be treated as real until separately verified.

The organizational goal is therefore not “hire the org chart.” It is to remove proven constraints while keeping ownership clear and burn disciplined.

---

## 1. Organization design doctrine

Foremention should scale functions only when complexity, customer risk, revenue opportunity, or founder concentration makes the current structure measurably inadequate.

### Core rules

1. **Hire against a bottleneck, not a title.** Every role must remove a documented constraint or create a capability that is repeatedly blocking company progress.
2. **One accountable owner before one department.** A function can exist as a responsibility long before it deserves a manager or team.
3. **Keep decision distance short.** Early employees should be able to move directly from evidence to decision to shipped result.
4. **Do not create management layers to signal maturity.** Add managers when coordination load, coaching load, or risk clearly exceeds an individual leader's span.
5. **Generalists first, specialists at constraint boundaries.** Early hires should span adjacent responsibilities without compromising deep product/security/evidence requirements.
6. **Specialize where failure is expensive.** Security, infrastructure, enterprise compliance, finance, and AI-quality work should gain dedicated expertise when scale or customer exposure makes amateur ownership unsafe.
7. **Automate repeated mechanics; retain human judgment where material.** This mirrors the product philosophy: machines can accelerate collection and processing, but consequential judgment remains owned and reviewable.
8. **No hiring to compensate for a broken process.** First simplify the workflow, remove unnecessary work, document it, and automate safe repetition. Hire when meaningful work still exceeds capacity.
9. **No permanent role without a durable job.** Temporary spikes may be handled through founder time, contractor capacity, specialist counsel, or fixed-scope services before creating permanent headcount.
10. **Every role must have a measurable first-year value thesis.** The thesis may be product velocity, reliability, customer retention, revenue capacity, security readiness, or operating leverage—but it must be observable.

### Functional maturity sequence

For most functions, use this sequence:

`founder/combined ownership -> documented recurring responsibility -> measurable capacity/risk trigger -> dedicated individual contributor -> repeatable function -> team lead/manager -> specialized subfunctions`

Skip steps only when legal, security, enterprise, or operational risk requires earlier specialization.

---

## 2. Founder bottleneck map

The purpose of this map is to separate **verified founder concentration** from **possible but unverified founder execution**.

| Function | Current truth | Founder concentration risk | HIRE / DELEGATION TRIGGER | First delegation target |
|---|---|---|---|---|
| CEO / company direction | **VERIFIED REPO FACT:** company command center, founder-led operating posture, and founder approval gates exist. | Strategic decisions, customer proof, product direction, and operational escalation can converge on one person. | Founder spends >25–30% of a normal week on coordination/admin rather than customer, product, capital, or high-leverage decisions for four consecutive weeks; or major decisions repeatedly wait >3 business days for founder attention. | Operating cadence, decision logs, KPI preparation, follow-up tracking. Founder retains strategy, capital allocation, executive hiring, category, and irreversible decisions. |
| Product | **VERIFIED REPO FACT:** material product changes require founder review. **UNKNOWN:** whether a separate product employee exists. | Founder approval can become a throughput gate even if implementation capacity exists. | Three or more important product decisions per week repeatedly queue for founder interpretation; customer evidence is not being synthesized into clear priorities; or roadmap work consumes founder time that should go to customers/category. | Senior product-minded engineer or product lead owns discovery synthesis, specs, prioritization mechanics, acceptance evidence; founder retains product thesis and major bets. |
| Engineering | **UNKNOWN:** repository does not prove human staffing structure. | If founder is a primary engineering executor, reliability and feature delivery compete with CEO work. If not, the risk is still unclear ownership. | P0/P1 product work exceeds available engineering capacity for 4+ weeks; median important issue age rises; release quality declines; or founder is personally required for routine implementation/review. | Founding/product engineer with end-to-end ownership and strong security/data discipline. |
| Sales | **VERIFIED REPO FACT:** founder-led design-partner/customer-proof process. | Founder sales is valuable during discovery but eventually limits pipeline coverage and follow-up consistency. | ICP, qualification, discovery, demo, pilot packaging, and objections are repeatable; at least several opportunities can be managed concurrently; founder is missing qualified follow-up or spending >40% of time on repeatable sales mechanics rather than learning/high-value closes. | Sales/revenue operator or first AE only after motion is repeatable. Founder remains in strategic deals and discovery until learning rate drops materially. |
| Customer success / support | **UNKNOWN:** no complete human ownership roster is established. | Customer learning can remain in founder memory and reactive support can interrupt strategic work. | 5+ active external accounts or pilots create recurring onboarding/support load; response obligations interrupt founder work several times per week; or success plans/renewal risks are not updated reliably. | Customer success generalist who owns onboarding, adoption, outcome cadence, support triage, and customer evidence capture. |
| Finance | **UNKNOWN:** no verified finance staff or system of record for payroll/compensation. | Founder may carry invoicing, forecasting, runway, vendor control, and board prep without specialist review. | Real recurring revenue/payroll exists; monthly close/forecast requires >1 founder day; cash/runway decisions lack timely numbers; tax/entity/compliance complexity expands; or fundraising requires defensible model and diligence support. | Fractional accountant/controller first; strategic finance/FP&A later when planning complexity merits it. |
| Marketing / growth | **UNKNOWN:** founder brand approval is verified, staffing is not. | Founder may remain the only source of category narrative and content approval. | Messaging is stable, customer proof exists, and there is a repeatable channel with measurable qualified pipeline; founder is the throughput constraint for distribution rather than the source of necessary learning. | Product/growth marketer who can turn customer evidence into category content, lifecycle assets, and measurable demand. |
| Operations | **VERIFIED REPO FACT:** founder/operator owns incidents until delegation. Broader operations staffing is **UNKNOWN**. | Reliability, vendor, process, access, admin, hiring, finance coordination, and security follow-up can fragment founder attention. | Recurring cross-functional work produces dropped actions; founder manages >10 recurring operating threads; or administrative/coordination work exceeds ~20% of founder capacity for 4+ weeks. | BizOps/operations generalist or chief-of-staff-like operator only if the work is truly recurring and cross-functional. |
| Security / enterprise trust | **VERIFIED REPO FACT:** security/privacy/evidence boundaries are core product requirements; incident ownership is currently founder/operator. | Enterprise evaluations and incidents can overwhelm a generalist structure and create unacceptable risk. | Enterprise security reviews recur; SSO/SCIM/audit/governance commitments become commercial blockers; material incidents occur; formal control ownership is required; or founder cannot maintain evidence and remediation cadence. | Security/infra owner, then dedicated security/compliance specialist as customer/regulatory complexity grows. |

### Founder work that should not be delegated too early

Until Foremention has repeatable evidence and a trusted leadership bench, the founder should retain direct ownership of:

- category and company thesis;
- ICP definition and major ICP changes;
- product truth boundaries and major product architecture changes;
- pricing strategy while willingness-to-pay evidence is still being learned;
- capital allocation and hiring bar;
- first strategic customers and critical win/loss learning;
- executive hiring and executive performance;
- material security/customer-trust incidents;
- statements that could create legal, financial, security, or reputational commitments.

### Founder leverage scorecard

Review monthly:

- % founder time on customers, product thesis, capital, hiring, and strategic partnerships;
- % founder time on repeatable admin, triage, scheduling, reporting, QA mechanics, and follow-ups;
- decisions waiting on founder >3 business days;
- recurring tasks with no documented owner;
- customer insights captured outside founder memory;
- operational actions overdue because founder was the only coordinator;
- functions that would stop for >5 working days if founder were unavailable.

The target is not to minimize founder involvement. It is to maximize founder time on decisions where founder judgment has uniquely high leverage.

---

## 3. Organizational phases

Headcount bands describe structural patterns, not hiring commitments. Move to a new pattern only when triggers are real.

## Phase I — 1–3 people

### Objective

Prove customer value, willingness to pay, and repeatable product behavior while maintaining product truth and production safety.

### Structure

A single mission team. No departments.

Required responsibilities, whether held by one person or several:

- company/product direction;
- customer discovery and founder-led sales;
- full-stack product engineering;
- AI/data/evidence quality;
- reliability/security basics;
- onboarding/support;
- commercial/finance administration.

### Hiring bias

Prefer high-agency product builders who can cross product, engineering, customer feedback, and operations. Avoid narrow management hires.

### Add a person only when

- a repeated customer/revenue bottleneck is visible;
- critical roadmap/reliability work remains blocked despite ruthless prioritization;
- the same function consumes substantial founder time every week;
- the work is durable enough to justify permanent ownership;
- cash/runway can support the role under a downside scenario.

### Anti-patterns

- VP titles without teams or repeatable functions;
- separate PM + designer + engineering manager before product-engineering throughput requires them;
- sales team before founder-led motion is repeatable;
- growth team before message/channel fit;
- full-time HR/People before recurring people operations justify it.

## Phase II — 4–10 people

### Objective

Turn proof into repeatable delivery and retention without losing speed or evidence discipline.

### Likely functional pods

**Product/Engineering pod (3–6):** product engineers, AI/data capability, with one clear technical owner. Product ownership may remain founder-led or be delegated to a product lead when decision throughput requires it.

**Customer/Revenue pod (1–3):** customer success and/or revenue generalist; first AE only after repeatable qualification/demo/pilot motion exists.

**Operations coverage (fractional or 0–1):** bookkeeping, finance, legal/compliance coordination, recruiting operations. Keep specialist work external when full-time load does not exist.

### Leadership pattern

Player-coaches, not hierarchy. Each functional owner still ships work.

### Phase transition triggers

Move beyond this structure when:

- more than one product squad is required;
- customer base creates segmented success/support needs;
- enterprise pipeline requires dedicated security/compliance execution;
- revenue motion produces enough qualified volume for multiple quota carriers;
- managers have >6–8 direct reports with meaningful coaching/coordination load;
- cross-functional dependencies repeatedly fail without clearer team boundaries.

## Phase III — 11–25 people

### Objective

Create repeatable functional systems while protecting one product and one customer truth.

### Recommended structure

- **CEO / company leadership**
- **Product + Engineering (6–12)** — 1–2 mission squads, platform/reliability ownership, AI/data quality capability, design embedded or shared.
- **Revenue (2–6)** — founder/leader, AE(s), customer success, possibly growth/product marketing once channels are proven.
- **Operations / Finance / People (1–3)** — lean operating backbone; specialist legal/accounting/security support can remain external.
- **Security/Trust (0–2 dedicated)** — dedicated ownership if enterprise demand and control burden justify it.

### Management rule

Do not split Product and Engineering leadership merely because the company passed a headcount threshold. Split when roadmap/product discovery and engineering architecture/people management each require a full-time senior owner.

### Required systems by this phase

- explicit leveling and role expectations;
- compensation bands approved before offers;
- quarterly company objectives;
- weekly functional metrics;
- structured hiring and reference checks;
- security/access onboarding and offboarding;
- decision log and architecture/product records;
- customer lifecycle ownership;
- monthly financial close and rolling forecast;
- manager 1:1s and lightweight performance reviews.

## Phase IV — 26–50 people

### Objective

Scale multiple teams without letting functions optimize against each other.

### Possible structure

- CEO
- Product
- Engineering
- Revenue: Sales + Customer Success + Marketing/Growth
- Finance/Operations/People
- Security/Trust

### Product organization

Use 2–4 cross-functional mission teams aligned to customer outcomes or durable product domains—not component silos. Shared platform/infra is justified only if multiple squads genuinely depend on it.

### Management triggers

Add dedicated managers when a team lead cannot both ship and coach effectively, or when >7 direct reports plus hiring/performance responsibility causes quality decline.

### Cross-functional mechanisms

- company objectives with one accountable executive;
- quarterly resource allocation review;
- shared customer evidence review;
- revenue-product win/loss loop;
- incident and security review;
- architecture council for irreversible/high-blast-radius decisions only;
- leadership operating review with explicit decisions, not status theater.

## Phase V — 51–100 people

### Objective

Preserve speed, accountability, product truth, and customer evidence as specialization increases.

### Likely executive functions

- CEO
- Product
- Engineering
- Revenue/Sales
- Marketing
- Customer Success
- Finance/Operations
- People
- Security/Trust as risk and enterprise scale require

Titles depend on scope, not prestige. A VP must own a multi-team function, leaders, operating metrics, talent system, and material company outcomes.

### Required organizational controls

- annual strategy translated into bounded team missions;
- formal workforce plan tied to financial scenarios;
- leadership succession and key-person risk review;
- compensation bands and promotion calibration;
- security/compliance control owners;
- standardized but lightweight hiring evidence;
- manager training and performance calibration;
- internal knowledge architecture with clear systems of record;
- executive/customer feedback channels that bypass hierarchy when evidence requires it.

### Things to resist even at 100 people

- strategy by committee;
- coordination roles without accountable outcomes;
- permanent project-management layers for work that should have a real owner;
- dashboards without decisions;
- duplicated data stores for company truth;
- sales promises that outrun product/security reality;
- “culture fit” as a proxy for similarity.

---

## 4. Hire-trigger framework

Before opening any role, write a one-page **Hiring Case** with these fields:

1. Bottleneck or risk observed.
2. Evidence: metrics, customer commitments, queue size, response time, quality failure, founder hours, lost revenue, or control burden.
3. Why process simplification/automation cannot solve it.
4. Why contractor/fractional support is insufficient.
5. Durable responsibilities for the next 12–18 months.
6. Expected outcomes by 30 / 90 / 180 / 365 days.
7. Manager and decision rights.
8. Cost envelope from the approved financial plan.
9. Downside test: what happens if growth is 50% below plan?
10. Stop condition: what evidence would cause Foremention not to hire or to close the search?

No role opens merely because “companies at our stage have one.”

---

## 5. Hiring scorecards

Every scorecard uses observable outcomes and behaviors. Degree, employer brand, years of experience, pedigree, and location may inform context but must not substitute for demonstrated capability.

### 5.1 Founding Engineer

**Mission:** multiply product velocity while protecting the evidence, security, multi-tenant, provider, and release boundaries that make Foremention trustworthy.

**12-month outcomes:**

- owns meaningful product surfaces end to end;
- reduces founder dependency for routine architecture and delivery;
- keeps tests, RLS, provider boundaries, and release proof strong;
- improves delivery throughput without increasing escaped defects;
- joins customer/problem conversations and converts evidence into shipped improvements;
- documents durable decisions so architecture is not person-dependent.

**Scorecard dimensions:** product judgment 20%; full-stack execution 20%; systems/security rigor 20%; debugging/reliability 15%; customer empathy 10%; written reasoning 10%; learning velocity 5%.

**Work sample:** scoped repository change or realistic offline system exercise requiring product tradeoffs, tests, failure handling, and a written decision note. Never use unpaid production work.

### 5.2 Product Engineer

**Mission:** turn customer evidence into simple, high-quality product workflows across the canonical five-object architecture.

**Outcomes:** ships end-to-end customer value; improves activation/retention path; preserves accessibility/responsive quality; instruments behavior safely; writes tests and owns production follow-through.

**Evaluate:** product sense, frontend/backend fluency, interaction quality, ability to reduce scope, testing, customer reasoning, operational ownership.

### 5.3 Data / AI Engineer

**Mission:** make provider observations, evidence extraction, comparisons, evaluation, and intelligence reliable and measurable.

**Outcomes:** versioned evaluation harness; reproducible provider/model metadata; extraction-quality metrics; cost/latency controls; safe handling of uncertainty and failure; no hidden causal overclaim.

**Evaluate:** evaluation design, LLM/provider systems, data modeling, statistics, retrieval/evidence reasoning, reproducibility, cost awareness, privacy/security.

### 5.4 Infrastructure / Security Engineer

**Mission:** keep Foremention dependable, tenant-safe, observable, recoverable, and economically operable as customer load grows.

**Outcomes:** clear SLOs and incident ownership; tested restore/recovery; least privilege; secrets/identity discipline; reliable queues/provider execution; cost visibility; fast root-cause analysis; enterprise-grade evidence where justified.

**Evaluate:** production debugging, cloud architecture, IAM, database/RLS thinking, incident command, threat modeling, cost/reliability tradeoffs, documentation.

### 5.5 Product Designer

**Mission:** make decision-grade recommendation evidence understandable and usable without weakening the locked product/brand architecture.

**Outcomes:** improves comprehension/activation; creates reusable interaction patterns; validates designs with real users; protects accessibility; reduces UI complexity; works inside canonical product and brand boundaries rather than redesigning for novelty.

**Evaluate:** information architecture, enterprise workflow design, evidence visualization, prototyping, research quality, accessibility, collaboration with engineering.

### 5.6 Customer Success

**Mission:** make signed customers reach verified value, repeat it, and convert learning into retention/expansion evidence.

**Outcomes:** time-to-value improves; implementation plans stay current; every account has outcomes/risks/next actions; comparable remeasurement happens; support is triaged; renewal risk is surfaced early; no false ROI or causality claims.

**Evaluate:** onboarding, analytical communication, stakeholder management, product fluency, escalation judgment, commercial awareness, disciplined record keeping.

### 5.7 Account Executive

**Mission:** convert qualified ICP demand into truthful, economically sound customer relationships.

**Hire only after:** qualification, discovery, demo, pilot packaging, objection patterns, and pricing process are repeatable enough to teach.

**Outcomes:** clean pipeline hygiene; accurate qualification; disciplined next actions; strong discovery; appropriate commercial terms; no overpromising; win/loss evidence fed back into product/company decisions.

**Evaluate:** discovery, qualification, deal strategy, writing, enterprise process, forecast discipline, integrity under pressure, learning from losses.

### 5.8 Growth / Product Marketing

**Mission:** turn Foremention’s verified product and customer truth into category understanding and qualified demand.

**Outcomes:** clear category narrative; customer-backed content; measurable channel experiments; sales enablement; better qualified pipeline; no fabricated proof or generic AI claims.

**Evaluate:** positioning, customer research, writing, distribution, analytics, experiment design, product fluency, evidence discipline.

### 5.9 Operations / Finance

**Mission:** create a reliable company operating backbone while keeping overhead low.

**Outcomes:** clean monthly close/forecast; cash/runway visibility; vendor and approval discipline; operating cadence; hiring/contractor administration; board/investor support; risks surfaced early; systems of record maintained.

**Evaluate:** financial reasoning, operational design, detail accuracy, prioritization, controls, written communication, ability to automate/standardize without bureaucracy.

### 5.10 Enterprise Security / Compliance

**Mission:** convert real security architecture into credible customer trust and scalable control operations without claiming certifications or controls that do not exist.

**Outcomes:** security questionnaires become faster and evidence-backed; control owners/evidence are current; customer commitments are tracked; access/vendor/incident processes mature; audit readiness increases; product/security gaps enter roadmap with severity and owner.

**Evaluate:** security controls, enterprise procurement, risk assessment, evidence management, privacy awareness, communication, ability to distinguish current fact from roadmap.

---

## 6. Interview system

### 6.1 Standard hiring funnel

Use a structured funnel with the same scorecard for every candidate in the role:

1. **Application / evidence screen — 20–30 minutes of reviewer time.** Look for relevant outcomes and craft, not pedigree.
2. **Hiring-manager screen — 30–45 minutes.** Confirm motivation, scope, role fit, and two or three scorecard dimensions.
3. **Work sample — 60–180 minutes candidate time maximum unless compensated.** Mirror real Foremention work without using production/customer secrets.
4. **Structured deep dives — 2–4 interviews.** Each interviewer owns distinct dimensions; avoid duplicate “vibe” interviews.
5. **Founder interview while company is small / role is senior.** Test mission, judgment, truth discipline, speed, and ownership.
6. **Reference checks.** Validate the highest-risk claims and operating behaviors.
7. **Written decision.** Hire/no-hire against evidence before group discussion to reduce conformity bias.

### 6.2 Interview evidence scale

For every scorecard dimension:

- **4 — exceptional evidence:** repeated high-scope outcomes; candidate explains tradeoffs, failures, and impact with precision.
- **3 — strong evidence:** clearly meets the required bar in relevant contexts.
- **2 — mixed evidence:** plausible but incomplete, overly assisted, shallow, or limited in comparable scope.
- **1 — weak evidence:** examples do not demonstrate the capability.
- **0 — contrary evidence:** behavior would create material risk.

No averaging away a `0` on integrity, security judgment, or truthfulness for roles where those are critical.

### 6.3 Technical evaluation principles

- use realistic debugging, architecture, implementation, or analysis tasks;
- permit normal tools unless the skill being tested specifically requires unaided reasoning;
- ask candidates to explain what they would verify rather than reward memorized trivia;
- inspect testing, failure handling, observability, security, and maintainability—not only happy-path completion;
- do not require candidates to reproduce Foremention proprietary work;
- avoid algorithm puzzles unless the role genuinely requires them.

### 6.4 Product / business work samples

Examples:

- prioritize five competing customer requests using supplied evidence;
- critique an activation funnel and propose one experiment;
- build a customer success plan from a fictional pilot record;
- qualify a fictional account and run a discovery role-play;
- create a forecast from deliberately incomplete data while labeling unknowns;
- respond to an enterprise security questionnaire using a provided evidence packet and refusing unsupported claims.

### 6.5 Reference checks

Ask references for concrete observations:

- What outcomes did this person directly own?
- What was the hardest feedback they received and what changed afterward?
- When did they create leverage for others?
- What type of environment makes them less effective?
- Would you hire them again into this exact scope? Why or why not?
- What should their manager know in the first 90 days?

Do not ask references to disclose protected personal information or irrelevant private matters.

### 6.6 Values / culture evaluation

Do not ask “Are they a culture fit?” Score specific operating behaviors:

- distinguishes fact from assumption;
- changes view when evidence changes;
- can move fast without misrepresenting state;
- raises security/privacy/customer risk early;
- accepts human review and disagreement where judgment matters;
- owns outcomes rather than activity;
- writes decisions clearly;
- treats customer evidence as a learning input, not a sales prop.

---

## 7. Performance operating system

Foremention should use a lightweight performance system that increases clarity, not paperwork.

### 7.1 Every role has five layers

1. **Mission** — why the role exists.
2. **Outcomes** — 3–5 durable results expected over 6–12 months.
3. **Current objectives** — a small set of quarterly priorities.
4. **Operating expectations** — quality, communication, security, collaboration, customer handling, and ownership.
5. **Growth expectations** — capabilities required for the next level.

### 7.2 Weekly

Each person should know:

- top outcomes this week;
- blocked decisions;
- customer/security/reliability risks;
- one or two measurable signals of progress;
- commitments that slipped and why.

Avoid status reporting that can be read from systems. Meetings exist to decide, unblock, learn, or coordinate.

### 7.3 Manager 1:1s

Default agenda:

- outcomes and blockers;
- decisions needing manager help;
- customer/team signals;
- feedback in both directions;
- workload/scope clarity;
- growth or role-design question.

Do not turn 1:1s into task-list recitations.

### 7.4 Quarterly objectives

Each individual/team objective should have:

- outcome statement;
- owner;
- baseline where known;
- target or completion test;
- source of truth;
- dependencies;
- risk/constraint;
- explicit non-goals.

Objectives may be qualitative when the work is foundational, but the completion test must still be observable.

### 7.5 Feedback

Use continuous, specific feedback:

`observation -> impact -> expected standard -> next behavior`

Praise should be equally specific so the company learns which behaviors to repeat.

### 7.6 Reviews

Until the company is large enough to justify more process, use two formal reviews per year plus continuous feedback.

Review:

- outcomes achieved;
- quality and judgment;
- ownership and reliability;
- company operating principles;
- scope handled;
- leverage created for others;
- next-level gaps.

Do not use forced ranking.

### 7.7 Promotion

Promotion recognizes sustained operation at a larger scope; it is not a reward for tenure or a retention emergency.

Evidence should show, for a meaningful period:

- next-level outcomes;
- wider decision scope;
- higher ambiguity handled;
- stronger cross-functional leverage;
- maintained quality/security/customer standards.

Create compensation corrections separately when someone is underpaid; do not manufacture a title change solely to fix pay.

### 7.8 Accountability

When performance is below expectations:

1. clarify the expectation and evidence;
2. determine whether the issue is skill, will, role design, resourcing, manager failure, or unclear priority;
3. set a short written improvement plan with outcomes and support;
4. review frequently;
5. make a timely role-change or separation decision if the gap remains material.

High standards and humane management are compatible. Prolonged ambiguity is unfair to both the person and the team.

---

## 8. Foremention operating culture

These are operating principles derived from the product/company system, not generic slogans.

### 8.1 Evidence before assertion

State what is known, unknown, inferred, assumed, and targeted. A confident unsupported claim is worse than an explicit unknown.

**In practice:** metrics have sources; customer claims have records; security claims have evidence; hiring decisions have scorecards; roadmap claims identify their evidence.

### 8.2 Customer truth before vanity

Real customer behavior, pain, payment, retention, and outcomes outrank social attention, feature count, inflated pipeline, or synthetic benchmarks.

**In practice:** do not call a demo organization a customer, a proposal revenue, a login retention, or a feature launch value.

### 8.3 Exact state before implementation

Recover the real current state before changing it.

**In practice:** inspect production/repository/customer context, understand constraints, then act. Do not rebuild what already works because documentation was not read.

### 8.4 Human review where judgment matters

Automation should accelerate evidence collection and repeated work, not erase responsibility.

**In practice:** consequential recommendations, customer claims, material security decisions, hiring decisions, and irreversible changes have named human owners.

### 8.5 Security and privacy are product quality

A feature that weakens tenant isolation, secret handling, evidence integrity, or customer trust is not “done.”

**In practice:** security issues are product issues; least privilege and data minimization are normal engineering constraints.

### 8.6 Speed without lying

Move quickly by narrowing scope, automating mechanics, making reversible decisions, and shipping evidence—not by hiding incomplete work.

**In practice:** `UNKNOWN`, `N/A`, “not yet supported,” and “not comparable” are valid outputs.

### 8.7 Decisions leave a trace

Important decisions should be reconstructable later.

**In practice:** record context, evidence, owner, decision, date, expected result, and revisit condition.

### 8.8 Own the outcome, expose the limitation

A person owns the result of their work and communicates constraints before they become surprises.

**In practice:** no “my ticket was done” when the customer flow is broken; no silent risks because another team technically owns the system.

### 8.9 Reduce before adding

Complexity carries long-term organizational and product cost.

**In practice:** remove unnecessary features, meetings, metrics, handoffs, tools, and roles before adding new ones.

### 8.10 Disagreement is resolved by evidence and decision rights

Healthy challenge is expected. Endless consensus is not.

**In practice:** surface contrary evidence early, identify the decision owner, decide, record why, and revisit when the predefined evidence changes.

---

## 9. Compensation architecture

No company-specific salary or equity numbers are established here.

### 9.1 Compensation truth rules

- **UNKNOWN:** current Foremention salary bands, option pool, grants, commission rates, benefits, payroll jurisdictions, and geographic-pay policy.
- Never quote an internal compensation number as approved until the financial plan, legal/employment setup, and founder/board authority support it.
- Every offer should use the current approved band for role, level, and location policy—not ad hoc negotiation as the primary pricing mechanism.

### 9.2 Salary bands — OPERATING DESIGN

For each role family and level, maintain:

- band minimum;
- band midpoint / market reference;
- band maximum;
- currency;
- geographic policy;
- employment type;
- review date;
- market data sources;
- approved exceptions and rationale.

Target offers should normally fall within band. Out-of-band offers require explicit approval and a written reason.

### 9.3 Leveling

Use a small number of levels early.

For individual contributors, distinguish levels by:

- scope of problems;
- ambiguity handled;
- independence;
- technical/domain depth;
- cross-functional influence;
- leverage created;
- consequence of decisions.

For managers, add:

- quality of hiring;
- coaching and performance management;
- team system design;
- succession;
- cross-team resource decisions.

Do not create levels faster than the company can distinguish them consistently.

### 9.4 Equity

**OPERATING DESIGN:** equity should reflect role scope, stage risk, scarcity, cash/equity tradeoff, and expected company-building impact.

Before making grants, verify:

- legal entity and cap table;
- authorized equity plan/pool;
- board/shareholder approvals as required;
- instrument type and jurisdiction;
- vesting and exercise terms;
- tax and securities implications with qualified counsel;
- dilution impact.

Do not promise a percentage or instrument the company is not authorized to grant.

### 9.5 Geographic pay

Choose and document one philosophy before hiring across regions. Examples to evaluate:

- location-neutral bands;
- geographic zones;
- local-market bands with global role calibration.

Selection criteria: hiring markets, internal fairness, cost structure, legal/payroll complexity, employee mobility, and long-term talent strategy.

**ASSUMPTION:** no specific approach is approved by this document.

### 9.6 Sales incentives

Do not introduce commission before there is a repeatable motion and reliable revenue attribution.

When ready, design variable compensation around:

- verified booked/collected revenue as appropriate;
- gross-margin guardrails where material;
- clawback/cancellation treatment;
- expansion/renewal ownership;
- discount approval;
- multi-year treatment;
- customer-quality safeguards;
- no reward for contracts that violate product/security/commercial boundaries.

### 9.7 Incentives outside sales

Do not create individual bonus systems that encourage local metric gaming. Prefer salary + equity + company/team outcome alignment unless a function has a genuinely measurable, controllable variable-output model.

---

## 10. Knowledge management — founder memory must not be the database

### 10.1 Knowledge architecture

Use explicit systems of record by domain:

| Domain | Canonical record | Minimum contents |
|---|---|---|
| Product truth | Repository constitution + product docs | architecture, evidence states, locked decisions, constraints |
| Product decisions | versioned ADR/product decision record | context, evidence, decision, owner, date, alternatives, revisit trigger |
| Customer discovery | customer research system | verbatim evidence, job/pain, behavior, stakeholder, source/date |
| Commercial pipeline | approved CRM or protected first-party commercial records | stage, amount, owner, next action, evidence, lost reason |
| Customer success | account plan / Outcome Ledger | goals, activation, action, outcome, risk, renewal/expansion status |
| Company metrics | CEO command center / financial model | definitions, source, owner, numerator/denominator, status |
| Security/trust | security control/evidence repository | control owner, implementation evidence, review date, gap/remediation |
| Incidents | incident record | timeline, scope, decision, recovery, root cause, corrective action |
| Hiring | ATS/hiring packet | approved case, scorecard, interview evidence, decision, references |
| People | secure HRIS when required | employment record, compensation, role/level, review history, access lifecycle |
| Finance | accounting + forecast system | actuals, commitments, forecast, cash, invoices, payroll, taxes |

Do not duplicate sensitive records into general chat, analytics, or project tools merely for convenience.

### 10.2 Decision record template

For material decisions:

- Decision ID / title
- Date
- Owner
- Status: proposed / decided / superseded
- Problem
- Current verified state
- Evidence
- Options considered
- Decision
- Why
- Risks / limitations
- Implementation owner
- Success signal
- Revisit trigger/date if applicable
- Links to source records

### 10.3 Weekly knowledge hygiene

Every week:

- convert founder/customer conversations into durable research notes;
- close or update stale next actions;
- record material product/company decisions;
- update owner changes;
- archive superseded docs rather than leaving competing truths;
- mark unknowns explicitly;
- link decisions to source evidence.

### 10.4 Meeting rule

A meeting is not a system of record. If the meeting creates a decision, commitment, customer fact, risk, or owner change, the canonical record must be updated after the meeting.

### 10.5 Bus-factor test

Quarterly, choose one critical function and ask:

> If the current owner were unavailable for two weeks, could another qualified person identify the current state, priorities, credentials/access path, risks, customer commitments, and next actions without reconstructing them from chat history?

If not, the function has unacceptable knowledge concentration.

---

## 11. Operating cadence for the organization

Keep cadence proportional to headcount.

### 1–10 people

- **Daily/async:** current priorities, blockers, incidents/customer escalations.
- **Weekly company review — 45–60 min:** customer truth, pipeline, activation/retention, product/reliability, cash/risk, decisions.
- **Weekly product/customer evidence review — 30–60 min:** what was learned; what changes priority.
- **Monthly founder/company review:** bottlenecks, cash/runway, hiring cases, customer proof, risk register.
- **Quarterly:** strategy and resource allocation, not ceremonial OKR rewriting.

### 11–50 people

Add functional reviews and a leadership decision meeting. Keep one company-wide customer/evidence narrative so functions do not diverge.

### 51–100 people

Add structured operating reviews, workforce planning, compensation/promotion calibration, succession/key-person risk, and annual strategy process. Do not increase meeting layers unless a coordination problem is measurable.

---

## 12. Manager design

### When to create a manager role

Create a manager when at least two are true:

- 6–8 people need sustained coaching/coordination from one leader;
- hiring/onboarding/performance work materially reduces that leader's ability to execute;
- team priorities require recurring allocation decisions;
- technical/product leadership and people management are both suffering;
- individual performance issues are not receiving timely management;
- the team is splitting into multiple durable workstreams.

### Manager expectations

A manager is accountable for:

- outcomes of the team;
- role clarity and prioritization;
- hiring quality;
- onboarding;
- feedback/performance;
- healthy execution system;
- risk escalation;
- developing future owners;
- reducing dependence on themselves.

Management is not seniority plus meetings.

---

## 13. Contractor, advisor, fractional, or employee?

Use the lightest structure that safely fits the work.

### Contractor / specialist service

Best when work is bounded, specialized, intermittent, or implementation-specific—for example legal counsel, tax advice, penetration testing, brand production, or a fixed migration.

### Fractional owner

Best when the function needs recurring senior judgment but not full-time capacity—for example early controller/accounting, recruiting operations, or security/compliance program guidance.

### Advisor

Best for periodic strategic expertise, introductions, or domain perspective. Advisors are not substitutes for accountable operators.

### Employee

Best when the work is durable, high-context, recurring, core to competitive advantage/customer experience, and requires continuous ownership.

Before engaging anyone, use correct legal classification for the relevant jurisdiction; this document does not determine worker classification.

---

## 14. Hiring priority decision matrix

When multiple hiring cases compete, score each 1–5 on:

- customer/revenue impact;
- product/reliability risk;
- founder leverage released;
- security/compliance risk;
- durability of workload;
- scarcity/time-to-fill;
- ability to solve with automation/process;
- runway/downside affordability.

Do not mechanically hire the highest numerical score. Use the score to expose assumptions, then make a documented allocation decision.

### Typical early ordering logic

Not a fixed sequence:

- If product delivery is the primary constraint -> founding/product engineer.
- If evidence/provider quality is the primary product risk -> data/AI engineer.
- If production/customer risk is the primary constraint -> infra/security engineer.
- If customers activate but do not reliably reach repeated value -> customer success.
- If founder sales is repeatable and qualified demand exceeds follow-up capacity -> AE/revenue hire.
- If the product is strong but qualified demand generation is the constraint -> growth/product marketing.
- If enterprise security process repeatedly blocks deals -> security/compliance owner.
- If finance/admin/coordination consumes material founder capacity -> fractional finance/ops, then full-time operations when workload is durable.

---

## 15. First-90-day onboarding system

Every hire receives:

### Before day 1

- role scorecard and 90-day outcomes;
- manager and decision rights;
- equipment/access plan using least privilege;
- product truth/security reading list;
- key customer/company context stripped of unnecessary sensitive data.

### Days 1–30 — understand and ship something bounded

- learn the product truth chain and five-object architecture;
- complete security/privacy onboarding;
- observe customer evidence directly where appropriate;
- ship or own one bounded real outcome;
- identify undocumented dependencies and improve at least one.

### Days 31–60 — own a recurring outcome

- take primary ownership of a defined metric/workstream;
- make decisions inside explicit rights;
- build relationships across dependencies;
- produce a written improvement to the function's operating system.

### Days 61–90 — create leverage

- deliver the agreed 90-day result;
- reduce manager/founder dependency;
- document current state and next priorities;
- agree next two quarters of outcomes.

A successful onboarding produces autonomous ownership, not merely knowledge consumption.

---

## 16. Organizational risk register

Review monthly while small, quarterly once responsibilities are distributed.

| Risk | Early signal | Control |
|---|---|---|
| Founder becomes universal approval queue | decisions wait; founder context-switching rises | delegate reversible decisions; explicit decision rights; score founder queue |
| Premature management | meetings rise faster than throughput | player-coach default; manager trigger test |
| Sales outruns product truth | unsupported commitments / roadmap promises | commercial approval rules; deal desk later; product/security sign-off on material exceptions |
| Customer knowledge trapped in founder calls | product decisions cite memory | mandatory research record; weekly synthesis |
| Security ownership diffuse | questionnaires/incidents bounce between people | named control owners; dedicated hire trigger |
| Hiring bar drifts | interviewers use pedigree/vibe | scorecards, structured interviews, written independent scoring |
| Compensation inconsistency | ad hoc offers create inequity | bands, levels, exception approval |
| Too many specialists too early | handoffs and idle capacity | generalist early hires; durable-work test |
| Hero culture | repeated emergencies depend on one person | runbooks, ownership, automation, postmortems, rotation when scale permits |
| Process bureaucracy | people optimize for templates | every process needs a decision/risk/output purpose; delete unused process |
| AI/tool dependence obscures ownership | generated work has no accountable reviewer | named human owner; evidence/verification required for consequential outputs |

---

## 17. Organization dashboard

Do not create a people dashboard until there is enough real headcount to make it useful. When appropriate, track only actionable measures.

### Early-stage measures

- open hiring cases by bottleneck;
- time roles remain blocked before hiring decision;
- founder time allocation;
- decisions waiting on founder;
- time to productivity for new hires;
- regrettable departures (raw count at small n);
- critical roles with no backup;
- overdue performance issues;
- hiring funnel by stage, using counts rather than false percentages at tiny sample sizes.

### Later measures

Potentially add:

- offer acceptance;
- time to fill;
- quality of hire at 6/12 months;
- promotion/internal mobility;
- manager span;
- engagement/retention trends where sample size protects privacy;
- compensation-band health;
- representation metrics only with lawful, privacy-safe collection and meaningful denominators.

People metrics must never become surveillance. Measure the system, not keystrokes or performative activity.

---

## 18. Founder delegation ladder

Delegate in this order where possible:

1. **Mechanics** — scheduling, report assembly, routine triage, recurring data gathering.
2. **Processes with clear rules** — onboarding checklists, release evidence collection, CRM hygiene, invoice administration.
3. **Reversible decisions** — scoped product implementation, standard customer responses, normal vendor/process choices within budget.
4. **Domain decisions** — architecture, customer success strategy, pricing execution, hiring within a function after trusted ownership is established.
5. **Irreversible/company-defining decisions** — executive hires, major capital allocation, category/company strategy, acquisitions, major security/legal commitments; founder/board retains these as appropriate.

Delegation requires three things:

- a clear outcome;
- a decision boundary;
- an escalation condition.

If those are absent, the founder has assigned tasks, not ownership.

---

## 19. Immediate operating actions for the current phase

These are **OPERATING DESIGN** actions, not claims that the systems already exist.

1. Keep a one-page founder bottleneck log for four weeks before opening any non-critical role.
2. Establish a durable decision-record location and require it for material product/company choices.
3. Convert every future hiring idea into a Hiring Case before sourcing candidates.
4. Use the scorecards in this document as templates; customize outcomes before each search.
5. Create one explicit owner map covering product, engineering, customer success/support, finance, marketing, operations, and security. Mark unowned/unknown responsibilities instead of assigning fictional names.
6. Start a weekly customer-evidence synthesis independent of founder memory.
7. Track founder time in broad categories for one month: customer, product, engineering, sales, capital/finance, marketing, operations/admin, people. Use the result to identify the actual constraint.
8. Use fractional/specialist help where recurring workload does not justify an employee.
9. Do not hire an AE until founder-led sales has a teachable qualification/discovery/demo/pilot process and real qualified volume exceeds founder capacity.
10. Do not hire a People/HR leader until hiring volume, manager support, compliance, and employee operations create a durable full-time job.
11. Do not create VP titles until the person truly owns a multi-team function and company-level outcomes.
12. Revisit this organization design whenever the company crosses a headcount phase, enterprise risk materially changes, or the financial plan materially changes.

---

## 20. Definition of organizational readiness

Foremention is organizationally ready for the next stage only when:

- customer and company truth live in durable systems rather than founder memory;
- each material function has a real named owner or is explicitly marked unowned;
- founder attention is concentrated on uniquely high-leverage decisions;
- hiring is triggered by evidence and fits the downside financial plan;
- employees know their outcomes and decision rights;
- product/security/customer commitments remain truthful under sales pressure;
- managers exist because coordination/coaching requires them, not because headcount looks impressive;
- compensation decisions follow a documented architecture;
- important decisions are reconstructable;
- the organization can move quickly without losing the Foremention standard: **evidence before assertion, customer truth before vanity, exact state before implementation, human review where judgment matters, security/privacy as product quality, and speed without lying.**

The company should become more capable as it grows, not merely more staffed.