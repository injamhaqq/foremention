# Foremention — Evidence Standard Production Design

Date: 2026-08-25
Base main SHA: `f0f15850dabe434c2e5dbd377e329e3795f30ec7`
Status: approved architecture, implementation not started
Identity winner: **The Evidence Standard**

## 1. Purpose

This specification converts Foremention from the current mint/jade, Space Grotesk-led presentation into the approved **Evidence Standard** identity without rebuilding or weakening the already-verified product, evidence-integrity, security, auth, analytics, provider, or organization-isolation architecture.

The goal is not a cosmetic reskin. The goal is to make the public site, signup/onboarding, signed-in product, Source X-Ray, Decision Lab, Outcome Ledger, reports, social surfaces, and motion system feel like one category-defining recommendation-intelligence product.

The business order is:

1. strengthen customer comprehension and trust;
2. improve fundraising credibility by making the real product and category distinction legible;
3. increase activation and repeatable customer proof;
4. preserve long-term category ownership around inspectable recommendation evidence.

## 2. Locked decisions

The following decisions are not reopened by implementation:

- The approved Foremention symbol/logo is locked.
- The approved `FOREMENTION` wordmark is locked.
- The identity winner is **The Evidence Standard**.
- Category: **Recommendation intelligence for B2B SaaS**.
- Brand principle: **EVIDENCE BEFORE THEATRE**.
- TRACE / Editorial Evidence Choreography remains the information-design logic.
- Source X-Ray remains a signature product experience.
- Running Numbers, references, runs, review states, Decision Gate, and the honesty marks remain core Foremention primitives.
- Public marketing remains light-primary.
- Evidence color is semantic, not decorative.
- No generic AI gradients, particles, glowing orbs, neural networks, floating browsers, 3D blobs, or motion used only for spectacle.
- Commercial truth remains private beta until verified otherwise. Workspace creation must not imply a card charge or live paid entitlement.

## 3. Canonical truth hierarchy

When design ideas conflict with reality, resolve them in this order:

1. current production code and verified runtime behavior;
2. explicit user locks and approved Foremention decisions;
3. verified Foremention docs and data-model constraints;
4. current database/evidence semantics;
5. current live public behavior;
6. external research and competitor references;
7. inference.

No visual treatment may redefine a product fact.

## 4. Verified current architecture

The project is an existing production application, not a greenfield build.

Verified stack on `main`:

- Next.js 16.2.12
- React 19.2.8
- TypeScript 5.9.3
- Vinext/Vite for Cloudflare runtime
- Supabase authentication and organization-scoped data access
- Inngest orchestration
- privacy-hardened PostHog product analytics
- multiple AI provider adapters and explicit cost boundaries

Verified existing product areas include:

- public website
- pricing/methodology/honesty/trust surfaces
- email/password signup and login
- optional Google auth when configured
- email confirmation continuation
- forgot/reset password
- guided workspace onboarding
- prompts/questions
- runs/AI results
- sources and Source Map
- competitors
- evidence
- analytics
- Decision Lab
- Outcome Ledger
- opportunities/resolutions/actions
- product analytics
- demo mode

Implementation must reuse these real flows rather than replacing them with disconnected mockups.

## 5. Brand-asset truth gate

The repository currently contains multiple brand-related assets and legacy coded marks:

- `public/foremention-wordmark.png`
- `public/source-eclipse.svg`
- `app/icon.svg`
- `components/brand.tsx` with `SourceEclipseMark` and a text-rendered lowercase `foremention`

The existence of an asset does not automatically make it canonical.

### Implementation rule

Before changing the production lockup:

1. visually inspect `public/foremention-wordmark.png`;
2. compare it with the user-approved locked logo/wordmark reference available in project history/assets;
3. if it matches exactly, use that asset unchanged and derive size/clear-space behavior around it;
4. if it does not match and the older canonical Figma source remains inaccessible, keep the production lockup unchanged until the exact approved asset is supplied or recovered;
5. never redraw, trace, approximate, regenerate, or “modernize” the locked mark.

`SourceEclipseMark` and `app/icon.svg` are treated as legacy implementation candidates, not as automatically canonical identity sources.

