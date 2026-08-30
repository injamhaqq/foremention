# Foremention Product Compression + Commercial Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a simpler, conversion-ready Foremention MVP that preserves the existing evidence/collection engine while compressing the UI to five canonical objects, strengthening design-partner conversion, and adding fail-closed commercial readiness.

**Architecture:** Keep all existing advanced routes and backend systems intact, but remove them from global navigation and surface them contextually from canonical objects/Settings. Public-site changes are content/navigation compression rather than a homepage redesign. Commercial behavior remains configuration-driven: design-partner conversion is active now; paid checkout/portal become available only when a real billing provider and price IDs exist.

**Tech Stack:** Next.js / React / TypeScript, Supabase/Postgres/RLS, Inngest, Cloudflare Worker, Node test runner, existing server-side REST helpers.

**Spec:** `docs/superpowers/specs/2026-08-29-product-compression-commercial-readiness-design.md`

## Global Constraints

- Homepage must remain byte-identical to base SHA `52c47ec71696bbeb5fc0087b1d17ce9af1319b96`.
- Primary IA remains exactly Attention / Questions / Records / Comparisons / Settings.
- Recommendation Record remains canonical; evidence inspection remains contained.
- Preserve Returned → Retrieved → Observed → Reviewed → Safe conclusion semantics.
- Preserve exact comparison, human review, RLS, provider, cost-control, and Inngest boundaries.
- No fabricated customer logos/counts, benchmarks, legal entity/jurisdiction, certifications, or active integrations.
- External billing/SSO/integration behavior fails closed when configuration is absent.
- No light/white panel backgrounds; keep black/graphite + registered green.

---

### Task 1: Product-compression contract

**Files:**
- Create: `tests/product-compression-commercial-readiness.test.mjs`
- Read/guard: `app/page.tsx`

**Produces:** A single RED contract covering the six release outcomes before implementation.

- [ ] **Step 1: Write failing tests** that assert:
  - `components/workspace-navigation.tsx` contains only the five primary routes in global navigation and no `workspaceNav`, `advancedNav`, or `sidebar-advanced` surface.
  - legacy routes such as `/app/competitors`, `/app/placements`, `/app/team`, `/app/intelligence`, and `/app/evidence` still exist.
  - `app/sitemap.ts` contains only the canonical evergreen/public-trust route set from the spec.
  - pricing leads with package value, not a beta-warning headline; contains Core/Signal/Intelligence; states checkout is configuration-dependent; contains no hard-coded invented price.
  - contact includes the five-question → Record → action → comparable-cycle design-partner loop.
  - signup states no card charge while describing a design-partner/private-beta workspace rather than leading with beta status.
  - Settings contains Team/Integrations/SSO/Billing contextual destinations.
  - no `SOC 2 certified`, `ISO 27001 certified`, fake customer count/logo, or invented legal entity strings are introduced.
  - SHA/contents of `app/page.tsx` remain unchanged from the base branch fixture copied into the test as a known content hash.
- [ ] **Step 2: Run the focused contract** with `node --test tests/product-compression-commercial-readiness.test.mjs`; expected RED on navigation/pricing/contact requirements.
- [ ] **Step 3: Commit RED test**.

### Task 2: Compress signed-in navigation without deleting capability

**Files:**
- Modify: `components/workspace-navigation.tsx`
- Modify: `components/retention-surface-bridge.tsx`
- Test: `tests/product-compression-commercial-readiness.test.mjs`

**Produces:** Five global destinations, contextual access to legacy tools.

- [ ] **Step 1: Remove workspace/advanced nav arrays and render only the existing `primaryNav` globally.**
- [ ] **Step 2: Add contextual secondary links** to canonical surfaces:
  - Attention: Alerts, Opportunities, Actions.
  - Questions: Competitors.
  - Records: Evidence Vault only as a supporting/tool link; Record controls remain in place.
  - Comparisons: Outcomes, Decision Lab.
  - Settings: Team, Integrations, operational tools.
  These are local panel links, not global navigation.
- [ ] **Step 3: Keep direct legacy routes unchanged.**
- [ ] **Step 4: Run focused contract; expect navigation assertions PASS.**
- [ ] **Step 5: Commit navigation compression.**

### Task 3: Prune public navigation and reposition commercial truth

