# Foremention — Customer Lifecycle + Retained Revenue Operating System

**Chat:** 14 of 19 — Customer Lifecycle + Renewal + Expansion + Advocacy Engine  
**Canonical recovery base:** `main` at `df92e0eb78edda5c8c621bb1388c5b519b8da1e8`  
**Branch:** `build/billion-dollar-14-customer-lifecycle`  
**Status:** architecture and operating contract grounded in the recovered repository state  
**Purpose:** turn Foremention's existing activation, evidence, action, commercial, billing, measurement and collaboration primitives into one truthful lifecycle from signed agreement/design-partner commitment through retention, renewal, expansion, advocacy or churn.

---

## 1. Executive decision

Foremention must not represent the customer lifecycle as one overloaded enum.

An account can be **retained**, **renewal-risk**, **expansion-ready** and an **advocate** at the same time. A single state such as `renewal_risk` replacing `retained` would destroy useful truth. The canonical model is therefore four coordinated state tracks:

1. **Lifecycle stage** — where the account is in the durable customer journey.
2. **Renewal state** — whether a renewal motion exists and its risk/readiness.
3. **Expansion state** — whether evidence supports a legitimate expansion motion.
4. **Advocacy state** — whether the customer is eligible and explicitly permitted to advocate publicly or privately.

The user-requested states remain first-class and are mapped as follows:

- Lifecycle: `prospect`, `design_partner`, `onboarding`, `activated`, `adopted`, `retained`, `churned`.
- Renewal: `not_applicable`, `unknown`, `renewal_upcoming`, `renewal_risk`, `renewed`.
- Expansion: `none`, `expansion_candidate`, `qualified`, `in_progress`, `expanded`, `declined`.
- Advocacy: `not_ready`, `candidate`, `advocate`.

**Payment state is separate from every track.** Product activity, a design-partner label, a `customer` classification, an active entitlement, or a won commercial opportunity must never independently be interpreted as collected revenue. Paid/recurring-revenue claims require explicit billing-provider evidence or a clearly labeled manually verified commercial record.

---

## 2. Recovered reality at the base SHA

The following is the repository-proven baseline, not a future-state claim.

| Area | Recovered fact on `main` | Lifecycle implication |
|---|---|---|
| Customer/company classification | `company_organization_classifications` separates `unknown`, `internal`, `synthetic`, `benchmark`, `design_partner`, and `customer`; KPI inclusion is human controlled. | External customer metrics already have a fail-closed eligibility boundary. Reuse it. |
| Commercial accounts | `commercial_accounts` carries target/qualified/contacted/conversation/design-partner/customer/churned/disqualified stages, ownership and next action. | Prospecting and commercial qualification exist, but they are not a complete post-sale lifecycle. |
| Commercial opportunities | `commercial_opportunities` supports pilot, annual, renewal and expansion models, monetary fields, revenue source and won/lost evidence constraints. | Renewal/expansion motions have a commercial foundation. Monetary facts remain evidence-gated. |
| Commercial events | Existing event taxonomy includes customer-success checkpoint, payment, renewal, expansion and churn verification. | Reuse the event stream for first-party commercial proof rather than creating a second CRM. |
| Activation analytics | Existing activation contract ends at a human-reviewed actionable decision insight; repeated workflows are used for return behavior. | Lifecycle activation must use a durable product-evidence boundary, not signup/login. |
| Company North Star | Existing command center defines weekly retained organizations reaching verified decision value and explicitly excludes internal/synthetic/unknown activity. | `retained` should be evidence-derived from comparable/repeated value, not session activity. |
| Retention loop | `measurement_schedules` preserves cadence, question IDs, providers, methodology, locale and market for recurring measurement. | Use schedules and completed comparable cycles as core adoption/retention signals. |
| Actions | Existing `placements` remain the canonical action object; retention-loop fields add owner/due date/baseline/remeasurement references. | Implementation, adoption and outcome tracking should link to actions rather than inventing a second task system. |
| Billing | `billing_accounts` stores provider lifecycle state independently from entitlements; billing webhook receipt/application is service-only and atomic. | Never infer payment from entitlement or lifecycle. Billing remains its own truth source. |
| Entitlements | `organization_entitlements` carries package and feature access and can be founder-granted or billing-backed. | Access is not revenue. Founder-granted/private-beta access must remain distinguishable. |
| Collaboration | Organization roles, invitations, comments, notifications/preferences and expiring Recommendation Record sharing already exist. | Collaboration health can be measured from real participation without exposing commercial PII. |
| Outcome Ledger | The canonical company operating docs define the Outcome Ledger concept, but no canonical `Outcome Ledger` implementation exists on this base under that exact name. | Do not claim a live ledger object on `main`. Integrate with the existing evidence/action/remeasurement chain now and with the outcome-ledger PR when merged. |
| Account health | No canonical signal-derived account-health model exists on this base. | Chat 14 defines the health contract; arbitrary operator scores are not canonical. |

