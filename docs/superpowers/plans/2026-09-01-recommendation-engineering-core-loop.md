# Recommendation Engineering Core Loop v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `ChangeSpecification` the first-class Foremention decision object, place existing Resolution Assets underneath it as execution artifacts, and turn Attention into a truthful “What should we change next?” surface without public rebranding or causal overclaiming.

**Architecture:** Implement in two reviewable slices. Slice A creates the canonical strategy authority, schema, evidence links, TypeScript domain contract, and authenticated API. Slice B reconciles PR #197 onto that foundation, links execution assets to Change Specifications, upgrades Attention and Outcome Ledger reads, and preserves legacy resolution records unchanged.

**Tech Stack:** Next.js App Router, TypeScript, Supabase/Postgres + RLS, Node test runner, pnpm, Cloudflare Workers, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-01-recommendation-engineering-core-loop-design.md`

## Global Constraints

- Canonical hierarchy: `Foremention → Category Leadership OS (destination) → Recommendation Engineering (core) → Recommendation Intelligence (measurement/diagnosis) → Change Specifications → Execution Assets → Verification → Business Outcomes → Learning`.
- Public positioning remains Recommendation Intelligence until the Change Specification path is shipped and separately approved for public migration.
- Preserve primary signed-in navigation: `Attention → Questions → Records → Comparisons → Settings`.
- `ChangeSpecification` is first-class; never make `ResolutionProposal` the canonical company-decision object.
- Historical `resolution_assets` remain valid and are not backfilled with fabricated Change Specifications.
- New Recommendation Engineering execution assets must explicitly link to a Change Specification.
- Canonical states: Control `CONTROLLABLE | INFLUENCEABLE | UNCONTROLLABLE`; Eligibility `ELIGIBLE | PARTIALLY_ELIGIBLE | STRUCTURALLY_INELIGIBLE | UNKNOWN`; Decision `DO_NOW | TEST_FIRST | DO_NOT_DO | MONITOR_ONLY | INSUFFICIENT_EVIDENCE`; Truth `OBSERVED_FACT | LIKELY_EXPLANATION | HYPOTHESIS | RECOMMENDED_EXPERIMENT | VERIFIED_OUTCOME`; Confidence `HIGH | MEDIUM | LOW | INSUFFICIENT`; Verification `IMPROVED | UNCHANGED | WORSENED | INSUFFICIENT_EVIDENCE`.
- Drafts may remain incomplete. Do not invent owner, effort, exact change, priority, scope, dependencies, or controllable surface.
- Safe generated-draft defaults are `UNKNOWN / INSUFFICIENT_EVIDENCE / HYPOTHESIS / INSUFFICIENT` for eligibility/decision/truth/confidence.
- Submission for human review fails closed unless required decision fields and at least one verified evidence link exist.
- No automatic `DO_NOW + HIGH` promotion from AI-output evidence alone.
- No fake 0–100 Recommendation Engineering score.
- Verification language remains observed association, not causation.
- Every runtime/schema slice must pass exact-head migration replay, tests, lint, typecheck, build, Worker dry run, Browser Acceptance, Security, CodeQL, AI Safety/Code Health, and relevant Agent Harness contracts before merge.
- Merge is not deployment; production SHA and production migrations must be verified separately.

---

## File Structure

### Slice A — domain foundation

- Modify: `CLAUDE.md` — replace old top-level Recommendation Intelligence lock with the approved hierarchy while preserving logo/visual and evidence-safety rules.
- Modify: `.claude/skills/foremention-product-truth/SKILL.md` — teach autonomous workers the new hierarchy and Change Specification boundary.
- Modify: `docs/billion-dollar-build/EXECUTION-STATUS.md` — mark Recommendation Engineering as the build authority and Category Leadership OS as destination only.
- Modify: `FOREMENTION_STATE.md` — durable continuation state and explicit “do not merge #197 as-is” note until reconciled.
- Create: `tests/recommendation-engineering-authority.test.mjs` — source-of-truth regression contract.
- Create: `supabase/migrations/20260901000300_change_specification_domain.sql` — first-class schema, validation, RLS, evidence links, execution join table.
- Create: `tests/change-specification-domain.test.mjs` — migration and state-model source contract.
- Create: `lib/change-specification.ts` — canonical enums/types, safe draft builder, completeness validator, API serializers.
- Create: `tests/change-specification-core.test.mjs` — unit tests for defaults, state compatibility, submission completeness.
- Create: `app/api/change-specifications/route.ts` — authenticated read/create/update/review endpoints.
- Create: `tests/change-specification-api-contract.test.mjs` — route/auth/RLS/state transition source contract.

### Slice B — execution integration + decision surface

- Modify: `lib/resolution-engine.ts` — keep Resolution Assets artifact-oriented; remove `controlSurface` as canonical proposal ownership.
- Modify: `app/api/resolutions/route.ts` — require/accept `changeSpecificationId` for new Recommendation Engineering execution assets and create `change_execution_assets` link.
- Modify: `components/resolution-center.tsx` — show parent Change Specification and artifact purpose; no company-decision state stored in artifact draft.
- Modify: `tests/controllable-recommendation-actions.test.mjs` — replace #197’s “controlSurface lives in ResolutionProposal” contract with “controlSurface lives in ChangeSpecification” contract.
- Create: `lib/change-specification-data.ts` — workspace-scoped loader for Attention and API composition.
- Create: `components/change-specification-priority-list.tsx` — top decision cards with explicit states and no score.
- Modify: `app/app/page.tsx` — make Attention lead with “What should we change next?” once activation prerequisites exist.
- Modify: `lib/outcome-ledger.ts` — attach optional Change Specification identity to new ledger records without breaking historical asset-only rows.
- Modify: `app/app/outcomes/page.tsx` and `app/app/outcomes/print/page.tsx` — display decision identity where linked while preserving non-causal wording.
- Create: `tests/change-specification-attention-outcome.test.mjs` — UI/ledger source contract.

---

# Slice A — ChangeSpecification Domain Foundation

### Task 1: Lock Recommendation Engineering as internal build authority

**Files:**
- Modify: `CLAUDE.md`
- Modify: `.claude/skills/foremention-product-truth/SKILL.md`
- Modify: `docs/billion-dollar-build/EXECUTION-STATUS.md`
- Modify: `FOREMENTION_STATE.md`
- Test: `tests/recommendation-engineering-authority.test.mjs`

**Interfaces:**
- Consumes: approved design spec.
- Produces: one authoritative hierarchy used by humans, Claude/Copilot/Autopilot, and future build PRs.

- [ ] **Step 1: Write the failing authority test**

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("Recommendation Engineering is the internal core category and Category Leadership OS is destination only", async () => {
  const [claude, skill, status, state] = await Promise.all([
    text("CLAUDE.md"),
    text(".claude/skills/foremention-product-truth/SKILL.md"),
    text("docs/billion-dollar-build/EXECUTION-STATUS.md"),
    text("FOREMENTION_STATE.md"),
  ]);
  for (const source of [claude, skill, status, state]) {
    assert.match(source, /Recommendation Engineering/);
    assert.match(source, /Recommendation Intelligence/);
    assert.match(source, /Category Leadership OS/);
    assert.match(source, /Change Specification/i);
  }
  assert.doesNotMatch(claude, /Category:\s*Recommendation Intelligence\./);
  assert.match(claude, /public positioning.*Recommendation Intelligence/i);
  assert.match(state, /do not merge #197 as-is/i);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
node --test tests/recommendation-engineering-authority.test.mjs
```

