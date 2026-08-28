# Foremention Canonical Visual System — Design Specification

Date: 2026-08-28
Status: Approved direction, implementation-gated
Branch: `feat/canonical-figma-visual-system`
Baseline merge: `697cbe8be6d12430e2134b47b6264df1eb0c71cd`

## 1. Objective

Rebuild Foremention’s entire presentation layer around the approved dark editorial visual direction while preserving the current product behavior exactly.

The visual north star is the approved Foremention hero: near-black/graphite environment, subtle registered-green technical grid, elegant serif display typography, restrained interface typography, luminous green/white evidence-signal visualization, sparse enterprise composition, and the expression `Register. Prove. Prepare.`

This is a visual-system migration, not a product redesign.

## 2. Frozen product contract

The following are out of scope for behavioral change and must remain functionally identical:

- Category: `Recommendation Intelligence`.
- Descriptor: `Recommendation intelligence for B2B software.`
- Expression: `Register. Prove. Prepare.`
- Signed-in primary IA: Attention → Questions → Records → Comparisons → Settings.
- Recommendation Record remains the canonical inspectable object.
- Evidence inspection remains embedded in Recommendation Records.
- Evidence truth chain remains RETURNED → RETRIEVED → OBSERVED → REVIEWED → SAFE CONCLUSION.
- Source X-Ray remains retired as a standalone surface, route, navigation item, SEO page, analytics event, homepage feature, investor story, and design-system deliverable.
- Authentication, authorization, Supabase RLS, organization/workspace isolation, provider boundaries, persistence, analytics privacy, database behavior, onboarding behavior, and security semantics are frozen.
- No fabricated traction, customers, benchmarks, accuracy, ARR, testimonials, paid plans, or proof.
- Existing advanced product routes may remain available behind secondary navigation, but the five-object primary IA does not change.

## 3. Identity boundary

### Preserve

- Exact canonical Foremention mark and wordmark geometry.
- Existing canonical SVG/vector assets only.
- Black lockup on light/warm surfaces.
- Exact white reverse lockup on dark surfaces.
- Registered green as the core signal color.
- Recommendation/evidence semantics and causal restraint.

### Retire

The previous presentation styling is no longer canonical. Retire the bright mint-paper/brutalist visual layer, including the current dominant `Space Grotesk` treatment, heavy black box shadows, square-marker hero treatment, and any reconstructed CSS logo approximation such as `.source-eclipse` when it substitutes for the canonical asset.

Retiring this styling does not retire the product or evidence semantics it currently presents.

## 4. Chosen implementation approach

### Recommended and approved: token-first canonical migration

Introduce a new canonical token layer and component primitives, then migrate the public site and signed-in product onto them without changing route/data/controller behavior.

Why this approach:

- isolates visual change from product logic;
- makes public and authenticated surfaces converge on one system;
- allows accessibility and responsive behavior to be tested centrally;
- avoids a second parallel theme that would create long-term drift;
- supports a faithful Figma ↔ code mapping.

### Rejected approach A: route-by-route restyling

Faster initially, but duplicates values and creates inconsistent typography, spacing, state colors, and interaction behavior.

### Rejected approach B: permanent parallel legacy/new themes

Useful for experiments, but inappropriate as the canonical architecture because it would preserve two competing identities and increase maintenance risk.

## 5. Canonical visual language

### 5.1 Environment

Primary environment: near-black / graphite. Warm light surfaces are used only where inspection density or reading length benefits from them. The overall impression should be dark, editorial, technical, and quiet rather than neon, cyberpunk, or dashboard-generic.

### 5.2 Color roles

Use semantic roles rather than ad hoc hex values in components.

Core starting palette:

- `ink-950`: near-black foundation, approximately `#0D0F0E`.
- `ink-900`: graphite surface, approximately `#151817`.
- `paper-100`: warm ground, approximately `#F4F0E8`.
- `paper-50`: clean warm surface, approximately `#FFFDF9`.
- `signal-600`: registered green, `#176347`.
- `signal-400`: lighter readable green for dark-surface text and fine signal accents, approximately `#65B58E`.
- `info`: `#355F7A`.
- `warning`: `#9A6700`.
- `contradictory`: `#A33A34`.
- `unknown`: `#6B706C`.
- `insufficient`: `#775E29`.
- `not-comparable`: `#59606A`.

The implementation may tune supporting neutrals during measured contrast QA, but must not casually change the registered-green identity signal.

### 5.3 Typography

Display typography: editorial serif with high legibility and controlled contrast, matching the approved hero’s premium character. Preferred direction: Newsreader or an equivalent licensed/web-safe implementation already approved for Foremention.

Interface/body typography: restrained sans serif with high UI legibility; preferred direction: Inter.

Provenance/data typography: IBM Plex Mono or equivalent monospace treatment for source IDs, timestamps, hashes, provider labels, retrieval metadata, and evidence chain details.

Rules:

- serif is for major narrative hierarchy, not dense controls;
- sans serif is the default for navigation, controls, tables, labels, forms, and body copy;
- mono is semantic, not decorative;
- avoid excessive letter-spacing and all-caps outside small system labels;
- typography must remain readable at 320px width and at 200% zoom.

## 6. Grid and composition

Public pages use a 12-column editorial grid with wide negative space, asymmetric compositions, restrained borders, and controlled luminous focal points.

Authenticated product uses a denser responsive grid while preserving the same visual DNA:

- stable application rail/navigation geometry;
- clear content measure for records and evidence;
- source/provenance columns that can collapse predictably;
- no decorative layout change may alter information order or keyboard order.

Technical grid lines may appear as low-contrast environmental texture on dark hero/feature surfaces. They must never reduce text contrast or become visual noise behind dense product content.

## 7. Surfaces and elevation

Replace heavy offset-box-shadow/brutalist elevation with restrained tonal separation:

- graphite-on-ink layering;
- 1px low-contrast borders;
- soft internal highlights where needed;
- rare controlled glow reserved for evidence/signal moments;
- no generic glassmorphism;
- no large soft SaaS gradient blobs.

Warm/paper surfaces are inspection surfaces and should feel like evidence sheets placed inside the dark system rather than a separate brand.

## 8. Luminous evidence/signal motif

The approved right-side hero visualization becomes a reusable brand motif, not a literal product metric.

Visual vocabulary:

- signal convergence;
- curved horizon / evidence field;
- small registered-green points;
- restrained white-green bloom;
- technical line work and arcs;
- progressive focus from uncertainty to registered evidence.

Rules:

- never encode invented quantitative claims;
- never suggest accuracy percentages or causal certainty;
- decorative versions are `aria-hidden`;
- any data-driven version must use real product data and accessible text alternatives;
- motion respects `prefers-reduced-motion`.

## 9. Design token architecture

Create explicit token groups for:

- color: background, surface, foreground, muted, border, signal, evidence states, focus, destructive;
- typography: display, body, UI, mono, size, line-height, tracking;
- spacing: 4px base scale with named semantic aliases;
- radius: primarily small/subtle, not pill-heavy;
- border widths and divider roles;
- elevation/glow;
- motion duration/easing;
- container widths and breakpoints;
- focus-ring geometry;
- z-index layers.

Components consume semantic tokens only. Raw colors remain centralized in the token definition layer.

## 10. Component system

Build and document canonical variants for:

- canonical brand lockup wrapper;
- public header and mobile navigation;
- workspace navigation and secondary navigation;
- buttons: primary, secondary, quiet, destructive, icon, loading, disabled;
- text links and inline actions;
- inputs, textareas, selects, checkboxes, radios, switches;
- search controls;
- labels, helper text, validation, fine print;
- cards and inspection sheets;
- tabs/segmented controls where already functionally present;
- tables, list rows, sortable headers, pagination where already present;
- badges/status labels;
- evidence-state chips;
- Recommendation Record shell;
- source/provenance blocks;
- review controls;
- comparison cells and comparability states;
- alerts, banners, toasts;
- dialogs/modals/drawers already supported by the product;
- empty, loading, skeleton, error, permission-denied, unavailable, and partial-data states;
- analytics/consent surfaces;
- footer;
- public CTA bands;
- evidence/signal visual motif.

No component may introduce a new product action or remove an existing one merely for aesthetics.

## 11. Recommendation Record treatment

Recommendation Record is the strongest product expression of the identity.

Hierarchy:

1. question / record identity;
2. current recommendation or answer;
3. reference/source support;
4. retrieval and observation facts;
5. review status;
6. uncertainty/comparability state;
7. safe conclusion boundary;
8. later comparison where available.

Evidence inspection remains inside the record and should visually feel like opening the proof behind a recommendation, not navigating to a separate product.

Use monospace provenance, warm inspection surfaces within the dark shell, and registered green only where a state is actually registered/verified. Unknown, contradictory, insufficient, and not-comparable states retain distinct semantics and must not be visually flattened into generic green success.

## 12. Public website migration

Migrate all canonical public routes to the new system without altering their factual claims or SEO intent.

Homepage:

- hero closely follows the approved visual direction;
- exact canonical reverse logo on dark;
- eyebrow such as `THE FOREMENTION STANDARD` only where already approved as presentation copy;
- `Register. Prove. Prepare.` is the primary expression;
- descriptor remains `Recommendation intelligence for B2B software.`;
- luminous evidence/signal motif occupies the visual field without implying fake data;
- Recommendation Record remains the core product proof;
- methodology, honesty/causal restraint, competitor evidence, Decision Gate, later measurement, and workspace entry remain truthful and visually integrated.

Other public routes inherit the same foundations and component system rather than creating page-specific mini-brands.

## 13. Authenticated product migration

Keep the exact signed-in primary IA:

- Attention
- Questions
- Records
- Comparisons
- Settings

The application shell becomes a dark premium workspace with high-density warm/graphite inspection areas. Navigation, forms, tables, records, comparisons, onboarding, settings, alerts, and existing advanced routes all receive the new visual system while maintaining current hrefs, event handling, data fetching, permissions, and keyboard behavior.

## 14. Responsive system

Required validation widths:

- 1440 desktop;
- 1024 laptop;
- 768 tablet;
- 375 mobile;
- 320 narrow.

Rules:

- no horizontal content loss;
- tables use existing safe responsive behaviors or deliberate scroll containers;
- source/provenance details remain inspectable on narrow screens;
- no evidence state is hidden merely to fit;
- CTA and navigation targets meet touch-size requirements;
- layout reflow must preserve reading and keyboard order.

## 15. Motion

Motion is quiet and evidentiary:

- 120–220ms UI transitions;
- slightly longer 300–600ms brand/environment transitions where justified;
- movement favors opacity, transform, line growth, and signal convergence;
- avoid constant ambient motion in dense product views;
- no motion should imply changing evidence when data is static;
- `prefers-reduced-motion` disables non-essential animation.

## 16. Accessibility

Minimum target: WCAG 2.2 AA for applicable UI.

Required:

- measured color contrast for every semantic text/background pairing;
- visible keyboard focus on dark and light surfaces;
- logical tab order;
- semantic headings/landmarks;
- accessible names for icon-only actions;
- no color-only evidence distinction;
- 200% zoom resilience;
- reduced-motion support;
- form errors programmatically associated with fields;
- tables retain headers/relationships;
- canonical logo images use appropriate accessible naming when meaningful and empty alt when decorative/duplicative.

The existing Browser Acceptance and axe-based canonical visual proof remain release gates and should be extended rather than bypassed.

## 17. Figma architecture

Preserve the existing page `00_CANONICAL_LOCKED` unchanged.