### Concurrent, unmerged work

As of this recovery, several billion-dollar-build PRs are still open and therefore are **not** canonical `main` truth:

- PR #171 — PMF activation + customer-proof contract.
- PR #175 — commercial engine / pricing / billing hardening.
- PR #176 — Outcome Intelligence + Customer Success system.
- PR #178 — enterprise security/trust/governance.

PR #176 contains a proposed Customer Success profile with manual activation/adoption/risk fields and an optional 0–100 health score requiring a written basis. This Chat 14 contract supersedes the **health-scoring approach**, not the useful Customer Success data model: health should be computed from transparent signal dimensions, while manual operator judgment is stored separately as a note/risk assessment.

No runtime code in this document is represented as merged merely because another open PR proposes it.

---

## 3. Truth taxonomy

Every lifecycle field, dashboard badge and metric must be classifiable as one of:

- **VERIFIED FACT** — persisted first-party event, billing-provider event, explicit contract data, or human-entered fact with provenance.
- **DERIVED FACT** — deterministic calculation from verified facts with a published formula.
- **OPERATOR ASSESSMENT** — human judgment such as champion strength or procurement risk, with author/time/basis.
- **HYPOTHESIS** — an unvalidated expansion, pricing, value or risk theory.
- **TARGET** — a desired future outcome.
- **UNKNOWN / INSUFFICIENT DATA** — the required evidence is missing or not yet old enough to evaluate.

`UNKNOWN` is a valid operating state. It must never be coerced to healthy, unhealthy, paid, renewed, churned, zero revenue or zero risk.

---

## 4. Canonical account identity

The lifecycle must compose existing systems rather than duplicate them.

### 4.1 Identity bridge

A lifecycle account is anchored to:

- `commercial_accounts.id` for internal commercial/RevOps identity;
- `commercial_accounts.customer_organization_id` when a real Foremention organization exists;
- `company_organization_classifications` for KPI eligibility;
- `organizations.id` for product/workspace facts;
- billing records only when an organization has verified billing linkage.

Before workspace creation, a prospect/design partner may exist only as a commercial account. After organization linkage, lifecycle derivation can use product evidence. One organization must not silently map to multiple live commercial accounts.

### 4.2 Proposed lifecycle record

Create one service-controlled `customer_lifecycle_accounts` record per commercial account, with nullable organization linkage inherited from the commercial account:

- `commercial_account_id`
- `organization_id`
- `lifecycle_stage`
- `lifecycle_stage_basis`
- `lifecycle_stage_changed_at`
- `implementation_owner_id`
- `customer_success_owner_id`
- `champion_contact_id`
- `executive_sponsor_contact_id`
- `started_at`
- `activated_at`
- `adopted_at`
- `retained_at`
- `churned_at`
- `created_at`, `updated_at`

Do **not** add `is_paid` to this record. Payment remains billing/commercial evidence.

Every stage change appends an immutable `customer_lifecycle_events` row containing prior state, new state, evidence type/reference, actor/source and timestamp. The current row is a materialized convenience; the event history is the audit trail.

---

## 5. Lifecycle state model

### 5.1 `prospect`

**Meaning:** commercially identified account not yet in an active customer implementation.

**Entry evidence:** linked `commercial_account` exists and has not begun a design-partner/customer implementation.

**Must not imply:** qualification, payment, customer status, product access.

### 5.2 `design_partner`

**Meaning:** a real account has explicitly entered the design-partner/pilot relationship.

**Entry evidence:** explicit commercial/design-partner event, accepted pilot/design-partner agreement, or operator-verified classification. Merely submitting a design-partner form is not sufficient.

**Required next step:** implementation plan owner and kickoff/next action.

### 5.3 `onboarding`

**Meaning:** implementation has begun but the activation definition has not yet been satisfied.

**Entry evidence:** implementation record started, linked organization/workspace when applicable, and at least one onboarding milestone begun.

**Exit:** activation evidence or verified churn/termination.

### 5.4 `activated`

**Meaning:** the organization has reached the first evidence-backed decision-value boundary.

Canonical activation should reuse the product's durable definition rather than inventing a CS-only milestone. The current main contract defines activation at a human-reviewed actionable decision insight. If PR #171 later changes the exact activation contract, Chat 14 should consume the canonical activation function/event instead of forking it.

**Must not imply:** retained, paid, ROI, successful outcome, renewal likelihood.

