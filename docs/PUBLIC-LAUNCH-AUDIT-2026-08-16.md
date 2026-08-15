# Foremention public-launch product audit — 2026-08-16

## Audit baseline

- Repository: `injamhaqq/foremention`
- Production: `https://foremention.com`
- Audited canonical `main`: `12b256dba80ae32d5f8c7c3bef859e8167e1b1e2`
- Production release at audit start: GREEN from exact-release CI, trusted Browser Acceptance/Lighthouse, security checks, and authenticated first-evidence canary.
- Cloudflare build at audit start: `f4e82448-8fd3-419e-9fc4-0881b022f6d5`
- Worker version at audit start: `6b7d85c9-c12f-446a-a64c-2ef74e3c707d`
- Current browser artifact on that release had no public/authenticated console errors, page errors, same-origin failed responses, or acceptance failures.
- Current Lighthouse baseline on audited public pages is technically healthy but not elite for speed: roughly 0.84–0.86 Performance with ~3.3–3.4s LCP; accessibility is 1.00 on the audited surfaces.

This audit does not treat a technically green release as a launch-ready marketing experience. It evaluates product truth, information architecture, mobile quality, conversion, trust, accessibility, performance, SEO, engineering quality, and commercial readiness separately.

## Route inventory

### Primary public / marketing / trust

`/`, `/product`, `/pricing`, `/source-map`, `/roi`, `/methodology`, `/honesty`, `/teardowns`, `/about`, `/contact`, `/source-gap`, `/privacy`, `/subprocessors`, `/terms`, `/monitoring-vs-execution`, `/insights`, `/insights/ai-visibility-measurement`, `/insights/seo-geo-technical-checklist`, `/compare/monitoring-tools`, `/compare/geo-agencies`, `/compare/pr-agencies`.

### Public tools / demos / account surfaces

`/score`, `/prompt-check`, `/sample-report`, `/report/[domain]`, `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/invite/[token]`, `/auth/callback`, `/unsubscribe`, `/api-docs/webhooks`, plus global 404/error/loading states.

### Authenticated workspace

`/app`, `/app/onboarding`, `/app/prompts`, `/app/runs`, `/app/runs/[id]`, `/app/runs/compare`, `/app/source-map`, `/app/sources/[id]`, `/app/competitors`, `/app/opportunities`, `/app/placements`, `/app/analytics`, `/app/alerts`, `/app/team`, `/app/search`, `/app/settings`, `/app/resolutions`, `/app/outcomes`, `/app/passport`, `/app/intelligence`, `/app/agents`, `/app/decision-lab`, `/app/evidence`, plus loading/error states.

## What is already strong — KEEP

1. Evidence semantics remain unusually disciplined: provider output, returned citations, page observations, inference, human review, and later comparison are explicitly separated.
2. Fictional sample/demo content is labelled and isolated; verified social proof renders only when its source-of-truth is ready.
3. Public/authenticated Browser Acceptance already covers multiple browsers and mobile/desktop with strong axe results.
4. Private-beta commercial copy repeatedly states that workspace signup is not paid checkout.
5. Methodology and Standards/Honesty pages are substantively strong and should carry the deep evidence/truth explanation rather than having every sales page repeat it.
6. Optional Clarity/Contentsquare experience analytics are privacy-off by default and load only after explicit browser consent.
7. PostHog is separately constrained: no autocapture/session recording/forms/provider answers/citations/customer evidence and coarse event-property sanitization.
8. `/subprocessors` is useful B2B trust infrastructure and should stay.
9. Auth/account/private workspace surfaces are intentionally no-indexed.
10. The public sample report is explicitly fictional and no-indexed.

## Issue register

### P0 — usage/security/truth blocker

**A01 — Search structured data publishes paid offers that cannot actually be purchased.**

`app/layout.tsx` emits `SoftwareApplication.offers` for Core `$149` and Signal `$499`, while `/pricing` correctly says those are planned packaging and checkout/entitlements are not active. Human-facing copy is truthful, but machine-readable search data is not aligned with the commercial boundary. Remove paid `offers` until a verified paid lifecycle exists.

### P1 — materially damages conversion, trust, or mobile experience

**A02 — Pricing leads with internal beta mechanics instead of customer value.** The first screen explains activation boundaries before the buyer understands the result they are paying for.

**A03 — Pricing includes a stale/misaligned vendor-price table.** The page says it was checked on August 9, uses a stale Scrunch domain/source and compares Profound Growth rather than its current entry tier. Category pricing is changing quickly, so this table is costly to keep decision-grade.

**A04 — Competitor pricing distracts the primary purchase journey.** Even if sourced correctly, a full vendor table sends high-intent buyers into competitors before Foremention has completed its own value argument.

