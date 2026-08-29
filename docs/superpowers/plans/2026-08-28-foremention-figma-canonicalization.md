# Foremention Figma Canonicalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the canonical Foremention Figma file so it contains the complete approved identity, foundations, component system, public/product masters, responsive states, prototypes, and engineering handoff that production code can implement directly.

**Architecture:** Preserve `00_CANONICAL_IDENTITY` as the locked source of logo geometry. Build all other pages as editable Figma structures with shared variables/components and explicit responsive/motion states. The design remains a presentation-layer system only; product IA and evidence semantics are frozen.

**Tech Stack:** Figma Design file `XeXprf1RZ9tM528ZTBYgTB`, Figma variables/components/prototypes, Newsreader/Inter/IBM Plex Mono direction, exact canonical SVG assets.

**Spec:** `docs/superpowers/specs/2026-08-28-foremention-canonical-visual-system-design.md`

## Global Constraints

- Category remains `Recommendation Intelligence`.
- Descriptor remains `Recommendation intelligence for B2B software.`
- Expression remains `Register. Prove. Prepare.`
- Primary app IA remains Attention → Questions → Records → Comparisons → Settings.
- Evidence chain remains RETURNED → RETRIEVED → OBSERVED → REVIEWED → SAFE CONCLUSION.
- Evidence inspection remains inside Recommendation Record.
- Source X-Ray remains retired.
- Exact canonical logo/wordmark geometry only; no redraw/retype.
- Registered green is restrained and semantic, not decorative everywhere.
- Every critical desktop surface has deliberate 375/320 behavior.
- Reduced motion preserves meaning.

---

### Task 1: Recover and lock Figma identity page

**Files/Surfaces:**
- Figma: `00_CANONICAL_IDENTITY`

**Interfaces:**
- Consumes: canonical logo/mark/wordmark vectors already present in the file.
- Produces: exact reusable identity source nodes used by every later page.

- [ ] Inspect top-level pages and the identity node tree.
- [ ] Confirm logo/mark/wordmark vectors remain unchanged.
- [ ] Add only annotations for dark/light usage, clear space, minimum size, and `DO NOT REDRAW` if missing.
- [ ] Screenshot the page and visually verify geometry.

Acceptance: no new logo geometry exists anywhere in the file.

### Task 2: Build foundations and variables

**Files/Surfaces:**
- Figma: `01_FOUNDATIONS`
- Variable collections: `Color`, `Spacing`, `Radius`, `Motion`

**Interfaces:**
- Produces semantic variables consumed by component/product/public pages.

- [ ] Create color variables for ink, graphite, warm surfaces, registered green, lighter signal green, info, warning, contradictory, unknown, insufficient, not-comparable.
- [ ] Create spacing variables using a 4px base scale.
- [ ] Create restrained radius variables.
- [ ] Create motion variables for micro, standard, evidence reveal, narrative.
- [ ] Create typography specimens for Newsreader display, Inter UI/body, IBM Plex Mono provenance.
- [ ] Document 12-column public grid and denser workspace grid.
- [ ] Add WCAG contrast notes and reduced-motion rules.

Acceptance: every later page can reference the same visual values rather than ad hoc tokens.

### Task 3: Build core and evidence component libraries

**Files/Surfaces:**
- Figma: `02_MOTION_LANGUAGE`
- Figma: `03_COMPONENTS_CORE`
- Figma: `04_COMPONENTS_EVIDENCE`

**Interfaces:**
- Produces components for navigation, buttons, fields, states, Recommendation Record, inspector, and comparisons.

- [ ] Build public header/mobile nav and signed-in rail with exact canonical identity.
- [ ] Build primary/secondary/quiet/destructive/icon button states.
- [ ] Build input/select/textarea/search/checkbox/radio/toggle states.
- [ ] Build empty/loading/error/retry/permission/degraded states.
- [ ] Build evidence chips for returned/retrieved/observed/reviewed and distinct uncertainty states.
- [ ] Build Recommendation Record master.
- [ ] Build contained Evidence Inspector master.
- [ ] Build Comparison Eligible and Comparison Withheld masters.
- [ ] Add focus, hover, disabled, loading, narrow/mobile variants where meaningful.