### 5.5 `adopted`

**Meaning:** value is no longer a one-off activation event; the customer has demonstrated the intended operating workflow.

Recommended minimum evidence:

- activated;
- more than one relevant Record reviewed or a second workflow completed;
- at least one action created when the evidence supports action;
- a responsible owner exists for the program;
- no critical unresolved implementation blocker preventing normal use.

Adoption may be `unknown` until the account has had enough elapsed time/opportunity to use the workflow.

### 5.6 `retained`

**Meaning:** the organization returned to verified decision value in a later eligible period/cycle.

Canonical evidence should align with the existing company command-center definition: an explicitly KPI-eligible external organization reaches verified decision value in the current period after having reached qualifying value before. For a stricter implementation/customer view, also preserve exact/comparable-cycle status and the elapsed time between cycles.

A login, page view, scheduled-but-failed run, or unreviewed output is not retention.

### 5.7 `churned`

**Meaning:** the customer/design-partner relationship has explicitly ended or the contracted/verified service relationship has terminated according to real evidence.

Possible evidence:

- verified churn commercial event;
- explicit customer termination;
- verified contract non-renewal/end;
- billing cancellation **plus** confirmed end of service when billing is the authoritative contract source.

Do not mark churn solely because activity is low. Inactivity creates risk, not churn.

### 5.8 Reactivation

A churned account may reactivate only with a new explicit commercial/customer event. Preserve prior churn as immutable history and start a new lifecycle episode rather than deleting history.

---

## 6. Implementation Plan

Every design partner/customer implementation has one durable plan. It should be visible to the internal owner and, where appropriate, the customer's authorized workspace members.

### 6.1 Required structure

**Goals**
- business/job goal in the customer's language;
- evidence required to support the goal;
- explicitly excluded claims/outcomes.

**Buyer questions**
- selected question IDs;
- priority/order;
- owner;
- active/inactive state;
- rationale.

**Competitors**
- competitor IDs;
- why each matters;
- market/segment applicability.

**Owners**
- Foremention implementation/CS owner;
- customer champion;
- executive sponsor when real;
- action owners drawn from actual workspace members where possible.

**Integrations**
- required integration;
- status: `not_required`, `planned`, `configured`, `blocked`, `failed`, `removed`;
- responsible owner;
- blocker/reference.

**Baseline**
- baseline run/Record references;
- provider/model/methodology/market/locale snapshot;
- baseline review status;
- comparability requirements for later measurement.

**First review**
- target date;
- completed date;
- reviewed Record/evidence reference;
- decision summary.

**First action**
- canonical action/placement ID;
- owner;
- due date;
- completion status;
- baseline reference.

**Second measurement**
- measurement schedule/cycle reference;
- due date;
- completed run reference;
- comparability result;
- review state.

**Success criteria**
- operational success criteria;
- measurement success criteria;
- commercial continuation criteria if explicitly agreed;
- evidence limitations.

### 6.2 Milestones

Use explicit milestones rather than free-form onboarding notes:

1. `plan_confirmed`
2. `questions_confirmed`
3. `competitors_confirmed`
4. `baseline_completed`
5. `first_review_completed`
6. `first_action_assigned`
7. `first_action_completed`
8. `second_measurement_completed`
9. `success_review_completed`

Each milestone has `status`, `owner`, `target_at`, `completed_at`, `evidence_reference`, `blocker`, `updated_by`.

Milestone completion must never be auto-asserted from a UI visit.

---

## 7. Transparent Health System

### 7.1 Design principle

Default UI is **health dimensions**, not a mysterious 0–100 number.

Each dimension contains:

- current status: `healthy`, `watch`, `risk`, `unknown`, `not_applicable`;
- raw inputs;
- deterministic rule/version;
- observation window;
- computed timestamp;
- evidence links;
- missing-data reason.

An optional overall score may exist later only if:

1. every weight and threshold is published internally;
2. the formula is versioned;
3. missing inputs do not silently become zero;
4. the component breakdown is always visible;
5. nobody uses it as a replacement for renewal judgment.

### 7.2 Health dimensions

#### A. Measurement execution

Signals:
- expected eligible measurements in window;
- successfully completed measurements;
- failed/blocked/cancelled measurements;
- last successful measurement age;
- enabled schedule status.

Example transparent ratio:

`measurement_completion_rate = completed_expected_measurements / expected_measurements`

Return `unknown` when no schedule/expectation exists.

#### B. Question-program maintenance

Signals:
- active buyer-question count;
- questions with owners/priority;
- stale/inactive questions;
- question set churn that breaks comparability.

This dimension measures program hygiene, not “more questions is better.”

#### C. Evidence review/adoption

