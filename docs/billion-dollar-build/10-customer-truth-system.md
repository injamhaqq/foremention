# Foremention — Customer Truth System

**Status:** operating contract for customer research, product discovery, win/loss, PMF evidence, feature-request evidence, and customer-advisory learning.  
**Scoped branch:** `build/billion-dollar-10-customer-truth`  
**Recovered base:** `main` at `df92e0eb78edda5c8c621bb1388c5b519b8da1e8` on 2026-08-30.  
**Repository constitution:** `CLAUDE.md`.  
**Current metric companion:** `docs/CEO-COMPANY-COMMAND-CENTER.md`.  
**Current founder proof companion:** `docs/FOUNDER-CUSTOMER-PROOF-PLAYBOOK.md`.  
**Historical validation context:** `docs/VALIDATION-SPRINT.md`.  

This document makes customer learning durable without manufacturing customer proof. It is a research and decision system, not a claim that Foremention has interviewed, won, retained, expanded, or lost any specific number of customers.

---

## 0. Customer-truth vocabulary

Every statement about a customer, prospect, market, buying behavior, pain, willingness to pay, retention, churn, expansion, competitive alternative, or product-market fit must use exactly one of these labels.

| Label | Meaning | Minimum support | Allowed use |
| --- | --- | --- | --- |
| **VERIFIED FACT** | A directly verifiable repository/product/commercial fact or an observed fact with a named source. | Repository artifact, first-party system of record, signed/paid commercial record, or other inspectable source. | Operations and reporting within the fact's scope. |
| **REAL CUSTOMER EVIDENCE** | First-party evidence from a real prospect/customer/design partner. | Attributable interview/behavior/payment/renewal/churn/expansion evidence with source and observed date. | Learning and decisions; never generalize farther than the sample supports. |
| **INTERNAL HYPOTHESIS** | A belief Foremention intends to test. | No customer proof required because it is explicitly unvalidated. | Experiment design and prioritization only. |
| **MARKET RESEARCH** | Evidence about the broader market from an external source rather than a Foremention customer. | Named external source, date, method, and relevant scope. | Context and hypothesis formation; never relabel as customer proof. |
| **FUTURE TARGET** | A desired future condition, threshold, cadence, council, metric gate, or operating state. | Explicit owner and intended use. | Planning only; never reported as achieved. |

### Truth rules

1. A repository fact about a hypothesis does not validate the hypothesis. Example: **VERIFIED FACT** — a playbook contains a 50–500 employee target ICP. **INTERNAL HYPOTHESIS** — 50–500 employees is the correct ICP.
2. A quote is not automatically a market truth. One buyer statement remains evidence from one buyer unless corroborated.
3. Stated willingness to pay is weaker than accepted commercial terms; accepted terms are weaker than verified payment; one payment is weaker than repeat payment/renewal.
4. Usage is not outcome evidence. Product analytics prove behavior only within their event contract.
5. A lost deal is evidence about that deal, not proof that the entire market rejects the product.
6. A feature request is evidence of a problem/request, not proof that the requested implementation should be built.
7. Missing evidence is `unknown` / `insufficient_data`, never a favorable zero or invented narrative.
8. Synthetic/demo/internal activity is never promoted to customer evidence.
9. Customer evidence must retain provenance: who/what account, evidence type, source, date, confidence, and any limitation.
10. Confidential evidence must not be copied into unsafe analytics, public Git history, public case studies, or broad-access product surfaces.

---

# A. Reality recovery

## 1. Authoritative state inspected before this build

- **VERIFIED FACT:** `main` was `df92e0eb78edda5c8c621bb1388c5b519b8da1e8` immediately before this branch was created.
- **VERIFIED FACT:** `CLAUDE.md` defines Foremention as Recommendation Intelligence for B2B software, locks the five signed-in objects, requires human-review/evidence integrity, forbids fabricated customers/ARR/testimonials/case studies, keeps conversion founder-led, and says pricing remains a hypothesis until validated.
- **VERIFIED FACT:** `docs/CEO-COMPANY-COMMAND-CENTER.md` separates PostHog product behavior from protected commercial/customer records and defines retained customer value around verified decision insight rather than logins/page views.
- **VERIFIED FACT:** `docs/ACTIVATION-FUNNEL-EVENTS-2026-08-14.md` defines privacy-minimized activation events and explicitly says those events do not prove customer outcomes, revenue, recommendation lift, or causation.
- **VERIFIED FACT:** `supabase/migrations/20260818000100_company_customer_proof.sql` creates protected company/commercial/customer-proof foundations, enables RLS, grants browser roles no direct access, and seeds no accounts, customers, revenue, or KPI classifications.
- **VERIFIED FACT:** design-partner application intake exists on `main` through `app/api/design-partner/route.ts` and `supabase/migrations/20260829000200_design_partner_applications.sql`.
- **VERIFIED FACT:** `docs/FOUNDER-CUSTOMER-PROOF-PLAYBOOK.md` contains discovery fields, an ICP qualification experiment, pilot structure, win/loss reasons, and pricing hypotheses.
- **VERIFIED FACT:** `docs/VALIDATION-SPRINT.md` is an older validation plan with a different target segment and different pricing questions than the current founder proof playbook.
- **VERIFIED FACT:** active second-wave branches are not merged into this branch merely because they exist. Relevant adjacent work includes `build/billion-dollar-01-pmf-retention`, `build/billion-dollar-05-commercial-engine`, and `build/billion-dollar-09-company-os`.
- **VERIFIED FACT:** the adjacent PMF branch says it found no repository customer evidence sufficient to validate ICP, willingness-to-pay, retention, conversion, ROI, or category-demand hypotheses and intentionally keeps commercial/customer-discovery records service-role only.
- **VERIFIED FACT:** recent PR inspection showed unrelated dependency/release work alongside second-wave branches; PR summaries/titles are not treated as evidence when exact files/commits disagree. File contents and exact commit state win.