**A05 — `/source-map` mixes two different jobs.** It starts as a dated self-audit of Foremention.com, then becomes a four-company market-evidence page. This breaks information scent and creates the mobile section the founder flagged.

**A06 — “Live Source Map” overstates freshness of a July 27 snapshot.** The collection date is disclosed, so the data is not hidden; the naming should nevertheless say dated/public audit rather than imply continuous freshness.

**A07 — Recommendation Monitor has a deterministic mobile label/value collision.** `Evidence layer` and `Trace the conclusion…` render inline because the intro `strong` lacks the block rule used by evidence cards.

**A08 — Recommendation Monitor is too dense on mobile.** It is technically responsive, but a desktop-like record + evidence stack dominates a phone viewport before the customer understands the core value.

**A09 — Footer information architecture is too large and incorrectly grouped.** Legal/privacy/subprocessor controls sit under Company, while Product contains many secondary links and auth actions.

**A10 — “Analytics preferences” is semantically ambiguous.** The footer control governs optional Clarity/Contentsquare only; limited PostHog product/web analytics are a separate disclosed system. The UI should say “Optional analytics settings” or equivalent so visitors do not think the toggle controls every analytics class.

**A11 — The expanded optional-analytics control is oversized on mobile.** A long explanatory paragraph plus two full-width buttons turns a footer preference into a large conversion-dead section.

**A12 — Homepage repeats evidence/trust mechanics too many times.** Evidence chain, Source X-Ray, learn cards, difference cards, workflow cards, trust band, FAQ, and final CTA repeatedly explain adjacent versions of the same idea. The page is honest but too defensive and long.

**A13 — Product page leads with eight internal system names before buyer outcomes.** Source X-Ray/Map are understandable differentiators, but names such as Evidence Vault + Claim Integrity Ledger, Action Graph, Agent Control Plane and Intelligence Loop make the public page feel like architecture documentation.

**A14 — Generic comparison pages make broad uncited “usually/varies” claims.** Statements such as “usually limited” or “usually no” are not decision-grade without a named/detailed comparison set. Reframe around operating-model differences or attach dated sources.

**A15 — High-intent free tools are nearly orphaned.** `/score` and `/prompt-check` are indexable and tested, but they are omitted from the sitemap and have no meaningful place in public navigation/links. Acquisition surfaces should be discoverable or intentionally no-indexed; the current state is neither.

**A16 — Pricing value is not yet strong enough for the planned capacities.** Current category entry pricing includes materially lower self-serve offers. Foremention can still justify premium pricing through evidence integrity, but the public page currently asks buyers to decode “monthly collection capacity” and product internals rather than the business result. This is a positioning problem, not evidence that the price must automatically be cut.

### P2 — meaningful polish/product-quality issue

**A17 — Sitemap `lastModified` is hard-coded to one date for every route.** It will age without representing actual route freshness.

**A18 — The same July 27 self-audit is reused as “live proof” across Source Map, Insights and Teardowns.** One strong proof asset is being stretched across too many pages.

**A19 — Teardowns says “A track record” while only one live public teardown is presented.** Use “method” or “standard” until multiple reproducible teardowns exist.

**A20 — About headline “Be the first mention” creates a promise tension.** It is memorable, but can be read as a ranking/outcome promise next to explicit no-ranking guarantees.

**A21 — Visible “Standards” uses the canonical URL `/honesty`.** The label is better than the old path. Future SEO/IA cleanup should create a stable `/standards` canonical/redirect strategy rather than leaving terminology split indefinitely.

**A22 — Public Source Map is a product term in primary navigation before its value is understood.** The navigation asks new visitors to understand an internal noun too early.

**A23 — Homepage duplicates the full three-plan pricing story and the pricing page.** This increases length and repeats planned-commercial caveats. The homepage should tease plan fit, not repeat the entire packaging story.

**A24 — Source Gap Check promises a reviewed output but the live API is an intake queue.** The flow is not fake—the request is stored for human follow-up—but the page should make turnaround/manual-review expectations clearer.

**A25 — Workspace navigation exposes 19 destinations.** Advanced disclosure helps desktop, but mobile still inherits a large taxonomy. This is usable today but carries onboarding/cognitive debt.

**A26 — Global CSS is a 200KB+ monolith plus additional polish/a11y stylesheets.** This is maintainability/performance debt; do not refactor it wholesale without measured benefit.

**A27 — Google Fonts are imported through CSS while the root layout also preconnects.** The audited public pages still show ~3.3–3.4s LCP. Font delivery is one candidate for a later measured performance PR, not a guessed quick fix.

**A28 — Insights is promoted in primary navigation with only two articles.** The content is useful, but the library currently looks thinner than its navigation prominence implies.