Signals:
- completed Records in window;
- Records reaching the canonical reviewed/value boundary;
- time from completed measurement to review;
- repeated reviews across cycles.

A Record existing is weaker than a Record reviewed.

#### D. Action execution

Signals:
- evidence-backed actions created;
- actions assigned;
- actions completed;
- overdue actions;
- completed actions linked to baseline/remeasurement.

Report counts and completion ratio. Do not penalize an account for creating zero actions when the reviewed evidence truthfully supports no action.

#### E. Comparable-cycle retention

Signals:
- prior value cycle exists;
- later eligible value cycle exists;
- exact comparability accepted/withheld;
- number and recency of retained cycles.

Incomparable runs do not become retention proof merely because they occurred later.

#### F. Collaboration

Signals:
- active workspace members by role;
- unique reviewers/actors in the window;
- comments/reviews/actions by more than one member;
- champion participation;
- invited stakeholder activity.

Do not use raw seat count alone as health.

#### G. Executive engagement

Signals:
- real executive sponsor identified;
- sponsor participated in a review/business-value/QBR event;
- latest sponsor interaction date;
- sponsor status/operator assessment with basis.

If no sponsor is required for the customer type, mark `not_applicable`, not unhealthy.

#### H. Technical health

Signals:
- unresolved customer-impacting provider/integration failures;
- blocked measurement schedules;
- open support/technical blockers;
- duration/severity;
- last successful workflow after the problem.

This dimension must distinguish Foremention-side reliability from customer-side implementation blockers.

### 7.3 Account-health snapshot

Persist periodic snapshots so renewal review can answer **what changed in health and why**, not only display today's status.

Suggested `customer_health_snapshots`:

- account/organization ID;
- observation window;
- dimension statuses;
- raw metric payload restricted to non-PII operational facts;
- ruleset version;
- coverage/confidence;
- generated_at.

Manual operator notes live in a separate `customer_health_assessments` table and can never overwrite computed inputs.

---

## 8. Renewal System

### 8.1 Renewal truth source

A renewal motion exists only when there is an explicit contract/service end or renewal date, or a verified commercial renewal opportunity. If no contract date exists, renewal timing is `unknown`.

Billing subscription state may support the renewal picture but must not invent contract terms that are absent from billing.

### 8.2 Contract/renewal record

Track:

- contract/service start date;
- contract/service end date;
- renewal date/window start;
- renewal type: manual, auto-renewal, month-to-month, unknown;
- commercial opportunity/reference;
- billing account/reference when applicable;
- currency/value only when verified;
- renewal owner;
- champion contact;
- executive sponsor;
- procurement/security owner;
- procurement/security timing;
- notice deadline if contractually known;
- renewal decision date;
- next step + due date.

### 8.3 Renewal evidence pack

At each renewal review create an immutable snapshot containing:

- activation/adoption/retention milestones;
- comparable cycles completed;
- Records reviewed;
- actions created/completed;
- evidence-linked observed outcomes;
- unresolved value gaps;
- health dimensions and trend;
- champion/sponsor status;
- technical incidents/blockers;
- commercial/billing facts available;
- claims explicitly unavailable because inputs are missing.

### 8.4 Renewal cadence

For annual/enterprise agreements, default operating checkpoints may be planned at approximately T-180, T-120, T-90, T-60 and T-30 **only when a verified contract end date exists**. The schedule is an operating policy, not a claim about an existing contract.

Recommended focus:

- **T-180/T-120:** value coverage, adoption gap, stakeholder map, security/procurement lead time.
- **T-90:** executive value review; identify renewal risks and expansion hypotheses.
- **T-60:** commercial path, procurement/security blockers, decision process.
- **T-30:** close plan, signatures/payment path where relevant, contingency.

### 8.5 Renewal risk

`renewal_risk` is first-class and can coexist with `retained`.

Risk reasons must be typed and evidenced:

- low/no recent verified value;
- insufficient adoption;
- unresolved technical problem;
- champion loss;
- executive misalignment;
- budget constraint;
- procurement/security blocker;
- product deficiency;
- competitor displacement;
- internal priority change;
- billing/payment problem;
- unknown/other.

A risk record includes severity, evidence, owner, mitigation, next date, status and resolution.

---

## 9. Expansion System

Expansion is evidence-led, not an engagement-score upsell machine.

### 9.1 Approved trigger taxonomy

- `additional_brand`
- `additional_market`
- `additional_questions`
- `increased_cadence`
- `api`
- `integration`
- `additional_users`
- `enterprise_governance`
- `agency_portfolio`

### 9.2 Signal rules

An expansion signal must contain:

- trigger type;
- observed customer need/behavior;
- evidence reference;
- affected scope;
- date observed;
- owner;
- confidence/basis;
- status.

Examples of legitimate evidence:

- customer explicitly requests coverage of another market/brand;
- question set repeatedly reaches configured capacity and additional high-priority questions are documented;
- required workflow demonstrably needs higher cadence;
- customer asks for API/integration automation;
- governance/procurement requirements block broader deployment;
- an agency customer has a documented multi-client use case.

A product event alone should usually create a **signal**, not a commercial opportunity. Human qualification promotes it to a `commercial_opportunities.commercial_model = 'expansion'` motion.

### 9.3 Expansion qualification

Require:

- current use case has achieved or is plausibly achieving value;
- proposed expansion solves a real additional job;
- customer stakeholder supports the need;
- implementation/cost/security constraints are understood;
- price/value remains hypothesis until commercially verified.

Do not treat renewal acceptance as expansion unless incremental scope/value is explicitly verified.

---

## 10. Advocacy System

Customer identity is private by default.

### 10.1 Advocacy readiness

A customer can become an advocacy `candidate` when:

- real value evidence exists;
- relationship/champion health is positive enough for an ask;
- there is no unresolved severe incident or sensitive dispute;
- the customer has not declined advocacy outreach.

Readiness is **not permission**.

### 10.2 Permission ledger

Create an explicit, revocable permission record for each permitted use. Never use one vague “marketing consent” boolean.

Scopes:

- `name_public`
- `logo_public`
- `quote_public`
- `case_study_public`
- `reference_call_private`
- `review_request`
- `referral_request`
- `advisory_participation`

Record:

- customer account;
- approving contact/authority;
- scope;
- approved artifact/version when relevant;
- granted_at;
- expiry if any;
- restrictions;
- revoked_at/revoked_by;
- evidence/reference to consent.

Publication code/process must fail closed when the required permission scope is absent or revoked.

### 10.3 Advocacy workflows

**Referral readiness** — identify candidate → operator review → customer ask → permission/result recorded.

**Case study** — evidence eligibility review → customer approval to draft → fact review → explicit final publication permission → publish exact approved artifact only.

**Testimonial** — preserve exact approved quote and approved attribution; edits require reapproval when meaning changes.

**Reference customer** — private reference permission must specify allowed context and expiry/usage limits where provided.

**Review request** — ask only after value; never condition benefits on positive sentiment.

**Advisory participation** — separate opt-in; participation never implies public endorsement.

An account reaches advocacy state `advocate` only when at least one active advocacy permission/workflow is explicitly granted/completed. A candidate is not an advocate.

---

## 11. Churn Intelligence

Churn must become structured research, not a free-text tombstone.

### 11.1 Churn taxonomy

Primary/contributing reasons:

- `product_deficiency`
- `budget`
- `internal_priority`
- `competitor`
- `lack_of_value`
- `lack_of_adoption`
- `champion_loss`
- `procurement`
- `data_trust_issue`
- `technical_reliability`
- `company_change`
- `other`
- `unknown`

### 11.2 Churn record

Capture:

- account and lifecycle episode;
- churn effective date;
- primary reason;
- contributing reasons;
- customer-stated reason separately from internal interpretation;
- competitor, if explicitly known;
- product deficiency/gap references;
- latest health snapshot;
- activation/adoption/retention facts;
- latest comparable measurement/value date;
- champion/sponsor status;
- billing/contract facts if available;
- save attempt and outcome if appropriate;
- exit interview/research reference;
- reactivation eligibility/next review date;
- recorded_by/recorded_at.

### 11.3 Closed-loop learning

Every churn record is reviewed for links to:

- customer-research evidence;
- win/loss evidence;
- product opportunity/issue;
- trust/security requirement;
- pricing/budget hypothesis;
- onboarding/adoption problem;
- ICP disqualification signal.

One churn event is evidence, not a roadmap mandate. Repeated, qualified patterns should change product/ICP/commercial decisions.

---

## 12. Data architecture

The implementation should extend the existing first-party commercial/customer system with the minimum new entities:

1. `customer_lifecycle_accounts` — current journey state and ownership.
2. `customer_lifecycle_events` — immutable state-transition audit history.
3. `customer_implementations` — one implementation episode/plan.
4. `customer_implementation_milestones` — structured plan execution.
5. `customer_health_snapshots` — deterministic signal-derived health dimensions.
6. `customer_health_assessments` — human notes/judgment separate from computed health.
7. `customer_renewals` — verified renewal facts/process.
8. `customer_renewal_risks` — typed risks and mitigation.
9. `customer_expansion_signals` — evidence-backed expansion triggers.
10. `customer_advocacy_permissions` — explicit scope-specific consent ledger.
11. `customer_advocacy_requests` — ask/workflow history.
12. `customer_churn_events` — structured churn evidence.