## 2. Current customer/market statements — classified

| Statement | Classification | Current interpretation |
| --- | --- | --- |
| Foremention is a Recommendation Intelligence product for B2B software. | **VERIFIED FACT** | Repository/product constitution. |
| The current founder proof motion targets English-language B2B SaaS companies around 50–500 employees with meaningful competitive buyer questions and an operator who can act on evidence. | **VERIFIED FACT** | This is what the current playbook says the experiment targets. |
| 50–500 employee B2B SaaS is the best/winning ICP. | **INTERNAL HYPOTHESIS** | Requires real account-level research, buying, activation, retention, and win/loss evidence. |
| VP Marketing/CMO/senior growth leadership is the economic buyer. | **INTERNAL HYPOTHESIS** | Must be proven through real buying authority and deal history. |
| SEO/content/organic/growth operators are the durable champion/user roles. | **INTERNAL HYPOTHESIS** | Must be proven through workflow ownership and repeated use. |
| The primary pain is inability to explain why competitors win important AI-mediated buyer questions and prove what changed after action. | **INTERNAL HYPOTHESIS** | Current problem thesis, not a validated customer fact. |
| Manual assistant checks + spreadsheets + SEO/GEO tools are the primary alternatives. | **INTERNAL HYPOTHESIS** | Record actual alternatives used in interviews and deals. |
| USD 3,000 / USD 6,000 30-day pilots are current founder-led pricing hypotheses. | **VERIFIED FACT** | Verified as hypotheses in the current playbook; not validated WTP or public pricing. |
| Buyers will pay USD 3,000 / USD 6,000 for those pilots. | **INTERNAL HYPOTHESIS** | Requires proposal/acceptance/payment evidence. |
| An older validation sprint targets roughly 5–50 employees and asks $49/$199 willingness questions. | **VERIFIED FACT** | Historical experiment, not current authority and not validated pricing. |
| Core / Signal / Intelligence is the current package architecture in adjacent commercial work. | **VERIFIED FACT** | Repository/branch implementation fact; package-market fit remains unproven. |
| Foremention has PMF. | **INTERNAL HYPOTHESIS** | Must remain unproven until the PMF gates in this system are supported by real cohorts and commercial evidence. |
| Foremention has a customer advisory council. | **FUTURE TARGET** | No council is claimed to exist by this build. |
| Foremention has validated customer quotes/testimonials/case studies. | **INTERNAL HYPOTHESIS** | Do not claim; no qualifying evidence was identified in the inspected repository artifacts. |

### Reconciliation rule

The older 5–50 employee / $49–$199 validation plan remains historical context. The current founder proof playbook is the active founder experiment on `main`, but its segment, buyer-role, pain, alternative, and pricing statements remain hypotheses until real evidence supports them. If the company-OS branch merges, its authority order should govern strategy while this document remains the customer-research operating contract.

---

# B. Research repository

## 3. One durable evidence model

Do not create a second customer database merely for research notes. Use the existing protected commercial/customer-proof system as the identity and commercial backbone. Where structured research-event fields from an adjacent branch later merge, extend them; do not fork them.

The research repository is a logical model with these objects:

### 3.1 Research account

Required fields:

- `account_id` — link to protected commercial account when one exists;
- company characteristics: segment, employee band, category, market, product motion, relevant team structure;
- lifecycle: prospect / design partner / paying customer / churned / lost / disqualified;
- ICP hypothesis under test;
- source and observed date for every external company characteristic;
- confidentiality tier;
- research owner.

A company characteristic is **VERIFIED FACT** only when sourced; inferred fit remains **INTERNAL HYPOTHESIS**.

### 3.2 Research participant

Keep direct PII in the protected contact system, not in PostHog or this Git document.

Required logical fields:

- protected contact reference;
- role/title;
- participant role: `user`, `champion`, `economic_buyer`, `technical_evaluator`, `security`, `procurement`, `legal`, `executive_sponsor`, `other`;
- authority evidence;
- product familiarity;
- consent/recording status where relevant;
- confidentiality restriction.