## 6. Identity system

### 6.1 Core thesis

**Make the recommendation record feel definitive.**

Foremention should feel like a decision-intelligence instrument with editorial authority, not an editorial publication pretending to be software and not a generic analytics dashboard with a premium font.

Desired emotional mix:

- authority
- intelligence
- precision
- consequence
- controlled curiosity

### 6.2 Working color system

These values are the approved Evidence Standard starting system for implementation and visual QA. They may be tuned only when accessibility or visual testing demonstrates a concrete failure.

- `--fm-paper: #F7F5EF`
- `--fm-surface: #FCFBF7`
- `--fm-ink: #10110F`
- `--fm-graphite: #3F403B`
- `--fm-muted: #6E7068`
- `--fm-rule: #D8D5CC`
- `--fm-evidence: #879A4A`
- `--fm-evidence-wash: #E2E6CF`
- `--fm-evidence-deep: #4D5837`

Supporting product-state colors are separate from the Marker:

- attention: deep ochre on pale ochre
- destructive/error: dark oxide red on pale oxide red
- informational/system: desaturated blue-gray on pale blue-gray

The exact supporting values should be selected for WCAG AA and must not compete visually with the evidence Marker.

### 6.3 Marker rule

`--fm-evidence` / Marker is allowed only when the UI can answer: **which evidence record or evidence-linked state does this color refer to?**

Allowed examples:

- returned citation/reference
- retrievable source record
- selected evidence
- evidence-linked review state
- exact comparable relationship
- active Source X-Ray evidence layer

Disallowed examples:

- primary CTA
- navigation hover
- generic card accent
- pricing emphasis
- decorative underline
- random section divider
- generic “success” state
- hero background

### 6.4 Typography

Canonical families remain:

- Signifier — display/editorial authority
- Untitled Sans — interface/body/navigation
- Söhne Mono — references, runs, evidence IDs, metadata

If licensed files are not available in the repository/build environment, implementation must use explicitly labeled temporary fallbacks and must not silently redefine the canonical identity.

Fallback order:

- display: a metrically restrained serif available in the build environment
- UI/body: Inter or system sans
- mono: IBM Plex Mono, Roboto Mono, or system monospace

The final production lock requires a legal/available font-delivery path or an explicit user-approved fallback decision.

## 7. Signature primitives

The visual system is organized around reusable semantic primitives rather than decorative motifs.

### The Record

The primary evidence object containing the exact question, provider, answer, returned reference, source, review state, run, and comparison boundary.

### The Running Number

Examples:

- `01 / QUESTION`
- `02 / ANSWER`
- `03 / SOURCE`
- `04 / REVIEW`
- `05 / DECISION`
- `06 / COMPARE`

### The Reference

Examples:

- `[03]`
- `SOURCE / 03`
- `EVIDENCE / 03.2`
- `RUN / 2407`

### The Honesty Marks

- `— NOT OBSERVED`
- `≠ NOT COMPARABLE`
- `± INSUFFICIENT EVIDENCE`

These must remain understandable without color, hover, or animation.

### The Gate

Decision readiness presented as explicit checks rather than a composite score.

### The Trace

A visible relationship between question, answer, returned reference, source, review, decision, and later comparable measurement.

## 8. Layout grammar

The visual language uses:

- strong typographic hierarchy
- editorial white space
- thin meaningful rules
- visible references and metadata
- asymmetric but disciplined compositions
- dense product information when the workflow needs density
- restrained surfaces rather than universal card grids
- flat, durable geometry over large radii and floating SaaS cards

### Public 1440 layout

- 12-column grid
- approximate outer margin 64–72 px
- 24 px gutters
- hero proposition first; evidence specimen right or lower-right
- no giant decorative browser mockup

### 768 layout

- 8-column recomposition
- proposition/CTA before evidence specimen
- Source X-Ray becomes a readable vertical evidence sequence where necessary
- no hover-dependent explanation

### 375–430 layout

Mobile is recomposed, never desktop scaled down.

Preferred transcript order:

1. category kicker
2. headline
3. body
4. primary CTA
5. `01 / QUESTION`
6. `02 / ANSWER`
7. `[03]` reference
8. `SOURCE / 03`
9. review state
10. honesty/comparison state

