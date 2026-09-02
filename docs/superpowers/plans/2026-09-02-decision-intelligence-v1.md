# Decision Intelligence v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Company Truth v1, Eligibility Engine v1, and Cross-business Evidence v1 as separate tenant-safe subsystems feeding the existing Change Specification loop.

**Architecture:** Add one forward-only migration for the three data domains, three focused TypeScript domain modules, one authenticated API route that orchestrates the domains, and one read-only Change Specification context panel. Company Truth remains evidence-backed and historical; Eligibility is a pure deterministic evaluator over verified requirements + current verified truth; Cross-business Evidence normalizes source-backed workspace evidence and explicitly linked commercial records without copying PII.

**Tech Stack:** Next.js App Router, TypeScript, Supabase/PostgREST + PostgreSQL RLS/triggers, Node test runner, existing Foremention auth/data/request-security helpers.

**Spec:** `docs/superpowers/specs/2026-09-02-decision-intelligence-v1-design.md`

## Global Constraints

- No fact becomes verified merely because it was typed.
- Verified Company Truth requires current verified same-workspace `evidence_items` provenance.
- Eligibility uses only verified requirements and current verified Company Truth.
- `STRUCTURALLY_INELIGIBLE` never implies or writes `DO_NOT_DO`.
- Eligibility may update only a draft Change Specification's `eligibility_state`.
- Commercial import requires `commercial_accounts.customer_organization_id = current organization` and excludes raw PII.
- No synthetic backfill, cross-tenant data, causality claim, public Category Leadership claim, or autonomous company decision.
- Human approval remains authoritative.

---

### Task 1: RED contract for all three subsystems

**Files:**
- Create: `tests/decision-intelligence-v1.test.mjs`

**Interfaces:**
- Consumes: approved design spec.
- Produces: repository contract that fails until migration/modules/API/UI integration exist.

- [ ] **Step 1: Write the failing repository contract**

The test must read the planned migration, modules, API route, and Change Specification detail component and assert:

```js
assert.match(sql, /create table public\.company_truth_entities/i);
assert.match(sql, /create table public\.company_truth_assertions/i);
assert.match(sql, /create table public\.eligibility_requirements/i);
assert.match(sql, /create table public\.eligibility_evaluations/i);
assert.match(sql, /create table public\.cross_business_evidence/i);
assert.match(sql, /create table public\.change_specification_cross_business_evidence/i);
assert.match(sql, /customer_organization_id\s*=\s*context\.organizationId/i);
assert.doesNotMatch(sql, /insert\s+into\s+public\.company_truth_assertions\s+select/i);
assert.match(engine, /STRUCTURALLY_INELIGIBLE/);
assert.match(engine, /PARTIALLY_ELIGIBLE/);
assert.doesNotMatch(engine, /decisionState\s*:/);
assert.match(api, /evaluate_eligibility/);
assert.match(api, /import_commercial_evidence/);
assert.match(ui, /Decision intelligence informs human review/);
```

Also assert every new table has RLS and no raw commercial contact PII fields are copied into the new cross-business table.

- [ ] **Step 2: Run CI on tests-only head**

Run repository CI through a draft/open PR. Expected: FAIL because `supabase/migrations/20260902000100_decision_intelligence_v1.sql`, the domain modules, and API route do not exist yet.

- [ ] **Step 3: Preserve the exact RED evidence**

Record the failing test/job name and exact tests-only SHA in the PR description or working notes before implementation.

---

### Task 2: Company Truth v1 persistence and domain contract

**Files:**
- Create: `supabase/migrations/20260902000100_decision_intelligence_v1.sql`
- Create: `lib/company-truth.ts`

**Interfaces:**
- Produces:
  - `COMPANY_TRUTH_ENTITY_TYPES`
  - `COMPANY_TRUTH_VERIFICATION_STATES`
  - `CompanyTruthEntityType`
  - `CompanyTruthVerificationState`
  - `CompanyTruthAssertion`
  - `isCurrentVerifiedTruth(assertion, now?)`
  - `selectCurrentVerifiedTruth(assertions)`
- Consumed by: API and Eligibility Engine.

- [ ] **Step 1: Add Company Truth tables to the forward-only migration**

Create `company_truth_entities` and `company_truth_assertions` with the exact fields/states from the design. Add same-project FK validation triggers, current-verified uniqueness, indexes, timestamps, and RLS.

- [ ] **Step 2: Add verification trigger**