A role inferred from title is not the same as verified buying authority.

### 3.3 Research session

Session types:

- `customer_interview`;
- `prospect_interview`;
- `post_demo_interview`;
- `activation_interview`;
- `first_value_interview`;
- `second_cycle_interview`;
- `renewal_interview`;
- `churn_interview`;
- `expansion_interview`;
- `lost_deal_interview`;
- `advisory_session`.

Capture:

- session ID;
- account/contact references;
- session type;
- date/time;
- interviewer;
- research question/hypothesis being tested;
- current lifecycle/deal stage;
- source artifact reference (secure notes/recording/transcript, if permitted);
- consent/recording status;
- summarized evidence items;
- unresolved questions;
- follow-up action.

Do not store a fake transcript. If a transcript does not exist, record structured notes and label them as notes.

### 3.4 Evidence item

Every reusable customer insight must be atomic enough to challenge later.

Fields:

- `evidence_id`;
- classification: one of the five truth labels;
- evidence type: `quote`, `behavior`, `workflow_observation`, `payment`, `proposal_response`, `renewal`, `expansion`, `churn`, `loss`, `support_issue`, `analytics_observation`, `external_research`, `operator_note`;
- account/contact/session reference where applicable;
- claim being supported;
- raw-source pointer in the protected system;
- redacted/paraphrased summary;
- observed date;
- confidence/strength;
- contradictions;
- scope/segment;
- expiry/revisit date when the evidence may become stale;
- reviewer.

### 3.5 Quote

Quotes are optional evidence, not mandatory artifacts.

Capture only when legitimate:

- exact quote text or approved redacted excerpt;
- speaker reference;
- session/source reference;
- date;
- context/question;
- whether the quote may be shared internally only, externally with permission, or not beyond the research team;
- permission reference if public use is allowed.

Never publish a customer quote because it sounds compelling. Public use requires explicit permission and appropriate attribution/privacy review.

### 3.6 Use case

Capture:

- use-case statement;
- triggering situation;
- current workflow;
- desired outcome;
- user/champion/buyer roles;
- frequency;
- severity/cost evidence;
- alternatives used;
- Foremention workflow touched;
- value evidence;
- repeat-use evidence;
- segment/account evidence references;
- status: `hypothesis`, `observed_once`, `repeated`, `commercially_supported`, `retained`.

The status does not become `retained` without later-cycle behavior.

---

# C. Jobs-to-be-Done system

## 4. JTBD record

Canonical format:

> **When** [situation], **I need to** [motivation / progress], **so I can** [desired outcome].

Each JTBD record must include:

- situation/context;
- functional job;
- emotional job;
- social job;
- desired outcome;
- current alternative;
- push of the current situation;
- pull of the new approach;
- anxiety about switching;
- habit/inertia holding the old approach in place;
- trigger event;
- frequency;
- consequence if unresolved;
- decision participants;
- evidence references;
- truth classification;
- confidence/strength;
- contradictions.

### 4.1 Switching-forces capture

Do not ask only “would you use this?” Reconstruct a real decision or attempted decision.

**Push**
- What made the old/current situation unacceptable now?
- What happened the last time the problem became visible?
- What consequence followed?

**Pull**
- What outcome made a new approach attractive?
- What did the buyer hope would become easier, faster, safer, or more defensible?

**Anxiety**
- What could go wrong by switching?
- What evidence/security/procurement/integration concern creates risk?

**Habit**
- What existing tool, spreadsheet, agency, meeting, or manual ritual is “good enough” today?
- Who is invested in keeping that process?

### 4.2 JTBD evidence rule

A JTBD is **REAL CUSTOMER EVIDENCE** only when tied to real first-party evidence. A synthesized cross-account JTBD remains **REAL CUSTOMER EVIDENCE** only if its supporting account count and evidence references are retained; otherwise label the synthesis **INTERNAL HYPOTHESIS**.

---

# D. Interview system

## 5. Universal interview protocol

Every interview should:

1. identify the hypothesis/research question before the call;
2. establish participant role and actual involvement;
3. start from a concrete past event rather than future preference;
4. reconstruct what happened before, during, and after the event;
5. capture current alternatives and effort/cost where known;
6. separate problem discovery from solution pitching;
7. ask for decision/budget evidence without forcing a price answer;
8. capture contradictions and uncertainty;
9. end with permission/next step, not an invented commitment;
10. convert notes into evidence items shortly after the session while preserving the source.

Avoid leading questions such as “Wouldn’t it be useful if...?” and avoid treating compliments as demand.

## 6. Discovery interview

**Purpose:** understand a real problem, trigger, workflow, alternative, urgency, and buying context.

Question sequence:

- Tell me about the last time an AI-mediated buyer answer/recommendation became important internally.
- What triggered the check?
- What exact decision or workflow depended on it?
- What did you do first?
- What tools/people/processes did you use?
- Where did the process become slow, uncertain, expensive, or politically difficult?
- What did you trust least?
- What happened because the issue existed?
- How often does this recur?
- Who owns the problem? Who approves spend? Who can block a purchase?
- What alternatives did you consider or already pay for?
- What evidence would make the team act?
- What would make changing the current approach not worth it?

Capture: trigger, JTBD, severity, frequency, workaround, alternative, buyer roles, decision evidence, and unresolved assumptions.

## 7. Post-demo interview

**Purpose:** measure comprehension and relevance, not demo enjoyment.

Ask:

- Before the demo, what did you expect this to solve?
- Which part matched a real workflow you already have?
- Which part felt irrelevant or confusing?
- What decision could you make differently with the evidence shown?
- What would prevent you from trying this with real data?
- What proof/security/integration/comparability requirement remains unanswered?
- What would the next real buying/evaluation step be inside your company?

A request for “more features” must be decomposed into the blocked job and decision.

## 8. Activation interview

**Purpose:** identify why a real account did or did not reach the canonical first-value boundary.

Ask:

- What were you trying to get done when you started setup?
- Which setup step was unclear or felt unnecessary?
- Which buyer questions were easiest/hardest to define?
- Where did you need help?
- What did you expect the first Recommendation Record to tell you?
- What was missing before you felt ready to review or act?
- If you stopped, what happened immediately before you stopped?

Pair interview evidence with the privacy-safe activation event contract; neither source replaces the other.

## 9. First-value interview

**Purpose:** determine whether the first reviewed insight changed a real decision.

Ask:

- What was the first moment you considered useful?
- What did you learn that you did not know confidently before?
- What decision did that evidence affect?
- What action, if any, did you create or assign?
- What would have made the insight unusable?
- Who else needed to see or trust it?
- Would you repeat the workflow for another question? Why?

Do not call first value an outcome unless a later customer/business outcome is actually observed.

## 10. Second-cycle interview

**Purpose:** understand repeat value and habit formation.

Ask:

- Why did you return for this measurement?
- What were you expecting to have changed?
- Was the later measurement comparable enough to trust?
- What decision did the comparison support?
- What part of the first-cycle workflow did you skip, repeat, or change?
- What would cause you to schedule another cycle?
- What existing process did Foremention replace, complement, or fail to replace?

Second-cycle behavior is stronger PMF evidence than stated future intent.

## 11. Renewal interview

**Purpose:** reconstruct the continuation decision before asking for advocacy.

Ask:

- What recurring job would stop or worsen if Foremention disappeared?
- Which workflows produced value since the last commercial decision?
- Which did not?
- What evidence are you using to justify renewal internally?
- What alternative would you use if you did not renew?
- What budget/procurement/security constraints matter now?
- What must change for renewal to make sense?

Renewal is **REAL CUSTOMER EVIDENCE** only when the commercial decision is verified in the commercial/billing source of truth.

## 12. Churn interview

**Purpose:** understand the decision chronology without defending the product.

Ask:

- When did you first begin considering stopping?
- What event pushed the decision forward?
- Which expected outcome did not materialize?
- Which workflow became less valuable or too costly?
- What alternative are you using now?
- Was the decisive issue product capability, trust, usability, timing, budget, internal ownership, procurement, or another factor?
- What could have changed the decision, if anything?

Never recode churn as “budget” solely because a cancellation form says so if richer evidence contradicts it.

## 13. Expansion interview

**Purpose:** identify whether value travels to more scope, teams, markets, brands, questions, frequency, or governance.

Ask:

- What additional job/scope is now worth adding?
- What evidence from the current scope created confidence?
- Who else needs the workflow?
- What new constraint appears at the larger scope?
- What budget owner or procurement step changes?
- Would expansion still be wanted if the new feature/scope were priced separately?

Expansion is evidence of value only after the expansion is verified, not when it is merely requested.

## 14. Lost-deal interview

**Purpose:** reconstruct the actual decision, including no-decision.

Ask:

- What originally made this worth evaluating?
- What changed between first evaluation and final decision?
- What were the decisive criteria?
- Which alternative won, including “do nothing” or internal process?
- Where did Foremention fall short or create risk?
- How important were price, trust, security, procurement, timing, budget, functionality, and internal priority relative to each other?
- Who made the final decision?
- What would need to become true for reevaluation?

A seller's interpretation is an operator note; direct buyer evidence is stronger when available.

---

# E. PMF evidence system

## 15. PMF evidence dimensions

PMF is not a sentiment score. Track evidence across these dimensions:

1. problem frequency;
2. problem urgency;
3. problem cost/consequence;
4. willingness to switch from the current alternative;
5. willingness to pay;
6. activation to first verified decision insight;
7. repeat use / second comparable cycle;
8. retained value over time;
9. recommendation/referral behavior;
10. expansion behavior.

### 15.1 Evidence strength scale

Use this scale per dimension; do not average weak evidence into confidence.

