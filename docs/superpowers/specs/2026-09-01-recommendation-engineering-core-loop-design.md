# Foremention Recommendation Engineering Core Loop — Design

**Status:** APPROVED ARCHITECTURE — implementation requires this spec to remain the source of truth.

**Date:** 2026-09-01

**Verified repository base:** `893e850cdea4fbf33793bd35a5473fa42d550dbd`

**Predecessor measurement foundation:** PR #198 / merged main `893e850cdea4fbf33793bd35a5473fa42d550dbd`

**Existing action-layer work to reconcile, not merge as-is:** PR #197 `feat/controllable-recommendation-actions-20260901`

---

## 1. Canonical product hierarchy

Foremention is moving from a measurement-led identity to a decision-and-change system.

The canonical hierarchy is:

1. **Foremention** — company/product.
2. **Category Leadership OS** — long-term destination; not a current achieved state or public guarantee.
3. **Recommendation Engineering** — the core product category Foremention is building.
4. **Recommendation Intelligence** — measurement and diagnosis subsystem inside Recommendation Engineering.
5. **Change Specifications** — first-class business/product decision objects.
6. **Execution Assets** — zero or many implementation artifacts attached to a Change Specification.
7. **Verification** — comparable later observation under the exact eligible measurement protocol.
8. **Business Outcomes** — observed commercial/customer/business results without automatic causal attribution.
9. **Learning** — durable evidence about company change → observed recommendation change → business outcome.

`Recommendation Intelligence` remains useful terminology for the measurement/diagnosis layer. It is no longer the top-level definition of what Foremention becomes.

Public marketing does **not** switch to Recommendation Engineering merely because this architecture is approved. Public repositioning happens after the first real Change Specification path is productized and verified.

---

## 2. Product law

Every material factor Foremention identifies must be classified before the system decides what to do with it.

### Control

- `CONTROLLABLE`
- `INFLUENCEABLE`
- `UNCONTROLLABLE`

Behavior:

- Controllable → analyze, benchmark, diagnose, prescribe, assign, verify.
- Influenceable → analyze, recommend strategy, track, measure.
- Uncontrollable → measure, monitor, quantify variance, detect change.

Foremention must never imply that a controllable company action controls an AI provider's ranking, model weights, reasoning, personalization, provider updates, competitor actions, or future prompts.

---

## 3. Canonical state model

### Eligibility

- `ELIGIBLE`
- `PARTIALLY_ELIGIBLE`
- `STRUCTURALLY_INELIGIBLE`
- `UNKNOWN`

### Decision

- `DO_NOW`
- `TEST_FIRST`
- `DO_NOT_DO`
- `MONITOR_ONLY`
- `INSUFFICIENT_EVIDENCE`

`CANNOT_CONTROL` is intentionally **not** a Decision value. The canonical expression for an uncontrollable factor that should only be observed is:

- Control: `UNCONTROLLABLE`
- Decision: `MONITOR_ONLY`

### Truth

- `OBSERVED_FACT`
- `LIKELY_EXPLANATION`
- `HYPOTHESIS`
- `RECOMMENDED_EXPERIMENT`
- `VERIFIED_OUTCOME`

`VERIFIED_OUTCOME` means a post-change outcome was actually observed and verified. It does not automatically mean Foremention established causal attribution.

### Confidence

- `HIGH`
- `MEDIUM`
- `LOW`
- `INSUFFICIENT`

No pseudo-precise percentage confidence is shown unless a future calibration system makes those probabilities defensible.

### Verification

- `IMPROVED`
- `UNCHANGED`
- `WORSENED`
- `INSUFFICIENT_EVIDENCE`

---

## 4. The canonical decision object: Change Specification

A **Change Specification** is not a content brief and is not a Resolution Asset.

Example Change Specification:

> Build native Salesforce integration.

Possible execution artifacts underneath that decision may include:

- product requirements document;
- engineering ticket;
- engineering pull request;
- launch checklist;
- integration documentation;
- website update;
- comparison page;
- FAQ;
- structured-data change.

The business/product decision remains one first-class Change Specification even when it has many execution artifacts.

### Required Change Specification fields

Every material Change Specification must support:

- problem;
- linked evidence;
- exact change;
- scope;
- control classification;
- controllable surface where applicable;
- eligibility state;
- decision state;
- truth state;
- confidence state;
- owner role;
- optional assigned workspace user;
- priority/order;
- effort: `LOW | MEDIUM | HIGH`;
- dependencies;
- commercial relevance;
- recommendation relevance;
- acceptance criteria;
- verification plan;
- baseline Recommendation Record/run;
- human review/approval history;
- execution state;
- timestamps and immutable identity.

No automatic generator may promote a material company action to `DO_NOW` + `HIGH` merely because an AI answer or source observation exists. Stronger decisions require stronger evidence.

For a generated draft with only reviewed Recommendation Intelligence evidence and no stronger cross-business evidence, the safe default is:

- Eligibility: `UNKNOWN`
- Decision: `INSUFFICIENT_EVIDENCE`
- Truth: `HYPOTHESIS`
- Confidence: `INSUFFICIENT`