Expected: FAIL because current authority files still hard-lock Recommendation Intelligence as the top-level category.

- [ ] **Step 3: Update the four authority files**

Use this exact hierarchy text in each appropriate authority section:

```md
- Long-term destination: **Category Leadership OS** — not claimed as achieved.
- Core product category being built: **Recommendation Engineering**.
- Measurement + diagnosis subsystem: **Recommendation Intelligence**.
- Canonical decision object: **Change Specification**.
- Execution artifacts are subordinate to Change Specifications.
- Public positioning remains Recommendation Intelligence until the Recommendation Engineering core path is shipped and separately approved for public migration.
```

Preserve the existing logo/visual lock, evidence lifecycle, tenant isolation, provider-cost controls, no-fake-proof rules, and the five primary signed-in navigation objects.

Add to `FOREMENTION_STATE.md`:

```md
PR #197 is directionally useful but MUST NOT merge as-is. Reconcile it after the first-class ChangeSpecification domain exists; `controlSurface` belongs to ChangeSpecification, not ResolutionProposal.
```

- [ ] **Step 4: Re-run the focused test**

Run:

```bash
node --test tests/recommendation-engineering-authority.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md .claude/skills/foremention-product-truth/SKILL.md docs/billion-dollar-build/EXECUTION-STATUS.md FOREMENTION_STATE.md tests/recommendation-engineering-authority.test.mjs
git commit -m "docs: make Recommendation Engineering the build authority"
```

---

### Task 2: Add the first-class ChangeSpecification schema

**Files:**
- Create: `supabase/migrations/20260901000300_change_specification_domain.sql`
- Create: `tests/change-specification-domain.test.mjs`

**Interfaces:**
- Consumes: `organizations`, `projects`, `opportunities`, `runs`, `evidence_items`, `source_observations`, `resolution_assets`, `is_org_member()`, `has_org_role()`.
- Produces: `change_specifications`, `change_specification_evidence`, `change_execution_assets`.

- [ ] **Step 1: Verify migration slot before writing**

Run:

```bash
ls supabase/migrations/20260901000300_change_specification_domain.sql
```

Expected: file does not exist. If `main` moved and the slot is occupied, rebase on current `main` first and allocate the next free forward timestamp; do not overwrite an existing migration.

