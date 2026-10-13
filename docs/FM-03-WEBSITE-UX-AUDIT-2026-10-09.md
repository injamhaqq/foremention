# FM-03 — 360° Website, Customer UX and Design-System Audit
**Date:** 2026-10-09 · **Authority:** FM-03 presentation workstream · **Integration owner:** FM-00
**Audit base:** `d4fea60a7bb8e047f2282cea9134121e9496c67e` on `main` · **Decision:** read-only audit; no brand, contract, data, deployment or application-logic change authorized
**Production evidence:** https://foremention.com/api/health (checked 2026-10-09, returned exact base build SHA, status ok, Worker/D1/Supabase reachable; providers configured but not probed)
**Live public browser session:** https://agent.tinyfish.ai/runs/e597dddd-5d5e-423f-921f-4063769a2109
**Read-only fictional demo session:** https://agent.tinyfish.ai/runs/071e6753-3dcf-42ea-9cb6-901a8047a052

## 1. Source-of-truth review
Reviewed at exact base SHA: `CLAUDE.md`, `FOREMENTION_STATE.md`, `README.md`, `docs/FOREMENTION-BRAND-ASSETS.md`, `app/layout.tsx`, `app/page.tsx`, `app/contact/page.tsx`, `app/pricing/page.tsx`, `components/public-shell.tsx`, `components/goat-home-experience.tsx`, `components/brand.tsx`, `components/workspace-navigation.tsx`, `components/app-shell.tsx`, `components/onboarding-wizard.tsx`, `components/recommendation-answer-record.tsx`, `components/source-review-form.tsx`, `scripts/browser-acceptance.mjs`, `scripts/browser-zoom-reflow.mjs`, `.github/workflows/browser-acceptance.yml`, `lighthouserc.cjs` and `package.json`. Inspected application, components, public, tests and workflow directory inventories. Reviewed open PR summary and changed-file collisions.
Do **not** treat older handoff ledger SHAs or `design-qa.md` PR #12 historical metrics as current production evidence. Do **not** assume all open PRs are merged.

## 2. Hard invariants — do not change
- Preserve the **current runtime-approved reverse identity assets** `public/brand/foremention-logo-white.svg` and `public/brand/foremention-mark-white.svg`; never redraw, recolor, derive, or substitute. `tests/canonical-visual-system.test.mjs` explicitly requires legacy/light asset paths `public/brand/foremention-logo.svg` and `public/brand/foremention-mark.svg` to be **retired**. Note that `docs/FOREMENTION-BRAND-ASSETS.md` still lists those retired light assets; resolve the documentation discrepancy via FM-00 rather than reintroducing removed artwork. Preserve graphite/registered green/warm evidence surfaces and `Register. Prove. Prepare.`.
- Public category: **Recommendation Intelligence for B2B software** until approved migration. Category Leadership OS remains future ambition.
- Eight primary navigation destinations in this order: Overview `/app`, Questions `/app/prompts`, Records `/app/runs`, Evidence `/app/source-map`, Opportunities `/app/opportunities`, Comparisons `/app/analytics`, All tools `/app/tools`, Settings `/app/settings`.
- Source X-Ray is retired as a standalone offering. Inspection must remain inside Recommendation Records and supporting evidence workspace.
- Preserve real returned provider reference vs retrieved URL vs page evidence vs human-reviewed conclusion, inferential state, safe comparison eligibility, and human control of Change Specifications. Demo is fictional and read-only; never invent proof.
- FM-04 owns product behavior, FM-08 owns security/release, FM-00 owns cross-workstream integration. No merge or deploy.