A human reviewer can refine these states based on inspectable evidence. Later engines can automate more only when their decision rules are independently validated.

---

## 5. Execution Assets are subordinate

Existing `resolution_assets` remain useful for content/documentation-oriented execution outputs, but they are not the canonical company decision.

V1 relationship:

`Change Specification 1 → 0..N Execution Assets`

The implementation should reuse existing resolution-asset machinery rather than delete it.

### Compatibility rule

Historical `resolution_assets` remain valid historical records and are **not** backfilled with fabricated Change Specifications.

New execution assets created through the Recommendation Engineering path must be explicitly linked to a Change Specification.

PR #197 must therefore be reconciled so that:

- `controlSurface` belongs to the Change Specification, not the canonical `ResolutionProposal` model;
- Resolution Assets remain typed execution artifacts such as comparison briefs, FAQ evidence briefs, and source-page briefs;
- generated Resolution Assets inherit the approved/reviewed Change Specification context rather than becoming the decision themselves;
- a Change Specification may exist with no content asset at all (for example product, pricing, policy, security, or engineering changes).

---

## 6. V1 Change Specification data model

Create forward-only schema; never rewrite historical migrations.

### `change_specifications`

Core relational fields:

- `id uuid primary key`
- `organization_id uuid not null`
- `project_id uuid not null`
- `primary_opportunity_id uuid not null`
- `baseline_run_id uuid`
- `control_class text not null`
- `control_surface text`
- `eligibility_state text not null`
- `decision_state text not null`
- `truth_state text not null`
- `confidence_state text not null`
- `title text not null`
- `problem_statement text not null`
- `exact_change text not null`
- `scope_json jsonb not null`
- `owner_role text not null`
- `owner_id uuid null`
- `priority_rank integer null`
- `effort text not null`
- `dependencies_json jsonb not null`
- `commercial_relevance_json jsonb not null`
- `recommendation_relevance_json jsonb not null`
- `acceptance_criteria_json jsonb not null`
- `verification_plan_json jsonb not null`
- `status text not null`
- submit/decision/approval actor + timestamp fields following existing forward-only review patterns
- `created_by`, `created_at`, `updated_at`

V1 `status`:

- `draft`
- `in_review`
- `approved`
- `in_execution`
- `completed`
- `rejected`

A completed Change Specification means the company-side execution has been recorded. It does not mean a later recommendation result improved.

### `change_specification_evidence`

Evidence links are separate from the specification body and preserve a snapshot of what was verified at the time of the decision.

Each row links exactly one of:

- existing `evidence_items`;
- existing `source_observations`.

The row also stores an immutable `evidence_snapshot` with the same privacy and truth discipline already used by Resolution Assets.

### `change_execution_assets`

A join table links a Change Specification to existing `resolution_assets`.

Fields:

- `id`
- `organization_id`
- `project_id`
- `change_specification_id`
- `resolution_asset_id`
- `execution_role`
- `created_by`
- `created_at`

V1 execution roles:

- `requirements`
- `documentation`
- `website`
- `comparison`
- `faq`
- `proof`
- `structured_data`
- `other`

Do not build generic Jira/Linear/CMS integrations in this slice.

---

## 7. Human approval boundary

Change Specification approval is the canonical company-decision approval.

Flow:

`draft → in_review → approved → in_execution → completed`

Rejection is explicit and terminal for the submitted version.

Material product, pricing, packaging, policy, positioning, market, security, feature-removal, or category changes require human approval before execution is recorded as authorized.

Resolution/Execution Assets can retain their existing artifact-level review where useful. That review does not replace approval of the underlying company change.

---

## 8. Verification boundary

PR #198 is the measurement prerequisite for this system.

A later observation can be treated as an exact comparable follow-up only when the full compatible measurement identity is present, including:

- exact persisted buyer-question text;
- provider;
- exact model;
- methodology;
- locale;
- market;
- buyer stage;
- versioned prompt/parser/retrieval/policy/schema/evaluation context.

Missing historical provenance remains unknown and fails closed.

Verification records may report:

- improved;
- unchanged;
- worsened;
- insufficient evidence.

The language remains:

> Company Change → **Observed** Recommendation Change → Business Outcome

not:

> Company Change → Caused Recommendation Change.

---

## 9. Outcome Ledger integration

The long-term canonical learning chain is:

`Buyer Question → Recommendation Observation → Eligibility → Gap → Evidence → Change Specification → Human Decision → Execution → Comparable Later Observation → Business Outcome`

The current Outcome Ledger is asset-centered. V1 should make it capable of presenting Change Specification identity as the business decision while preserving historical asset-centered records.

Do not delete or reinterpret historical ledger events.

New ledger semantics should distinguish:

- decision approved;
- execution artifact created;
- company execution recorded;
- later measurement completed;
- observed recommendation result;
- business outcome when separately verified.

---

## 10. Primary signed-in surface

Do **not** add a sixth top-level navigation item in V1.

Preserve the current five primary navigation objects:

`Attention → Questions → Records → Comparisons → Settings`

Recommendation Engineering changes what **Attention** prioritizes.

The `/app` Attention experience becomes the executive decision surface led by:

# What should we change next?

V1 shows only active Change Specifications and a small number of highest-priority decisions rather than a vanity visibility score or dozens of generated tasks.

When evidence is insufficient, the surface must be willing to show:

- TEST FIRST;
- DO NOT DO;
- MONITOR ONLY;
- INSUFFICIENT EVIDENCE.

No UI should imply that activity volume is value.

---

## 11. Ranking and prioritization

Do not ship a fake 0–100 Recommendation Engineering score.

The eventual ranking model may use:

`Commercial Value × Recommendation Relevance × Evidence Confidence × Strategic Fit ÷ Effort`

but V1 should expose the underlying ordinal inputs and an explicit `priority_rank`, not a pseudo-scientific composite number.

A reviewer must be able to understand why Change #1 is ahead of Change #2.

---

## 12. Company Truth and Eligibility — next sub-projects, not this PR

Company Truth is approved as:

`Entity → Attribute → Asserted Value → Source → Verification State → Effective Date → Superseded Date`

This should be implemented in its own spec after the Change Specification core exists.

V1 Company Truth will start narrowly with facts needed for recommendation eligibility and company-change decisions:

- capabilities/features;
- integrations;
- pricing/packages;
- trust/certifications;
- use cases;
- markets/availability;
- policies;
- verified proof.

Eligibility v1 and Company Truth v1 are **not** to be hidden inside the Change Specification migration. They are separate, testable subsystems that will feed Change Specifications later.

---

## 13. Cross-business evidence — next sub-project

Foremention must eventually reconcile Recommendation Intelligence evidence with:

- sales/win-loss;
- customer interviews;
- support;
- product analytics;
- feature requests;
- churn/retention;
- reviews;
- pricing/commercial records;
- customer-success and revenue evidence.

Do not build hundreds of integrations now. Reuse the existing commercial/customer evidence systems first.

---

## 14. Public positioning boundary

Do not perform a global marketing rename in the Change Specification implementation PR.

After the core path exists, public positioning can move toward:

> Foremention is Recommendation Engineering for B2B companies. It shows why AI recommends competitors instead of you, tells your company exactly what to change, and measures what happened after you changed it.

The safer early wording is **“measures what happened after”**, not **“proves the change worked.”**

`Category Leadership OS` remains the long-term destination and must not be presented as achieved category leadership, guaranteed leadership, or validated market position.

---

## 15. Explicit non-goals for Core Loop v1

Do not build in this slice:

- generic SEO suite;
- generic GEO/AEO suite;
- giant social suite;
- shopping/marketplace platform;
- hundreds of integrations;
- category-name generator;
- vanity Category Leadership Score;
- autonomous company-changing agent;
- generic AI writing platform;
- cross-tenant public benchmarks;
- causality claims;
- public Recommendation Engineering rebrand before the product path exists;
- full Company Truth knowledge graph;
- complete Eligibility Engine;
- broad cross-business connector platform.

---

## 16. Validation gate before full Category Leadership OS

Do not expand into the complete Category Leadership OS until the core loop is proven with real companies.

Initial evidence target:

- 3 real design partners;
- each completes at least one `Loss → Diagnosis → Exact Change → Execution → Comparable Re-measurement` loop;
- 5+ actually executed company changes across the cohort.

Valid measured outcomes include improved, unchanged, and worsened.

The important proof question is:

> Can Foremention reliably identify useful company changes, make them precise enough that companies execute them, and learn honestly from what happens afterward?

No customer, PMF, revenue, retention, willingness-to-pay, category-leadership, or causal claim may be inferred merely from implementing this architecture.

---

## 17. Implementation decomposition

This architecture is implemented in separate reviewable slices.

### Slice A — ChangeSpecification domain foundation

- canonical strategy authority updates;
- first-class schema + RLS + validation;
- evidence links;
- TypeScript domain contract;
- API read/create/update/review operations;
- no public rebrand;
- no execution integration yet.

### Slice B — execution integration and decision surface

- reconcile PR #197 against latest `main`;
- move controllable-surface ownership from ResolutionProposal to ChangeSpecification;
- link zero/many Resolution Assets underneath Change Specifications;
- preserve artifact-level human review;
- add Attention decision surface headed “What should we change next?”;
- adapt Outcome Ledger reads to make Change Specification the decision identity for new records while keeping legacy records intact.

### Later independent specs

1. Eligibility Engine v1.
2. Company Truth v1.
3. Cross-business Evidence v1.
4. Next Best Company Change prioritization v1.
5. Immutable executive/board reporting snapshots.
6. Public Recommendation Engineering positioning migration.
7. Platform/API expansion only when the core loop needs it.

---

## 18. Release standard

Every runtime/schema slice must pass, on its exact final head:

- isolated complete Supabase migration replay;
- repository tests;
- lint;
- typecheck;
- production build;
- Cloudflare Worker dry run;
- Browser Acceptance;
- Security;
- CodeQL;
- AI Safety and Code Health;
- relevant Agent Harness contracts.

Merge is not deployment. After merge, verify the exact production release SHA separately and apply/verify canonical production migrations before calling the slice production-complete.