No horizontal overflow, tiny metadata, or desktop evidence table squeezed into mobile.

## 9. Public information architecture

Public navigation is intentionally small:

- Product
- Evidence
- Method
- Insights
- Sign in
- Create workspace

Pricing remains available but must not dominate while paid checkout is inactive.

### Required public routes

Existing routes should be consolidated/refined around this model rather than multiplied unnecessarily:

- `/` — homepage / category story
- `/product` or existing equivalent — product architecture
- `/source-xray` or a deep public Source X-Ray section/route
- `/methodology` — measurement standard
- `/pricing` — private-beta packaging truth
- `/insights` — research/resources where content exists
- `/about` — company/category narrative if useful
- `/contact` — demo/contact
- `/login`
- `/signup`
- privacy/terms/security/honesty routes already required by production

Do not create empty marketing routes simply to make the company appear larger.

## 10. Homepage design

### 10.1 CMO eight-second goal

Within roughly eight seconds the homepage should communicate:

- Foremention is recommendation intelligence for B2B SaaS;
- it records buyer questions and AI answers;
- it preserves returned evidence/sources;
- competitor presence is inspectable;
- results are dated records;
- evidence can be reviewed before decisions are made;
- a workspace can be created without a card charge.

### 10.2 Hero

Working copy:

Kicker: `Recommendation intelligence for B2B SaaS`

H1: `See what AI recommends. Inspect the evidence behind the record.`

Body: `Run the buyer questions that matter, record which brands appear, preserve returned citation URLs when providers supply them, review the evidence, and compare equivalent runs over time.`

Primary: `Create workspace →`

Secondary: `Inspect the evidence`

Disclosure: `Private beta · Creating a workspace does not charge a card. Collection capacity is activated separately.`

Hero visual: an **illustrative product interface** using a recommendation record, not customer data and not fake production metrics.

### 10.3 Narrative rhythm

1. Recommendation Record — what Foremention records
2. Source X-Ray — what evidence was returned with the answer
3. Honesty States — what is observed, incomparable, or insufficient
4. Competitor Evidence — exact observation without leaderboard theatre
5. Decision Gate — explicit evidence checks
6. Later Measurement — valid comparison vs `≠` / `±`
7. Create Workspace — quiet decisive close

The page rhythm alternates open editorial sections with denser evidence sections. Avoid card-card-card-pricing-logo-wall-FAQ sameness.

## 11. Source X-Ray

Source X-Ray is the signature public and signed-in experience.

The visible chain is:

Question → Observed Answer → Recommendation → Returned Reference → Distinct Source → Retrievability → Review → Evidence → Decision Implication

Optional later layers:

Human Review → Decision → Later Measurement

### Causal language rule

Do not say `What shaped the answer?` unless causal evidence exists.

Preferred language:

- `What sources were returned?`
- `What evidence came with the answer?`
- `Inspect the evidence behind the record.`

A returned URL proves an observable answer↔returned-source relationship. It does not prove that source caused the model answer.

### Interaction

The current accessible pointer/keyboard inspection lens may be retained as one interaction mode, but the redesign should make the underlying evidence sequence understandable with motion disabled and without user interaction.

## 12. Signup and authentication

Preserve existing secure behavior:

- full name/email/password signup
- 12+ character signup password policy with mixed character classes
- confirmation matching
- breached-password safety check
- email confirmation handling
- duplicate-account guidance
- forgot/reset password
- safe `next` continuation
- Google auth only when actually configured
- Supabase session and server-side auth boundaries

### Design goal

Signup should feel like entering an intelligence workspace, not a growth funnel.

Structure:

- exact locked lockup
- one concise value statement
- form
- clear password guidance
- confirmation/error states
- no fake testimonials or logos
- no distracting 3D

The design must preserve live-region and error semantics.

## 13. Onboarding

Keep the existing product truth and public-check handoff behavior.

Activation sequence:

1. identify company/site
2. establish category/market
3. confirm competitors
4. approve buyer questions
5. confirm provider/collection readiness
6. run first controlled collection
7. inspect first returned evidence
8. complete first human review
9. reach first decision-relevant insight

