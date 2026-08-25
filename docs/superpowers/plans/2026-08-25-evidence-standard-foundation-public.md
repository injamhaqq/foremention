# Evidence Standard Foundation + Public Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the legacy mint/jade public presentation with the approved Evidence Standard foundation and public homepage/Source X-Ray experience while preserving the locked logo/wordmark gate, existing conversion routes, accessibility hooks, evidence truth, and private-beta commercial boundaries.

**Architecture:** Add a focused Evidence Standard override layer rather than rewriting the 200k-line legacy stylesheet in one unsafe change. Introduce reusable semantic primitives for running labels, evidence references, and honesty states; migrate the public shell and homepage to those primitives; preserve current route IDs and browser-acceptance hooks; then visually QA the resulting PR before expanding the identity into auth/onboarding and the signed-in product.

**Tech Stack:** Next.js 16.2.12, React 19.2.8, TypeScript 5.9.3, CSS, Node test runner, Vinext/Cloudflare runtime.

**Spec:** `docs/superpowers/specs/2026-08-25-evidence-standard-production-design.md`

## Global Constraints

- Do not redesign, redraw, approximate, regenerate, or modernize the locked Foremention logo or `FOREMENTION` wordmark.
- Treat `public/foremention-wordmark.png`, `public/source-eclipse.svg`, `app/icon.svg`, and the coded `SourceEclipseMark` as candidates until canonical asset identity is proven.
- Identity winner is **The Evidence Standard**; do not reopen the tournament.
- Category copy remains **Recommendation intelligence for B2B SaaS**.
- Principle remains **EVIDENCE BEFORE THEATRE**.
- Public marketing remains light-primary.
- Marker/evidence color may refer only to an evidence record or evidence-linked state; never generic CTA/nav/pricing/decorative emphasis.
- Preserve `#source-xray` and `#source-xray-stage` because browser acceptance exercises those hooks.
- Preserve pointer, keyboard, reduced-motion, and no-interaction understandability for Source X-Ray.
- Never use `What shaped the answer?` or other unsupported causal language for provider-returned citations.
- Workspace creation must not imply a card charge or live paid entitlement.
- No new production dependency is required for this slice.
- Production code changes require a failing test first.

---

### Task 1: Add Evidence Standard public contract tests

**Files:**
- Create: `tests/evidence-standard-public.test.mjs`
- Read-only dependencies: `app/layout.tsx`, `app/page.tsx`, `components/public-shell.tsx`, `components/goat-home-experience.tsx`, `components/evidence-standard-primitives.tsx`, `app/evidence-standard.css`

**Interfaces:**
- Consumes: repository files as UTF-8 source.
- Produces: one contract suite that fails until the new CSS layer, primitives, shell copy, homepage copy, and Source X-Ray language exist.

- [ ] **Step 1: Write the failing contract test**

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("Evidence Standard tokens replace the legacy public visual grammar", () => {
  const layout = read("app/layout.tsx");
  const css = read("app/evidence-standard.css");

  assert.match(layout, /import "\.\/evidence-standard\.css"/);
  for (const token of [
    "--fm-paper: #F7F5EF",
    "--fm-surface: #FCFBF7",
    "--fm-ink: #10110F",
    "--fm-graphite: #3F403B",
    "--fm-muted: #6E7068",
    "--fm-rule: #D8D5CC",
    "--fm-evidence: #879A4A",
    "--fm-evidence-wash: #E2E6CF",
    "--fm-evidence-deep: #4D5837",
  ]) assert.ok(css.includes(token), `missing ${token}`);

  assert.match(css, /--fm-font-display:/);
  assert.match(css, /--fm-font-sans:/);
  assert.match(css, /--fm-font-mono:/);
  assert.match(css, /\.button--ink[\s\S]*background:\s*var\(--fm-ink\)/);
  assert.doesNotMatch(css, /\.public-nav[^}]*var\(--fm-evidence\)/);
});

test("public navigation reflects the Evidence Standard information architecture", () => {
  const shell = read("components/public-shell.tsx");
  for (const item of ["Product", "Evidence", "Method", "Insights"]) assert.ok(shell.includes(`"${item}"`));
  assert.match(shell, /Sign in/);
  assert.match(shell, /Create workspace/);
  assert.doesNotMatch(shell, /\["\/pricing", "Pricing"\]/);
});

