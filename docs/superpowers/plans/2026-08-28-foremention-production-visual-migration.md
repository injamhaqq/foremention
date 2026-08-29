# Foremention Production Visual Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved canonical Figma visual system across Foremention’s public and authenticated frontend while preserving existing product behavior, evidence semantics, backend, security boundaries, and primary IA.

**Architecture:** Introduce one canonical semantic token/style layer imported last, add a small set of reusable presentation components, migrate the homepage/public shell first, then authenticated shell and product surfaces. Business logic/data-fetching files remain untouched unless a verified visual interaction cannot be implemented without a contract change, in which case execution stops for approval.

**Tech Stack:** Next.js 16.2.12, React 19.2.8, TypeScript 5.9.3, pnpm 10.25.0, Vinext/Vite/Cloudflare Worker, existing CSS architecture, existing browser/axe acceptance harness.

**Spec:** `docs/superpowers/specs/2026-08-28-foremention-canonical-visual-system-design.md`

## Global Constraints

- Base branch was merged from PR #158 at `697cbe8be6d12430e2134b47b6264df1eb0c71cd`.
- Working branch: `feat/canonical-figma-visual-system`.
- No backend/database/RLS/provider/auth semantic changes.
- Exact canonical mark/wordmark assets only.
- Primary IA remains Attention → Questions → Records → Comparisons → Settings.
- Recommendation Record remains the canonical inspectable object.
- Evidence inspection remains inside Recommendation Record.
- Evidence chain remains RETURNED → RETRIEVED → OBSERVED → REVIEWED → SAFE CONCLUSION.
- Source X-Ray remains retired.
- No fabricated traction, metrics, customers, benchmarks, accuracy, or certainty.
- Required QA widths: 1440, 1024, 768, 375, 320.
- WCAG 2.2 AA target; reduced-motion meaning preserved.
- Every release gate must refer to the same exact SHA.

---

### Task 1: Add canonical token/system layer and contract test

**Files:**
- Create: `app/canonical-system.css`
- Modify: `app/layout.tsx`
- Create: `tests/canonical-visual-system.test.mjs`

**Interfaces:**
- Produces CSS custom properties such as `--fm-bg`, `--fm-surface`, `--fm-paper`, `--fm-fg`, `--fm-muted`, `--fm-signal`, semantic state colors, spacing/radius/motion values.
- All later visual work consumes these tokens.

- [ ] Write a failing contract test that reads `app/layout.tsx` and `app/canonical-system.css` and asserts the new stylesheet is imported last, canonical token names exist, and no `source-x-ray` selector/route is introduced.

```js
assert.match(layout, /import "\.\/canonical-system\.css";/);
assert.match(css, /--fm-bg:\s*#0D0F0E/i);
assert.match(css, /--fm-signal:\s*#176347/i);
assert.doesNotMatch(css, /source-x-ray/i);
```

- [ ] Run `pnpm test` and verify the new test fails before implementation.
- [ ] Create semantic tokens, global typography/focus/reduced-motion foundations, and restrained dark/light surface roles.
- [ ] Import `canonical-system.css` after `accessibility-hardening.css` in `app/layout.tsx`.
- [ ] Run `pnpm test`, `pnpm lint`, `pnpm typecheck`.
- [ ] Commit `feat: add canonical design tokens`.

### Task 2: Canonical brand/public navigation primitives

**Files:**
- Modify: `components/brand.tsx`
- Modify: `components/public-shell.tsx`
- Modify: `app/canonical-system.css`
- Test: `tests/canonical-visual-system.test.mjs`

**Interfaces:**
- Consumes existing `/brand/foremention-logo*.svg` and mark assets.
- Produces exact dark/light public header and mobile navigation styling.

- [ ] Extend the contract test to assert production brand components reference canonical SVG files and no CSS-drawn logo substitute is rendered by `PublicHeader`.
- [ ] Keep `Wordmark`/`ForementionMark` geometry and paths unchanged.
- [ ] Restyle `public-header`, navigation, mobile menu, demo CTA, footer into the approved dark editorial system.
- [ ] Ensure Sign in remains available through mobile and footer; do not create unsupported nav routes.
- [ ] Run targeted tests and browser-contract tests.
- [ ] Commit `feat: migrate canonical public navigation`.