On transition to `verified`, require `evidence_item_id` to reference a current same-workspace `evidence_items` row with `verification_status = 'verified'`, non-null source URL, non-empty usage rights, and non-expired evidence. Canonicalize `source_snapshot` server-side.

- [ ] **Step 3: Enforce immutable verified history**

Once verified, prevent changes to entity, attribute, asserted value, evidence source, creator, effective date, or verification actor/history. Supersession sets only `verification_state = 'superseded'` and `superseded_at`; replacement truth is a new assertion.

- [ ] **Step 4: Add tenant authorization**

Members can select. Owner/admin/analyst can create entities and unverified assertions. Owner/admin can verify/reject/supersede. Grant only needed authenticated privileges.

- [ ] **Step 5: Implement pure Company Truth helpers**

`isCurrentVerifiedTruth` returns true only for `verified`, effective assertions not superseded/expired as of the supplied time. `selectCurrentVerifiedTruth` returns one current assertion per `entityId + attributeKey` without inventing defaults.

---

### Task 3: Eligibility Engine v1

**Files:**
- Modify: `supabase/migrations/20260902000100_decision_intelligence_v1.sql`
- Create: `lib/eligibility-engine.ts`

**Interfaces:**
- Consumes: current verified Company Truth assertions.
- Produces:
  - `ELIGIBILITY_OPERATORS`
  - `ELIGIBILITY_IMPORTANCE`
  - `EligibilityRequirement`
  - `EligibilityRequirementResult`
  - `EligibilityEvaluation`
  - `evaluateEligibility(requirements, assertions)`

- [ ] **Step 1: Add eligibility requirement/evaluation tables**

Add `eligibility_requirements` and immutable `eligibility_evaluations`. Requirements are same-workspace and tied to one Change Specification. Support `EXISTS | EQUALS | INCLUDES | NOT_EQUALS`, `REQUIRED | SUPPORTING`, and `draft | verified | rejected`.

- [ ] **Step 2: Require verified requirement provenance**

A requirement can become verified only when exactly one source is present: a current verified `evidence_item` or a verified `source_observation` that retains persisted reviewed answer question/provider/model/run provenance from the same project. Canonicalize `source_snapshot` in a trigger.

- [ ] **Step 3: Make verified requirements immutable**

After verification, subject attribute, operator, expected value, importance, source, creator, and verification history cannot change.

- [ ] **Step 4: Implement deterministic matching**

For each requirement:

```ts
EXISTS: verified truth exists and has a non-null/non-empty value
EQUALS: normalized JSON value equals expected JSON value
INCLUDES: strings use case-insensitive containment; arrays require expected members
NOT_EQUALS: verified truth exists and normalized value differs
```

Missing current truth yields `UNKNOWN`, never a guessed mismatch.

- [ ] **Step 5: Implement aggregate states exactly**

```ts
if (requiredMismatch) return "STRUCTURALLY_INELIGIBLE";
if (noVerifiedRequirements || requiredUnknown) return "UNKNOWN";
if (supportingMismatchOrUnknown) return "PARTIALLY_ELIGIBLE";
return "ELIGIBLE";
```

Return inspectable reason codes and counts; no probability score and no decision-state field.

- [ ] **Step 6: Persist immutable evaluations**

Store state, reason codes, per-requirement results, requirement count, truth count, engine version `decision-intelligence-v1`, actor, and time. The database does not auto-mutate `decision_state`.

---

### Task 4: Cross-business Evidence v1

**Files:**
- Modify: `supabase/migrations/20260902000100_decision_intelligence_v1.sql`
- Create: `lib/cross-business-evidence.ts`

**Interfaces:**
- Produces:
  - `CROSS_BUSINESS_EVIDENCE_TYPES`
  - `CROSS_BUSINESS_DIRECTIONS`
  - `CrossBusinessEvidenceType`
  - `CrossBusinessDirection`
  - `sanitizeCommercialEvidenceSnapshot(input)`
- Consumed by: API.

- [ ] **Step 1: Add normalized evidence/link tables**

Create `cross_business_evidence` and `change_specification_cross_business_evidence` with the design enums, source fields, verification state, timestamps, same-workspace FKs, indexes, and RLS.

- [ ] **Step 2: Verify workspace-created evidence from evidence_items**

Promotion to verified requires a current verified evidence item in the same project and canonicalizes its source snapshot.

- [ ] **Step 3: Make links verified-only and immutable**

A Change Specification link is insertable only when both rows belong to the same workspace and the evidence is `verified`. Link identity cannot be rewritten.