Do not add steps that do not improve activation.

The Evidence Standard visual treatment should make setup feel like creating a measurement record rather than filling a generic wizard.

## 14. Signed-in product information architecture

The existing product surface is retained, but the navigation and hierarchy should be simplified around the evidence workflow.

Primary workspace areas:

- Overview
- Questions
- Runs / AI Results
- Source X-Ray / Sources
- Competitors
- Evidence
- Decision Lab
- Outcome Ledger
- Actions / Resolutions / Opportunities
- Analytics / Intelligence where supported
- Settings

Secondary/advanced areas remain available when real but should not crowd the primary operator path.

## 15. Overview dashboard

The overview is not a KPI wall.

Priority order:

1. current workspace/evidence state
2. latest recommendation record
3. newest run status, including failed/running visibility
4. evidence requiring review
5. exact comparable movement, if valid
6. competitor observations
7. next justified action
8. product-truth explanation for displayed metrics

Large isolated vanity metrics must not dominate the page.

The existing product-truth panel remains conceptually important and should be visually integrated rather than hidden.

## 16. Decision Lab

Preserve the verified evidence-readiness model already in code.

Required checks remain explicit:

- collection coverage
- provider agreement
- source review
- source concentration
- exact repeatability

Readiness states:

- `DECISION-READY`
- `DIRECTIONAL ONLY`
- `INSUFFICIENT EVIDENCE`

No composite score may replace the checks.

The current decorative orbit treatment should be re-evaluated. If it survives, it must clarify relationships rather than act as atmospheric motion. The default Evidence Standard presentation should favor a structured gate/record over a generic circular dashboard visualization.

## 17. Outcome Ledger

Preserve the current causal boundary:

baseline → approved solution asset → applied location → comparable follow-up measurement → observed before/after association

Never imply the asset caused a later answer change unless causal evidence exists.

The visual treatment should resemble a dated chain of accountable records, not an ROI dashboard.

## 18. Evidence and competitor surfaces

### Evidence

Make the separation explicit between:

- collected provider evidence
- human-reviewed source evidence
- manually supplied company-claim evidence

Verification dates, owners, limitations, and rights should remain visible where they already exist.

### Competitors

Avoid leaderboards as the dominant metaphor.

Show:

- exact buyer question
- observed competitor presence
- provider/run context
- returned reference/source
- review state
- comparability state
- causal boundary

## 19. Motion system — TRACE Motion

Motion personality:

- measured
- forensic
- sequential
- exact
- editorial

### Motion hierarchy

Primary explanatory sequence:

Question establishes → Answer resolves → Reference appears → Source attaches → Review locks → Decision becomes available → Later comparison opens

### Timing classes

- micro feedback: 120–180 ms
- local state transition: 180–260 ms
- explanatory evidence transition: 320–520 ms
- page/section transition: only when it improves orientation; otherwise no transition

Use CSS transforms/opacity and lightweight SVG where possible.

### Reduced motion

With `prefers-reduced-motion: reduce`, all evidence relationships must be visible immediately. No information is revealed only through animation.

## 20. 3D / spatial system

3D is optional, not a brand requirement.

Allowed only when a prototype demonstrates clearer evidence comprehension or materially stronger stopping power without harming performance/accessibility.

Potentially valid uses:

- a shallow layered evidence stack
- spatial separation between answer and evidence layers
- perspective transition between record → source → review

Rejected uses:

- glowing orbs
- galaxies
- particles
- decorative node networks
- floating cubes/cards
- shader-heavy scenes
- 3D that disappears on mobile and removes meaning

Default implementation is high-quality 2D information design.

## 21. Component architecture

Create or consolidate reusable semantic components rather than styling every route independently.

Expected primitives:

- `BrandLockup`
- `RunningNumber`
- `ReferenceId`
- `EvidenceMarker`
- `EvidenceRecord`
- `SourceRecord`
- `ReviewState`
- `HonestyState`
- `RunRecord`
- `DecisionGate`
- `DecisionGateRow`
- `ComparableState`
- `SourceXRay`
- `TraceSequence`
- `EvidenceDisclosure`
- `MethodBoundary`