- [ ] **Step 2: Write the failing domain source test**

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("ChangeSpecification is first-class and execution assets are subordinate", async () => {
  const sql = await text("supabase/migrations/20260901000300_change_specification_domain.sql");
  assert.match(sql, /create table public\.change_specifications/i);
  assert.match(sql, /create table public\.change_specification_evidence/i);
  assert.match(sql, /create table public\.change_execution_assets/i);
  assert.match(sql, /CONTROLLABLE.*INFLUENCEABLE.*UNCONTROLLABLE/s);
  assert.match(sql, /DO_NOW.*TEST_FIRST.*DO_NOT_DO.*MONITOR_ONLY.*INSUFFICIENT_EVIDENCE/s);
  assert.match(sql, /ELIGIBLE.*PARTIALLY_ELIGIBLE.*STRUCTURALLY_INELIGIBLE.*UNKNOWN/s);
  assert.match(sql, /OBSERVED_FACT.*LIKELY_EXPLANATION.*HYPOTHESIS.*RECOMMENDED_EXPERIMENT.*VERIFIED_OUTCOME/s);
  assert.match(sql, /HIGH.*MEDIUM.*LOW.*INSUFFICIENT/s);
  assert.match(sql, /resolution_asset_id uuid not null references public\.resolution_assets/i);
  assert.doesNotMatch(sql, /insert into public\.change_specifications/i);
});

test("drafts can remain unknown but review submission is fail-closed", async () => {
  const sql = await text("supabase/migrations/20260901000300_change_specification_domain.sql");
  assert.match(sql, /eligibility_state text not null default 'UNKNOWN'/i);
  assert.match(sql, /decision_state text not null default 'INSUFFICIENT_EVIDENCE'/i);
  assert.match(sql, /truth_state text not null default 'HYPOTHESIS'/i);
  assert.match(sql, /confidence_state text not null default 'INSUFFICIENT'/i);
  assert.match(sql, /exact_change text/i);
  assert.match(sql, /owner_role text/i);
  assert.match(sql, /effort text/i);
  assert.match(sql, /requires verified linked evidence before review/i);
  assert.match(sql, /requires an exact company change before review/i);
  assert.match(sql, /requires acceptance criteria before review/i);
  assert.match(sql, /requires a verification plan before review/i);
});
```

- [ ] **Step 3: Run the source test and verify RED**

```bash
node --test tests/change-specification-domain.test.mjs
```

Expected: FAIL because the migration does not exist.

- [ ] **Step 4: Write the migration**

Use the following core table shape; retain exact enum/check values:

```sql
begin;

create table public.change_specifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  primary_opportunity_id uuid not null references public.opportunities(id) on delete restrict,
  baseline_run_id uuid references public.runs(id) on delete set null,
  control_class text check (control_class is null or control_class in ('CONTROLLABLE','INFLUENCEABLE','UNCONTROLLABLE')),
  control_surface text,
  eligibility_state text not null default 'UNKNOWN' check (eligibility_state in ('ELIGIBLE','PARTIALLY_ELIGIBLE','STRUCTURALLY_INELIGIBLE','UNKNOWN')),
  decision_state text not null default 'INSUFFICIENT_EVIDENCE' check (decision_state in ('DO_NOW','TEST_FIRST','DO_NOT_DO','MONITOR_ONLY','INSUFFICIENT_EVIDENCE')),
  truth_state text not null default 'HYPOTHESIS' check (truth_state in ('OBSERVED_FACT','LIKELY_EXPLANATION','HYPOTHESIS','RECOMMENDED_EXPERIMENT','VERIFIED_OUTCOME')),
  confidence_state text not null default 'INSUFFICIENT' check (confidence_state in ('HIGH','MEDIUM','LOW','INSUFFICIENT')),
  title text not null check (char_length(title) between 3 and 200),
  problem_statement text not null check (char_length(problem_statement) between 3 and 2000),
  exact_change text,
  scope_json jsonb not null default '{}'::jsonb check (jsonb_typeof(scope_json) = 'object'),
  owner_role text,
  owner_id uuid references auth.users(id) on delete set null,
  priority_rank integer check (priority_rank is null or priority_rank > 0),
  effort text check (effort is null or effort in ('LOW','MEDIUM','HIGH')),
  dependencies_json jsonb not null default '[]'::jsonb check (jsonb_typeof(dependencies_json) = 'array'),
  commercial_relevance_json jsonb not null default '{}'::jsonb check (jsonb_typeof(commercial_relevance_json) = 'object'),
  recommendation_relevance_json jsonb not null default '{}'::jsonb check (jsonb_typeof(recommendation_relevance_json) = 'object'),
  acceptance_criteria_json jsonb not null default '[]'::jsonb check (jsonb_typeof(acceptance_criteria_json) = 'array'),
  verification_plan_json jsonb not null default '{}'::jsonb check (jsonb_typeof(verification_plan_json) = 'object'),
  status text not null default 'draft' check (status in ('draft','in_review','approved','in_execution','completed','rejected')),
  created_by uuid not null references auth.users(id) on delete restrict,
  submitted_by uuid references auth.users(id) on delete set null,
  submitted_at timestamptz,
  decision_by uuid references auth.users(id) on delete set null,
  decision_at timestamptz,
  approval_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.change_specification_evidence (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  change_specification_id uuid not null references public.change_specifications(id) on delete cascade,
  evidence_item_id uuid references public.evidence_items(id) on delete restrict,
  source_observation_id uuid references public.source_observations(id) on delete restrict,
  evidence_snapshot jsonb not null,
  created_at timestamptz not null default now(),
  check ((evidence_item_id is not null)::integer + (source_observation_id is not null)::integer = 1),
  check (jsonb_typeof(evidence_snapshot) = 'object' and evidence_snapshot->>'verification' = 'verified')
);