**A29 — Comparison content has no `/compare` hub.** Three indexed comparison routes exist, but no clear research/comparison index ties them together or provides dated methodology/source boundaries.

**A30 — `/source-map` heading/content density is excessive on small screens.** Large market-evidence cards and long evidence-boundary copy create unnecessary scroll even after overflow is prevented.

**A31 — Public pricing/mobile card density is excessive.** The current vertical rhythm makes planned packaging look heavier and more enterprise-complex than the private-beta product needs.

**A32 — Site voice often explains limitations before desire.** Truthful limits are a differentiator, but they should reduce risk after the value proposition rather than dominate the first impression.

**A33 — Route/content sprawl makes the company feel broader than its proven wedge.** Product, Source Map, Source Gap, ROI, Monitoring vs Execution, Teardowns, Insights, Compare and multiple free tools all compete for public attention.

### P3 — optional / housekeeping

**A34 — One stale open PR (#110) remains.** Its movement-detector purpose was superseded by the later merged cleanup; it should never be merged in its current stale state.

**A35 — The repository has many stale historical branches.** Cleanup is destructive housekeeping and should be handled explicitly, not during product work.

**A36 — Four social links in the footer may be more than the brand actively maintains.** Keep only genuinely maintained channels after founder review.

**A37 — Facebook remains in footer and organization structured-data `sameAs`.** Verify it is an intentionally maintained official profile before deciding whether to retain it.

## Mobile-specific findings from founder screenshots + exact-release evidence

- No current tested horizontal viewport overflow on audited routes.
- The primary mobile problem is density/hierarchy, not just overflow.
- Pricing plans and market-evidence blocks occupy too many successive phone screens.
- Recommendation Monitor has one concrete inline label/value defect plus excessive vertical density.
- Expanded footer optional-analytics preferences become a large section and visually compete with navigation.
- The market-evidence company cards on `/source-map` are both large and contextually misplaced.
- Safari’s bottom `foremention.com` pill in screenshots is browser chrome, not Foremention UI.

## Pricing position — recommendation, not activation

Do not activate billing or silently change the commercial contract in this audit PR.

Current planned `$149` Core / `$499` Signal is not automatically outside the category, but it is hard to defend at current product maturity/capacity unless the evidence-first outcome is much clearer. A credible paid-beta hypothesis is roughly `$99` Core / `$349` Signal / custom Intelligence, but this requires an explicit commercial decision and real payment/legal readiness before becoming an active checkout. The site should first become good enough to sell either price honestly.

## Prioritized implementation program

### Release A — public truth, pricing, footer, mobile conversion

1. Remove inactive paid offers from JSON-LD.
2. Rewrite pricing hierarchy around outcomes while preserving planned/private-beta truth and existing planned prices until commercial approval.
3. Remove the stale vendor-price table from the primary pricing journey; route comparison/research elsewhere.
4. Simplify footer IA, rename `/subprocessors` link to `Subprocessors`, and make the consent UI explicitly about optional experience analytics.
5. Fix Recommendation Monitor’s mobile intro collision and reduce mobile density.
6. Remove the four-company market-evidence block from `/source-map`; create/prepare a dedicated comparison/research home so evidence is preserved rather than deleted.
7. Replace “Live Source Map” freshness language with dated/public audit language where the data is snapshot-based.

### Release B — comparison, discovery, positioning

1. Add a `/compare` research hub with explicit methodology/date/source boundaries.
2. Rework generic “usually/varies” comparison claims into defensible operating-model differences or sourced named comparisons.
3. Add intentional discovery for `/score` and `/prompt-check` and include them in sitemap if they remain indexable.
4. Collapse homepage repetition and turn full homepage pricing cards into a concise plan-fit bridge.
5. Reframe the product page from eight internal systems to buyer outcomes, keeping system names as secondary detail.
6. Clarify Source Gap manual-review expectation.
7. Reconcile Standards naming/path deliberately.

### Release C — measured performance + workspace IA

1. Profile LCP/font delivery before changing the font pipeline.
2. Reduce CSS/client cost only where profiling shows measurable benefit.
3. Audit mobile workspace navigation taxonomy and first-use discoverability without removing advanced evidence tools.
4. Re-run exact authenticated browser/canary evidence after any workspace IA change.

## Non-negotiable release constraints

- No billing activation in this program without explicit commercial/legal/payment authorization.
- No fabricated competitor facts, customers, citations, testimonials or outcomes.
- Do not restore `recordRunChanges(...)`, `detect-run-changes`, or any renamed equivalent pre-review movement detector.
- Preserve `recordReviewedComparableChangeNotifications` as the legitimate reviewed comparable movement path.
- No new database/auth/workflow/analytics infrastructure unless a measured need is proven.
- PR evidence is never reused as production proof; every merge requires exact resulting-release verification.
