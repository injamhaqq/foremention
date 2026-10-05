# Company OS Funding Source Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add project-scoped, append-only funding-source inspection and human-review receipts using Foremention’s existing source inspection/snapshot engine.

**Architecture:** The authenticated Company OS route proves operator identity and exact active project scope with the user token, then performs native source inspection and internal ledger writes through the trusted server path. New service-only check/review tables bind verified funding evidence to immutable native source snapshots; no submission, draft gating, scheduling, or external authority is added.

**Tech Stack:** Next.js route handlers, TypeScript, Supabase/Postgres RLS, existing `inspectSourceUrl` / `persistSourceSnapshot`, Node test runner.

**Spec:** `docs/company-os/FUNDING-SOURCE-REVIEW-2026-10-05.md`

## Global Constraints

- Preserve Foremention as the only company kernel and Supabase as Company Truth.
- Keep Inngest as the only durable workflow orchestrator; this increment adds no scheduler.
- Reuse native bounded source inspection and snapshots; never persist full raw page bodies.
- User token proves operator/scope/evidence; service role is server-only for internal source/check/review persistence.
- Public/anon/authenticated roles receive no direct privileges on the new internal tables.
- No funding discovery, criteria extraction, application submission, email, browser form action, payment, secret change, deployment, or production mutation.
- Stage 0 customer proof remains the operating priority.

## Review Focus

- Cross-project evidence ID: must fail before any inspection or source write.
- Changed source URL after a check: acceptance must fail closed.
- Blocked/unreachable source snapshot: cannot be accepted.
- Analyst/viewer/non-operator: cannot create or review internal funding checks.
- Duplicate review for one check: must fail rather than overwrite history.

---

### Task 1: RED contract

**Files:**
- Create: `tests/company-os-funding-source-review.test.mjs`

**Interfaces:**
- Consumes: the spec above.
- Produces: failing contracts for the route, parser, migration, native inspection reuse, and service-only authority boundary.

- [ ] **Step 1: Write the failing contract test** for the absent route/helper/migration and exact fail-closed invariants.
- [ ] **Step 2: Run the pull-request CI and confirm the test fails because the funding source review feature is absent.**
- [ ] **Step 3: Commit the RED contract.**

### Task 2: Request parser and bounded domain contract

**Files:**
- Create: `lib/company-os/funding-source-review.ts`
- Test: `tests/company-os-funding-source-review.test.mjs`

**Interfaces:**
- Produces:
  - `parseFundingSourceCheckRequest(value)`
  - `parseFundingSourceReviewRequest(value)`
  - bounded decision/note types.

- [ ] **Step 1: Implement only the strict request parsers required by the RED test.**
- [ ] **Step 2: Verify unknown properties, invalid UUIDs, invalid decisions, and oversized notes fail closed.**
- [ ] **Step 3: Commit.**

### Task 3: Service-only check/review persistence

**Files:**
- Create: `supabase/migrations/20261005000200_company_funding_source_reviews.sql`
- Create: `scripts/verify-company-funding-source-review-isolation.sql`
- Modify: `.github/workflows/ci.yml`
- Test: `tests/company-os-funding-source-review.test.mjs`

**Interfaces:**
- Produces immutable `company_funding_source_checks` and `company_funding_source_reviews` tables and database validation triggers.

- [ ] **Step 1: Add the minimum schema and validation triggers required by the contract.**
- [ ] **Step 2: Revoke all browser-role privileges and grant only the trusted server role required access.**
- [ ] **Step 3: Add SQL acceptance proving cross-project, non-owner/admin, unreachable acceptance, direct browser access, and duplicate review all fail closed.**
- [ ] **Step 4: Add the SQL verification script to isolated migration replay.**
- [ ] **Step 5: Commit.**

### Task 4: Authenticated inspection and human review route

**Files:**
- Create: `app/api/internal/company-os/funding-source-reviews/route.ts`
- Modify: `tests/company-os-funding-source-review.test.mjs`

**Interfaces:**
- POST consumes `{schemaVersion:1,evidenceItemId}`.
- PATCH consumes `{schemaVersion:1,checkId,decision,note?}`.
- GET returns bounded recent project-scoped check/review records.

- [ ] **Step 1: Reuse the same operator/exact-project checks as the verified funding-draft service.**
- [ ] **Step 2: Load the evidence with the viewer token and reject non-official/unverified/expired/no-rights sources before fetching.**
- [ ] **Step 3: Reuse/create the native organization source server-side, call `validatePublicSourceUrl` / `inspectSourceUrl`, and persist through `persistSourceSnapshot` with bounded text.**
- [ ] **Step 4: Persist the immutable check receipt server-side.**
- [ ] **Step 5: Persist an append-only review receipt on PATCH; do not mutate the evidence item or authorize submission.**
- [ ] **Step 6: Implement bounded GET through the server-only internal ledgers after operator/project authorization.**
- [ ] **Step 7: Commit.**

### Task 5: Exact-head verification

**Files:**
- Modify: `docs/company-os/FUNDING-SOURCE-REVIEW-2026-10-05.md` only if implementation facts differ from the approved spec.

- [ ] **Step 1: Run isolated migration replay and SQL acceptance.**
- [ ] **Step 2: Run full tests, deterministic AI quality gate, lint, typecheck, and production build.**
- [ ] **Step 3: Require Security, CodeQL, AI Safety/Code Health, and Browser Acceptance on the exact final SHA.**
- [ ] **Step 4: Record exact SHA and validation truth in the draft PR; do not merge or deploy.**