Acceptance: no Source X-Ray component exists; Evidence Inspector is visibly contained by Recommendation Record.

### Task 4: Build public masters

**Files/Surfaces:**
- Figma: `05_PUBLIC_HOMEPAGE`
- Figma: `06_PUBLIC_PAGES`

**Interfaces:**
- Consumes: foundations, identity, core/evidence components.
- Produces: desktop/mobile visual source of truth for production public routes.

- [ ] Build 1440 homepage with dark editorial hero, `THE FOREMENTION STANDARD`, `Register. Prove. Prepare.`, descriptor, three pillars, CTA hierarchy, and evidence convergence motif.
- [ ] Keep the signal motif abstract/evidentiary, never planet/crypto/neural-network-like.
- [ ] Build Recommendation Record, honesty/uncertainty, competitor evidence, decision gate, later measurement, workspace-entry sections.
- [ ] Build Product, Recommendation Intelligence, Recommendation Record, Methodology, Research/Insights, Pricing/private beta, Contact, About/trust, Legal/Auth pattern masters.
- [ ] Build 375 mobile homepage with text-first reading order and signal motif below core message.

Acceptance: homepage matches the approved visual family while preserving truthful copy and product semantics.

### Task 5: Build signed-in product masters

**Files/Surfaces:**
- Figma: `07_PRODUCT_ATTENTION`
- Figma: `08_PRODUCT_QUESTIONS`
- Figma: `09_PRODUCT_RECORDS`
- Figma: `10_PRODUCT_COMPARISONS`
- Figma: `11_PRODUCT_SETTINGS`
- Figma: `12_ADVANCED_PRODUCT`

**Interfaces:**
- Produces implementation targets for the existing signed-in routes without changing their behavior.

- [ ] Build Attention as a judgment inbox, not KPI dashboard.
- [ ] Build Questions around exact registered buyer question wording.
- [ ] Build Records index and Recommendation Record detail with contained inspector.
- [ ] Build eligible/withheld comparison views with explicit reasons.
- [ ] Build quiet Settings surface.
- [ ] Map existing advanced tools as secondary surfaces without promoting them into primary IA.

Acceptance: five-object IA is obvious; advanced tools remain secondary.

### Task 6: Build responsive/state/prototype system

**Files/Surfaces:**
- Figma: `13_RESPONSIVE`
- Figma: `14_STATES`
- Figma: `15_PROTOTYPES`

**Interfaces:**
- Produces responsive/motion reference used by browser QA and frontend implementation.

- [ ] Build 1440, 1024, 768, 375, 320 reference layouts.
- [ ] Ensure evidence states are never hidden just to fit.
- [ ] Build complete empty/loading/collecting/review/failed/insufficient/unknown/contradictory/not-comparable states.
- [ ] Wire hero prototype: Signals → Register → Converge → Prove → Prepare.
- [ ] Wire Recommendation Record → Evidence Inspector open/close prototype.
- [ ] Wire Comparison Withheld → Eligible explanatory prototype.
- [ ] Add reduced-motion resolved-state frames.

Acceptance: essential meaning is identical with motion disabled.

### Task 7: Engineering handoff and visual QA

**Files/Surfaces:**
- Figma: `16_ENGINEERING_HANDOFF`

**Interfaces:**
- Produces node IDs, token mapping, component mapping, QA contract for code work.

- [ ] Document exact token values and code-side semantic names.
- [ ] Record node IDs for homepage, public header, workspace rail, Recommendation Record, Evidence Inspector, Comparison Eligible/Withheld, responsive mobile homepage.
- [ ] Document canonical logo asset rule and no-Source-X-Ray rule.
- [ ] Screenshot homepage desktop/mobile, Attention, Record+Inspector, Comparisons, and prototype start/end states.
- [ ] Fix visible typography, spacing, clipping, contrast, or identity defects before code implementation.

Acceptance: Figma is implementation-ready and every major production surface has a concrete visual reference.