| Level | Meaning |
| --- | --- |
| `0 — unknown` | No qualifying evidence. |
| `1 — stated` | One or more direct first-party statements, but no confirming behavior. |
| `2 — repeated` | Similar evidence across multiple independent qualified accounts or repeated situations. |
| `3 — behavioral` | Product/workflow/buying behavior supports the claim. |
| `4 — commercial/retained` | Payment, renewal, retained comparable use, expansion, referral, or other durable behavior supports the claim where relevant. |

The level must link to underlying evidence IDs and account count. A level without evidence references is invalid.

## 16. PMF scorecard

For every reporting period, show the following table with raw numerator/denominator where meaningful and `insufficient_data` when not.

| Dimension | Evidence question | Preferred evidence | Current status |
| --- | --- | --- | --- |
| Problem frequency | Does the job recur often enough to justify a system? | Reconstructed past events + repeated account evidence. | **INTERNAL HYPOTHESIS** until measured. |
| Problem urgency | Does a trigger create a near-term need to act? | Buying timelines, real deadlines, executive/customer triggers. | **INTERNAL HYPOTHESIS** until measured. |
| Problem cost | Is inaction/manual work materially costly or risky? | Observed labor/tool spend/decision delay/business consequence. | **INTERNAL HYPOTHESIS** until measured. |
| Switch | Will the team change an existing workflow? | Connected real data, replaced workflow, implementation effort accepted. | **INTERNAL HYPOTHESIS** until measured. |
| Pay | Will budget move? | Accepted terms, verified payment, renewal. | **INTERNAL HYPOTHESIS** until measured. |
| Activation | Does the account reach verified decision value? | Canonical account-level activation facts. | **INTERNAL HYPOTHESIS** until real cohort data exists. |
| Repeat | Does an activated account complete another comparable cycle? | Second-cycle facts. | **INTERNAL HYPOTHESIS** until real cohort data exists. |
| Retention | Does verified value recur across mature periods? | Mature cohort retained-value behavior. | **INTERNAL HYPOTHESIS** until real cohort data exists. |
| Referral | Will a customer put reputation behind an introduction/recommendation? | Verified referral/intro/reference behavior. | **INTERNAL HYPOTHESIS** until measured. |
| Expansion | Does value justify broader paid scope? | Verified paid expansion / scope increase. | **INTERNAL HYPOTHESIS** until measured. |

## 17. PMF confidence gates

**FUTURE TARGET — PMF operating standard:** Foremention should declare PMF confidence by the weakest mandatory gate, not by a founder-selected weighted average.

### Gate 0 — Unmeasured

- insufficient qualified customer evidence;
- no reliable activation/retention cohort;
- no commercial proof.

Allowed language: “testing the problem/wedge.”

### Gate 1 — Problem evidence

Requires repeated qualified evidence for frequency, urgency, consequence, alternatives, and a coherent JTBD across the intended segment.

Allowed language: “repeated problem evidence.”

### Gate 2 — Pull + activation

Requires real accounts to accept implementation/switching effort and reach the canonical verified first-value boundary without founder heroics being the only value source.

Allowed language: “activation/pull evidence.”

### Gate 3 — Repeat + retention

Requires mature cohorts with second comparable cycles and repeated verified decision value. Raw counts and cohort maturity must be shown.

Allowed language: “retained-use evidence.”

### Gate 4 — Commercial durability

Requires verified payment plus repeat value, with renewal and/or expansion/referral evidence beginning to appear across independent accounts. Unit economics must not be obviously incompatible with the motion.

Allowed language: “strong PMF evidence” only when the underlying evidence is inspectable.

### PMF refusal rules

Do not declare PMF from:

- founder enthusiasm;
- waitlist size;
- traffic;
- demo compliments;
- one design partner;
- a single paid pilot;
- raw signups;
- a high activation percentage from a tiny/immature denominator;
- internal/demo usage;
- unreviewed AI output;
- non-comparable repeat measurements;
- survey willingness-to-pay without buying behavior;
- one renewal or expansion presented as a market-wide result.

---

# F. Win/loss system

## 18. Deal outcome taxonomy

Outcome:

- `won`;
- `lost`;
- `no_decision`;
- `deferred`;
- `disqualified`.

Primary reason taxonomy:

- `incumbent_or_alternative`;
- `price`;
- `trust`;
- `missing_functionality`;
- `timing`;
- `procurement`;
- `security`;
- `internal_priority`;
- `budget`;
- `competitor_selected`;
- `no_decision`;
- `internal_build`;
- `implementation_risk`;
- `no_authority`;
- `unclear_value`;
- `other`.

Maintain a mapping from legacy loss reasons (`no_urgent_pain`, `no_budget`, `timing`, `no_authority`, `missing_capability`, `trust_security`, `competitor`, `internal_build`, `no_response`, `other`) rather than deleting historical semantics.

## 19. Win/loss record

Required fields:

- account/opportunity;
- outcome;
- original trigger;
- intended JTBD/use case;
- current/incumbent alternative;
- selected competitor/alternative if known;
- decision criteria;
- champion strength evidence;
- economic buyer access/authority evidence;
- package/scope discussed;
- quoted/accepted/paid commercial evidence where applicable;
- security/procurement path;
- primary reason;
- secondary reasons;
- direct buyer evidence vs seller inference;
- source/session references;
- date;
- product gap vs commercial/process gap;
- follow-up/revisit trigger;
- research confidence.

### Win/loss rules

1. Force one primary reason only after evidence review; preserve secondary reasons.
2. `no_decision` is a real outcome, not miscellaneous loss.
3. Price is not the root cause merely because the buyer mentioned cost.
4. Missing functionality is not automatically a roadmap priority.
5. A competitor win must identify the alternative if known and the criterion it satisfied.
6. Aggregate only comparable segments/stages; do not mix disqualified leads with late-stage losses.
7. Publish counts before percentages at small sample size.

---

# G. Feature-request evidence system

## 20. Feature request record

Capture:

- request ID;
- account/contact evidence reference;
- customer segment;
- lifecycle/commercial stage;
- workflow/JTBD blocked;
- exact requested capability;
- underlying problem;
- severity;
- frequency of the underlying problem;
- number of independent qualified accounts with corroborating evidence;
- revenue relevance: none / retention risk / expansion / active deal / unknown;
- strategic alignment with Recommendation Intelligence and the five-object product architecture;
- workaround and workaround cost;
- evidence type/strength;
- security/privacy/evidence-integrity implications;
- implementation/maintenance risk;
- status: `new`, `researching`, `validated_problem`, `planned`, `building`, `shipped`, `declined`, `deferred`;
- decision rationale;
- linked outcome after shipping where measurable.

## 21. Prioritization rule

Never rank requests only by volume. Volume can indicate recurrence, but the decision must consider:

1. severity of the underlying job/problem;
2. quality and independence of evidence;
3. strategic alignment;
4. activation/retention/outcome relevance;
5. commercial relevance without treating pipeline as revenue;
6. workaround viability/cost;
7. whether the request preserves product/evidence/security constraints;
8. implementation and ongoing complexity;
9. whether the desired outcome can be achieved with an existing capability or workflow change.

A loud enterprise prospect does not automatically outrank repeated retained-customer evidence, and ten low-severity requests do not automatically outrank one critical workflow blocker.

### Feature evidence decisions

- `build_now` — blocks verified activation/retention/revenue/security/release and evidence is strong.
- `validate_problem` — signal exists but implementation shape is premature.
- `solve_with_existing_workflow` — problem is real but no new feature is justified.
- `defer` — insufficient urgency/evidence/strategic fit.
- `decline` — conflicts with product truth, security, evidence integrity, or company strategy.

---

# H. Customer advisory system

## 22. Advisory council status

- **FUTURE TARGET:** establish a small customer advisory council only after enough real customers/design partners exist to create independent signal.
- **FUTURE TARGET:** establish a design-partner council during the proof phase if multiple active design partners can participate without compromising confidentiality.
- **VERIFIED FACT:** this document does not claim that either council currently exists.

## 23. Advisory council model

When justified, select members for diversity of evidence, not prestige alone:

- active users/champions;
- economic buyers;
- relevant customer segments/use cases;
- customers with positive and critical feedback;
- customers at different maturity stages.

Do not require roadmap endorsement, testimonials, public references, or exclusivity as the price of participation.

Suggested session structure:

1. changes since last session;
2. two or three customer problems/jobs, not a broad feature poll;
3. evidence from real workflows;
4. roadmap trade-offs and what evidence would change the decision;
5. market/workflow changes observed by members;
6. unresolved risks/objections;
7. close with research follow-ups, not promises.

## 24. Design-partner council

**FUTURE TARGET:** use a smaller, execution-heavy council to inspect:

- activation friction;
- first-value clarity;
- reviewed Recommendation Record usefulness;
- action ownership;
- second-cycle comparability;
- renewal/continuation criteria;
- product gaps that block the core loop.

Design partners do not become representative of the market merely because they work closely with the founder.

---

# I. Research synthesis and cadence

## 25. Per-session synthesis

After each research session:

- preserve source/consent metadata;
- extract atomic evidence items;
- attach truth classification;
- update JTBD/use-case/win-loss/feature-request links where warranted;
- record contradictions;
- identify what remains unknown;
- define the next research question;
- avoid rewriting one interview into a company-wide conclusion.

## 26. Weekly customer-learning review

**FUTURE TARGET — cadence:** run a short weekly review while active discovery/design-partner work is occurring.

Review:

- new qualified sessions;
- strongest new evidence;
- contradictions/disconfirming evidence;
- new or changed JTBD hypotheses;
- win/loss reasons;
- activation/second-cycle blockers;
- feature-request evidence;
- pricing evidence;
- decisions made because of evidence;
- experiments to run next.