Existing business/data components should be composed into these primitives where practical instead of rewritten.

## 22. CSS / token migration strategy

The current `app/globals.css` is very large and embeds the legacy mint/jade identity throughout public and product styles. Do not perform a blind global find/replace.

Migration strategy:

1. introduce a dedicated Evidence Standard token layer;
2. create semantic aliases used by new/reworked components;
3. update shared shells/brand/navigation/buttons first;
4. migrate public routes;
5. migrate auth/onboarding;
6. migrate signed-in shell and high-value surfaces;
7. remove legacy identity selectors only after their consumers are migrated and tests/screenshots prove equivalence;
8. keep legacy functionality styles that are not identity-sensitive until touched by a scoped migration.

Avoid growing `globals.css` indefinitely. New complex route-specific styling should use scoped modules or focused stylesheets.

## 23. Analytics and privacy

Preserve the existing hardened analytics contract.

Do not add raw:

- email
- personal names
- prompt text
- answer text
- citation URLs
- source content
- arbitrary error messages
- stack traces
- nested customer content

Design work may add only approved low-cardinality interaction events needed to measure activation/conversion, and only through the existing centralized analytics boundary.

## 24. Accessibility

Target WCAG 2.2 AA.

Required verification:

- text/background contrast
- Marker contrast in every text/non-text use
- focus visibility
- keyboard navigation
- Source X-Ray keyboard path
- form labels/errors/live regions
- 44px touch targets where appropriate
- reduced motion
- no color-only state meaning
- honesty marks readable without symbol knowledge alone
- 200% zoom
- 320px viewport
- headings/landmarks
- screen-reader descriptions for evidence relationships where visual layout carries structure

## 25. Performance

The redesign must not trade trust for visual weight.

Rules:

- no autoplay background video
- no mandatory WebGL
- no huge image sequences
- no page-level animation dependency
- prefer semantic HTML/CSS/SVG
- lazy-load non-critical interactive visualizations
- preserve server rendering where appropriate
- avoid unnecessary client components
- preserve existing Cloudflare/Vinext runtime constraints

Any 3D prototype that materially worsens Core Web Vitals or mobile interaction is removed.

## 26. SEO and public semantics

Preserve/upgrade:

- route metadata
- canonical URLs
- sitemap/robots
- structured data where truthful
- Open Graph/Twitter images
- descriptive headings
- internal links
- crawlable product/method explanation

Do not generate large numbers of thin “AI visibility” pages.

## 27. Commercial truth

Until billing is genuinely activated:

- no paid checkout CTA
- no fake trial countdown
- no `14-day trial` unless verified
- no final prices unless verified
- no payment-method collection
- no fake enterprise logos/testimonials

Approved current language can include:

- private beta
- workspace creation without card charge
- package scopes under validation
- collection capacity activated separately

## 28. Engineering boundaries

This redesign must not weaken:

- Supabase RLS
- organization isolation
- auth/session boundaries
- service-role/server-only RPC boundaries
- provider cost ceilings
- citation/evidence eligibility
- exact-run comparability
- review provenance
- analytics privacy
- demo isolation
- idempotency/background job semantics

Design changes must adapt to these boundaries, not bypass them.

## 29. Implementation decomposition

The work is too large for one undifferentiated change. Implement in controlled subprojects on stacked or sequential branches/PRs.

### Subproject 1 — Evidence Standard foundation

- exact brand asset verification
- token layer
- font delivery/fallback decision
- lockup component
- shared buttons/links/labels
- Running Number / Reference / Marker / Honesty primitives
- shared public/product shell foundation
- reduced-motion baseline

### Subproject 2 — Public site

- homepage
- public navigation/footer
- Source X-Ray public experience
- methodology/evidence/product/pricing hierarchy
- mobile public experience
- public SEO/social assets

### Subproject 3 — Auth and onboarding

- login/signup/forgot/reset visual migration
- account confirmation states
- onboarding measurement-record treatment
- activation clarity

### Subproject 4 — Signed-in core

- product shell/navigation
- Overview
- Questions
- Runs/results
- Sources/Source X-Ray
- Competitors
- Evidence