**Files:**
- Modify: `components/public-shell.tsx`
- Modify: `app/sitemap.ts`
- Modify: `app/pricing/page.tsx`
- Modify: `app/signup/page.tsx`
- Test: `tests/product-compression-commercial-readiness.test.mjs`

**Produces:** Smaller public surface and value-first packaging while preserving truth.

- [ ] **Step 1: Keep header exactly Product / Methodology / Research + Sign in / Request a demo.**
- [ ] **Step 2: Compress footer** to Product, Research/Company, Trust, Access; remove redundant promotion of Recommendation Intelligence/Record/AI-mediated-buying as separate footer destinations while keeping those pages live.
- [ ] **Step 3: Canonicalize sitemap** to home, product, recommendation-intelligence, recommendation-record, methodology, insights, about, contact, privacy, subprocessors, terms; do not add pricing/signup/auth routes.
- [ ] **Step 4: Rewrite pricing hero** to lead with `Choose the evidence coverage your team needs.` and present Core/Signal/Intelligence packaging dimensions. Keep a compact disclosure: founder-led design-partner pricing; self-serve paid checkout activates only when billing is configured. Do not hard-code a final price.
- [ ] **Step 5: Update signup microcopy** to `Design-partner / private-beta workspace` and keep explicit `Creating a workspace does not charge a card.`
- [ ] **Step 6: Run focused contract.**
- [ ] **Step 7: Commit public/commercial copy compression.**

### Task 4: Design-partner conversion path

**Files:**
- Modify: `app/contact/page.tsx`
- Create: `lib/design-partner.ts`
- Create: `app/api/design-partner/route.ts`
- Modify: `lib/product-analytics.ts` only if a safe existing server event helper is available; otherwise keep the application persisted server-side without adding new analytics payloads.
- Create migration only if no existing contact/application table can safely hold the record.
- Test: `tests/design-partner.test.mjs`

**Interfaces:**
- `validateDesignPartnerApplication(input)` returns a normalized application or a validation error without accepting arbitrary HTML/oversized text.
- POST `/api/design-partner` persists company, role, category, up to five buyer questions, and optional current problem; no secret/customer evidence content.

- [ ] **Step 1: Search current schema for an existing safe intake/application table.** Prefer reuse; if absent, create tenant-independent `design_partner_applications` with server-only writes and no public reads.
- [ ] **Step 2: Write RED validation/API contract tests.**
- [ ] **Step 3: Implement normalization/validation and server route** with trusted-origin/CSRF protections matching existing mutation patterns, rate/size bounds, and no automatic account provisioning.
- [ ] **Step 4: Replace contact page's email-only primary flow** with a native form plus email fallback. Required fields: work email, company, role, category; optional up to five buyer questions/current decision problem.
- [ ] **Step 5: Copy must explicitly state the loop:** five questions → baseline Record → evidence review → one owned action → comparable remeasurement.
- [ ] **Step 6: Run design-partner tests and focused product contract.**
- [ ] **Step 7: Commit conversion path.**

### Task 5: Billing readiness with fail-closed Stripe-compatible server flow

**Files:**
- Modify: `lib/billing.ts`
- Create: `lib/stripe-billing.ts`
- Create: `app/api/billing/checkout/route.ts`
- Create: `app/api/billing/portal/route.ts`
- Modify: `app/api/billing/webhook/route.ts`
- Modify: `components/retention-surface-bridge.tsx` or Settings Plan panel for truthful configuration status.
- Test: `tests/billing-checkout-portal.test.mjs`