The output is a decision/update, not a slide deck of quotes.

## 27. Quarterly research review

**FUTURE TARGET — cadence:** perform a formal quarterly synthesis once enough evidence exists.

Required sections:

- segment/ICP evidence by account count and evidence strength;
- JTBD changes;
- trigger events and alternatives;
- PMF gate status;
- win/loss distribution with sample sizes;
- activation/retention evidence;
- willingness-to-pay and verified commercial evidence;
- churn/renewal/expansion evidence when real;
- feature-request themes and decisions;
- roadmap assumptions invalidated or strengthened;
- evidence gaps for next quarter.

If evidence is too sparse, state that explicitly instead of forcing a quarterly trend.

## 28. Roadmap evidence review

Before a material roadmap commitment, require a short evidence packet:

- problem/JTBD;
- intended segment;
- evidence IDs and independent account count;
- behavioral/commercial evidence;
- contradiction/counter-evidence;
- workaround;
- expected customer-value metric affected;
- strategic fit;
- security/evidence-integrity constraints;
- smallest experiment/change that can test the assumption;
- kill/revisit condition.

The roadmap should optimize learning and retained value, not ticket volume.

---

# J. Confidentiality, privacy, and research security

## 29. Data handling rules

1. Direct contact PII belongs in the existing protected commercial/contact system or another approved access-controlled research system, not PostHog.
2. Raw transcripts, recordings, private URLs, prompts, customer answers, citations, credentials, security questionnaires, or commercially sensitive documents must not be committed to this repository unless an explicit approved repository policy says otherwise.
3. Store references/opaque IDs in operating documents rather than reproducing sensitive source material.
4. Redact unnecessary names, emails, customer secrets, account identifiers, and confidential commercial details from synthesis artifacts.
5. Respect recording/quote/publication permissions separately; permission to record does not imply permission to publish.
6. PostHog remains behavioral telemetry only under the existing denylist and privacy contract.
7. Service-role commercial/customer-research data must not be exposed through normal customer browser RLS merely to create an internal dashboard.
8. Public proof requires real evidence plus explicit permission; a synthetic story must stay clearly labeled synthetic/demo and must never substitute for traction.
9. Research exports need an owner, purpose, access boundary, and deletion/retention policy before becoming routine.

---

# K. Evidence quality and anti-bias controls

## 30. Evidence strength hierarchy

Generally prefer, while preserving context:

`verified retained/renewed/expanded behavior > verified payment/contract behavior > repeated product behavior > observed workflow > direct reconstructed customer evidence > stated future preference > internal opinion`

This is not absolute. A cancellation plus a detailed churn interview may be stronger evidence for a churn cause than a raw usage event. Always preserve the evidence type.

## 31. Research bias controls

- Recruit beyond friends/supporters.
- Record non-buyers and no-decisions, not only wins.
- Ask about the last real event before asking future intent.
- Capture counterexamples.
- Do not discard evidence because it conflicts with positioning.
- Separate interviewer interpretation from participant evidence.
- Do not let one enterprise logo dominate prioritization without severity/strategy evidence.
- Avoid asking price questions before enough value/context is understood.
- Preserve old hypotheses after they are invalidated so the company can learn from changes rather than rewrite history.

## 32. Evidence aging

Customer and market evidence can become stale. Mark evidence for revisit when:

- product packaging changes materially;
- the ICP changes;
- provider/market behavior changes the workflow;
- a customer changes role/company;
- a new procurement/security regime appears;
- the evidence is old enough that the original context may no longer apply.

Do not delete historical evidence; supersede it with newer evidence and preserve provenance.

---

# L. Source-of-truth mapping

## 33. Where each fact belongs

| Fact type | Canonical owner/source |
| --- | --- |
| Product behavior | Privacy-minimized PostHog event contract + first-party product DB where company KPI eligibility requires durable facts. |
| Customer/account identity | Protected commercial account/contact system. |
| Design-partner application | Existing protected design-partner application table/API. |
| Opportunity/deal stage | Protected commercial opportunity system. |
| Payment/renewal/expansion/churn | Billing provider and/or verified first-party commercial event, clearly sourced. |
| Interview/research evidence | Protected research/commercial event/source reference; never raw PII in PostHog. |
| JTBD/use-case synthesis | This research operating model or approved protected research system, linked to evidence IDs. |
| Win/loss | Protected opportunity + research evidence. |
| Feature request | Evidence-linked product/research record, not a PostHog property containing customer text. |
| Product outcome | Outcome Ledger / comparable later measurement with limitations. |
| PMF status | Derived from the above sources under this document's gates; never a manually declared vanity field. |

---

# M. Implementation decision for Chat 10

## 34. Why this build is documentation/process-first