create table public.change_execution_assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  change_specification_id uuid not null references public.change_specifications(id) on delete cascade,
  resolution_asset_id uuid not null references public.resolution_assets(id) on delete cascade,
  execution_role text not null check (execution_role in ('requirements','documentation','website','comparison','faq','proof','structured_data','other')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (change_specification_id, resolution_asset_id)
);
```

Add `set_updated_at()` trigger, indexes on workspace/status/priority, and a `validate_change_specification()` trigger that:

```sql
-- Pseudocode expressed as required SQL conditions inside the trigger:
-- 1. primary opportunity belongs to the same organization/project.
-- 2. baseline run, when present, belongs to the same organization/project and is review/complete/partial.
-- 3. identity fields are immutable after insert.
-- 4. allowed transitions:
--    draft -> in_review
--    in_review -> approved | rejected
--    approved -> in_execution
--    in_execution -> completed
-- 5. draft -> in_review requires:
--    linked verified evidence;
--    control_class;
--    control_surface when control_class = CONTROLLABLE;
--    non-empty exact_change;
--    non-empty owner_role;
--    effort LOW|MEDIUM|HIGH;
--    non-empty acceptance_criteria_json array;
--    non-empty verification_plan_json object;
--    submitted_by = auth.uid().
-- 6. approved/in_execution/completed decision fields are immutable.
```

Use these exact exception messages so tests can lock the boundary:

```sql
raise exception 'Change Specification requires verified linked evidence before review';
raise exception 'Change Specification requires an exact company change before review';
raise exception 'Change Specification requires acceptance criteria before review';
raise exception 'Change Specification requires a verification plan before review';
```

Add evidence validation equivalent to `validate_resolution_asset_evidence()`: only current verified `evidence_items` or verified same-workspace `source_observations`; evidence links can change only while the Change Specification is a draft.

Add RLS/policies using existing organization roles:

```sql
alter table public.change_specifications enable row level security;
alter table public.change_specification_evidence enable row level security;
alter table public.change_execution_assets enable row level security;

create policy "change_specifications_select_member" on public.change_specifications for select
  using (public.is_org_member(organization_id));

create policy "change_specifications_insert_analyst" on public.change_specifications for insert
  with check (status = 'draft' and created_by = auth.uid()
    and public.has_org_role(organization_id, array['owner','admin','analyst']::public.organization_role[]));

create policy "change_specifications_update_analyst_draft" on public.change_specifications for update
  using (status = 'draft' and public.has_org_role(organization_id, array['owner','admin','analyst']::public.organization_role[]))
  with check (status in ('draft','in_review') and public.has_org_role(organization_id, array['owner','admin','analyst']::public.organization_role[]));

create policy "change_specifications_update_manager" on public.change_specifications for update
  using (public.has_org_role(organization_id, array['owner','admin']::public.organization_role[]))
  with check (public.has_org_role(organization_id, array['owner','admin']::public.organization_role[]));
```

Evidence and execution-link policies must require same-organization membership and analyst/manager write roles, plus trigger-level same-project validation.

No seed inserts.

- [ ] **Step 5: Run the isolated migration replay**

Run the repository's exact CI-equivalent Supabase replay command from `.github/workflows/ci.yml`.

Expected: complete migration chain succeeds from a clean local database.

- [ ] **Step 6: Run the focused source test**

```bash
node --test tests/change-specification-domain.test.mjs
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260901000300_change_specification_domain.sql tests/change-specification-domain.test.mjs
git commit -m "feat: add first-class Change Specification domain"
```

---

### Task 3: Add the TypeScript ChangeSpecification contract

**Files:**
- Create: `lib/change-specification.ts`
- Create: `tests/change-specification-core.test.mjs`

**Interfaces:**
- Produces: `CONTROL_CLASSES`, `ELIGIBILITY_STATES`, `DECISION_STATES`, `TRUTH_STATES`, `CONFIDENCE_STATES`, `VERIFICATION_STATES`, `EFFORT_STATES`, `ChangeSpecification`, `buildSafeChangeSpecificationDraft()`, `validateChangeSpecificationForReview()`.

- [ ] **Step 1: Write failing unit tests**

```js
import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSafeChangeSpecificationDraft,
  validateChangeSpecificationForReview,
} from "../lib/change-specification.ts";

test("generated drafts default to uncertainty rather than invented confidence", () => {
  const draft = buildSafeChangeSpecificationDraft({
    opportunityId: "11111111-1111-1111-1111-111111111111",
    baselineRunId: "22222222-2222-2222-2222-222222222222",
    title: "Salesforce compatibility gap",
    problemStatement: "Reviewed evidence shows Salesforce compatibility matters in this loss.",
  });
  assert.equal(draft.eligibilityState, "UNKNOWN");
  assert.equal(draft.decisionState, "INSUFFICIENT_EVIDENCE");
  assert.equal(draft.truthState, "HYPOTHESIS");
  assert.equal(draft.confidenceState, "INSUFFICIENT");
  assert.equal(draft.exactChange, null);
  assert.equal(draft.ownerRole, null);
  assert.equal(draft.effort, null);
});