- [ ] **Step 4: Implement commercial snapshot sanitizer**

Return only allowlisted fields such as event type, stage, commercial model, loss reason, non-negative accepted/paid values where already stored, source system/reference, and observed timestamps. Explicitly exclude name, email, job title, message body, free-form contact PII, and arbitrary commercial notes.

---

### Task 5: Authenticated orchestration API

**Files:**
- Create: `app/api/decision-intelligence/route.ts`

**Interfaces:**
- Consumes: viewer/workspace role helpers, `supabaseRest`, three domain modules.
- Produces: GET decision context and POST actions listed in the design.

- [ ] **Step 1: Add shared request guards**

Use `getViewer`, `loadWorkspaceContext`, `getPrimaryWorkspaceRole`, `isTrustedMutationOrigin`, UUID validation, bounded string/array/object cleaners, and `isMissingRelationError` pending-migration handling.

- [ ] **Step 2: Implement GET**

For live authenticated workspace return current verified Company Truth, selected Change Specification requirements/latest evaluation, and linked verified cross-business evidence. Demo returns empty safe data without service-role reads.

- [ ] **Step 3: Implement Company Truth mutations**

Create entity/assertion with analyst+ role. Verify/supersede with owner/admin role. Use authenticated token so RLS/triggers remain authoritative.

- [ ] **Step 4: Implement Eligibility mutations**

Create requirement with analyst+ role. Verify with owner/admin. `evaluate_eligibility` loads only verified requirements + current verified truth, calls `evaluateEligibility`, inserts immutable evaluation, and updates only draft `change_specifications.eligibility_state`.

The update body must be exactly scoped to eligibility state and must never include `decision_state`, `truth_state`, `confidence_state`, or status/history fields.

- [ ] **Step 5: Implement Cross-business mutations**

Create/verify/link source-backed evidence using authenticated RLS.

- [ ] **Step 6: Implement commercial import**

Owner/admin only. Service-role read existing `commercial_accounts` joined by `customer_organization_id = context.organizationId`, then load the requested event/opportunity only under that account. Sanitize to a non-PII snapshot before writing a verified cross-business evidence row for the current workspace. Reject unlinked prospects and arbitrary account IDs.

- [ ] **Step 7: Add audit events**

Record material verify/supersede/evaluate/import/link actions in existing `audit_logs` with bounded non-PII before/after state.

---

### Task 6: Change Specification decision-context UI

**Files:**
- Create: `components/decision-intelligence-context.tsx`
- Modify: `components/change-specification-detail.tsx`

**Interfaces:**
- Consumes: `/api/decision-intelligence?changeSpecificationId=<id>`.
- Produces: read-only context panel inside existing Change Specification detail.

- [ ] **Step 1: Build read-only context component**

Fetch the API after mount. Render loading/error/pending-migration states without blocking the existing Change Specification screen.

- [ ] **Step 2: Render inspectable context**

Show verified Company Truth count, latest eligibility state/reason codes, verified requirement count, and linked cross-business evidence count/types. Do not render a composite score.

- [ ] **Step 3: Preserve human boundary copy**

Render exactly:

`Decision intelligence informs human review. It does not authorize a company change or prove causality.`

- [ ] **Step 4: Embed without changing top-level IA**

Add the component to the existing Change Specification detail page. Do not add a navigation item or global public-positioning change.

---

### Task 7: GREEN verification, PR, merge, production proof

**Files:**
- All files above.

**Interfaces:**
- Produces: exact tested release SHA.

- [ ] **Step 1: Run exact-head CI through PR**

Require migration replay, all tests, lint, typecheck, build, and Worker dry-run green.

- [ ] **Step 2: Run mandatory PR gates**

Require Browser Acceptance, Security, CodeQL, and AI Safety and Code Health green on the exact same head SHA.

- [ ] **Step 3: Review diff for truth/privacy regressions**

Confirm no synthetic inserts/backfills, no service-role PII exposure, no decision-state auto-promotion, no weakened RLS, and no causality/leadership claims.

- [ ] **Step 4: Merge with expected-head lock**

Merge only the exact tested head. Record merge SHA and verify `main` points to it.

- [ ] **Step 5: Verify production exact SHA**

Require Cloudflare Workers build success for the new `main` SHA and `/api/health` exact release verification through existing CI.

- [ ] **Step 6: Verify post-merge runtime gates**

Require trusted Browser Acceptance, Inngest sync/probe where invoked by current release workflow, release provenance, and SBOM attestation green before declaring production complete.