test("homepage hero and public record use the approved category and evidence language", () => {
  const experience = read("components/goat-home-experience.tsx");
  const home = read("app/page.tsx");
  const combined = `${experience}\n${home}`;

  assert.match(experience, /See what AI recommends\. Inspect the evidence behind the record\./);
  assert.match(experience, /Private beta/);
  assert.match(experience, /Creating a workspace does not charge a card/);
  assert.match(combined, /Recommendation intelligence for B2B SaaS/);
  assert.match(combined, /01 \/ QUESTION/);
  assert.match(combined, /02 \/ ANSWER/);
  assert.match(combined, /\[03\]/);
  assert.match(combined, /SOURCE \/ 03/);
  assert.match(combined, /— NOT OBSERVED/);
  assert.match(combined, /≠ NOT COMPARABLE/);
  assert.match(combined, /± INSUFFICIENT EVIDENCE/);
});

test("Source X-Ray preserves returned-source truth without causal overclaim", () => {
  const experience = read("components/goat-home-experience.tsx");
  const home = read("app/page.tsx");
  const combined = `${experience}\n${home}`;

  assert.match(experience, /id="source-xray"/);
  assert.match(experience, /id="source-xray-stage"/);
  assert.match(experience, /What evidence came with the answer\?/);
  assert.match(experience, /Returned reference/);
  assert.match(experience, /Distinct source/);
  assert.doesNotMatch(combined, /What shaped the answer/i);
});