### Task 3: Implement canonical signal-field component and homepage hero

**Files:**
- Create: `components/canonical-signal-field.tsx`
- Modify: `components/goat-home-experience.tsx`
- Modify: `app/page.tsx`
- Modify: `app/canonical-system.css`
- Test: `tests/canonical-visual-system.test.mjs`

**Interfaces:**
- `CanonicalSignalField({ compact?: boolean, reduced?: boolean })` returns decorative SVG/CSS geometry only and is `aria-hidden`.
- Existing homepage content/product claims remain unchanged.

- [ ] Add failing assertions for `THE FOREMENTION STANDARD`, `Register. Prove. Prepare.`, canonical signal component usage, and the exact descriptor.
- [ ] Build CSS/SVG signal field: concentric rings, evidence axis, convergence point, horizon arcs, sparse points.
- [ ] Rewrite `MissingAnswerExperience` composition to match Figma: editorial copy left, signal field right, three Register/Prove/Prepare pillars, real CTA hierarchy, illustrative Recommendation Record below/within the hero flow.
- [ ] Preserve the public homepage’s existing truth sections in `app/page.tsx`, restyled through canonical classes/tokens.
- [ ] Add `prefers-reduced-motion` static resolution.
- [ ] Run tests/lint/typecheck/build.
- [ ] Commit `feat: migrate canonical homepage`.

### Task 4: Public route visual migration

**Files:**
- Modify CSS classes through `app/canonical-system.css` and only route TSX files where composition needs a canonical wrapper.
- Primary routes: `app/product/page.tsx`, `app/recommendation-intelligence/page.tsx`, `app/recommendation-record/page.tsx`, `app/methodology/page.tsx`, `app/insights/page.tsx`, `app/pricing/page.tsx`, `app/contact/page.tsx`, `app/about/page.tsx`, legal/auth pages.
- Test: existing public truth/SEO tests plus `tests/canonical-visual-system.test.mjs`.

**Interfaces:**
- No route/data/metadata semantic changes.
- Pages inherit canonical public shell/tokens.

- [ ] Add test assertions that canonical public routes still exist and do not reintroduce Source X-Ray.
- [ ] Apply dark editorial page heroes, warm inspection/content surfaces, restrained green signals, consistent typography and buttons.
- [ ] Keep pricing/private-beta language truthful and existing SEO metadata intact.
- [ ] Verify auth/legal surfaces use lower visual intensity.
- [ ] Run `pnpm test && pnpm lint && pnpm typecheck && pnpm build`.
- [ ] Commit `feat: migrate canonical public pages`.

### Task 5: Signed-in shell and five-object navigation

**Files:**
- Modify: `components/app-shell.tsx`
- Modify: `components/workspace-navigation.tsx`
- Modify: `app/canonical-system.css`
- Test: existing master-system/navigation tests and `tests/canonical-visual-system.test.mjs`.

**Interfaces:**
- Existing hrefs and active-route behavior remain unchanged.
- Exact full canonical lockup on desktop rail; mark-only only where narrow geometry requires it.

- [ ] Add assertions for the five labels and canonical asset use.
- [ ] Restyle app background, rail, command/search region, active state, advanced section, account area, responsive mobile navigation.
- [ ] Preserve focus/keyboard behavior and 44px mobile targets.
- [ ] Run relevant tests/lint/typecheck.
- [ ] Commit `feat: migrate canonical product shell`.

### Task 6: Recommendation Record and Evidence Inspector presentation

**Files:**
- Locate and modify existing Record/index/detail presentation components under `app/app/runs/**` and `components/**` only where visual composition requires it.
- Create: `components/canonical-evidence-ui.tsx` if existing primitives cannot express the Figma anatomy cleanly.
- Modify: `app/canonical-system.css`.
- Test: evidence/public/product-truth tests.

**Interfaces:**
- Canonical evidence state component accepts real existing state labels only.
- Inspector is rendered within Record context; no standalone route.

