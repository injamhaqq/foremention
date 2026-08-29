# Foremention Retention Loop 1–25 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the existing Foremention private-beta product into a repeatable Recommendation Intelligence retention loop covering approved items 1–25 without redesigning the homepage or replacing working collection/evidence infrastructure.

**Architecture:** Keep the current Next.js/Vinext + Supabase + Inngest architecture. Add additive retention/enterprise tables and focused service modules; route scheduled work back through the same trusted run execution contract; derive Attention and change detection from persisted truth; enhance Recommendation Records and Settings in place. External billing and SSO capabilities fail closed until genuinely configured.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.9, Supabase/Postgres/RLS, Inngest 4, PostHog contract analytics, Cloudflare/Vinext.

**Spec:** `docs/superpowers/specs/2026-08-29-foremention-retention-loop-1-25-design.md`

## Global Constraints

- Do not change the homepage implementation or canonical public identity.
- Preserve `Attention -> Questions -> Records -> Comparisons -> Settings` as the five primary signed-in objects.
- Recommendation Record remains canonical; evidence inspection stays contained.
- Never weaken exact comparability, review, provider provenance, tenant isolation, or cost controls.
- No live billing/SSO claims without verified external configuration.
- No white/light dashboard surfaces; retain black/graphite + registered-green product system.
- TDD: contract/behavior test must exist before each production change.

---

### Task 1: Add the 1–25 retention/enterprise data contract

**Files:**
- Create: `tests/retention-loop-contract.test.mjs`
- Create: `supabase/migrations/20260829000100_retention_loop_v1.sql`

**Interfaces:**
- Produces tables `measurement_schedules`, `record_shares`, `billing_accounts`, `organization_entitlements` and additive action/locale/role fields used by later tasks.

- [ ] **Step 1: Write failing migration contract tests** asserting new tables, RLS, organization foreign keys, schedule cadence/enable constraints, record-share expiry/revocation fields, billing verified-webhook state, entitlement uniqueness, action owner/due/priority linkage, market/locale snapshot fields, and reviewer/stakeholder role support.
- [ ] **Step 2: Commit the failing test and let CI confirm RED.**
- [ ] **Step 3: Add the additive migration.** Use `public.is_org_member`/`public.has_org_role`; never trust organization IDs supplied by browser code.
- [ ] **Step 4: Run CI until the migration contract and migration replay pass.**

### Task 2: Pure retention/schedule/change services

**Files:**
- Create: `lib/measurement-schedules.ts`
- Create: `lib/retention-loop.ts`
- Create: `lib/entitlements.ts`
- Test: `tests/retention-loop-contract.test.mjs`

**Interfaces:**
- Produces `validateMeasurementSchedule`, `nextScheduleAt`, `scheduleIdempotencyKey`, `deriveAttentionItems`, `deriveComparableChanges`, `deriveRetentionMilestones`, `hasEntitlement`.

- [ ] **Step 1: Add failing behavior tests** for weekly/biweekly/monthly next-run math, pause/resume, stable idempotency keys, invalid timezone/cadence rejection, exact-comparison withholding, truthful change kinds, activation milestones, and entitlement default-deny.
- [ ] **Step 2: Verify RED in CI.**
- [ ] **Step 3: Implement pure functions with no network/database side effects.**
- [ ] **Step 4: Verify GREEN and existing tests.**

### Task 3: Scheduled recurring measurement through the trusted run path

**Files:**
- Modify: `lib/jobs/inngest.ts`
- Modify: `app/api/inngest/route.ts` or the existing Inngest registration file if different
- Create: `app/api/schedules/route.ts`
- Modify: `lib/data.ts` only for focused schedule load/write helpers
- Test: `tests/retention-loop-contract.test.mjs`

**Interfaces:**
- `POST /api/schedules` creates/updates a viewer-scoped schedule.
- `PATCH /api/schedules` pauses/resumes without deleting history.
- Inngest dispatcher emits/executes the same collection contract as manual runs with deterministic idempotency.

- [ ] **Step 1: Add failing tests** proving API derives organization/project from the authenticated viewer, validates question/provider ownership, snapshots model/methodology/locale, and dispatcher does not duplicate a due schedule.
- [ ] **Step 2: Verify RED.**
- [ ] **Step 3: Implement API/data helpers and due-schedule Inngest function.**
- [ ] **Step 4: Verify GREEN, provider/run contracts, and duplicate-run protections.**

### Task 4: Attention inbox + change detection + recurring-measurement UI

**Files:**
- Modify: `app/app/page.tsx`
- Create: `components/attention-inbox.tsx`
- Create: `components/measurement-schedule-control.tsx`
- Modify: `app/app/settings/page.tsx`
- Modify: `app/globals.css` only for signed-in product styling
- Test: `tests/customer-journey-acceptance.test.mjs`
- Test: `tests/retention-loop-contract.test.mjs`

**Interfaces:**
- Attention consumes persisted onboarding/runs/alerts/review/actions/comparisons and `deriveAttentionItems`.
- Schedule control consumes `/api/schedules`.

- [ ] **Step 1: Add failing UI contract tests** for prioritized Attention states, “comparison withheld” copy, schedule enable/pause/resume, due/overdue actions, review backlog, failed run handling, and dark canonical surface classes.
- [ ] **Step 2: Verify RED.**
- [ ] **Step 3: Implement components and integrate without removing existing metrics/product-truth panels.**
- [ ] **Step 4: Verify GREEN plus browser/a11y contract.**

