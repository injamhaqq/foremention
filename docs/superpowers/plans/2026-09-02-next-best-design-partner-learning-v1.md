# Implementation Plan — Next Best Company Change v1 + Design-Partner Execution + Learning Refinement

## Base

Stacked from Decision Intelligence v1 exact head `0bbf2fd735eec154673cc61ec5edc5319daee34f` while PR #215 finishes Browser Acceptance. Do not merge this phase before PR #215 is merged and exact-production verified.

## Task 1 — RED contracts

Create `tests/next-best-design-partner-learning-v1.test.mjs` that requires:

- a forward-only migration;
- `next_best_change_batches` and `next_best_change_evaluations` with RLS and immutable evaluation history;
- no score/probability fields;
- deterministic pure prioritization engine with explicit bands/reasons and no `decision_state` output;
- `design_partner_execution_cycles` gated by real external classification + commercial account linkage;
- no design-partner/customer backfill;
- service-role-only honest program scorecard;
- append-only `change_verification_assessments` using canonical verification states and `causal_attribution = not_claimed`;
- a pure verification function that classifies positive/zero/negative/mixed recommendation deltas conservatively;
- authenticated API actions;
- UI boundary copy.

Open a stacked PR and prove RED because planned implementation files are absent.

## Task 2 — Persistence

Create `supabase/migrations/20260902000200_next_best_design_partner_learning_v1.sql`.

### Next Best tables

- `next_best_change_batches`
- `next_best_change_evaluations`

Both tenant scoped. Batch and evaluations are immutable after insert. Evaluation rows snapshot all factors and reason codes.

### Design-partner cycle

Create `design_partner_execution_cycles` with a validation trigger that uses a narrow security-definer eligibility function to check:

- company classification is `design_partner` or `customer`;
- KPI inclusion is explicit;
- commercial account has the same `customer_organization_id`.

No commercial PII is copied into the cycle.

Create a derived progress view and a service-role-only scorecard. Customer RLS may expose only their own cycle/progress rows.

### Verification / learning

Create append-only `change_verification_assessments` and association table to verified Cross-business Evidence. Persist Recommendation Engineering before/after metrics and limitations. Never set causal attribution to anything other than `not_claimed`.

Create descriptive `change_learning_summaries` only if enough real assessments exist; otherwise the API should return insufficient evidence rather than manufacturing a pattern.

## Task 3 — Pure engines

Create:

- `lib/next-best-company-change.ts`
- `lib/change-verification.ts`

### Prioritizer

Inputs are explicit candidate facts. Output contains:

- `priorityBand`;
- `reasonCodes`;
- stable ordering metadata;
- candidate identity.

No score, probability, `decisionState` output, or mutation behavior.

### Verification

Input is a persisted follow-up outcome snapshot. Output contains canonical verification state, comparison eligibility, reasons, limitations, and metric deltas. Mixed direction is insufficient evidence.

## Task 4 — API

Create `app/api/next-best-change/route.ts`.

GET returns:

- latest batch/evaluations;
- design-partner cycle/progress for the workspace;
- latest verification assessments.

POST actions:

- `evaluate_next_best_changes` — owner/admin/analyst; load candidate facts, latest eligibility, linked evidence and Cross-business Evidence; run pure prioritizer; persist immutable batch/evaluations.
- `start_design_partner_cycle` — owner/admin only; fail closed unless database verifies external classification + commercial account linkage.
- `refresh_design_partner_cycle` — owner/admin/analyst; update lifecycle only from factual existing execution/follow-up state, never invent milestones.
- `assess_change_verification` — owner/admin/analyst; require a completed/incomparable follow-up linked through a Change Specification execution asset; persist canonical assessment.

No API action changes `decision_state`, `truth_state`, `confidence_state`, approval state, or human `priority_rank` automatically.

## Task 5 — UI

Create `components/next-best-change-context.tsx` and integrate into the Change Specification detail page.

Add a small Attention integration only if the latest evaluation can be loaded without replacing the existing Change Specification list. Display:

- recommended band and ordinal;
- reasons;
- design-partner execution state (only if legitimate);
- latest verification state;
- boundary copy.

Do not add a score.

## Task 6 — GREEN gates

Required exact-head gates:

- Supabase migration replay;
- tests;
- lint;
- typecheck;
- build;
- Worker dry run;
- Browser Acceptance;
- Security;
- CodeQL;
- AI Safety and Code Health.

Fix exact diagnostics only. Do not weaken rules.

## Task 7 — Merge/release

1. First finish PR #215 and exact-production verification.
2. Reconfirm this stacked branch is based on the merged Decision Intelligence tree; retarget/rebase only if needed.
3. Verify exact next-phase head and all gates.
4. Merge with expected-head lock.
5. Capture exact new `main` SHA.
6. Verify Cloudflare deploys that exact SHA.
7. Verify production health, exact-release CI, Inngest sync/probe, provenance/SBOM, Browser Acceptance.
8. Report design-partner counters truthfully. If no verified external partner exists, report zero and identify the next operational action as acquiring/classifying a real partner—not fabricating one.