# Foremention Distribution + Category Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Foremention’s Recommendation Intelligence category, research, SEO, partner, and privacy-first shared-Record distribution surfaces without changing the locked brand or five-object product IA.

**Architecture:** Extend the existing public shell and SEO helpers with a finite authority graph, reuse the existing Recommendation Record share security model, and add only PII-safe analytics events. Public publishing of Records stays fail-closed; existing private hash-only shares gain stakeholder/executive presentation and attribution.

**Tech Stack:** Next.js 16.2.12, React 19.2.8, TypeScript 5.9, Vinext/Cloudflare, PostHog, Supabase REST, Node test runner.

**Spec:** `docs/billion-dollar-build/04-distribution-category.md`

## Global Constraints

- Preserve Attention → Questions → Records → Comparisons → Settings.
- Do not redesign locked logo, colors, homepage visual identity, or canonical brand.
- Do not fabricate prospects, partnerships, customer proof, benchmarks, rankings, or causal claims.
- Keep authenticated and tokenized private routes out of the public index.
- Never send raw customer content, emails, source URLs, or share tokens to product analytics.

---

### Task 1: Distribution contract

**Files:**
- Create: `tests/distribution-category-contract.test.mjs`

**Interfaces:**
- Consumes: repository file tree.
- Produces: failing/passing static contracts for category, research, SEO, sharing, analytics, and documentation.

- [x] Write contract tests before implementation.
- [x] Run the contract against the missing implementation and confirm failure.
- [ ] Run the complete suite after implementation and confirm green.

### Task 2: Category authority surfaces

**Files:**
- Create: `app/recommendation-intelligence/page.tsx`
- Create: `app/glossary/page.tsx`
- Modify: `components/public-shell.tsx`
- Modify: `lib/seo.ts`

**Interfaces:**
- Consumes: `PublicShell`, `pageMetadata`.
- Produces: category definition, category boundaries, manifesto, glossary, `WebPage` and `DefinedTermSet` JSON-LD.

- [ ] Add the category definition without leadership claims.
- [ ] Add SEO/GEO-AEO/rank-tracking/AI-visibility boundaries.
- [ ] Add canonical vocabulary and founder POV.
- [ ] Link Category and Glossary into public IA.

### Task 3: Research + partner distribution

**Files:**
- Modify: `app/insights/page.tsx`
- Create: `app/partners/page.tsx`

**Interfaces:**
- Produces: evidence-gated Foremention Research program and partner-track infrastructure.

- [ ] Add State of Recommendation Intelligence as a research program, not a fabricated published benchmark.
- [ ] Document benchmark eligibility/minimum-sample gate.
- [ ] Add agency, consultant, SEO/GEO, B2B marketing, VC, accelerator, and integration tracks.
- [ ] State explicitly that partner categories do not imply partnerships.

### Task 4: SEO/indexation

**Files:**
- Create: `app/sitemap.ts`
- Create: `app/robots.ts`
- Modify: `lib/seo.ts`

**Interfaces:**
- Produces: finite public index and structured-data helpers.

- [ ] Curate the sitemap.
- [ ] Disallow `/app/`, `/share/`, `/api/`, auth, login, and signup.
- [ ] Add conservative `WebPage`, `CollectionPage`, `DefinedTermSet` helpers.

### Task 5: Shared Record viral loop

**Files:**
- Modify: `app/api/records/[id]/share/route.ts`
- Modify: `app/share/record/[token]/page.tsx`
- Create: `components/shared-record-actions.tsx`

**Interfaces:**
- Consumes: existing hash-only token, expiry, revocation, role, and service-role lookup model.
- Produces: private-only visibility contract, stakeholder/executive views, branded attribution, workspace CTA.

- [ ] Keep `private` as the only enabled share visibility.
- [ ] Fail closed for attempted public publishing.
- [ ] Render less detail in executive view than stakeholder view.
- [ ] Keep shared routes noindex and read-only.
- [ ] Add workspace CTA without passing the share token.

### Task 6: Distribution analytics

**Files:**
- Modify: `lib/product-analytics-contract.ts`
- Modify: `components/public-activation-analytics.tsx`
- Create: `components/shared-record-actions.tsx`

**Interfaces:**
- Produces: `category_page_viewed`, `research_page_viewed`, `partner_page_viewed`, `record_share_viewed`, `record_share_workspace_cta_clicked`.

- [ ] Allowlist events.
- [ ] Limit share properties to `view_mode` and `include_evidence`.
- [ ] Do not capture raw content, source URLs, customer identity, or tokens.

### Task 7: Verification

**Files:**
- Review all changed files and PR diff.

- [ ] Run full CI: migrations, tests, lint, typecheck, build, worker dry-run, security and release checks.
- [ ] Run browser acceptance.
- [ ] Verify PR diff does not alter homepage visual identity or five-object workspace navigation.
- [ ] Only mark the PR ready after exact-SHA checks provide evidence.