**Interfaces:**
- `stripeBillingConfigured()` requires `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and at least one configured package price ID.
- `createStripeCheckoutSession({ packageKey, organizationId, customerEmail, successUrl, cancelUrl })` posts server-side form data to Stripe API.
- `createStripePortalSession({ customerId, returnUrl })` creates a hosted billing portal session.
- `verifyStripeWebhook(rawBody, signatureHeader)` validates Stripe's timestamped `v1` HMAC signature with replay-tolerance bounds.
- `parseStripeBillingEvent(rawBody)` maps only supported subscription/checkout/invoice events into the existing `VerifiedBillingEvent` model; unsupported events return `null` without mutating entitlements.

- [ ] **Step 1: Read existing billing/migration schema and write RED tests** for absent-config 503, owner-only checkout/portal, no client-supplied organization/customer IDs, signature verification, supported lifecycle mappings, unsupported event no-op.
- [ ] **Step 2: Implement Stripe REST helper without exposing keys** and without requiring a browser/client Stripe SDK.
- [ ] **Step 3: Add checkout endpoint** for Core/Signal only; Intelligence remains contact-led. Price IDs come exclusively from env.
- [ ] **Step 4: Add customer portal endpoint** using server-stored billing account customer ID.
- [ ] **Step 5: Extend webhook route** to choose the Stripe parser when `BILLING_PROVIDER_ID=stripe`, otherwise retain the existing generic signed webhook behavior.
- [ ] **Step 6: Update Settings**: when Stripe is configured and the workspace has a paid billing account, show Manage billing; when configured but unpaid, show package checkout actions; when absent, state founder-led billing only. Never claim checkout is live when config is absent.
- [ ] **Step 7: Run billing tests + full existing billing contracts.**
- [ ] **Step 8: Commit billing readiness.**

### Task 6: Trust/legal and enterprise-readiness compression

**Files:**
- Modify: `app/privacy/page.tsx` only if needed for concise links/status copy.
- Modify: `app/subprocessors/page.tsx` only if needed for current configured-vs-potential wording.
- Modify: `app/terms/page.tsx` only to remove stale beta-first framing, never to invent entity/jurisdiction.
- Modify: `app/app/settings/page.tsx`
- Create: `components/enterprise-readiness.tsx` if Settings would otherwise grow further.
- Test: `tests/product-compression-commercial-readiness.test.mjs`

**Produces:** One truthful trust/enterprise readiness panel, not a fake compliance center.

- [ ] **Step 1: Add Settings enterprise-readiness panel** listing: tenant isolation, exports/deletion, signed webhooks, SSO configuration state, monitoring configuration state, subprocessor link, and audit/security testing boundary.
- [ ] **Step 2: Explicitly label certifications/contractual items as `Not claimed` unless backed by configuration/documented fact.** Do not use certification badges.
- [ ] **Step 3: Keep public legal pages concise and linkable; remove repeated marketing copy if present without changing substantive privacy/terms commitments.**
- [ ] **Step 4: Run trust/commercial contract and Browser-oriented tests.**
- [ ] **Step 5: Commit trust readiness.**

### Task 7: Activation/retention proof and next-step guidance

**Files:**
- Modify: `lib/retention-loop.ts`
- Modify: `components/attention-inbox.tsx` and/or `components/retention-surface-bridge.tsx`
- Modify: `lib/product-analytics.ts` using only existing safe internal IDs/events.
- Test: `tests/retention-loop-activation.test.mjs`

**Interfaces:**
- `deriveActivationStage(state)` returns one of `workspace_configured`, `five_questions`, `first_record`, `first_review`, `first_action`, `second_comparable_cycle`, plus a next-step label/href.

- [ ] **Step 1: Write RED tests** for deterministic stage ordering and no false completion when evidence/review/comparability state is missing.
- [ ] **Step 2: Implement stage derivation from existing persisted state only.**
- [ ] **Step 3: Show one `Next best step` card at top of Attention** rather than adding another dashboard metric block.
- [ ] **Step 4: Emit only safe stage-change analytics using internal user/org IDs; no email, prompt text, answers, evidence, or URLs.**
- [ ] **Step 5: Run activation tests and existing analytics privacy contracts.**
- [ ] **Step 6: Commit activation proof.**

### Task 8: Full release QA and production verification

**Files:**
- No product changes unless a gate finds a root-cause defect.

- [ ] **Step 1: Verify homepage remains byte-identical** to base via GitHub compare/content hash.
- [ ] **Step 2: Run full repository test suite and migration replay.**
- [ ] **Step 3: Run lint, typecheck, build, Worker dry-run.**
- [ ] **Step 4: Open PR and inspect changed filenames/review threads.**
- [ ] **Step 5: Require fresh PR CI, Browser Acceptance, Security, CodeQL, AI Safety/Code Health.**
- [ ] **Step 6: Fix only root-cause failures; do not weaken tests/accessibility/evidence gates.**
- [ ] **Step 7: Merge with exact-head SHA lock after green checks.**
- [ ] **Step 8: Verify exact merged `main` through push CI, Browser Acceptance, Security, CodeQL, AI Safety/Code Health, OpenSSF Scorecard, and Authenticated First-Evidence Canary.**
- [ ] **Step 9: Confirm production health reports the exact merged SHA and no customer budget/guardrail was changed.**