### Subproject 5 — Decision system

- Decision Lab
- Outcome Ledger
- opportunities/resolutions/actions
- analytics/intelligence hierarchy

### Subproject 6 — Motion, QA, release

- TRACE Motion polish
- optional spatial prototype only if justified
- desktop/tablet/mobile visual QA
- accessibility
- performance
- browser acceptance
- exact-SHA deployment/production acceptance

Each subproject must preserve a runnable product and pass the repository's existing checks before merge.

## 30. Testing strategy

For every implementation PR:

- existing unit/contract tests
- TypeScript typecheck
- lint
- production build
- Cloudflare/Vinext dry run if part of repository CI
- security/CodeQL/AI code health where configured
- route/browser acceptance
- responsive screenshots for touched high-value routes
- accessibility checks

Add targeted regression coverage for:

- locked commercial wording where required
- Evidence Standard semantic state rendering
- reduced-motion behavior for new animated components
- auth behavior not changing during visual migration
- exact evidence/comparability logic not changing during Decision Lab redesign
- no raw customer content added to analytics

## 31. Visual QA matrix

Capture and inspect at minimum:

- homepage: 1440, 768, 390/375
- signup
- login
- onboarding
- overview with no data
- overview with reviewed baseline
- overview with newer failed/running collection
- Source X-Ray
- run detail
- competitor evidence
- evidence page
- Decision Lab: insufficient, directional, ready
- Outcome Ledger: empty, pending-migration, populated/comparable
- pricing/methodology

Run these qualitative tests:

- logo-off recognizability
- competitor-swap resistance
- effects-off comprehension
- CMO eight-second test
- operator-depth test
- boardroom/fundraising credibility
- screenshot/PDF survival
- mobile recomposition

## 32. Release policy

Do not merge or deploy a large visual change based only on screenshots.

Release evidence must include:

- exact branch/head SHA
- required CI green
- production build success
- deployment exact-SHA verification
- public browser acceptance
- auth-boundary acceptance
- seeded-demo acceptance
- authenticated core-flow acceptance where safe
- accessibility and responsive smoke checks
- no new console/network errors

Production is not declared complete until the deployed SHA and real live behavior are proven.

## 33. Acceptance criteria

The Evidence Standard redesign is successful when all of the following are true:

1. the locked logo and wordmark are preserved exactly;
2. the old mint/jade identity no longer controls the public/product visual language;
3. Foremention is understandable as recommendation intelligence, not generic GEO/AEO monitoring;
4. Source X-Ray visibly differentiates answer observation from returned evidence and later analysis;
5. Marker usage is evidence-semantic rather than decorative;
6. Running Numbers/references/honesty states work across website and product;
7. signup/onboarding remain secure and functionally unchanged while visually integrated;
8. Overview prioritizes record/review/decision state over vanity KPIs;
9. Decision Lab preserves its exact evidence gate and does not introduce a composite score;
10. Outcome Ledger preserves causal restraint;
11. mobile is recomposed and fully readable;
12. reduced-motion mode preserves all meaning;
13. accessibility remains WCAG 2.2 AA-targeted;
14. analytics privacy rules remain intact;
15. current security/RLS/provider-cost/evidence-integrity boundaries remain intact;
16. production deployment is proven on the exact release SHA;
17. the result passes the logo-off, competitor-swap, CMO, operator, effects-off, and 10-year durability tests at implementation review.

## 34. Explicit non-goals

This redesign does not automatically include:

- changing pricing
- activating billing
- adding unsupported providers
- changing database evidence semantics
- changing RLS policy
- creating fake customer proof
- inventing traction
- rebuilding auth architecture
- redesigning the locked logo/wordmark
- adding 3D for spectacle
- replacing every legacy route in one risky merge

## 35. Final implementation decision

Proceed with a **controlled Evidence Standard retrofit over the existing architecture**. Preserve the production data/security/evidence core, replace the legacy visual identity in ordered layers, and use real product surfaces as the primary design material.

Implementation begins only after this spec is reviewed and approved. The next step after approval is a detailed implementation plan using the repository's current branch/PR workflow and test gates.
