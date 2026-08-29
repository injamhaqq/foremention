# Foremention Product Compression + Commercial Readiness Design

## Purpose

Turn the now-production-verified Foremention private beta into a simpler, more credible, conversion-ready Recommendation Intelligence MVP without changing the homepage, provider collection engine, Recommendation Record evidence boundary, five-object information architecture, or canonical black/graphite + registered-green identity.

The release addresses six audited gaps in one coordinated pass:

1. reduce dashboard complexity;
2. prune/de-emphasize public-site sprawl;
3. create a concrete design-partner conversion path;
4. make commercial packaging and billing readiness credible without inventing live billing;
5. strengthen trust/legal readiness without inventing entity/jurisdiction facts;
6. make activation/retention proof measurable so real customer usage can validate product-market fit.

## Market evidence used

The category is now crowded with generic AI-visibility products, so Foremention should differentiate on evidence, reviewability, comparability, and decision support rather than dashboard breadth.

- Semrush AI Visibility starts at $99/month for one domain/25 tracked prompts and moves enterprise buyers toward multi-brand coverage, custom limits, API, SSO, governance, audit logs, SLA, and support.
- Scrunch Core is $250/month and Enterprise adds expanded model coverage, API/integrations, SSO, and dedicated support.
- Peec packages around prompt/model/project volume, with public tiers from roughly $95 to $495/month plus enterprise.
- G2's 2026 buyer research reports that AI chatbots now materially shape B2B software shortlists, while security review, budget approval, implementation proof, and transparent AI behavior dominate the evaluation stage.
- Stripe's current subscription guidance recommends hosted Checkout/customer portal plus verified asynchronous webhooks and stored customer/subscription state; product access should follow subscription/entitlement state rather than client-side checkout success alone.
- Supabase supports multi-tenant SAML SSO, but SSO connections must be genuinely configured and should never be represented as active merely because application code exists.

## Non-negotiable boundaries

- Do not change the homepage.
- Preserve the canonical primary IA exactly: **Attention → Questions → Records → Comparisons → Settings**.
- Preserve Recommendation Record as the canonical object.
- Evidence inspection stays contained inside the Recommendation Record; do not recreate Source X-Ray.
- Preserve evidence semantics: **Returned → Retrieved → Observed → Reviewed → Safe conclusion**.
- Preserve exact-comparability rules and human-review boundaries.
- Preserve current providers, cost controls, RLS, Inngest orchestration, exports, existing advanced routes, and tenant boundaries.
- Preserve canonical logo/mark assets unchanged.
- Public and authenticated surfaces stay black/graphite + registered green; no white/light panel drift.
- Do not fabricate customers, benchmarks, logos, contracts, prices paid, legal entity, jurisdiction, compliance certifications, or active integrations.
- A feature that needs an external account remains fail-closed until its server-side configuration is real.

## 1. Dashboard compression

### Decision

The global sidebar shows only the five canonical objects. Existing workspace/advanced routes are **not deleted**. They remain addressable and retain their engineering, but they move out of global navigation and become contextual destinations from the relevant canonical object or Settings.

### Context mapping

- Attention owns alerts, opportunities, unresolved items, and action follow-up entry points.
- Questions owns question intelligence and competitor-question context.
- Records owns Record share/export/evidence controls and links to evidence-specific supporting tools.
- Comparisons owns comparable change, outcomes, and decision-lab-style interpretation.
- Settings owns Team, Integrations, SSO, billing, monitoring, data controls, and advanced operations.

This preserves functionality while removing the 18-destination cognitive load.

## 2. Public-site pruning

### Decision

Keep core evergreen pages indexable and primary:

- `/`
- `/product`
- `/recommendation-intelligence`
- `/recommendation-record`
- `/methodology`
- `/insights`
- `/about`
- `/contact`
- `/privacy`
- `/terms`
- `/subprocessors`

Keep supporting/background pages reachable when already linked internally, but do not promote them as primary navigation objects or create more top-level marketing destinations. The sitemap should reflect only canonical evergreen/public-trust pages.

The footer is compressed into Product, Research/Company, Trust, and Access. Marketing copy should lead with the product value and evidence model; beta/commercial caveats remain visible but secondary.

## 3. Design-partner conversion

### Decision

Replace vague private-beta positioning with a concrete founder-led design-partner program while keeping free workspace access truthful.

The contact page becomes the primary conversion surface with two paths:

- **Request a working-session demo** — bring category + buyer questions + current recommendation problem.
- **Apply as a design partner** — a small scoped program for teams willing to complete a baseline, review a Recommendation Record, take one action, and return for a comparable cycle.

No fake scarcity, customer count, or logos. The program promise is operational rather than promotional:

1. define 5 priority buyer questions;
2. establish baseline Recommendation Records;
3. review evidence and choose one action;
4. remeasure after a comparable interval;
5. decide whether the workflow is valuable enough to continue commercially.