- [ ] Add/extend tests that assert RETURNED/RETRIEVED/OBSERVED/REVIEWED/SAFE CONCLUSION remain distinct and Source X-Ray is absent.
- [ ] Build record header/provenance, evidence summary, chain, review state, uncertainty/comparability treatments using existing data.
- [ ] Restyle contained source/evidence inspection without inventing unavailable fields.
- [ ] Preserve causal-restraint copy and unknown/unavailable treatments.
- [ ] Run tests/lint/typecheck/build.
- [ ] Commit `feat: migrate recommendation record evidence UI`.

### Task 7: Attention, Questions, Comparisons, Settings, advanced routes

**Files:**
- Modify route presentation under `app/app/page.tsx`, `app/app/prompts/**`, `app/app/analytics/**`, `app/app/settings/**`, existing advanced route components.
- Modify: `app/canonical-system.css`.
- Test: master-system, comparability, customer-journey, product-truth tests.

**Interfaces:**
- No data contract changes.
- Attention stays judgment-oriented; Comparisons use existing eligibility logic.

- [ ] Restyle Attention as needs-review/withheld/new-observation inbox.
- [ ] Restyle Questions around exact wording/run metadata.
- [ ] Build distinct Comparison Eligible/Withheld presentations from existing logic.
- [ ] Restyle Settings and advanced routes without adding capabilities.
- [ ] Run tests/lint/typecheck/build.
- [ ] Commit `feat: migrate canonical product surfaces`.

### Task 8: Responsive, state, motion, and accessibility hardening

**Files:**
- Modify: `app/canonical-system.css`
- Modify only component files needed for semantic labels/focus behavior.
- Modify: `scripts/browser-acceptance.mjs` only if new canonical selectors/screenshots need coverage without weakening existing checks.
- Test: `tests/browser-acceptance-contract.test.mjs`, `tests/canonical-brand-visual-proof.test.mjs`, new canonical system test.

**Interfaces:**
- Breakpoints: 1440, 1024, 768, 375, 320.
- Motion respects `prefers-reduced-motion`.

- [ ] Verify no evidence state disappears at narrow widths.
- [ ] Ensure desktop rail transforms to mobile navigation instead of squeezing.
- [ ] Add canonical hero/Record/Comparison screenshots to browser acceptance evidence where harness supports them.
- [ ] Check focus rings, contrast, dialog/drawer behavior, form labels, semantic state labels.
- [ ] Run browser-contract unit tests.
- [ ] Commit `fix: harden responsive motion and accessibility`.

### Task 9: Agent harness canonical-design guidance

**Files:**
- Modify only if gaps are confirmed: `.claude/skills/foremention-product-truth/SKILL.md`, `.claude/agents/experience-reviewer.md`, `CLAUDE.md`.
- Test: `tests/agent-harness-contract.test.mjs`.

**Interfaces:**
- Must encode canonical Figma file key, new visual-system rule, Source X-Ray retirement, and no-backend-change boundary without duplicating existing tools.

- [ ] Audit before editing.
- [ ] Add only missing canonical visual/Figma-to-code guidance.
- [ ] Run agent-harness contract test.
- [ ] Commit `chore: align agent harness with canonical visual system` if a real gap exists; otherwise skip the commit.

### Task 10: Exact-head QA and release PR

**Files:**
- Update PR description only; no product files unless a measured failure requires a minimal patch.

**Interfaces:**
- Every gate must target the same exact SHA.

- [ ] Run/verify `pnpm test`.
- [ ] Run/verify `pnpm lint`.
- [ ] Run/verify `pnpm typecheck`.
- [ ] Run/verify `pnpm build` and Cloudflare Worker dry run through CI.
- [ ] Verify Browser Acceptance, accessibility, responsive screenshots, canonical logo audit, Security, CodeQL, Agent Harness, AI Safety/Code Health.
- [ ] Open dedicated PR with Figma source, changed/not-changed scope, backend impact `none`, visual QA evidence, exact SHA, rollback notes.
- [ ] STOP before merge unless the founder explicitly authorizes the visual migration merge.