- **VERIFIED FACT:** `main` already has protected commercial/customer-proof tables, KPI eligibility boundaries, service-role restrictions, and a founder discovery/pilot playbook.
- **VERIFIED FACT:** an adjacent PMF branch already proposes research-event extensions to those same protected tables rather than a parallel research database.
- **VERIFIED FACT:** current analytics already has a privacy-safe activation contract and explicitly separates behavior from customer outcomes.
- **INTERNAL HYPOTHESIS:** adding another database schema now would create duplication and cross-branch conflict without proving a new storage requirement.

Therefore this Chat 10 build intentionally adds the canonical research operating contract only. It does not add a duplicate schema, a customer-facing research UI, a fake CRM, seeded interviews, seeded quotes, seeded PMF scores, or synthetic win/loss data.

### 34.1 Trigger for future product/database implementation

**FUTURE TARGET:** add or extend structured product/database support only when one or more of these are true:

- research volume makes manual protected capture error-prone;
- multiple operators need controlled write/read access;
- evidence-to-JTBD/win-loss/feature-request querying is repeatedly required;
- audit/history requirements exceed current commercial-event fields;
- a CRM/research integration is adopted;
- retention/deletion/access controls are explicitly designed;
- the adjacent PMF/commercial migrations merge and a remaining concrete gap is demonstrated.

When triggered, extend the canonical protected customer-proof model; do not create a competing customer truth store.

---

# N. QA / red-team checklist

## 35. Customer-truth QA

Before any research synthesis, PMF review, roadmap review, investor update, sales deck, or public customer-proof claim, verify:

- [ ] Every customer/market statement uses one of the five truth labels or is a pure operating instruction.
- [ ] Repository facts are not confused with validated market facts.
- [ ] Every **REAL CUSTOMER EVIDENCE** item has an account/session/source/date reference.
- [ ] Every quote has a source and sharing-permission status.
- [ ] No fake transcript, customer, logo, testimonial, case study, revenue, retention, or PMF claim exists.
- [ ] No PII/customer content was copied into PostHog or broad-access analytics.
- [ ] No raw confidential transcript/recording was committed to Git without explicit policy approval.
- [ ] PMF confidence is gated by the weakest mandatory evidence stage, not an average.
- [ ] Activation is not equated with signup/login/page view.
- [ ] Repeat/retention evidence uses comparable and mature periods where required.
- [ ] Payment/renewal/expansion/churn is verified in the correct source of truth.
- [ ] Win/loss primary reason is supported by evidence and direct-vs-inferred source is visible.
- [ ] `no_decision` is preserved as an outcome.
- [ ] Feature requests link to underlying jobs/problems and are not ranked by volume alone.
- [ ] Roadmap decisions include counter-evidence and a kill/revisit condition.
- [ ] Advisory councils are described as future targets until they actually exist.
- [ ] Older ICP/pricing experiments remain historical context rather than silently disappearing.
- [ ] Small samples show raw counts and `insufficient_data` rather than false precision.
- [ ] Customer-outcome language preserves observed/correlated/plausibly influenced/causal boundaries from the existing outcome system.

---

# O. Permanent outputs and handoff

## 36. What this system now provides

This document is the permanent operating contract for:

- research repository structure;
- prospect/customer/design-partner evidence capture;
- participant/buyer-role capture;
- JTBD and switching-forces research;
- discovery, post-demo, activation, first-value, second-cycle, renewal, churn, expansion, and lost-deal interviews;
- PMF evidence dimensions and confidence gates;
- win/loss taxonomy and evidence rules;
- feature-request evidence and prioritization;
- advisory/design-partner council design without claiming they exist;
- weekly/quarterly synthesis;
- roadmap evidence review;
- confidentiality/privacy boundaries;
- anti-bias and QA controls.

## 37. Cross-chat integration rules

1. If `build/billion-dollar-01-pmf-retention` merges, use its canonical account-level activation/retention derivations and research-event extensions; this document supplies the evidence/research semantics around them.
2. If `build/billion-dollar-05-commercial-engine` merges, use its commercial pipeline/pricing records for verified deal and pricing evidence; this document supplies the research interpretation and win/loss discipline.
3. If `build/billion-dollar-09-company-os` merges, use its strategy/document precedence and company cadence; this document becomes the customer-learning subsystem underneath that OS.
4. Never copy data from one branch into another as if the branch had merged. Reconcile against current `main` before later implementation.
5. Future customer-truth code must preserve `CLAUDE.md`, RLS/service-role boundaries, the five-object IA, human review, exact comparability, and `insufficient_data` behavior.

## 38. Immediate operating sequence

Use this order with real prospects/customers:

`qualify account → define research question → conduct evidence-led interview → capture atomic evidence → classify truth → update JTBD/use case → observe activation/behavior → capture commercial decision → capture second cycle/retention → record win/loss/renewal/churn/expansion → synthesize → change roadmap/ICP/pricing only when evidence warrants`

The system succeeds when Foremention can answer, with inspectable evidence rather than founder memory:

**What did customers actually say? What did they actually do? What did they actually pay for? Why did they buy or not buy? What value repeated? What failed? What evidence should change the product or company decision next?**
