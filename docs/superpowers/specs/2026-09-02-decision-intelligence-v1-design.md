# Foremention Decision Intelligence v1 — Company Truth, Eligibility, Cross-business Evidence

**Status:** APPROVED FOR IMPLEMENTATION

**Date:** 2026-09-02

**Base:** `883afde9c79ab9a5b31546b98228877ec429be6a`

## Goal

Build the next three Recommendation Engineering subsystems as separate, testable layers that feed the existing Change Specification loop:

1. Company Truth v1;
2. Eligibility Engine v1;
3. Cross-business Evidence v1.

The implementation must strengthen decision quality without claiming that Foremention controls AI providers, without fabricating customer/company facts, and without automatically converting evidence into a material company decision.

## Product boundary

The existing canonical hierarchy remains:

`Recommendation Intelligence → Change Specification → Human Decision → Execution → Comparable Later Observation → Business Outcome → Learning`

Decision Intelligence v1 adds upstream context:

`Company Truth + Eligibility + Cross-business Evidence → Change Specification context`

It does not replace Recommendation Intelligence, Change Specifications, verified source evidence, or human approval.

## Global truth rules

- No fact is `verified` merely because a user typed it.
- A verified Company Truth assertion must be backed by a current verified `evidence_item` from the same organization/project.
- Eligibility evaluates explicit verified requirements against current verified Company Truth. It never infers missing requirements from model output.
- `STRUCTURALLY_INELIGIBLE` is an eligibility result, not a `DO_NOT_DO` decision.
- Eligibility may update the `eligibility_state` of a **draft** Change Specification only; it never changes decision, truth, confidence, approval, or execution state.
- Cross-business evidence is normalized evidence, not customer proof by assertion. Verified workspace evidence must be source-backed.
- Commercial imports may reuse existing first-party commercial records only when the commercial account is explicitly linked to the current customer organization. Raw contact PII must not be copied into workspace evidence.
- No automatic causal attribution.
- No synthetic backfill.
- No cross-tenant reads or writes.

---

# 1. Company Truth v1

## Purpose

Represent what the company/product actually claims to be true, with source provenance and historical validity.

Canonical model:

`Entity → Attribute → Asserted Value → Source → Verification State → Effective Date → Superseded Date`

## Scope

V1 supports only facts useful for recommendation eligibility and company-change decisions:

- capabilities/features;
- integrations;
- pricing/packages;
- trust/certifications;
- use cases;
- markets/availability;
- policies;
- verified proof.

## Data model

### `company_truth_entities`

Tenant/project-scoped canonical subjects.

Fields:

- `id`
- `organization_id`
- `project_id`
- `entity_type`: `company | product | package | integration | market | policy | proof`
- `canonical_key`
- `label`
- `created_by`
- timestamps

Entity identity is immutable. No automatic entity creation from AI output.

### `company_truth_assertions`

Append-oriented assertions about an entity.

Fields:

- `id`
- tenant/project identity
- `entity_id`
- `attribute_key`
- `asserted_value_json`
- `evidence_item_id`
- `source_snapshot`
- `verification_state`: `unverified | verified | rejected | superseded | expired`
- `effective_at`
- `superseded_at`
- `created_by`
- `verified_by`
- `verified_at`
- timestamps

Rules:

- draft/unverified assertions may exist without evidence;
- promotion to `verified` requires a current verified `evidence_item` in the same workspace with a source URL and usage rights;
- the database canonicalizes a non-PII source snapshot at verification time;
- verified assertion value, entity, attribute, source, creator, and effective date become immutable;
- a verified assertion is replaced by creating a new assertion and superseding the old one;
- only one current verified assertion may exist for the same entity + attribute;
- no historical backfill is created.

## Authorization

- organization members: read;
- owner/admin/analyst: create entities and unverified assertions;
- owner/admin: verify/reject/supersede assertions;
- browser roles cannot bypass source verification.

---

# 2. Eligibility Engine v1

## Purpose

Answer an inspectable question:

> Based on explicit verified buyer requirements and current verified Company Truth, is this company structurally eligible for this Change Specification context?

The engine does **not** answer whether the company will be recommended or ranked.

## Requirement model

### `eligibility_requirements`

V1 requirements are scoped to one Change Specification so they can be used immediately by the live decision loop without pretending a universal requirement model already exists.

Fields:

- `id`
- tenant/project identity
- `change_specification_id`
- `entity_type`
- `attribute_key`
- `operator`: `EXISTS | EQUALS | INCLUDES | NOT_EQUALS`
- `expected_value_json`
- `importance`: `REQUIRED | SUPPORTING`
- exactly one source: verified `evidence_item` or verified `source_observation`
- canonical `source_snapshot`
- `review_status`: `draft | verified | rejected`
- `created_by`, `verified_by`, timestamps

Requirements become immutable after verification.

## Pure evaluation rules

The TypeScript engine receives only verified requirements and current verified truth assertions.

For each requirement it returns `MATCH | MISMATCH | UNKNOWN` with an inspectable reason.

Aggregate state:

1. `STRUCTURALLY_INELIGIBLE` if any `REQUIRED` requirement has a definitive `MISMATCH`.
2. `UNKNOWN` if no required mismatch exists but at least one `REQUIRED` requirement is `UNKNOWN`, or if there are no verified requirements.
3. `PARTIALLY_ELIGIBLE` if every required requirement matches but at least one supporting requirement is `MISMATCH` or `UNKNOWN`.
4. `ELIGIBLE` only when all verified requirements match.

The engine emits reason codes and counts, not a fake percentage score.

## Persistence

### `eligibility_evaluations`

Immutable evaluation snapshots:

- `id`
- tenant/project identity
- `change_specification_id`
- `state`
- `reason_codes_json`
- `results_json`
- `requirement_count`
- `truth_assertion_count`
- `engine_version = decision-intelligence-v1`
- `evaluated_by`
- `evaluated_at`

An evaluation may update `change_specifications.eligibility_state` only when that Change Specification is still `draft` and the authenticated actor has write permission. It must not mutate `decision_state`, `truth_state`, `confidence_state`, review history, approval history, or execution state.

---

# 3. Cross-business Evidence v1

## Purpose

Allow Recommendation Engineering to consider evidence from outside the recommendation-measurement loop while preserving provenance and privacy.

V1 evidence types:

- `sales_win_loss`
- `customer_interview`
- `support`
- `product_analytics`
- `feature_request`
- `churn_retention`
- `review`
- `pricing_commercial`
- `customer_success`
- `revenue`

## Data model

### `cross_business_evidence`

Fields:

- `id`
- tenant/project identity
- `evidence_type`
- `title`
- `summary`
- `direction`: `supports | contradicts | context | unknown`
- `evidence_item_id` when workspace-created
- optional commercial linkage: `commercial_event_id` / `commercial_opportunity_id`
- `source_system`
- `source_reference`
- canonical non-PII `source_snapshot`
- `verification_state`: `unverified | verified | rejected | expired`
- `occurred_at`
- `created_by`, `verified_by`, timestamps

Workspace-created evidence can be verified only with a current verified `evidence_item` in the same project.

### `change_specification_cross_business_evidence`

Links verified cross-business evidence to a Change Specification in the same workspace. The link is immutable and does not change the Change Specification decision state.

## Commercial import

The API may import an existing `commercial_event` or `commercial_opportunity` as normalized evidence only when:

- caller is workspace owner/admin;
- the commercial account's `customer_organization_id` equals the current organization;
- the commercial record is real first-party data already stored by Foremention;
- the normalized snapshot excludes contact name, email, phone, message body, and other raw PII;
- the imported evidence is explicitly labelled `source_system = foremention_commercial`;
- a commercial stage/value is preserved as observed commercial context, not rewritten as product causality.

No prospect without an explicit customer-organization link may be exposed to a workspace.

---

# 4. API

Create `/api/decision-intelligence`.

## GET

Requires an authenticated live workspace. Supports optional `changeSpecificationId` and returns:

- Company Truth entities + current verified assertions;
- requirements and latest eligibility evaluation for the selected Change Specification;
- linked verified cross-business evidence;
- counts and reason codes suitable for a decision-context UI.

Demo mode returns an empty, explicitly fictional-safe payload and never reads live truth/commercial data.

## POST actions

Company Truth:

- `create_truth_entity`
- `create_truth_assertion`
- `verify_truth_assertion`
- `supersede_truth_assertion`

Eligibility:

- `create_eligibility_requirement`
- `verify_eligibility_requirement`
- `evaluate_eligibility`

Cross-business evidence:

- `create_cross_business_evidence`
- `verify_cross_business_evidence`
- `link_cross_business_evidence`
- `import_commercial_evidence`

All mutations enforce trusted origin, workspace membership/role, same-project identity, bounded input sizes, and fail-closed source validation.

---

# 5. Change Specification integration

The Change Specification detail screen gains one read-only **Decision intelligence context** section showing:

- current verified Company Truth fact count;
- latest Eligibility state + reason codes;
- linked verified cross-business evidence count/types;
- explicit copy: `Decision intelligence informs human review. It does not authorize a company change or prove causality.`

No sixth top-level nav item is added.

---

# 6. Tests and release gates

TDD contract must prove:

- all three subsystems exist independently;
- RLS is enabled on every new table;
- no data backfill exists;
- verified Company Truth requires a current verified evidence source;
- verified eligibility requirements require reviewed evidence provenance;
- aggregate eligibility semantics match the four-state rules exactly;
- `STRUCTURALLY_INELIGIBLE` does not mutate `decision_state`;
- commercial import requires explicit `customer_organization_id` equality and excludes PII;
- cross-business links require verified same-workspace evidence;
- demo mode cannot read live evidence;
- the Change Specification UI uses read-only context and preserves human approval copy.

Required exact-head gates before merge:

- migration replay;
- test suite;
- lint;
- typecheck;
- build;
- Worker dry-run;
- Browser Acceptance;
- Security;
- CodeQL;
- AI Safety and Code Health.

After merge, production must report the exact new `main` SHA before trusted acceptance is considered complete.

## Explicit non-goals

- no hundreds of third-party integrations;
- no autonomous company-changing agent;
- no public cross-tenant benchmark;
- no probability-based eligibility score;
- no automated `DO_NOW`;
- no causal business-outcome claim;
- no fabricated Company Truth backfill;
- no public Category Leadership claim;
- no global marketing rebrand.