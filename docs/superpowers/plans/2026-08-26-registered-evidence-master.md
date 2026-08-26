# Registered Evidence Master Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Foremention’s public homepage and signed-in workspace presentation to the locked Registered Evidence identity without changing authentication, authorization, collection, database, analytics, or route semantics.

**Architecture:** Keep the proven application behavior and route tree intact. Introduce a final, last-loaded `registered-evidence.css` layer for the new visual system, update only presentation-oriented markup/copy in the public shell, homepage experience, and navigation labels, and lock the migration with source contracts plus the existing browser/accessibility/production acceptance workflows.

**Tech Stack:** Next.js 16.2.12, React 19.2.8, TypeScript 5.9.3, vinext, Cloudflare Workers, Node test runner, Playwright/axe browser acceptance.

**Spec:** Locked Foremention Registered Evidence Figma master (`KurrRhyuATLtcIET1XArYC`, homepage desktop `102:83`, mobile `102:134`) and canonical artwork frame `71:2`.

## Global Constraints

- Preserve exact canonical Foremention SVG artwork; do not redraw, retype, stretch, recolor, glow, shadow, or distort it.
- Public conviction environment: near-black `#0D0F0E` / graphite `#151817`, white/warm copy, Registered Green `#176347` only for registration/evidence signal.
- Product inspection environment: warm `#F4F0E8` / surface `#FFFDF9` with restrained near-black text and semantic evidence states.
- Display type uses Newsreader-compatible serif stack; UI uses Inter-compatible sans stack; provenance/state labels use IBM Plex Mono-compatible mono stack.
- Homepage hero must say `Register. Prove. Prepare.` and `Recommendation intelligence for B2B software.`
- Preserve epistemic restraint: returned references are not causal proof; one run is not a trend; later comparisons require equivalent measurement.
- Preserve existing auth/session/RLS/onboarding/collection/analytics behavior and URLs.
- Workspace primary navigation labels: Attention, Questions, Records, Source X-Ray, Comparisons, Settings; existing routes remain the destinations.
- WCAG AA and responsive acceptance at 1440, 1024, 768, 375, and 320 remain release gates.
- No generic gradients, neon/cyber treatment, planet imagery, fake traction, fake scores, or false causal claims.

---

### Task 1: Lock the Registered Evidence contract

**Files:**
- Create: `tests/registered-evidence-master.test.mjs`
- Test: `tests/registered-evidence-master.test.mjs`

**Interfaces:**
- Consumes: current source files on `feat/registered-evidence-master`.
- Produces: source-level contract for tokens, hero language, public navigation, workspace navigation, canonical identity, responsive/reduced-motion rules, and epistemic restraint.

- [x] **Step 1: Write the failing source contract** asserting the final stylesheet import, locked palette/type tokens, `Register. Prove. Prepare.`, the B2B software descriptor, Request a demo / Product / Methodology / Research navigation, the six primary workspace labels, and no route-mechanics changes.
- [x] **Step 2: Run `pnpm test` in CI** and verify the new contract fails before implementation.
- [x] **Step 3: Keep every existing auth/onboarding/browser contract enabled.**

### Task 2: Implement the public Registered Evidence system

**Files:**
- Create: `app/registered-evidence.css`
- Modify: `app/layout.tsx`
- Modify: `components/public-shell.tsx`
- Modify: `components/goat-home-experience.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: canonical `Wordmark`/`ForementionMark`, existing Source X-Ray interaction, existing public route tree.
- Produces: dark conviction homepage aligned to Figma, responsive mobile header/hero/illustrative record, restyled Source X-Ray, and retained long-form evidence narrative.

- [x] **Step 1: Load `registered-evidence.css` last** so it can supersede legacy presentation without deleting proven legacy behavior.
- [x] **Step 2: Recompose the public header** to Product / Methodology / Research plus Request a demo; preserve login access in the mobile/full navigation and footer.
- [x] **Step 3: Recompose the hero** around the locked headline, descriptor, safe supporting copy, See an example CTA, and illustrative registered-record visualization.
- [x] **Step 4: Restyle existing downstream evidence sections and Source X-Ray** using the final palette/type/registration language while keeping the existing interaction and truth boundaries.
- [x] **Step 5: Add responsive 1024/768/375/320 and reduced-motion/reduced-transparency behavior.**

### Task 3: Implement the signed-in inspection environment

**Files:**
- Modify: `components/workspace-navigation.tsx`
- Modify: `app/registered-evidence.css`

**Interfaces:**
- Consumes: existing signed-in route destinations and `WorkspaceSidebar`/`WorkspaceMobileNavigation` behavior.
- Produces: minimal primary navigation labels and a warm inspection shell without route or security changes.

- [x] **Step 1: Map existing routes to Attention, Questions, Records, Source X-Ray, Comparisons, Settings.**
- [x] **Step 2: Move secondary/legacy operational destinations under Advanced rather than deleting routes.**
- [x] **Step 3: Style app sidebar/topbar/mobile navigation with Registered Evidence inspection tokens and preserve canonical mobile mark visibility.**

### Task 4: Prove and release

**Files:**
- No production files unless a failing gate proves a specific defect.

**Interfaces:**
- Consumes: exact feature-branch SHA.
- Produces: merged exact main SHA and exact production evidence.

- [ ] **Step 1: Run the full GitHub PR suite**: migrations, unit/integration tests, lint, typecheck, build, Worker dry run, Security, CodeQL, AI Safety/Code Health, Browser Acceptance.
- [ ] **Step 2: Diagnose any red gate from exact logs before editing.**
- [ ] **Step 3: Verify exact-head all-green, mark PR ready, merge with expected head SHA.**
- [ ] **Step 4: Verify exact `main` merge SHA, successful Cloudflare production build, exact-release CI, authenticated browser acceptance/Lighthouse, first-evidence production canary, Inngest probe, provenance and SBOM attestation.**