## 3. Production and visual audit — findings grounded in browser sessions
| Surface | Observed | Finding |
|---|---|---|
| Public home `/` | Hero “See where AI recommends your brand.”; dark/light approved system, graph and CTA | Strong first message, but subsequent high-volume explanatory detail risks burying pilot comprehension; *not* a confirmed rendering error |
| Hero example | Native select “Workers AI + Bing RSS grounded synthesis”; interactive nodes; no paid run | Correctly illustrative; provider-surface distinction is crucial; consider plain-language glossary before detailed node mechanics |
| Header/footer | Product, Use cases, Pricing, Research, Trust, Sign in, Request a pilot; consent dialog | Public nav and CTA function; no browser-reported overlap; retain |
| Product | Observe → understand → decide → execute → verify with transparent provider boundaries | Correct claims, but exact technical jargon can delay buyer comprehension |
| Pricing | Core/Signal/Intelligence with no fabricated prices; deliberate `noindex,nofollow` | Seek FM-00 business/SEO decision before indexing; do not add unvalidated dollar amounts |
| Contact | Four required inputs; optional buyer questions and current problem; no submission made | Appropriate low-friction pilot intake. Screen-reader validation and error-state test still needed |
| Methodology/trust | Evidence/causal restraint; trust states differentiated from certifications | Preserve this high-trust differentiator |
| Login/signup | Site copy and `noindex` observable | Full actual customer signup/login not tested |
| `/score` | “Free AI Brand Visibility Score” route still live | Potential message tension against richer evidence-first value; review traffic and reason for keeping before modifying |
| Social previews | Title, description, canonical and basic Twitter summary seen | Need actual platform link-preview and image payload verification; `twitter:summary` is not itself a defect |
| Responsive | Public browser session reported no obvious mobile overflow, hero collision or broken FAQ; screenshots captured in browser session | No downloadable before/after screenshot artifact was supplied, no measured pixel geometry; independent visual proof pending |
| Performance | No real LCP/INP/CLS p75 metrics collected | Do not claim pass or fail; Lighthouse quality gates currently include warning-only category score floors |

### Demo journey (credential-free, fictional)
Read-only demo browser loaded all eight primary routes and these specialist routes: `/app/onboarding`, `/app/intelligence`, `/app/alerts`, `/app/placements`, `/app/resolutions`, `/app/evidence`, `/app/passport`, `/app/competitors`, `/app/agents`, `/app/team`, `/app/search`, `/app/support`, `/app/outcomes`, and `/app/decision-lab`. The primary navigation remained the canonical eight.
- **Overview:** Attention, KPI cells, next-step links, example outcomes. Dense but actionable.
- **Questions:** intent classifications and clear links to competitors and AI results.
- **Records:** run list and provider choice; evidence inspection attached to the answer component in source.
- **Evidence:** search, source queue, review categories. Do not imply provider citation caused a recommendation.
- **Opportunities:** 0 reviewed and 1 pending in fictional fixture; prompts should distinguish “review evidence” from “approved action”.
- **Comparisons:** fictional baseline, directional changes and explicit conditions for valid comparisons. Protect comparability.
- **Tools and Settings:** directory and recurring measurement/billing/enterprise controls reachable.
- **Onboarding:** six-step draft/recovery path present. Website analysis and localStorage restore exist in source; no live creation submitted.
- **Empty states:** fictional Outcomes had no records; Support had no help articles; Vendor Passport has no verified demo statements.
These demo numbers are **not** customer evidence, production KPIs, paid engagement or verified outcomes. Browser visited pages; did not assert end-to-end signed-in real-user persistence/authorization.