test("review validation refuses incomplete material decisions", () => {
  const result = validateChangeSpecificationForReview({
    ...buildSafeChangeSpecificationDraft({
      opportunityId: "11111111-1111-1111-1111-111111111111",
      baselineRunId: null,
      title: "Pricing gap",
      problemStatement: "Reviewed evidence shows a pricing constraint.",
    }),
    linkedEvidenceCount: 1,
  });
  assert.equal(result.ok, false);
  assert.deepEqual(result.missing, ["controlClass", "exactChange", "ownerRole", "effort", "acceptanceCriteria", "verificationPlan"]);
});
```

- [ ] **Step 2: Run and verify RED**

```bash
node --test tests/change-specification-core.test.mjs
```

Expected: FAIL because module does not exist.

- [ ] **Step 3: Implement canonical enums and types**

```ts
export const CONTROL_CLASSES = ["CONTROLLABLE", "INFLUENCEABLE", "UNCONTROLLABLE"] as const;
export const ELIGIBILITY_STATES = ["ELIGIBLE", "PARTIALLY_ELIGIBLE", "STRUCTURALLY_INELIGIBLE", "UNKNOWN"] as const;
export const DECISION_STATES = ["DO_NOW", "TEST_FIRST", "DO_NOT_DO", "MONITOR_ONLY", "INSUFFICIENT_EVIDENCE"] as const;
export const TRUTH_STATES = ["OBSERVED_FACT", "LIKELY_EXPLANATION", "HYPOTHESIS", "RECOMMENDED_EXPERIMENT", "VERIFIED_OUTCOME"] as const;
export const CONFIDENCE_STATES = ["HIGH", "MEDIUM", "LOW", "INSUFFICIENT"] as const;
export const VERIFICATION_STATES = ["IMPROVED", "UNCHANGED", "WORSENED", "INSUFFICIENT_EVIDENCE"] as const;
export const EFFORT_STATES = ["LOW", "MEDIUM", "HIGH"] as const;

export type ChangeSpecification = {
  id: string | null;
  opportunityId: string;
  baselineRunId: string | null;
  controlClass: typeof CONTROL_CLASSES[number] | null;
  controlSurface: string | null;
  eligibilityState: typeof ELIGIBILITY_STATES[number];
  decisionState: typeof DECISION_STATES[number];
  truthState: typeof TRUTH_STATES[number];
  confidenceState: typeof CONFIDENCE_STATES[number];
  title: string;
  problemStatement: string;
  exactChange: string | null;
  scope: Record<string, unknown>;
  ownerRole: string | null;
  ownerId: string | null;
  priorityRank: number | null;
  effort: typeof EFFORT_STATES[number] | null;
  dependencies: string[];
  commercialRelevance: Record<string, unknown>;
  recommendationRelevance: Record<string, unknown>;
  acceptanceCriteria: string[];
  verificationPlan: Record<string, unknown>;
};
```

Implement safe draft defaults exactly:

```ts
export function buildSafeChangeSpecificationDraft(input: {
  opportunityId: string;
  baselineRunId: string | null;
  title: string;
  problemStatement: string;
}): ChangeSpecification {
  return {
    id: null,
    opportunityId: input.opportunityId,
    baselineRunId: input.baselineRunId,
    controlClass: null,
    controlSurface: null,
    eligibilityState: "UNKNOWN",
    decisionState: "INSUFFICIENT_EVIDENCE",
    truthState: "HYPOTHESIS",
    confidenceState: "INSUFFICIENT",
    title: input.title.trim(),
    problemStatement: input.problemStatement.trim(),
    exactChange: null,
    scope: {},
    ownerRole: null,
    ownerId: null,
    priorityRank: null,
    effort: null,
    dependencies: [],
    commercialRelevance: {},
    recommendationRelevance: {},
    acceptanceCriteria: [],
    verificationPlan: {},
  };
}
```

`validateChangeSpecificationForReview()` must require linked evidence and the exact submission fields from the spec. It must additionally reject `controlClass === "CONTROLLABLE"` when `controlSurface` is empty and reject `controlClass === "UNCONTROLLABLE"` paired with `decisionState === "DO_NOW"`.

- [ ] **Step 4: Run focused tests**

```bash
node --test tests/change-specification-core.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/change-specification.ts tests/change-specification-core.test.mjs
git commit -m "feat: define Change Specification decision contract"
```

---

### Task 4: Add authenticated ChangeSpecification API

**Files:**
- Create: `app/api/change-specifications/route.ts`
- Create: `tests/change-specification-api-contract.test.mjs`

**Interfaces:**
- Consumes: `requireViewer/getViewer`, `loadWorkspaceContext`, `supabaseRest`, `buildSafeChangeSpecificationDraft`, `validateChangeSpecificationForReview`.
- Produces: workspace-scoped `GET`, `POST`, `PATCH` operations.

- [ ] **Step 1: Write failing route contract tests**

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("Change Specification route is tenant-scoped and uses canonical states", async () => {
  const route = await text("app/api/change-specifications/route.ts");
  assert.match(route, /loadWorkspaceContext/);
  assert.match(route, /organization_id=eq\.\$\{context\.organizationId\}/);
  assert.match(route, /project_id=eq\.\$\{context\.projectId\}/);
  assert.match(route, /buildSafeChangeSpecificationDraft/);
  assert.match(route, /validateChangeSpecificationForReview/);
  assert.doesNotMatch(route, /confidence.*\d+%/i);
});
```

