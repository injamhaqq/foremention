# Foremention UI/UX + Engineering Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the highest-risk responsive, zoom, typography, visual-system, intake-abuse, and billing-integrity defects found in the Foremention audit without redesigning the homepage or changing evidence/provider behavior.

**Architecture:** Keep the existing five-object IA and current product routes. Add regression coverage first, then harden shared CSS/tokens and shell behavior, then make public intake and billing mutation paths safer. Existing advanced routes remain contextual. Homepage content/composition and approved brand assets remain unchanged.

**Tech Stack:** Next.js 16, React 19, TypeScript, CSS, Playwright 1.60, axe-core, Supabase/Postgres, Stripe-compatible billing adapter, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-29-product-compression-commercial-readiness-design.md` plus the 2026-08-30 audit accepted by the founder.

## Global Constraints

- Do not redesign or rewrite the homepage content/composition.
- Do not modify canonical logo/mark asset bytes.
- Preserve `Attention -> Questions -> Records -> Comparisons -> Settings` as the only global workspace IA.
- Preserve Recommendation Record, evidence semantics, human review, RLS, providers, Inngest, and exact comparability.
- Keep public/app surfaces black/graphite with registered green; no light-card drift.
- Do not invent prices, certifications, legal identity, customer claims, or benchmark claims.
- Tests must become stricter, not weaker.

---

### Task 1: Zoom, reflow, mobile-landscape and WebKit acceptance

**Files:**
- Modify: `.github/workflows/browser-acceptance.yml`
- Modify: `scripts/browser-acceptance.mjs`
- Modify: `tests/browser-acceptance-contract.test.mjs`

**Interfaces:**
- Consumes: existing Playwright/axe runner.
- Produces: WebKit coverage, 1366x768 + landscape profiles, 200%/400% zoom reflow checks, nested clipping checks.

- [ ] Add failing contract assertions for WebKit install/profile, 1366x768, 844x390 landscape, and zoom factors `2` and `4`.
- [ ] Run CI and confirm the contract fails on missing coverage.
- [ ] Install WebKit in the quality-tools step and import/use it in `browser-acceptance.mjs`.
- [ ] Add reflow auditing that applies zoom, checks document/nested overflow and restores zoom before screenshots/axe.
- [ ] Verify the browser contract passes.

### Task 2: Typography + shared responsive shell hardening

**Files:**
- Create: `app/canonical-responsive-hardening.css`
- Modify: `app/layout.tsx`
- Create: `tests/canonical-responsive-hardening.test.mjs`

**Interfaces:**
- Produces: shared minimum readable text/touch sizes and fluid shell/topbar behavior without changing homepage composition.

- [ ] Add RED assertions requiring `clamp()` shell gutters, minimum 12px product/public microcopy, 44px interactive targets, topbar collapse rules, safe-area padding and responsive table containment.
- [ ] Add the final canonical hardening layer after current canonical release CSS.
- [ ] Replace only presentation constraints at the shared CSS boundary; do not edit homepage JSX.
- [ ] Verify contract + Browser Acceptance.

### Task 3: CSS-system cleanup guardrails

**Files:**
- Create: `tests/canonical-css-debt-contract.test.mjs`
- Modify: `app/product-polish.css`
- Modify: `app/canonical-release-qa.css`

**Interfaces:**
- Produces: no active legacy sidebar-advanced styles, no light field background on workspace search, and semantic-token use for new hardening surfaces.

- [ ] Add RED assertions for dead advanced-menu CSS and active light workspace field styling.
- [ ] Remove dead `.sidebar-advanced` presentation blocks now that they are not rendered.
- [ ] Make workspace-search input dark/tokenized at source so it does not rely on later `!important` repair.
- [ ] Keep release QA overrides only where legacy components still require them.

### Task 4: Public design-partner intake abuse protection

**Files:**
- Create: `supabase/migrations/20260830000100_design_partner_submission_limits.sql`
- Modify: `app/api/design-partner/route.ts`
- Modify: `lib/design-partner.ts`
- Create: `tests/design-partner-abuse-protection.test.mjs`

**Interfaces:**
- Produces: server-side bounded submission claim by normalized email/company/day plus explicit overlong-question validation.

- [ ] Add RED tests requiring duplicate/rate-limit claim and rejecting >500-char questions instead of silently truncating them.
- [ ] Add a service-only submission-claim table/function with no authenticated/public policy.
- [ ] Claim before insert; return a generic accepted response for recent duplicates and 429 only for abusive burst limits without leaking database state.
- [ ] Validate individual question length before normalization.

### Task 5: Billing atomicity + canonical redirect origin

**Files:**
- Create: `supabase/migrations/20260830000200_apply_billing_event_atomic.sql`
- Modify: `app/api/billing/webhook/route.ts`
- Modify: `app/api/billing/checkout/route.ts`
- Create: `tests/billing-atomicity-origin.test.mjs`

**Interfaces:**
- Produces: one database RPC for billing account + entitlement + receipt completion; checkout URLs anchored to `NEXT_PUBLIC_SITE_URL` when configured.

- [ ] Add RED tests for atomic RPC use and canonical configured origin.
- [ ] Add `apply_billing_event_atomic(...)` security-definer RPC with explicit validation and service-only execution.
- [ ] Replace three separate billing writes with one RPC after event claim.
- [ ] Derive success/cancel URL from configured canonical site origin; fail closed on invalid/missing production origin when Stripe is enabled.

### Task 6: Final release verification

**Files:** no product-code changes unless a failing gate exposes a real defect.

- [ ] Run migrations, full tests, lint, typecheck, build, Worker dry-run.
- [ ] Require PR Browser Acceptance, Security, CodeQL, and AI Safety/Code Health green on exact head.
- [ ] Review PR diff for homepage JSX/asset-byte changes; there must be none.
- [ ] Merge only exact verified head.
- [ ] Require all push-to-main workflows, including live Browser Acceptance and authenticated first-evidence canary, green on the resulting exact main SHA.