## 4. Complete journey — success metric, UX expectation and verification still needed
| Journey | Intended success | Key QA |
|---|---|---|
| Search/landing → example | Visitor understands what was observed and what is illustrative | Plain-language comprehension; no false native-consumer-LLM claims; responsive interactive graph |
| Example → pilot CTA | Interested visitor finds founder-led request with clear no-charge/no-guarantee boundary | CTA visibility/analytics; mobile click-through |
| Pilot form → submit | Four required fields, accessible validation, saved server-side with truthful success/error | Test with approved synthetic data only; CSRF/abuse policy owned by FM-08; no real submission in audit |
| Signup/login → first workspace | Auth flows preserve RLS and no charge | Authenticated isolated test in FM-04/FM-08 boundary |
| Six-step onboarding → first buyer questions | Resumable setup, manual fallback, valid review step, no concealed collection | 320px/reflow/screen-reader/form errors; backend correctness FM-04 |
| Question → run → Record | Trace provider/model, question version, timestamp and returned refs | End-to-end real pinned provider with quota/timeouts and retries under FM-04 |
| Record → evidence review | Inspect returned reference, retrievability, claims, reviewer and uncertainty | Human review affordances, no auto-approval, keyboard focus |
| Evidence → Opportunity → Change Specification | Safe handoff to customer-owned action | Required owner/criteria/verification visible; FM-04 owns decisions |
| First cycle → comparable second cycle | Exact comparable pair or visible not-comparable reason | Nine-field material context gate FM-04; reviewer can understand why |
| Second cycle → Outcome Ledger | No causal uplift manufactured | Separate observation from business outcome and causation |
| Re-entry and retention | Clear next attention task, unambiguous empty/error states | Service-unavailable retry and skeleton/timeout states; FM-04 for API |
| Account/tools/settings | Discoverability and permission-safe controls | Eight canonical destinations unchanged; mobile nav, focus, authorization |

## 5. P0/P1/P2 backlog (observed vs proposed clearly distinguished)
| Priority | Item | Evidence / scope | Owner / gate |
|---|---|---|---|
| P0 | No confirmed blocking public browser/accessibility defect in this session. Real-user auth, automated axe and production RUM not yet re-executed in FM-03. | Do not invent P0; audit limitations are **unverified**, not passed | FM-08 release gate |
| P1 | Simplify pilot comprehension via progressive disclosure. Keep same hero and evidence graph; move/expose outcome and pilot scope before dense ten-step material without deleting provenance. | Existing long live homepage, source `components/goat-home-experience.tsx` | FM-00 approval + PR #440 coordination |
| P1 | Clarify source → reviewed evidence → eligible opportunity → exact decision with a single understandable next action; preserve state detail under expandable inspection. | Demo and source show distinct workflows; no functionality regression demonstrated | FM-03 + FM-04, overlaps #426/#438/#440 |
| P1 | Screen-reader/form-error and exact live-auth acceptance for first baseline/second cycle; produce inspectable receipts. | Demo visits aren't real authenticated journey | FM-08/FM-04 |
| P1 | Assess intentional `/pricing` noindex and `/score` language against current public positioning; no automatic change. | Live robots and route copy | FM-00 positioning decision |
| P1 | Collect actual production CWV p75 and run Lighthouse at representative routes; assess warning-to-blocking threshold after variance baseline. | `lighthouserc.cjs`: perf .75, a11y .95, best practices .9 are warnings | FM-08 joint release |
| P2 | Mobile public nav summary says “Open navigation” even when open; assess accessible state/name with actual keyboard/screen reader before scoped semantic patch. | `components/public-shell.tsx`; test not completed | FM-03; overlaps #440 |
| P2 | Rationalize CSS layering and performance; root imports over twenty stylesheets and `app/globals.css` exceeds 200 KB of source. | Source-code size only, not shipped-byte claim | FM-03 incremental ownership after FM-00 clearance |
| P2 | Review social cards, schema validity, search snippets and 404/500 copy with snapshots, not aesthetic redesign. | Live metadata verified, previews not platform-tested | FM-03 |
| P2 | Improve no-outcome/help-articles empty-state next actions; do not invent content or data. | Fictional demo empty states | FM-03/FM-04 coordination |