test("semantic primitives keep evidence meaning visible without color", () => {
  const primitives = read("components/evidence-standard-primitives.tsx");
  assert.match(primitives, /export function RunningLabel/);
  assert.match(primitives, /export function EvidenceReference/);
  assert.match(primitives, /export function HonestyState/);
  assert.match(primitives, /NOT OBSERVED/);
  assert.match(primitives, /NOT COMPARABLE/);
  assert.match(primitives, /INSUFFICIENT EVIDENCE/);
});
```

- [ ] **Step 2: Run the targeted test and verify RED**

Run: `node --test tests/evidence-standard-public.test.mjs`

Expected: FAIL because `app/evidence-standard.css` and `components/evidence-standard-primitives.tsx` do not exist and the homepage still uses the prior hero/copy.

- [ ] **Step 3: Commit the RED test only**

```bash
git add tests/evidence-standard-public.test.mjs
git commit -m "test: define Evidence Standard public contract"
```

---

### Task 2: Add the Evidence Standard token and typography layer

**Files:**
- Create: `app/evidence-standard.css`
- Modify: `app/layout.tsx`
- Test: `tests/evidence-standard-public.test.mjs`

**Interfaces:**
- Produces CSS custom properties `--fm-*` consumed by public shell, homepage, primitives, and later auth/product migrations.
- Does not delete legacy styles yet; it overrides them last to constrain blast radius.

- [ ] **Step 1: Import the new stylesheet last in `app/layout.tsx`**

Add:

```ts
import "./evidence-standard.css";
```

after the existing public/accessibility stylesheet imports so Evidence Standard is the final visual layer.

- [ ] **Step 2: Create the Evidence Standard token layer**

Create `app/evidence-standard.css` with the exact working tokens from the spec, canonical-family variables with explicit fallbacks, body/public shell/background/type overrides, flat rule-driven button/nav behavior, focus-visible behavior, responsive public grid rules, Source X-Ray presentation, honesty-state presentation, and `prefers-reduced-motion` fallbacks.

The first block must include exactly:

```css
:root {
  --fm-paper: #F7F5EF;
  --fm-surface: #FCFBF7;
  --fm-ink: #10110F;
  --fm-graphite: #3F403B;
  --fm-muted: #6E7068;
  --fm-rule: #D8D5CC;
  --fm-evidence: #879A4A;
  --fm-evidence-wash: #E2E6CF;
  --fm-evidence-deep: #4D5837;
  --fm-font-display: "Signifier", "Iowan Old Style", "Palatino Linotype", Georgia, serif;
  --fm-font-sans: "Untitled Sans", Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --fm-font-mono: "Söhne Mono", "IBM Plex Mono", "Roboto Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
```

Do not use `--fm-evidence` on generic CTA, nav hover, pricing emphasis, or decorative section separators.

- [ ] **Step 3: Run the targeted test**

Run: `node --test tests/evidence-standard-public.test.mjs`

Expected: still FAIL on missing primitives/homepage language, while token assertions now pass.

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx app/evidence-standard.css
git commit -m "feat: add Evidence Standard visual foundation"
```

---

### Task 3: Add semantic Evidence Standard primitives

**Files:**
- Create: `components/evidence-standard-primitives.tsx`
- Test: `tests/evidence-standard-public.test.mjs`

**Interfaces:**
- Produces `RunningLabel`, `EvidenceReference`, and `HonestyState` reusable by public and signed-in surfaces.

- [ ] **Step 1: Implement primitives**

```tsx
import type { ReactNode } from "react";

export function RunningLabel({ number, label, className = "" }: { number: string; label: string; className?: string }) {
  return <span className={`fm-running-label ${className}`.trim()}><b>{number}</b><span aria-hidden="true"> / </span><span>{label}</span></span>;
}

export function EvidenceReference({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`fm-evidence-reference ${className}`.trim()}>{children}</span>;
}

type HonestyTone = "not-observed" | "not-comparable" | "insufficient";
const honestyCopy: Record<HonestyTone, string> = {
  "not-observed": "— NOT OBSERVED",
  "not-comparable": "≠ NOT COMPARABLE",
  insufficient: "± INSUFFICIENT EVIDENCE",
};

export function HonestyState({ tone }: { tone: HonestyTone }) {
  return <span className={`fm-honesty-state fm-honesty-state--${tone}`}>{honestyCopy[tone]}</span>;
}
```

- [ ] **Step 2: Add CSS for these primitives**

Use mono typography, thin rules, and explicit text. Only `EvidenceReference` may use the evidence/Marker color by default; honesty states stay primarily ink/rule based so their meaning survives grayscale and color loss.

- [ ] **Step 3: Run targeted test**

Run: `node --test tests/evidence-standard-public.test.mjs`

Expected: remaining failures are homepage/public-shell/Source-X-Ray language only.

- [ ] **Step 4: Commit**

```bash
git add components/evidence-standard-primitives.tsx app/evidence-standard.css
git commit -m "feat: add Evidence Standard semantic primitives"
```

---

### Task 4: Migrate public shell information architecture

**Files:**
- Modify: `components/public-shell.tsx`
- Test: `tests/evidence-standard-public.test.mjs`

**Interfaces:**
- Keeps `Wordmark`, current route destinations, skip link, site motion, footer legal/trust surfaces, and analytics-preference component.
- Changes top-level navigation labels/priorities only.

- [ ] **Step 1: Replace public navigation model**

Use:

```ts
const links = [
  ["/product", "Product"],
  ["/source-map", "Evidence"],
  ["/methodology", "Method"],
  ["/insights", "Insights"],
] as const;
```

Keep `Sign in` and `Create workspace` as utilities. Pricing remains accessible in the footer and relevant page CTAs but no longer dominates the top navigation while checkout is inactive.

- [ ] **Step 2: Update footer wording without changing legal/trust routes**

Footer note:

`Recommendation intelligence for B2B SaaS teams that need to inspect what AI systems recommended, what evidence was returned, and what changed later.`

Footer product links should include Product, Evidence, Method, Pricing, and Standards.

- [ ] **Step 3: Run targeted test**

Run: `node --test tests/evidence-standard-public.test.mjs`

Expected: nav assertions pass; homepage/Source-X-Ray assertions remain RED.

- [ ] **Step 4: Commit**

```bash
git add components/public-shell.tsx
git commit -m "feat: align public shell with Evidence Standard"
```

---

### Task 5: Rebuild hero and Source X-Ray around the recommendation record

**Files:**
- Modify: `components/goat-home-experience.tsx`
- Modify: `app/evidence-standard.css`
- Test: `tests/evidence-standard-public.test.mjs`
- Regression test: `tests/browser-acceptance-contract.test.mjs`

**Interfaces:**
- Preserves exported component names `MissingAnswerExperience` and `SourceXRayExperience` so `app/page.tsx` imports remain stable.
- Preserves `#source-xray` and `#source-xray-stage` IDs and keyboard/pointer behavior.

- [ ] **Step 1: Replace hero copy with approved Evidence Standard copy**

Use exactly:

- Kicker: `Recommendation intelligence for B2B SaaS`
- H1: `See what AI recommends. Inspect the evidence behind the record.`
- Body: `Run the buyer questions that matter, record which brands appear, preserve returned citation URLs when providers supply them, review the evidence, and compare equivalent runs over time.`
- Primary: `Create workspace →`
- Secondary: `Inspect the evidence`
- Disclosure: `Private beta · Creating a workspace does not charge a card. Collection capacity is activated separately.`

- [ ] **Step 2: Replace generic preview rows with a visible recommendation-record sequence**

Use `RunningLabel`, `EvidenceReference`, and `HonestyState`. The illustrative record must visibly contain:

- `01 / QUESTION`
- `02 / ANSWER`
- `[03]`
- `SOURCE / 03`
- `04 / REVIEW`
- `06 / COMPARE`
- `— NOT OBSERVED`
- `≠ NOT COMPARABLE`
- `± INSUFFICIENT EVIDENCE`

Keep the existing illustrative buyer question and generic Brand A/B/C labels; do not introduce fake customer metrics or testimonials.

- [ ] **Step 3: Recompose Source X-Ray copy around returned-source truth**

The section heading becomes `What evidence came with the answer?`.

Within the evidence layer use labels such as:

- `Returned reference`
- `Distinct source`
- `Retrievable`
- `Review pending` / `Reviewed` only where the illustrative state explicitly says so

Do not use `What shaped the answer?`.

Keep the pointer lens, arrow-key movement, Enter/Space full-layer toggle, and screen-reader instructions.

- [ ] **Step 4: Run targeted and browser-contract tests**

Run:

```bash
node --test tests/evidence-standard-public.test.mjs tests/browser-acceptance-contract.test.mjs
```

Expected: Evidence Standard contract now passes; browser acceptance contract still passes because IDs/keyboard hooks are preserved.

- [ ] **Step 5: Commit**

```bash
git add components/goat-home-experience.tsx app/evidence-standard.css
git commit -m "feat: rebuild hero and Source X-Ray as evidence records"
```

---

### Task 6: Recompose homepage narrative and remove causal copy

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/evidence-standard.css`
- Test: `tests/evidence-standard-public.test.mjs`

**Interfaces:**
- Keeps existing route, structured FAQ data, pricing truth, `VerifiedSocialProof`, and public-shell wrapper.
- Uses semantic section classes and Evidence Standard primitives without inventing customer proof.

- [ ] **Step 1: Replace the `learn` item `What shaped the answer`**

Use:

```ts
{ n: "Sources", title: "What sources were returned", body: "Inspect the citation URLs the provider actually returned, then review the pages behind those observations." }
```

- [ ] **Step 2: Add a dedicated honesty-state section before competitor/decision content**

Render the three text-first states using `HonestyState`:

- `— NOT OBSERVED`
- `≠ NOT COMPARABLE`
- `± INSUFFICIENT EVIDENCE`

The section explains that missing evidence and invalid comparison are product states, not hidden errors.

- [ ] **Step 3: Reframe the existing evidence-chain/workflow sections to the seven-scene rhythm**

Preserve real product truth while making the visible sequence read as:

1. Recommendation Record
2. Source X-Ray
3. Honesty States
4. Competitor Evidence
5. Decision Gate
6. Later Measurement
7. Create Workspace

Do not create a fake competitor leaderboard or fake trend values.

- [ ] **Step 4: Update final CTA**

Keep `Create a workspace` and private-beta truth. Use the Evidence Standard thesis rather than generic AI-visibility language.

- [ ] **Step 5: Run targeted test**

Run: `node --test tests/evidence-standard-public.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx app/evidence-standard.css
git commit -m "feat: compose Evidence Standard homepage narrative"
```

---

### Task 7: Full repository verification and visual QA gate

**Files:**
- No production file changes unless verification exposes a defect.
- Potential test fixes must follow a new RED → GREEN cycle.

**Interfaces:**
- Produces evidence that the first production slice is safe to review/merge.

- [ ] **Step 1: Run static/unit contracts**

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 2: Run lint/typecheck/build**

```bash
pnpm lint
pnpm typecheck
pnpm build
```

Expected: all commands exit 0.

- [ ] **Step 3: Open/update a draft PR against `main`**

PR body must state:

- exact base SHA inherited from approved spec
- locked logo/wordmark were not redesigned
- no auth/data/evidence/billing semantics changed
- Evidence Standard token/copy/Source-X-Ray public migration only
- visual QA required before ready-for-review

- [ ] **Step 4: Inspect CI**

Require CI, Security, CodeQL, AI Safety/Code Health, and Browser Acceptance to complete successfully where configured.

- [ ] **Step 5: Perform browser visual QA on the PR/local preview**

Inspect desktop and mobile for:

- hero hierarchy
- no clipping/overlap
- Source X-Ray pointer and keyboard interaction
- Source X-Ray understandable without interaction
- marker-semantic discipline
- public nav/mobile nav
- no horizontal overflow at 375/320
- reduced-motion behavior
- readable mono/reference text
- pricing/private-beta truth unchanged

- [ ] **Step 6: Red-team the public result**

Attempt to prove the result is:

- generic SaaS
- generic AI
- editorial but not software
- beautiful but causally sloppy
- dependent on Marker color
- dependent on animation
- weak without logo
- weak on mobile

Any proven defect becomes a separate failing test before correction.

- [ ] **Step 7: Mark slice ready only with evidence**

Do not merge automatically. Report exact PR/head SHA and all verification results, then proceed to the auth/onboarding slice on a new branch after this public foundation is proven.