Prefer foreign keys to existing `commercial_accounts`, `commercial_contacts`, `organizations`, `projects`, `runs`, `placements`, `measurement_schedules`, commercial opportunities/events, and future Outcome Ledger entities. Do not duplicate their content into JSON except for immutable review snapshots where historical reproducibility requires it.

### 12.1 Access model

Commercial contacts, contracts, renewal economics, churn notes and advocacy permission evidence are internal/service-side records unless a dedicated authenticated internal-admin surface with explicit authorization exists.

Customer workspace members may see customer-facing implementation/health/value information only through organization-scoped RLS. Internal commercial PII must never be exposed through customer RLS or PostHog.

### 12.2 Immutability

Append-only/immutable by default:

- lifecycle transitions;
- health snapshots;
- renewal review snapshots;
- advocacy permission grant/revocation events;
- churn events;
- verified commercial events;
- outcome/evidence history.

Mutable convenience rows may point to the latest state but must not erase historical evidence.

---

## 13. Derivation engine

Lifecycle derivation should run at trusted server/service boundaries. It may be event-driven plus scheduled reconciliation.

### 13.1 Deterministic derivations

Safe to derive when inputs exist:

- activated from canonical activation evidence;
- retained from qualifying later value cycles;
- measurement completion ratios;
- action assignment/completion ratios;
- Record review recency;
- collaboration participation counts;
- technical blocker age;
- renewal-upcoming only from verified date/window;
- advocacy permission validity from permission ledger.

### 13.2 Human-controlled facts

Require operator/customer evidence:

- champion quality/status;
- executive sponsor status;
- procurement risk;
- customer-stated churn reason;
- expansion business need unless explicit customer request is recorded;
- advocacy permission;
- contract dates if not provider-sourced;
- manual payment verification.

### 13.3 Reconciliation

A daily reconciliation job may detect inconsistencies such as:

- retained account with no qualifying retained-value evidence;
- renewal-upcoming with no contract/renewal date;
- advocate with no active permission;
- churned account with active post-churn workflow activity;
- paid claim with no billing/manual-verified source;
- linked customer organization classified internal/synthetic;
- duplicate lifecycle account for one commercial account.

Flag discrepancies; do not silently manufacture corrective facts.

---

## 14. Product/CS surfaces

Do not create a sixth top-level product object. Customer lifecycle belongs in internal/customer-success administration and contextual account views.

### Account 360

Show:

- lifecycle stage + evidence;
- implementation progress;
- health dimensions + trend;
- latest verified value;
- comparable-cycle history;
- action status;
- champion/sponsor status;
- renewal state/date confidence;
- expansion signals;
- advocacy permissions;
- current risks/next action.

### Implementation Plan

Shared operating view for goals, questions, competitors, owners, integrations, baseline, reviews, actions, second measurement and success criteria.

### Renewal cockpit

Internal view with contract facts, value evidence pack, health history, stakeholder map, procurement/security milestones, risk register, renewal owner and next step.

### Advocacy console

Internal permission-first workflow. Public identity cannot be emitted from this surface without the exact active permission scope.

### Churn review

Structured exit capture linked to research/product/commercial feedback.

---

## 15. Metrics

### 15.1 Customer lifecycle metrics

Use raw counts until cohorts are meaningful:

- design partners entering onboarding;
- activated organizations;
- median time to activation when sample allows;
- adopted organizations;
- retained value organizations;
- first-to-second-value conversion;
- comparable cycles per retained organization;
- time from measurement completion to review;
- action assignment/completion rate;
- overdue action count;
- multi-user collaboration rate only with a defined eligible denominator.

### 15.2 Revenue retention metrics

Compute only with verified recurring-revenue inputs:

- renewal rate;
- gross revenue retention (GRR);
- net revenue retention (NRR);
- churned recurring revenue;
- expansion recurring revenue;
- renewed recurring revenue.

If the billing/contract denominator is incomplete, report `N/A`/insufficient data rather than deriving revenue retention from customer counts.

Logo retention and value retention are different metrics and must not be labeled revenue retention.

### 15.3 Expansion metrics

- evidence-backed expansion signals;
- qualified expansion opportunities;
- signal → opportunity conversion;
- verified expansion wins;
- expansion value only where real monetary evidence exists;
- trigger-type distribution.

### 15.4 Advocacy metrics

- eligible candidates;
- asks made;
- permissions granted by scope;
- references completed;
- case studies approved/published;
- referrals generated;
- permission revocations.

