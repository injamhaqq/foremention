# AI Evaluation Quality Implementation Plan

> Execution branch: `build/billion-dollar-11-ai-quality`
> Corrected base: `08d7f398ae89d0d69af4530af5ecc6c752f1a6c6`

**Goal:** Add a deterministic, privacy-safe, versioned AI quality evaluation system around Foremention’s existing provider/evidence pipeline without changing live intelligence behavior merely to make it measurable.

**Architecture:** Evaluate captured observations outside provider execution. Keep retrieval, returned citations, retrievability, evidence correctness, classification, recommendation quality, and human review as separate facts. Stamp new persisted answers with a database-owned version envelope; leave historical missing metadata null.

**Stack:** Node test runner, ESM evaluation modules, TypeScript contract helper, PostgreSQL/Supabase migration, existing GitHub Actions CI.

## Task 1 — Freeze the regression contract before implementation

Files:
- Create `tests/ai-evaluation-quality.test.mjs`
- Create `tests/ai-measurement-context-contract.test.mjs`

Requirements:
- privacy boundary;
- golden risk categories;
- numerator/denominator metrics;
- missing-ground-truth behavior;
- repeated-question consistency;
- recommendation guardrails;
- independent drift signals;
- non-vanity report;
- persisted version envelope;
- no-network CLI contract.

## Task 2 — Add deterministic evaluation primitives

Files:
- Create `lib/evaluation/quality-harness.mjs`
- Create `lib/evaluation/golden-cases.mjs`

Requirements:
- canonical URL handling;
- duplicate reference detection;
- retrieval precision/coverage;
- citation survival;
- evidence correctness;
- evidence-state correctness;
- extraction consistency;
- classification accuracy;
- unsupported/contradicted assertion rates;
- comparison eligibility correctness;
- provider failure rate;
- review outcomes;
- model/provider operational summary;
- drift detection.

## Task 3 — Persist reproducibility context

Files:
- Create `lib/ai-measurement-context.ts`
- Create `supabase/migrations/20260830000300_ai_measurement_context.sql`

Requirements:
- prompt/parser/provider/model/model-version/retrieval/policy/schema/evaluation dimensions;
- DB stamp on every newly inserted `run_answers` row;
- `modelVersion = unreported` until a trustworthy immutable provider revision is available;
- no historical backfill with guessed metadata.

## Task 4 — Add internal reporting runner

Files:
- Create `scripts/run-ai-evaluation.mjs`
- Modify `package.json`

Requirements:
- `pnpm eval:ai` command;
- file-in / report-out only;
- no provider request or web retrieval;
- optional baseline drift comparison;
- Markdown and JSON output.

## Task 5 — Document the operating system

Files:
- Create `docs/billion-dollar-build/11-ai-evaluation-quality.md`

Requirements:
- recovered architecture;
- metric definitions and assessment boundaries;
- golden-set policy;
- privacy constraints;
- version-bump rules;
- model drift runbook;
- recommendation quality guard;
- red-team taxonomy;
- regression gate;
- explicit non-claims.

## Task 6 — Verify before merge-readiness

Required evidence:
- `pnpm test` green;
- migration replay green;
- lint green;
- typecheck green;
- build green;
- security workflows green;
- browser acceptance green;
- PR review of changed-file diff;
- no claim of benchmark performance without an actual evaluated dataset.
