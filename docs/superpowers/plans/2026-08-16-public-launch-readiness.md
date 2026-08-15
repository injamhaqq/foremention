# Public Launch Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the first highest-impact public-launch release: align machine-readable commercial truth, make pricing sell outcomes without fake checkout, simplify footer/analytics UX, repair mobile product-preview density, and move market evidence out of the Source Map into a dedicated research home.

**Architecture:** Keep the existing Next.js App Router, `PublicShell`, evidence data, consent loader, auth/RLS/provider architecture, and release gates. This release changes public information architecture, copy, structured data, and responsive presentation only; it does not activate billing, add infrastructure, change evidence semantics, or touch customer data. Market evidence is moved/reused, never rewritten as unsupported superiority claims.

**Tech Stack:** Next.js App Router, React, TypeScript, CSS Modules/global CSS, Node contract tests, GitHub Actions Browser Acceptance/axe/Lighthouse, Cloudflare Workers production release.

## Global Constraints

- No paid checkout or entitlement activation.
- Preserve planned `$149` Core / `$499` Signal until a separate explicit commercial decision authorizes a price change.
- Never fabricate competitor facts, sources, customers, citations, testimonials, metrics or outcomes.
- Preserve optional Clarity/Contentsquare consent as privacy-off by default; do not imply its control also disables separately disclosed limited PostHog telemetry.
- Preserve `/subprocessors` as B2B trust infrastructure.
- Never restore `recordRunChanges(...)`, `detect-run-changes`, or any equivalent pre-review movement detector.
- Preserve `recordReviewedComparableChangeNotifications`.
- Do not weaken Browser Acceptance, axe, security, or exact-release verification.
- PR checks are pre-release evidence only; production must be re-proven after merge on the exact resulting SHA.

---

### Task 1: Commercial truth in structured data

**Files:**
- Modify: `app/layout.tsx`
- Test: create `tests/public-launch-commercial-truth.test.mjs`

**Interfaces:**
- Consumes: existing root `SoftwareApplication` JSON-LD.
- Produces: truthful software structured data without purchasable `Offer` objects while checkout is disabled.

- [ ] **Step 1: Write the failing test**

Create a contract that reads `app/layout.tsx`, requires the `SoftwareApplication` node to remain, and rejects inactive paid structured-data fields:

```js
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const layout = fs.readFileSync("app/layout.tsx", "utf8");

test("private beta structured data does not advertise inactive paid offers", () => {
  assert.match(layout, /SoftwareApplication/);
  assert.doesNotMatch(layout, /\"@type\":\s*\"Offer\"/);
  assert.doesNotMatch(layout, /price:\s*\"149\"/);
  assert.doesNotMatch(layout, /price:\s*\"499\"/);
});
```

- [ ] **Step 2: Run CI on the test-only head and verify RED**

Expected: only the new commercial-truth contract fails because `app/layout.tsx` still emits Core/Signal Offer objects.

- [ ] **Step 3: Implement minimal fix**

Remove only the `offers` array from the `SoftwareApplication` JSON-LD. Keep organization/software identity, URL, category and description.

- [ ] **Step 4: Verify GREEN**

Expected: new contract and full suite pass.

---

### Task 2: Pricing becomes an outcome-led private-beta sales page

**Files:**
- Modify: `app/pricing/page.tsx`
- Test: extend/create `tests/public-launch-pricing.test.mjs`

**Interfaces:**
- Consumes: existing plan definitions and private-beta commercial boundary.
- Produces: same planned plan prices/capacities, clearer buyer outcomes, no stale vendor-price table in the purchase journey, truthful no-checkout CTA.

- [ ] **Step 1: Write failing pricing contracts**

Contracts must require:

```js
assert.match(pricing, /Know what AI says/i);
assert.match(pricing, /planned/i);
assert.match(pricing, /Join private beta/i);
assert.doesNotMatch(pricing, /pricingComparison\s*=/);
assert.doesNotMatch(pricing, /peec\.ai\/pricing/i);
assert.doesNotMatch(pricing, /scrunch\.com\/pricing/i);
assert.doesNotMatch(pricing, /tryprofound\.com\/pricing/i);
```

Also preserve `$149`, `$499`, `Custom`, and explicit language that workspace creation does not charge a card or grant a paid entitlement.

- [ ] **Step 2: Verify RED on CI**