Never count an unapproved logo/name as advocacy.

### 15.5 Churn metrics

- churned account count;
- churn reason distribution;
- churn by activation/adoption/retention state;
- churn preceded by technical risk;
- churn preceded by champion loss;
- product deficiency clusters;
- revenue churn only when monetary evidence is complete.

---

## 16. Relationship to the Outcome Ledger

The lifecycle system does not replace the Outcome Ledger.

The desired chain remains:

`Observation → Evidence → Recommendation → Decision → Action → Owner → Completion → Later Measurement → Observed Outcome`

Customer lifecycle consumes this chain to answer:

- Did the customer reach value?
- Did the workflow repeat?
- Did the customer act?
- Was a later measurement comparable?
- What observed outcome was recorded?
- What limitations remain?

Renewal and expansion evidence packs may reference Outcome Ledger entries, but they must never convert observed/correlated movement into causal ROI.

Until the separate Outcome Ledger implementation is merged, lifecycle code must link directly to the existing authoritative run/evidence/action/remeasurement primitives and remain migration-compatible with the upcoming ledger.

---

## 17. Billing and commercial boundaries

1. `billing_accounts.state = active` is verified subscription state, not by itself proof of amount collected.
2. `organization_entitlements` describes access, not revenue.
3. Founder-granted/private-beta entitlements never imply payment.
4. A `customer` classification does not imply payment.
5. A commercial `won` opportunity requires accepted/paid evidence under the existing constraint, but accepted commercial value and collected value remain distinct.
6. `paid_value_usd` is only a paid fact when its `revenue_source` is traceable (`manual_verified` or `billing_provider`).
7. Renewal/expansion revenue metrics require verified values and eligible denominators.
8. Missing billing data is `unknown`/`N/A`, never inferred from product use.

---

## 18. Enterprise renewal readiness

For accounts requiring enterprise procurement, renewal records should link to factual security/procurement work:

- security review status;
- legal/procurement stage;
- required evidence package;
- SSO/SCIM/governance requirements only when actually requested;
- data governance/residency requirements;
- owner and due date;
- blockers;
- externally configured capabilities vs architecture-ready capabilities.

Do not claim SOC 2, ISO 27001, contractual SLA, SCIM, residency or other enterprise controls merely because an architecture exists. Consume the enterprise-trust system's verified capability states when PR #178 or its successor becomes canonical.

---

## 19. Analytics/privacy contract

PostHog remains product-behavior analytics only.

Allowed lifecycle analytics should use internal IDs and bounded event properties such as lifecycle milestone key or status bucket where privacy-safe. Do not send:

- customer/prospect names;
- email addresses;
- contract terms;
- renewal dollar values;
- churn free text;
- champion/executive names;
- buyer questions/prompts;
- answers/citations/source URLs;
- case-study drafts;
- advocacy permission evidence;
- support/error content.

Supabase/internal first-party tables remain the source for customer/commercial lifecycle truth.

---

## 20. QA / red-team matrix

The implementation is not complete until automated tests cover at least these cases:

### Lifecycle truth

- prospect cannot become activated without canonical activation evidence;
- activation does not imply payment;
- adopted account can remain unpaid/unknown billing;
- retained derivation requires a later qualifying value cycle;
- incomparable follow-up cannot be mislabeled comparable retention/outcome proof;
- inactivity creates risk but does not auto-churn;
- reactivation preserves prior churn history.

### Billing

- active entitlement with `founder_grant` does not count as paid;
- `billing_accounts = active` with missing monetary source does not invent ARR/MRR;
- unprocessed/unverified billing webhook cannot update lifecycle/revenue facts;
- stale/out-of-order billing event cannot create false paid/renewal state.

### Health

- missing dimension input returns `unknown`, not zero/risk;
- zero actions can be healthy when no evidence-backed action was appropriate;
- failed measurement affects technical/measurement health but not automatically churn;
- overall health, if implemented, exposes formula/version/components;
- manual assessment cannot overwrite computed raw facts.

### Renewal

- no contract end/renewal date => no `renewal_upcoming` derivation;
- retained account may simultaneously be `renewal_risk`;
- renewal risk requires type, basis, owner and timestamp;
- renewal revenue is unavailable without verified commercial/billing value.

### Expansion

- expansion signal does not automatically create a won opportunity;
- each trigger is evidence-linked;
- renewal with unchanged scope is not counted as expansion;
- agency portfolio expansion remains tenant-safe.

### Advocacy/privacy

- no customer name/logo/testimonial/case study without exact active permission scope;
- revoked permission immediately fails closed for future publication;
- private reference permission does not authorize public case study/logo;
- advisory participation does not imply endorsement.

### Churn

