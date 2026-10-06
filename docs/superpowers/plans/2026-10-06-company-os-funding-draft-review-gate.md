# Funding Draft Reviewed-Evidence Gate Implementation Plan

**Base:** PR #420 exact verified head `7f433f4b09821e33e0242e054a06cee6dca9153f`.

### Task 1 — RED contract

Create `tests/company-os-funding-draft-review-gate.test.mjs`.

The failing contract must require:

- route lookup of accepted funding-source checks/reviews;
- same-project/current evidence review validation;
- program evidence `observedAt` derived from `checked_at`;
- persisted `program_source_check_ids` and `program_source_review_ids`;
- a new migration that independently enforces the ordinal evidence/check/review chain;
- SQL acceptance cases for missing review, rejected review, stale review, changed evidence verification timestamp, and valid reviewed evidence.

Run the PR CI and verify RED fails because the review gate migration/route behavior does not exist.

### Task 2 — Route gate

Modify `app/api/internal/company-os/funding-drafts/route.ts`.

- Resolve one current accepted review chain per requested program evidence ID.
- Fail 409 if any source lacks a valid chain.
- Anchor official evidence `observedAt` to source-check `checked_at`.
- Persist aligned check/review ID arrays.
- Return those arrays in GET.

### Task 3 — Database enforcement

Create `supabase/migrations/20261006000100_company_funding_draft_review_gate.sql`.

- Add the two provenance arrays with legacy-safe empty defaults.
- Replace the funding artifact validation function so every new insert requires one aligned accepted review chain per program evidence ID.
- Independently revalidate project, evidence verification revision, URL, source, snapshot reviewability, timestamps, decision, and freshness.
- Preserve append-only, service-only, internal-draft-only authority.

### Task 4 — SQL acceptance

Create `scripts/verify-company-funding-draft-review-gate.sql` and add it to isolated migration replay.

Acceptance must prove:

- new draft without review provenance is rejected;
- rejected-only review is rejected;
- stale source check is rejected;
- evidence reverified after review is rejected;
- cross-project review is rejected;
- valid current accepted review is accepted;
- persisted ordinal arrays bind the exact evidence/check/review chain.

### Task 5 — Regression reconciliation

Update the older funding-draft SQL verifier so its fixture inserts include valid reviewed-source provenance under the new database contract.

Do not weaken any prior isolation or authority assertion.

### Task 6 — Exact-head verification

Require on the final SHA:

- isolated migration replay;
- full tests;
- deterministic AI quality release gate;
- lint;
- typecheck;
- production build;
- Cloudflare dry runs;
- Browser Acceptance;
- Security;
- CodeQL;
- AI Safety / Code Health.

Do not merge or deploy.
