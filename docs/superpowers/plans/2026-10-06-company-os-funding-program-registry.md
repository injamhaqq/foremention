# Funding Program Registry + Draft Consumption Implementation Plan

**Base:** PR #429 exact verified head `81f7752bb1161adcbc843a1a1ca2af175edfa72f`.

### Task 1 — RED contract

Create `tests/company-os-funding-program-registry.test.mjs`.

Require:

- strict registry parser;
- immutable service-only registry migration;
- database validation of accepted review provenance and supersession;
- authenticated registry GET/POST route;
- funding service schemaVersion 2 accepting only `programRevisionIds`;
- funding draft route loading registry revisions server-side;
- draft artifact `program_revision_ids` provenance;
- CI SQL acceptance verifier.

Prove RED before implementation.

### Task 2 — Strict registry parser

Create `lib/company-os/funding-program-registry.ts`.

Implement strict parsing and bounded criteria/question shapes only.

### Task 3 — Registry persistence

Create migration `20261006000200_company_funding_program_registry.sql`.

- append-only revisions;
- service-only table;
- exact project/review/source/snapshot validation;
- supersession validation and anti-fork rule;
- no browser-role table privileges.

### Task 4 — Registry API

Create `app/api/internal/company-os/funding-programs/route.ts`.

- reuse existing Company OS operator/scope checks;
- GET current revisions;
- POST only after user-scoped evidence + trusted review-chain verification;
- no edit/delete surface.

### Task 5 — Draft request v2

Modify:

- `lib/company-os/funding-draft-service.ts`
- `app/api/internal/company-os/funding-drafts/route.ts`

Reject v1 input. Accept only bounded `programRevisionIds`. Load current registry rows and reconstruct opportunities server-side.

### Task 6 — Artifact provenance

Create migration `20261006000300_company_funding_draft_program_revision_provenance.sql`.

Add `program_revision_ids`, enforce ordinal alignment and current registry provenance.

### Task 7 — SQL acceptance + regression

Create `scripts/verify-company-funding-program-registry.sql`; add to CI migration replay.

Prove:

- browser roles cannot read/write registry directly;
- non-owner/admin creator rejected;
- stale/rejected/cross-project review rejected;
- first revision valid;
- valid superseding revision valid;
- supersession fork rejected;
- invalid cross-program supersession rejected;
- draft without registry provenance rejected;
- superseded program revision cannot create a new draft;
- current registry revision can create a draft.

Reconcile older funding draft tests/fixtures without weakening prior assertions.

### Task 8 — Exact-head verification

Require:

- isolated migrations + all SQL verifiers;
- full tests;
- deterministic AI quality gate;
- lint;
- typecheck;
- production build;
- Cloudflare dry-runs;
- Security;
- CodeQL;
- AI Safety / Code Health;
- Browser Acceptance.

Do not merge or deploy.