- [ ] **Step 2: Run and verify RED**

```bash
node --test tests/change-specification-api-contract.test.mjs
```

Expected: FAIL because route does not exist.

- [ ] **Step 3: Implement GET**

Return only the active workspace/project rows plus linked evidence count. Never expose another tenant and never use service-role credentials from the browser route.

Use a query shaped like:

```ts
const rows = await supabaseRest<ChangeSpecificationRow[]>(
  `change_specifications?select=*&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&order=priority_rank.asc.nullslast,created_at.desc`,
  { token: viewer.accessToken },
);
```

- [ ] **Step 4: Implement POST `action=create_from_opportunity`**

Requirements:

1. Validate opportunity UUID.
2. Fetch opportunity from same org/project.
3. Verify at least one requested evidence item/source observation is current and reviewed.
4. Create a safe draft using `UNKNOWN / INSUFFICIENT_EVIDENCE / HYPOTHESIS / INSUFFICIENT`.
5. Insert immutable evidence snapshots into `change_specification_evidence`.
6. Do not assign owner/effort/priority/exact change automatically.
7. Record audit action `change_specification.created` without raw evidence text in analytics.

- [ ] **Step 5: Implement PATCH `action=update_draft`**

Allow owner/admin/analyst through existing RLS while status is `draft`. Sanitize strings and JSON sizes. Persist only canonical enum values.

- [ ] **Step 6: Implement PATCH `action=submit` and `action=decision`**

Before submit:

```ts
const check = validateChangeSpecificationForReview({ ...spec, linkedEvidenceCount });
if (!check.ok) {
  return NextResponse.json({ error: "Complete the Change Specification before review.", missing: check.missing }, { status: 409 });
}
```

Decision rules:

- analyst may submit;
- owner/admin may approve/reject;
- approved decision must not rewrite the specification body;
- later execution-state operations are Slice B.

- [ ] **Step 7: Run focused tests**

```bash
node --test tests/change-specification-api-contract.test.mjs tests/change-specification-core.test.mjs tests/change-specification-domain.test.mjs
```

Expected: PASS.

- [ ] **Step 8: Run Slice A verification**

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Also run the repository Cloudflare Worker dry-run command and isolated Supabase migration replay from CI.

Expected: all green.

- [ ] **Step 9: Commit and open Slice A PR**

```bash
git add app/api/change-specifications/route.ts tests/change-specification-api-contract.test.mjs
git commit -m "feat: add Change Specification review API"
```

Open a scoped PR titled:

```text
Build Recommendation Engineering ChangeSpecification domain
```

Do not begin Slice B until Slice A exact head passes CI, Browser Acceptance, Security, CodeQL, AI Safety/Code Health, and Agent Harness; merge and verify production separately.

---

# Slice B — Execution Integration and Decision Surface

### Task 5: Reconcile PR #197 so controllability belongs to ChangeSpecification

**Files:**
- Modify: `lib/resolution-engine.ts`
- Modify: `app/api/resolutions/route.ts`
- Modify: `components/resolution-center.tsx`
- Modify: `tests/controllable-recommendation-actions.test.mjs`

**Interfaces:**
- Consumes: approved Change Specification rows from Slice A.
- Produces: Resolution Assets linked via `change_execution_assets` without duplicating the company-decision state in `ResolutionProposal`.

- [ ] **Step 1: Rebase/recreate #197 changes on the latest merged Slice A `main`**

Do not merge #197 directly. Compare its diff and manually carry only still-correct behavior:

- generic application references, not URL-only;
- human approval language;
- execution-surface guidance where useful;
- no ranking/provider-control guarantee.

Discard as canonical behavior:

- `ResolutionProposal.controlLevel`;
- `ResolutionProposal.controlSurface`;
- UI controls that make the Resolution Asset choose the company change surface.