Add canonical design-system pages:

1. `01_FOUNDATIONS` — color, typography, spacing, grid, motion, accessibility roles.
2. `02_COMPONENTS` — controls, navigation, forms, cards, tables, states.
3. `03_RECOMMENDATION_RECORD` — record anatomy, evidence inspection, provenance, review, uncertainty/comparability.
4. `04_PUBLIC_WEB` — homepage and canonical public-page patterns.
5. `05_PRODUCT_APP` — application shell and five-object IA surfaces.
6. `06_RESPONSIVE_STATES` — 1440/1024/768/375/320 layouts and interaction states.
7. `07_HANDOFF_QA` — token mapping, component mapping, accessibility notes, implementation status.

All logo use must reference/copy the exact canonical vector assets from `00_CANONICAL_LOCKED`; do not redraw, retype, trace, or approximate them.

## 18. Code architecture

Implementation should separate foundations from migration:

- canonical token stylesheet/module;
- canonical typography/font setup;
- reusable visual primitives;
- public-shell styling;
- app-shell styling;
- Recommendation Record/evidence styling;
- route-level composition only where a layout genuinely differs.

Do not couple visual tokens to data-fetching or business logic modules.

The existing `app/globals.css` currently contains legacy identity values and large route/component styling. Migration should progressively move canonical values into an explicit new token/system layer and delete obsolete legacy identity rules only after their consumers have migrated and browser tests prove parity.

## 19. Testing and release gates

Every implementation tranche must preserve or extend:

- unit/contract tests;
- lint;
- typecheck;
- production build;
- Cloudflare Worker dry run;
- Browser Acceptance;
- axe accessibility checks;
- canonical brand visual proof;
- responsive screenshots at 1440/1024/768/375/320;
- keyboard acceptance;
- canonical logo audit;
- no standalone Source X-Ray regression;
- no primary-IA regression;
- no evidence-truth regression;
- no auth/RLS/security regression.

Visual regression evidence should be archived for the public homepage, Product, Methodology, Recommendation Record examples, signed-in shell fixture, and the core Record/Comparison states.

## 20. Implementation sequence

1. Lock baseline and create visual-system branch.
2. Preserve/reconfirm canonical Figma assets.
3. Establish code and Figma foundations/tokens.
4. Build core primitives and interaction states.
5. Build Recommendation Record/evidence primitives.
6. Migrate public shell and homepage.
7. Migrate canonical public routes.
8. Migrate authenticated shell/navigation.
9. Migrate Attention, Questions, Records, Comparisons, Settings.
10. Migrate remaining existing advanced/supporting routes without promoting them into primary IA.
11. Complete responsive and accessibility hardening.
12. Run exact-head test/build/browser/security gates.
13. Red-team visual consistency, truth boundaries, and canonical-logo usage.
14. Open a dedicated visual-system PR; do not merge until all exact-head gates pass.

## 21. Definition of done

The migration is complete only when:

- public and authenticated Foremention visibly belong to the approved dark editorial system;
- the old bright/brutalist identity no longer defines canonical surfaces;
- canonical logo geometry is unchanged;
- all existing product functionality still works;
- five-object primary IA is unchanged;
- Recommendation Record/evidence semantics are unchanged;
- Source X-Ray has not returned as a standalone concept;
- all required responsive states are deliberately designed;
- accessibility gates pass;
- exact-head CI, Browser Acceptance, Agent Harness, Security, CodeQL, and AI Safety/Code Health are green;
- Figma and code share documented token/component mappings;
- no unsupported product or traction claim has been introduced.

## 22. Non-goals

This project does not:

- redesign Foremention’s product model;
- change pricing strategy;
- invent traction;
- rename the five primary objects;
- add autonomous product behavior;
- change evidence semantics;
- replace infrastructure/auth/database architecture;
- restore Source X-Ray;
- redraw the canonical logo;
- create a decorative design system disconnected from production code.