Expected failures: outcome-led hero missing and competitor table still present.

- [ ] **Step 3: Implement minimal pricing rewrite**

Use an outcome hierarchy:

Hero direction:

`Know what AI says about your brand. Know where it came from. Know what actually changed.`

Supporting copy must explain that Foremention turns dated AI answers and returned citations into reviewable evidence, and that paid packaging remains planned while private beta is the live entitlement.

Plan direction:
- Core: establish a defensible baseline for one brand/category.
- Signal: review meaningful movement more frequently across broader questions/providers/workspaces.
- Intelligence: portfolio/custom scope.

Keep the existing factual capacities unless the repository proves a different live contract. Keep CTA truthful (`Join private beta` / `Discuss Intelligence`). Remove the vendor-price comparison table from this page entirely.

- [ ] **Step 4: Verify GREEN**

Run full suite; pricing commercial-boundary tests must still pass.

---

### Task 3: Simplify footer and make analytics control semantically honest

**Files:**
- Modify: `components/public-shell.tsx`
- Modify: `components/contentsquare-analytics.tsx`
- Modify: `app/product-polish.css`
- Test: extend/create `tests/public-launch-shell.test.mjs`

**Interfaces:**
- Consumes: current consent storage/events and PublicShell.
- Produces: compact footer IA and a control explicitly scoped to optional experience analytics.

- [ ] **Step 1: Write failing contracts**

Require:

```js
assert.match(shell, />Subprocessors</);
assert.doesNotMatch(shell, />Service providers</);
assert.match(analytics, /Optional analytics settings/);
assert.match(analytics, /Microsoft Clarity and Contentsquare/);
assert.match(analytics, /Keep off/);
assert.match(analytics, /Allow analytics/);
```

Also require footer groups `Product`, `Company`, `Legal / trust`, `Follow`, and reject Privacy/Terms/Subprocessors from the Company group.

- [ ] **Step 2: Verify RED**

Expected: current footer grouping, label and analytics summary fail.

- [ ] **Step 3: Implement minimal footer IA**

Target:

- Product: Platform, Pricing, Methodology, Standards.
- Company: About, Contact.
- Legal / trust: Privacy, Terms, Subprocessors, optional analytics control.
- Follow: keep existing official profiles for now; social-channel pruning remains founder-level housekeeping.

Remove secondary acquisition/docs links from the footer rather than deleting their routes.

Change the consent summary to `Optional analytics settings` with On/Off state. Keep the full explanation hidden inside the disclosure. Shorten the open panel to one concise sentence and retain both `Keep off` and `Allow analytics` buttons. Preserve revoke reload behavior and consent keys/events.

- [ ] **Step 4: Compress mobile open state in CSS**

At <=520px keep stacked actions but reduce panel width/spacing and avoid turning the control into a large standalone section.

- [ ] **Step 5: Verify GREEN**

Run contracts + existing consent/a11y tests.

---

### Task 4: Repair Recommendation Monitor mobile hierarchy

**Files:**
- Modify: `components/homepage-readiness.module.css`
- Test: extend/create `tests/public-launch-mobile.test.mjs`

**Interfaces:**
- Consumes: existing `MissingAnswerExperience` DOM.
- Produces: no intro label/value collision and lower mobile density without changing illustrative-data boundaries.

- [ ] **Step 1: Write failing CSS contract**

Require an explicit block rule for the evidence intro strong and a <=520px mobile density block:

```js
assert.match(css, /\.previewEvidence\s*>\s*div:first-child\s*>\s*strong[\s\S]*display:\s*block/);
assert.match(css, /@media\s*\(max-width:\s*520px\)[\s\S]*\.previewAnswer/);
```

- [ ] **Step 2: Verify RED**

Expected: intro strong rule and <=520 density treatment are missing.

- [ ] **Step 3: Implement minimal CSS fix**

- Make the evidence intro label/value block-flow with a small margin.
- At <=520px reduce preview frame padding/gaps, top-line spacing, evidence-card padding and question/row spacing while preserving >=44px interactive touch targets elsewhere.
- Do not hide evidence-boundary content.

- [ ] **Step 4: Verify GREEN**

Contracts + Browser Acceptance must pass without new overflow/contrast issues.

---

### Task 5: Separate Source Map self-audit from market evidence