- churn supports typed primary/contributing reasons;
- customer-stated reason remains distinguishable from internal analysis;
- one churn event cannot silently rewrite ICP/product hypotheses;
- churned revenue remains `N/A` if revenue data is incomplete.

### Tenant/security

- customer workspace cannot read another organization's lifecycle/implementation data;
- customer-facing roles cannot read commercial PII/contract/renewal notes;
- browser/authenticated role cannot mutate service-only commercial truth;
- audit/event rows are append-only where specified.

---

## 21. Merge-order and implementation strategy

Because Chat 14 was recovered while PRs #171, #175, #176 and #178 are open against the same base, do not create competing runtime tables that duplicate those branches before integration.

Recommended sequence:

1. Merge/reconcile canonical activation/customer-proof work (#171 or successor).
2. Merge/reconcile commercial/billing hardening (#175 or successor).
3. Merge/reconcile Outcome Ledger + Customer Success (#176 or successor).
4. Rebase Chat 14 on the resulting `main`.
5. Replace any arbitrary/manual Customer Success health-score implementation with the transparent health-dimension contract in this document while preserving operator assessments separately.
6. Add the lifecycle/implementation/renewal/expansion/advocacy/churn migration and service layer against the now-canonical upstream table names.
7. Integrate enterprise renewal dependencies after #178/successor where applicable.
8. Run the complete migration replay, tests, lint, typecheck, build, security and browser/release gates on the exact head.

This order avoids parallel schema forks and makes Chat 14 the retained-revenue integration layer rather than a duplicate Customer Success subsystem.

---

## 22. Rollout phases

### Phase 1 — Lifecycle + implementation

- lifecycle account bridge;
- immutable transitions;
- implementation plan/milestones;
- activation/adoption/retention derivations;
- account ownership and next actions.

### Phase 2 — Transparent health

- signal collectors;
- health dimensions;
- snapshots/trends;
- operator assessments;
- blocker/risk workflows.

### Phase 3 — Renewal

- contract/renewal facts;
- evidence pack;
- renewal risks;
- stakeholder/procurement timing;
- renewal opportunity bridge.

### Phase 4 — Expansion + advocacy

- typed expansion signals;
- human qualification to commercial opportunity;
- advocacy candidate workflow;
- explicit permission ledger and publication fail-closed checks.

### Phase 5 — Churn intelligence

- structured churn capture;
- exit-review workflow;
- links to customer research, win/loss and product gaps;
- reactivation episodes.

---

## 23. Definition of done

Chat 14 is fully implemented only when all of the following are true on a canonical, merged base:

- every customer has an evidence-backed lifecycle stage or explicit `unknown` state;
- payment/subscription/entitlement/lifecycle states are separate;
- design partner → onboarding → activation → adoption → retention transitions are deterministic or explicitly operator-evidenced;
- implementation plans contain goals, questions, competitors, owners, integrations, baseline, first review, first action, second measurement and success criteria;
- health is transparent, dimensional, versioned and handles missing data honestly;
- renewal timing never exists without verified date evidence;
- renewal risk is typed, owned and evidenced;
- expansion uses the approved trigger taxonomy and requires human qualification before commercial advancement;
- customer advocacy/public identity is permission-scoped and revocable;
- churn reasons are structured and feed customer research/product learning;
- Outcome Ledger/evidence/action/remeasurement links preserve provenance and causal restraint;
- customer/commercial PII stays out of PostHog and customer-facing RLS surfaces;
- revenue retention metrics remain unavailable when monetary inputs are incomplete;
- lifecycle history is auditable and tenant-safe;
- exact-head migrations/tests/lint/typecheck/build/security/release gates pass before merge.

---

## 24. What this system explicitly will not do

- invent a payment because a customer is active;
- invent ARR/MRR/GRR/NRR from logo counts;
- treat a login as retention;
- treat an AI output as activation before the canonical human-reviewed value boundary;
- turn an arbitrary CS opinion into a hidden health score;
- auto-churn an inactive customer without termination evidence;
- auto-upsell because usage increased;
- publish a customer name, logo, quote, case study or reference status without explicit permission;
- claim causality from before/after movement alone;
- duplicate the Recommendation Record, action, measurement, commercial, billing or Outcome Ledger systems;
- expose internal commercial PII to PostHog or customer workspace roles;
- merge around concurrent upstream billion-dollar-build branches by silently inventing their final schemas.

Foremention's retained-revenue engine should be valuable precisely because it can answer, with evidence: **what the customer intended to achieve, whether they reached decision value, whether they repeated the workflow, what they acted on, what happened later, what is at risk, what could legitimately expand, and what commercial facts are actually verified.**