- [ ] **Step 2: Rewrite failing control ownership test**

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("control classification belongs to ChangeSpecification, not ResolutionProposal", async () => {
  const [change, resolution, route] = await Promise.all([
    text("lib/change-specification.ts"),
    text("lib/resolution-engine.ts"),
    text("app/api/resolutions/route.ts"),
  ]);
  assert.match(change, /controlClass/);
  assert.match(change, /controlSurface/);
  assert.doesNotMatch(resolution, /controlLevel\?:/);
  assert.doesNotMatch(resolution, /controlSurface\?:/);
  assert.match(route, /changeSpecificationId/);
  assert.match(route, /change_execution_assets/);
});
```

- [ ] **Step 3: Make new asset generation require a Change Specification**

For Recommendation Engineering generation, request body must include:

```ts
{
  action: "generate",
  changeSpecificationId: string,
  assetType: "comparison_page" | "faq" | "content_brief"
}
```

Load the parent Change Specification from the same org/project. Require at least `in_review` for draft artifact creation and `approved|in_execution|completed` for recording the artifact as authorized execution. Do not mutate the parent decision fields from the artifact route.

After creating the existing `resolution_assets` row, insert:

```ts
await supabaseRest("change_execution_assets", {
  method: "POST",
  token: viewer.accessToken,
  prefer: "return=minimal",
  body: {
    organization_id: context.organizationId,
    project_id: context.projectId,
    change_specification_id: changeSpecification.id,
    resolution_asset_id: asset.id,
    execution_role: executionRoleFor(asset.asset_type),
    created_by: viewer.id,
  },
});
```

If the link insert fails, delete the just-created draft Resolution Asset so the operation remains atomic from the user's perspective.

- [ ] **Step 4: Generalize application reference without causal wording**

Preserve #197’s useful change from URL-only to customer-controlled reference. UI error text must be:

```text
Record the customer-controlled page, pull request, document, ticket, release, or other reference where the approved execution asset was applied.
```

Success text must remain:

```text
Applied reference recorded. This records customer action; it does not claim the change caused an AI result.
```

- [ ] **Step 5: Run focused tests**

```bash
node --test tests/controllable-recommendation-actions.test.mjs tests/resolution-engine.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/resolution-engine.ts app/api/resolutions/route.ts components/resolution-center.tsx tests/controllable-recommendation-actions.test.mjs
git commit -m "refactor: put execution assets under Change Specifications"
```

---

### Task 6: Build “What should we change next?” on Attention

**Files:**
- Create: `lib/change-specification-data.ts`
- Create: `components/change-specification-priority-list.tsx`
- Modify: `app/app/page.tsx`
- Create/Modify: `tests/change-specification-attention-outcome.test.mjs`

**Interfaces:**
- Consumes: active workspace Change Specifications.
- Produces: at most five decision cards ordered by explicit `priority_rank` then recency; no composite score.

- [ ] **Step 1: Write failing Attention contract**

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("Attention leads with the next company decisions without a vanity score", async () => {
  const page = await text("app/app/page.tsx");
  const list = await text("components/change-specification-priority-list.tsx");
  assert.match(page, /What should we change next\?/);
  assert.match(list, /DO_NOW/);
  assert.match(list, /TEST_FIRST/);
  assert.match(list, /DO_NOT_DO/);
  assert.match(list, /MONITOR_ONLY/);
  assert.match(list, /INSUFFICIENT_EVIDENCE/);
  assert.doesNotMatch(list, /Leadership Score|Recommendation Engineering Score|\/\s*100/);
});
```

- [ ] **Step 2: Run and verify RED**

```bash
node --test tests/change-specification-attention-outcome.test.mjs
```

Expected: FAIL.

- [ ] **Step 3: Implement workspace loader**

`lib/change-specification-data.ts` must:

- use the signed-in viewer token;
- filter by active org/project;
- return only non-rejected active specs for the executive list;
- order `priority_rank.asc.nullslast, created_at.desc`;
- cap the executive list at 5;
- expose raw state labels and evidence counts, not a synthetic score.

- [ ] **Step 4: Implement decision cards**

Each card must show:

- title / exact change when present;
- decision state;
- control class;
- eligibility state;
- confidence state;
- effort when known;
- owner role when assigned;
- evidence count;
- acceptance-criteria count;
- verification-plan presence;
- link to the full decision/edit flow.

For incomplete drafts, display “Not specified” or “Insufficient evidence”; do not invent values.

- [ ] **Step 5: Integrate with Attention without destroying activation**

Keep current first-use activation when the workspace has not yet established a reviewed baseline. Once activation prerequisites are met, the first decision section must be:

```tsx
<section aria-labelledby="next-company-change">
  <span className="eyebrow">Recommendation Engineering</span>
  <h1 id="next-company-change">What should we change next?</h1>
  <ChangeSpecificationPriorityList items={changeSpecifications} />
</section>
```

If no Change Specifications exist, the empty state should route to reviewed opportunities and say that Foremention will not manufacture actions without reviewed evidence.

- [ ] **Step 6: Run focused test**

```bash
node --test tests/change-specification-attention-outcome.test.mjs
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/change-specification-data.ts components/change-specification-priority-list.tsx app/app/page.tsx tests/change-specification-attention-outcome.test.mjs
git commit -m "feat: make Attention the Recommendation Engineering decision surface"
```

---

### Task 7: Make Outcome Ledger decision-aware while preserving legacy records

**Files:**
- Modify: `lib/outcome-ledger.ts`
- Modify: `app/app/outcomes/page.tsx`
- Modify: `app/app/outcomes/print/page.tsx`
- Modify: `tests/change-specification-attention-outcome.test.mjs`

**Interfaces:**
- Consumes: optional `change_execution_assets → change_specifications` link.
- Produces: new Outcome Ledger records that identify the underlying Change Specification while legacy resolution-only records still render.

- [ ] **Step 1: Extend the test with legacy + linked cases**

```js
assert.match(outcomeLedger, /changeSpecificationId/);
assert.match(outcomeLedger, /changeTitle/);
assert.match(outcomeLedger, /Observed before-and-after association only/);
assert.match(printPage, /Change Specification/);
assert.match(printPage, /not causal attribution|not causal|does not establish.*caus/i);
```