**Files:**
- Create: `app/compare/page.tsx`
- Modify: `app/source-map/page.tsx`
- Modify: `app/sitemap.ts`
- Modify: `components/public-shell.tsx` only if a contextual research link is needed beyond Task 3
- Test: create/extend `tests/public-launch-information-architecture.test.mjs`

**Interfaces:**
- Consumes: `marketEvidenceRecords`, `marketEvidenceSnapshot`, existing generic comparison routes.
- Produces: one dedicated research/comparison hub; Source Map remains a dated Foremention.com audit; evidence data is preserved.

- [ ] **Step 1: Write failing IA contracts**

Require:

```js
assert.doesNotMatch(sourceMap, /marketEvidenceRecords/);
assert.doesNotMatch(sourceMap, /Four real platforms/);
assert.match(compareHub, /marketEvidenceRecords/);
assert.match(compareHub, /first-party/i);
assert.match(compareHub, /not that an AI engine cited/i);
assert.match(sitemap, /path:\s*\"\/compare\"/);
```

Also reject `Live Source Map` language on the dated public self-audit unless the underlying snapshot is refreshed dynamically.

- [ ] **Step 2: Verify RED**

Expected: `/compare` hub absent; Source Map still owns market evidence and “Live” language.

- [ ] **Step 3: Implement `/compare` hub**

Create a PublicShell page titled around `Market evidence & comparisons`, containing:
- a concise explanation that records are dated first-party observations;
- the existing four company records from `market-evidence-data` with observed text and evidence boundary preserved;
- links to the three existing operating-model comparison pages;
- explicit statement that company-page observations do not prove AI citation, independent truth, or product superiority.

No new competitor feature/price claims are introduced in this task.

- [ ] **Step 4: Simplify `/source-map`**

Remove the market-evidence section/imports. Reframe hero/metadata from `Live Website Audit` / `Live Source Map` to `Dated Website Audit` / `Public Source Map` while retaining the actual collection date and Dataset schema.

- [ ] **Step 5: Add `/compare` to sitemap**

Keep existing specific comparison routes for now; their claim-quality rewrite is Release B.

- [ ] **Step 6: Verify GREEN**

Run full suite + Browser Acceptance; Source Map should become materially shorter on mobile without losing its self-audit evidence.

---

### Task 6: Exact-head release gate and guarded merge

**Files:** no product changes.

- [ ] Verify branch diff contains only planned public-site/docs/tests files.
- [ ] Reverify `main` did not move unexpectedly; if it moved, rebase/recreate safely and rerun all evidence.
- [ ] Verify legacy movement detector remains absent and `recordReviewedComparableChangeNotifications` remains present.
- [ ] Require applicable exact-head CI: tests, lint, typecheck, production build, Worker dry-run, Browser Acceptance/axe/mobile, Security, CodeQL, AI Safety/Code Health, dependency/patch hygiene.
- [ ] Do not count release-only skipped jobs as passes.
- [ ] Mark PR ready only after exact-head green.
- [ ] Merge with `expected_head_sha`; never force/bypass protection.

---

### Task 7: Same-release production verification

**Files:** no product changes unless a production-only defect is proven.

- [ ] Capture resulting exact `main` SHA.
- [ ] Verify Cloudflare production build/version and `/api/health buildCommit` match that SHA.
- [ ] Verify D1/Supabase reachability and Inngest sync + independent execution probe.
- [ ] Verify public + authenticated Browser Acceptance, Chromium/Firefox/mobile, axe, no console/page/same-origin failed-response errors.
- [ ] Verify Lighthouse; compare against the current ~0.84–0.86 performance / ~3.3–3.4s LCP baseline and reject material regressions.
- [ ] Verify exact-release authenticated first-evidence canary, exact-SHA idempotency, provider/model persistence, citation truth, human-review boundary and logout/session protection.
- [ ] Verify Security, SBOM and provenance.
- [ ] If any required same-release gate fails, classify YELLOW/RED and create the narrowest evidence-backed fix-forward PR. Never call GREEN from PR evidence.

---

## Deferred follow-up releases already audited

Release B: `/compare` claim quality, `/score` + `/prompt-check` discovery/sitemap, homepage de-duplication, outcome-led product page, Source Gap manual-review clarity, Standards URL reconciliation.

Release C: measured font/LCP optimization, CSS/client-cost profiling, authenticated workspace 19-destination navigation audit.