### Task 5: Executive Recommendation Record, evidence quality, competitor/question/market intelligence

**Files:**
- Modify: `app/app/runs/[id]/page.tsx`
- Modify: `components/recommendation-answer-record.tsx`
- Modify: `components/recommendation-source-evidence.tsx`
- Create: `lib/evidence-quality.ts`
- Create: `lib/recommendation-gap.ts`
- Modify: `app/app/analytics/page.tsx`
- Modify: `app/app/prompts/page.tsx`
- Modify: `app/app/competitors/page.tsx`
- Test: `tests/retention-loop-contract.test.mjs`

**Interfaces:**
- Produces explicit evidence quality components (freshness/retrievability/authority-category/corroboration/review state), candidate competitor discovery from persisted answers, grounded recommendation-gap diagnosis, cluster/locale filters, benchmark-unavailable state.

- [ ] **Step 1: Add failing tests** for the five evidence states, explicit quality components, no black-box “verified score”, competitor candidates requiring confirmation, question suggestions requiring approval, existing cluster taxonomy, locale/market comparability, and grounded diagnosis provenance.
- [ ] **Step 2: Verify RED.**
- [ ] **Step 3: Implement focused helpers/UI using existing data loaders and project/domain model.**
- [ ] **Step 4: Verify GREEN and existing Recommendation Record/browser canary contracts.**

### Task 6: Action ownership, before/after loop, share/export

**Files:**
- Modify: `app/app/placements/page.tsx`
- Modify: `components/placement-board.tsx`
- Create: `app/api/records/[id]/share/route.ts`
- Create: `app/share/record/[token]/page.tsx`
- Create: `lib/record-sharing.ts`
- Modify: `app/api/export/route.ts` or current export route if different
- Test: `tests/retention-loop-contract.test.mjs`

**Interfaces:**
- Actions expose owner, due date, priority, status, linked evidence/Record and remeasurement state.
- Share tokens are random, stored hashed, expiring and revocable.
- Shared page is read-only and tenant-minimal.

- [ ] **Step 1: Add failing tests** for action fields and chronology-only “observed after” language, ineligible comparison withholding, share hash/expiry/revocation/cross-tenant protection, and CSV/print export truthfulness.
- [ ] **Step 2: Verify RED.**
- [ ] **Step 3: Implement action UI/data wiring, share helpers/routes/page, and export enhancements.**
- [ ] **Step 4: Verify GREEN and security tests.**

### Task 7: Product analytics retention milestones

**Files:**
- Modify: `lib/product-analytics-contract.ts`
- Modify: `lib/product-analytics.ts`
- Modify relevant existing client event emitters for onboarding/record/action/schedule/share/team flows
- Test: existing analytics tests plus `tests/retention-loop-contract.test.mjs`

**Interfaces:**
- New safe events: `first_record_reviewed`, `action_created`, `second_comparable_cycle_completed`, `measurement_schedule_enabled`, `record_share_created`, `team_invite_sent`.

- [ ] **Step 1: Add failing tests** that accept only safe categorical/bucketed properties and reject email/domain/raw question/raw answer/customer names.
- [ ] **Step 2: Verify RED.**
- [ ] **Step 3: Implement sanitizer cases and event emission at completed workflow boundaries.**
- [ ] **Step 4: Verify GREEN and PostHog hardening tests.**

### Task 8: Billing/packaging + team/roles + enterprise SSO foundation

**Files:**
- Create: `app/api/billing/webhook/route.ts`
- Create: `lib/billing.ts`
- Create: `app/api/auth/sso/route.ts`
- Create: `lib/enterprise-sso.ts`
- Modify: `app/app/settings/page.tsx`
- Modify: `app/app/team/page.tsx`
- Modify: role helpers in `lib/auth.ts`/`lib/data.ts` only as necessary
- Test: `tests/retention-loop-contract.test.mjs`
- Test: `tests/private-beta-commercial-boundary.test.mjs`

**Interfaces:**
- Billing webhook default-denies without configured secret/provider and only writes entitlement state after verified webhook input.
- Feature access comes from `organization_entitlements`.
- SSO starts only for configured workspace/domain; otherwise returns a truthful not-configured state.
- Application roles: owner/admin/member/reviewer/stakeholder.

- [ ] **Step 1: Add failing tests** for billing signature/config fail-closed behavior, no hardcoded price, entitlement gating, role permissions, reviewer/stakeholder access, and SSO fail-closed/configured request shape.
- [ ] **Step 2: Verify RED.**
- [ ] **Step 3: Implement minimal server modules/routes/settings/team UI without activating external services.**
- [ ] **Step 4: Verify GREEN and private-beta truth contract.**

### Task 9: Full release verification and integration polish

**Files:**
- Update: `README.md`
- Update: `docs/PRODUCTION-READINESS.md` only with truthful new capability boundaries, not a release claim before evidence exists
- Update: browser/customer journey tests as required

**Interfaces:**
- Documents exactly what is implemented and what still requires external provider configuration.

- [ ] **Step 1: Run full `pnpm test`, lint, typecheck, build, migration replay, security and browser acceptance in CI.**
- [ ] **Step 2: Fix only root causes; do not weaken tests or product-truth gates.**
- [ ] **Step 3: Review PR diff for homepage changes; expected homepage functional diff is zero.**
- [ ] **Step 4: Require exact-head CI, Browser Acceptance, Security, CodeQL, AI Safety/Code Health, Agent Harness, and relevant canaries to pass before merge.**
- [ ] **Step 5: Squash merge with expected-head SHA only after every required gate is green.**