Also add a unit fixture in the existing Outcome Ledger tests where `changeSpecificationId` is null and assert that the legacy record still builds.

- [ ] **Step 2: Extend row types without requiring backfill**

Add optional fields:

```ts
export type OutcomeLedgerAssetRow = {
  // existing fields...
  change_specification_id?: string | null;
  change_title?: string | null;
};

export type OutcomeLedgerRecord = {
  // existing fields...
  changeSpecificationId: string | null;
  changeTitle: string | null;
};
```

Do not change historical resolution identity or fabricate a decision link.

- [ ] **Step 3: Load links in outcomes pages**

Query `change_execution_assets` for the displayed asset IDs, then fetch linked `change_specifications` by workspace/org/project. Join in application code and pass optional fields into `buildOutcomeLedger()`.

- [ ] **Step 4: Update wording**

Where a link exists, label the business decision as `Change Specification` and the existing item as an execution asset. Preserve:

```text
Observed before-and-after association only. This record does not establish that the applied change caused the result.
```

- [ ] **Step 5: Run focused tests**

```bash
node --test tests/change-specification-attention-outcome.test.mjs tests/outcome-ledger.test.mjs tests/value-report.test.mjs
```

Expected: PASS, including legacy fixtures.

- [ ] **Step 6: Commit**

```bash
git add lib/outcome-ledger.ts app/app/outcomes/page.tsx app/app/outcomes/print/page.tsx tests/change-specification-attention-outcome.test.mjs
git commit -m "feat: connect Change Specifications to the Outcome Ledger"
```

---

### Task 8: Exact-head verification, merge, production migration, and live proof

**Files:**
- No new product files unless verification exposes a real defect.

**Interfaces:**
- Consumes: exact final Slice B head.
- Produces: verified merged `main` + production schema/runtime parity.

- [ ] **Step 1: Run full local/CI-equivalent gates**

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Run the isolated Supabase migration replay and Cloudflare Worker dry run exactly as `.github/workflows/ci.yml` does.

Expected: all pass.

- [ ] **Step 2: Open PR and hold the head stable**

Require exact-head success for:

- CI;
- Browser Acceptance;
- Security;
- CodeQL;
- AI Safety and Code Health;
- Agent Harness when triggered.

No “merge now, fix production later.”

- [ ] **Step 3: Merge with expected-head SHA guard**

Use squash merge with the exact verified PR head. If `main` moved, stop and reconcile before merge.

- [ ] **Step 4: Verify new `main` SHA**

Read `refs/heads/main` / branch metadata and record the exact merged SHA in `FOREMENTION_STATE.md` in the next docs/state update.

- [ ] **Step 5: Verify production release before database migration**

Use the authenticated canary/release workflow. Require `Verify exact production release before canary` to pass for the merged SHA.

- [ ] **Step 6: Apply only the canonical forward migration to production**

Apply the exact merged SQL for the Change Specification migration through Supabase migration tooling. Do not hand-edit production schema.

- [ ] **Step 7: Verify production schema**

Run a read-only verification query equivalent to:

```sql
select
  to_regclass('public.change_specifications') is not null as specs,
  to_regclass('public.change_specification_evidence') is not null as evidence,
  to_regclass('public.change_execution_assets') is not null as execution_assets,
  (select count(*) from public.change_specifications) as spec_count,
  (select count(*) from public.change_execution_assets) as execution_asset_count;
```

Expected on pre-customer production immediately after migration: tables exist; counts may legitimately be `0`. Do not seed fake rows.

Verify RLS and role access with `has_table_privilege` plus the existing security advisor.

- [ ] **Step 8: Require authenticated canary completion**

The exact-release precheck is not the same as the full authenticated canary. Require the canary job itself to finish successfully before calling the slice production-complete.

- [ ] **Step 9: Close/supersede old #197 safely**

After the reconciled Slice B PR merges, close PR #197 as superseded. Its useful behavior has been reimplemented under the first-class Change Specification architecture; do not merge its old head afterward.

---

## Plan Self-Review

### Spec coverage

- Canonical hierarchy → Task 1.
- Corrected state model → Tasks 2–4.
- First-class Change Specification → Tasks 2–4.
- Execution Assets subordinate → Task 5.
- Human approval boundary → Tasks 2 and 4.
- Verification / non-causal boundary → Tasks 5, 7, 8.
- “What should we change next?” → Task 6.
- Legacy Resolution Asset compatibility → Tasks 5 and 7.
- No public rebrand → Global Constraints / Task 1.
- Eligibility/Company Truth/cross-business evidence deferred to separate specs → Global Constraints; intentionally absent from runtime tasks.

### Placeholder scan

No `TBD`, `TODO`, generic “add error handling,” or unspecified test steps are permitted in execution. If repository drift changes a path or migration timestamp, rebase first and update the plan/spec in the implementation PR rather than guessing.

### Type consistency

The plan uses the same canonical state names in SQL, TypeScript, API, and UI. `controlClass`/`controlSurface` live only on Change Specification. `ResolutionProposal` stays execution-artifact-specific. `changeSpecificationId` is optional only in legacy Outcome Ledger reads, not for new Recommendation Engineering execution assets.