## 6. Component-library decision matrix
**Weights:** customer value 20, architecture 15, correctness 15, security/privacy 15, maintainability 10, cost 10, reversibility 10, licensing 5. Each dimension scored 0–5 then linearly normalized to 100; these are context-specific design judgments, *not benchmark measurements*.
| Candidate | Weighted fit /100 | Decision |
|---|---:|---|
| Existing semantic HTML and approved CSS | 95.4 | Keep |
| Targeted Radix primitives | 87.9 | Conditional for audited interactions |
| Targeted Lucide icon assets | 83.1 | Conditional icon cleanup |
| Targeted shadcn/ui components | 79.6 | Defer pending demonstrated need |
| Targeted Recharts visualizations | 79.4 | Defer pending demonstrated need |
| Custom Visx primitives | 71.1 | Defer pending demonstrated need |
| XYFlow for evidence diagrams | 67 | Defer pending demonstrated need |
| Wholesale Tailwind CSS migration | 54.2 | Reject now |
**Why:** Existing native semantics minimize integration cost and preserve the locked identity. Only consider selective Radix where tested focus/keyboard/aria defects demand a well-maintained primitive; its MIT license and unstyled model are good fits (https://www.radix-ui.com/primitives/docs/overview/accessibility). shadcn/ui can be selectively copied but its defaults/Tailwind styling would incur brand-specific porting; avoid library-wide generation. Recharts is a sensible conditional choice for meaningful actual time-series graphics *only after verifying accessible table alternatives*. Visx is lower-level custom chart engineering, not justified by the current Stage 0 workload. XYFlow is MIT for core but an interactive graph adds keyboard/gesture/screen-reader work to an illustrative explanation already functioning; defer. Lucide is ISC/MIT icon licensing; preserve canonical artwork rather than replacing it. Tailwind wholesale migration is high risk due extensive existing CSS. “Diagram Design” must be identified by exact package, source and license before procurement or scoring.
Licensing references: https://github.com/radix-ui/primitives/blob/main/LICENSE ; https://github.com/shadcn-ui/ui/blob/main/LICENSE.md ; https://xyflow.com/open-source ; https://github.com/airbnb/visx/blob/master/package.json ; https://github.com/lucide-icons/lucide/blob/main/LICENSE .
No dependencies were installed.

## 7. Shared-branch collision avoidance
49 PRs open at audit. Examples:
- **#440** already edits homepage, CTA, public nav, contact, layout, visual styles and browser acceptance; **do not fork competing edits**.
- **#438** broad customer product release touches `app/globals.css`, evidence and decision views, browser scripts and routes.
- **#426** source review readability and demo read-only: `components/source-review-form.tsx`, `app/canonical-evidence.css`.
- **#422** Attention/first-baseline browser; **#439** run-estimate contrast hotfix in `app/globals.css`.
- **#453** dependency update changes `package.json`/`pnpm-lock.yaml`.
Other FM-04/FM-08 PRs may mutate application APIs and auth boundaries at any time. Audit work therefore uses a docs-only isolated branch; any UI application patch requires FM-00 path claim, PR reconciliation and founder approval of material visuals.

## 8. Proposed controlled visual direction — **not approved or implemented**
**Change:** Prioritize “What did the AI actually return?”, “What can my team verify?”, and “How does a small pilot help me decide?” above the longer conceptual chain. Use progressive disclosure for technical states. Tighten empty-state calls to action only after verified UI/semantic test.
**Unchanged:** existing logo SVGs, marks, wordmark, brand colors, approved opening hero/illustrative graph, eight destinations, honest provider/evidence labels, no invented logos or metrics, company expression.
**Reason:** faster buyer comprehension and activation, minimal technical risk, no architectural replacement.
**Approval gate:** founder review of actual before/after visual direction and FM-00 path ownership before material changes. This report is not that approval.

## 9. Verification record and release checklist
**Existing exact main GitHub check runs as inspected:** CI, quality, browser-acceptance, production-canary, OSV, secrets, Trivy, CodeQL, scorecard and attest verified release reported success. Dependabot dependency-review skipped; Cloudflare Workers Builds was in progress at check time. These preexisting checks do not prove this report's proposed future changes.
**FM-03 executed:** repo/source review; live public content/metadata audit; production health SHA read; actual browser walk of public home/CTA/contact/sample/FAQ; separate read-only seeded demo walk of 22 app routes. No mutation of application code, no form submission, no new local test run, no independent axe/Lighthouse/RUM metrics and no downloadable before/after images.
**Required before merge/deployment of any actual UI patch:**
1. Base and head SHAs, reviewed PR conflicts, exact source diff and brand asset hash/integrity.
2. `pnpm install --frozen-lockfile && pnpm test && pnpm lint && pnpm typecheck && pnpm build`.
3. Playwright browsers Chromium/Firefox/WebKit, viewport widths **1440/1024/768/375/320**, 200% text resizing, effective 320px at 400% zoom, forced colors/reduced motion.
4. Accessibility: keyboard-only, visible focus, skip link, focus trap where appropriate, accessible names/state, native semantics, screen-reader smoke, zero serious/critical axe violations; manual WCAG 2.2 review.
5. Exact user flows home→sample→pilot without real submission, approved synthetic intake test in isolation, login/demo, eight nav, question→Record→Evidence→Opportunity→Change Spec→later comparison including unavailable and contradictory states.
6. Production traffic p75 Core Web Vitals targets LCP <=2.5s, INP <=200ms, CLS <=0.1; measured Lighthouse results and budgets, no unsupported performance claims.
7. Before/after desktop/mobile screenshot filenames, comparison annotations, measurement evidence, approval receipt.
8. FM-08 release security, privacy, data isolation, rollback and deployment verification on the *exact tested SHA*; no self-merge or deploy by FM-03.

## 10. FM-03 CONTINUATION PACKET
**Checkpoint:** exact `main` d4fea60a7bb8e047f2282cea9134121e9496c67e, live health same SHA. 49 open PRs. Production/public and fictional-demo walk recorded. Existing public funnel functional in the tested paths; no confirmed blocking rendering defect. User/customer behavior remains unverified beyond read-only demo.
**Created in this workstream:** this review document only on `audit/fm-03-ux-20261009`; no application logic, brand asset, dependency, visual component or shared route change. No merge/deploy.
**Next bounded tasks:**
1. FM-00 reviews ownership and PR #440 first; decide whether material progressive disclosure/hero-adjacent change is approved.
2. Extract PR #440's intended current visual and compare with production screenshot, not a fresh generic design.
3. Once approved, isolate one simple readability/semantics fix on a new branch or integrate into PR #440 after explicit ownership.
4. Add a specific regression test; gather real after screenshot + manual accessibility + Playwright/axe + Lighthouse + CI exact SHA.
5. Return task patch/CI/visual evidence and founder approval receipt to FM-00. FM-08 owns merge/release signoff.
**Stop conditions:** if live main SHA changed, refresh. If another workstream claims target file, stop. If feature copy implies native ChatGPT/Gemini consumer monitoring from Cloudflare path, stop. If visual requires new identity, request founder approval. If test/CI/screenshot unavailable, say **UNVERIFIED**.

## 11. Implementation continuation — 2026-10-09
- **New isolated PR:** [#467](https://github.com/injamhaqq/foremention/pull/467), `fix/fm03-keyboard-shortcut-announcements-20261009`, based on exact audited main `d4fea60a7bb8e047f2282cea9134121e9496c67e`.
- **Real defect:** `components/workspace-keyboard-shortcuts.tsx` unconditionally announced “Opened the review action” or “Started the available export” after a keypress even when the current page did not contain a usable action control; misleading accessibility feedback.
- **Bounded fix:** `lib/workspace-shortcut-activation.ts` returns a truthy activation signal only when a control is present and not disabled, inert or `aria-disabled=true`. Component sends an `aria-live` announcement only on activation and uses “activated” rather than implying asynchronous completion. Suppresses global shortcuts under an open modal dialog. Preserves `A` fallback, `J/K` navigation and eight canonical signed-in destinations.
- **Regression test:** `tests/workspace-keyboard-shortcuts.test.mjs` now covers absent, disabled, inert, aria-disabled and usable targets, plus conditional-announcement integration checks.
- **Collision scan:** every open PR at branch selection was checked for all three touched paths; no overlap was reported. **No app-wide CSS, brand or product contracts changed.**
- **FM-00 action:** review #467 as a nonmaterial accessibility correction, not a new design proposal. Requires passing exact head CI and FM-08/browser checks before merge. Neither #465 nor #467 is approved for automatic merge or deployment.

## 12. Final automated verification and FM-00 merge gate — 2026-10-10

### Exact-SHA engineering result
The isolated, nonvisual accessibility patch is [PR #467](https://github.com/injamhaqq/foremention/pull/467), head **`defeec71d5e85acc2ac4520f141ef896bb7f001a`**, still based on main **`d4fea60a7bb8e047f2282cea9134121e9496c67e`** at recheck on 2026-10-10. The earlier test head `d790c56f322551a8e9f67bd8b059b8fe00dcade2` is superseded.

The patch changes exactly:
- `components/workspace-keyboard-shortcuts.tsx`: guarded truthful live-region announcements; skip background shortcuts while a modal is open; select active-row control first, then first usable matching control.
- `lib/workspace-shortcut-activation.ts`: skip missing, disabled, inert, hidden, aria-disabled and nonrendered targets; report that a control was activated, **not** whether an asynchronous review/export completed.
- `tests/workspace-keyboard-shortcuts.test.mjs`: missing/disabled/inert/hidden target guards, conditional announcement and skip-disabled-bulk-to-per-row regression.

**All 12 applicable checks on exact #467 head passed, zero failed/pending**: CI, browser-acceptance, isolated authenticated journey, Workers Builds, CodeQL, JS/TS analysis, quality, secrets, dependency-review, actions-security, OSV, and Trivy. GitHub release attestation was skipped by the pull-request workflow, not falsely reported as completed. The CI log reported **1,035 passing tests, zero failed, zero skipped**, plus lint/typecheck/build and **15/15 synthetic quality golden cases**. Browser acceptance log reported **60 public browser/page observations** across Chromium widths 1440/1024/768/375/320 and Firefox desktop, with fictional-demo and local Lighthouse checks on the homepage, product, pricing and score routes. The separate isolated authenticated journey passed with synthetic local resources. Workflow browser evidence: https://github.com/injamhaqq/foremention/actions/runs/37948084099.

The docs-only [PR #465](https://github.com/injamhaqq/foremention/pull/465) head before this section was `3b957e12bb63ba8005c1a1fba358bb498aafea7d` and had **12 applicable checks passing**. This documentation amendment creates a new head and **must receive fresh check confirmation**; prior checks do not automatically transfer.

### Release proof still explicitly unavailable
1. The PR browser suite skipped **production-authenticated** routes because dedicated acceptance credentials were not configured. Local synthetic authenticated tests are not a substitute for production-user proof.
2. No human screen-reader/assistive-technology signoff, real production field CWV p75 metrics, controlled before/after screenshot review of material visual changes, or post-merge exact-SHA production smoke has been established by FM-03.
3. No submitted GitHub PR reviewer approval was present on #465 or #467 at final inspection; neither PR was merged/deployed. The existing public website still serves the unchanged production baseline.
4. No unapproved material redesign, pricing/indexing change, category migration, new library, new buyer/customer numbers, or public evidence claim has been introduced.

### Definitive disposition
**FM-03 code and audit: IMPLEMENTED, AUTOMATED CHECKS GREEN, AWAITING AUTHORIZED INTEGRATION.** GitHub reported both #465 and #467 cleanly mergeable at the recheck before this documentation update. The developer workstream **must not** merge or deploy: FM-00 controls integration, FM-08 release/security signoff, and the founder approves any material visual direction. If FM-00 elects to land the bounded fix, recheck live main, branch diff and reviewer policy, merge **only its final reviewed SHA**, run exact merge SHA tests, verify production health/build SHA and relevant keyboard behavior, and preserve rollback. Do not equate a green PR with a released customer-facing correction. Leave P1/P2 redesign items gated rather than creating overlapping patches in #440/#438/#426.

## 13. CI artifact inspection — performance warnings and actual visual proof
**Evidence source:** [PR #467's exact-head browser acceptance run](https://github.com/injamhaqq/foremention/actions/runs/37948084099) at `defeec71d5e85acc2ac4520f141ef896bb7f001a`; GitHub Actions artifact ID **11624524285**. The artifact ZIP (190 files, including actual screenshots, axe reports, responsive checks and Lighthouse JSON) was downloaded and independently inspected by FM-03 on 2026-10-10. These are **local isolated build** findings; not field data or real production signed-in tests.

### Lighthouse lab values — one run per public route
| Local route | Performance /100 | Accessibility /100 | Best practices /100 | SEO /100 | LCP (lab) | Observed interpretation |
|---|---:|---:|---:|---:|---:|---|
| `/` | **74** | 100 | 96 | 100 | **5.14 s** | Below configured performance warning floor of 75 |
| `/product` | 77 | 100 | 96 | 100 | **4.14 s** | Above score warning floor; lab LCP still warrants investigation |
| `/pricing` | 85 | 100 | 96 | 69 | **3.33 s** | Public pricing `noindex` is an intentional separate FM-00 business/SEO decision; do not automatically index |
| `/score` | **72** | 100 | 96 | 100 | **4.54 s** | Below configured performance warning floor of 75 |

**Important:** The two performance assertion results (`/`: 74 < 75, `/score`: 72 < 75) were emitted at Lighthouse **warning severity**, so GitHub's browser acceptance job correctly finished SUCCESS despite these warnings. **Never interpret CI success as meeting performance targets.** Scores are single-run synthetic Lighthouse values; **Core Web Vitals field p75 LCP, INP and CLS remain unverified**. The category accessibility score of 100 is an automated audit result, not proof of WCAG 2.2 conformance or manual assistive-technology approval.

The Lighthouse audits flagged render-blocking Google Fonts CSS requests and approximately 88–91 KiB of unused JavaScript estimates across the inspected routes, notably a shared `product-analytics` bundle. These are candidates for **controlled, measured investigation**, not proof a dependency can be deleted safely; analytics collection and privacy semantics are owned by FM-07/FM-08. Public stylesheet ownership overlaps #440; do not ship speculative CSS/font replacement or shift measured attribution behavior without a separate reviewed change. Re-run warm/cold repeat tests and inspect waterfall/font cache/bundle before accepting savings.

### Screenshot and responsive test coverage
The downloaded artifact includes homepage screenshots at 1440, 1024, 768, 375 and 320 pixels; 375 and 320 show the approved reverse logo, hero heading, two distinct pilot/example actions and illustrative graph without reported horizontal overflow. Brand-proof screenshots are also saved for the fictional workspace shell and show no horizontal overflow at the five supported widths; **these are not a screen-reader/manual interaction signoff**. The automated WebKit-mobile reflow suite had `failures=[]` and all documented normal views unclipped in its JSON summary; zoom, reduced motion and responsive evidence require their exact respective test receipts, not generic claims.

### Brand documentation mismatch discovered
Repository test `tests/canonical-visual-system.test.mjs` confirms the **approved reverse white SVGs only**, while `docs/FOREMENTION-BRAND-ASSETS.md` still calls two now-retired light SVGs canonical. The runtime brand-proof check received HTTP 200 on `foremention-logo-white.svg` and `foremention-mark-white.svg`, and HTTP 404 for `foremention-logo.svg`, `foremention-mark.svg` and known legacy paths. The earlier Section 2 brand statement in this audit has been corrected; **FM-00 should reconcile the older asset documentation with the current tests, not reintroduce retired assets.** No artwork or runtime style has been changed in this workstream.

**Disposition:** FM-03 accessibility correction remains code-complete and all relevant exact-head checks GREEN. Further performance tuning (especially home and score) and public presentation simplification are **not** implemented; they require measured ownership/approval and should be tracked as separate P1 decisions rather than falsely declared fixed.