Signup copy should describe access as a design-partner/private-beta workspace, not a generic free SaaS trial.

## 4. Commercial packaging and billing readiness

### Packaging decision

Use category-standard packaging dimensions—questions, measurement frequency, brands/projects, team/governance, integrations—while positioning Foremention above commodity visibility tracking because of evidence review and Recommendation Records.

Public pricing should not invent finalized monetary prices before commercial validation. Instead:

- **Core** — establish the record; one brand/category; 25 buyer questions; monthly measurement; Record/evidence/export.
- **Signal** — review what changed; up to three workspaces/brands; 100 buyer questions; weekly measurement; comparisons/review/team workflow.
- **Intelligence** — enterprise/custom; multi-brand, custom limits, API/webhooks, SSO, governance, advanced reporting.

The page leads with value and packaging, not with "pricing is not final". A compact commercial-status disclosure states that design-partner pricing is founder-led and self-serve paid checkout is not active until the billing provider is configured.

### Billing implementation boundary

The existing provider-agnostic verified billing event boundary remains the source of entitlement state. Add a Stripe-compatible adapter only behind explicit server variables if the dependency footprint remains acceptable; otherwise document and expose configuration readiness without pretending checkout is active.

Minimum safe production lifecycle when configured:

- hosted checkout session created server-side;
- signed webhook verification;
- subscription/customer identifiers persisted server-side;
- entitlement changes driven by webhook state;
- failed payments pause paid entitlements according to the existing lifecycle mapping;
- customer portal session available to active customers;
- no secret values exposed client-side.

If Stripe secrets/prices are absent, CTAs fall back to founder-led demo/design-partner contact and no paid action is presented as available.

## 5. Trust/legal readiness

### Decision

Create one coherent Trust/Enterprise-readiness surface through existing public trust pages and Settings rather than inventing compliance claims.

Public trust language should clearly state what is true now:

- tenant-scoped data controls;
- human review boundary;
- provider/subprocessor transparency;
- export/deletion controls;
- signed webhook and secret-handling boundaries;
- exact release/security testing where appropriate without claiming certification;
- SSO available only when an enterprise connection is configured.

Still absent and therefore explicitly not claimed:

- SOC 2 certification/report;
- ISO certification;
- invented legal entity/jurisdiction;
- contractual SLA unless separately signed;
- automatic SCIM unless actually configured;
- Sentry as active unless `SENTRY_DSN` is genuinely configured.

## 6. Activation and customer proof

### Decision

Foremention must measure whether real teams complete the core retention loop rather than measuring vanity pageviews.

Canonical activation stages:

1. workspace configured;
2. five approved buyer questions;
3. first live run completed;
4. first Recommendation Record reviewed;
5. first action created/owned;
6. second comparable cycle completed.

Expose the current activation stage to the customer in Attention/onboarding and capture privacy-safe internal analytics using stable internal identifiers only. Do not send raw emails, prompt text, provider answers, or evidence text into product analytics.

The product should visibly encourage the next missing step, not expose more tools.

## Error handling

- External billing/SSO/email/integration actions fail closed and explain the missing configuration.
- Existing advanced routes remain functional if directly accessed or reached contextually.
- No destructive migration is required for navigation/public-site compression.
- Commercial status is derived from configuration and entitlement state, not hard-coded claims.
- If no eligible comparison exists, Comparisons continues to say so explicitly.
- If no real customer cohort exists, benchmark surfaces remain unavailable rather than synthetic.

## Testing and release gates

Add contract tests for:

- sidebar contains exactly five canonical global destinations and no Advanced/global workspace navigation;
- legacy advanced routes remain present in the repository;
- public header remains Product / Methodology / Research + Sign in / Request demo;
- sitemap contains only the canonical evergreen/public-trust route set;
- pricing leads with package value and retains explicit no-live-checkout truth boundary;
- contact/design-partner copy contains the measurable 5-question → Record → action → comparable-cycle loop;
- signup retains no-charge truth while reducing beta-first framing;
- Settings remains the contextual home for Team/Integrations/SSO/Billing;
- no fabricated prices, customers, compliance claims, or legal-entity facts are introduced;
- homepage file is byte-identical to the base commit.

Then require the existing full release chain: migrations, tests, lint, typecheck, build, Worker dry-run, Browser Acceptance, Security, CodeQL, AI Safety/Code Health, exact-production SHA verification, Inngest probe, and authenticated first-evidence canary after merge.

## Success criteria

A first-time evaluator should be able to understand Foremention in under one minute and use the signed-in product without navigating an internal architecture diagram:

**Questions → Recommendation Records → Attention → comparable change → action/next cycle.**

The product remains technically deep, but the customer sees five objects, one evidence standard, one primary conversion path, and truthful commercial/trust boundaries.