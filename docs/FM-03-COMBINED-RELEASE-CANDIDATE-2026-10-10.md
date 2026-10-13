# FM-03 — Combined public website candidate (founder and FM-00 review)
Date: 2026-10-10
Base main: `d4fea60a7bb8e047f2282cea9134121e9496c67e`
Starting head: PR #491 `64c4c23c2b4d9d8133c28462acffd7e51ae86f9f`
Independent input: PR #492 `abe5088aa6827f371ea7ee6825c2828a3545d96e`
Status: **draft; no merge or production deployment authorized**.

## Implemented presentation changes
1. Preserve the canonical hero/graph, add three short founder-led pilot stages and clarify that the example uses Workers AI + Bing RSS synthesis rather than direct ChatGPT/Gemini/Perplexity consumer-app results.
2. Keep mobile navigation naming truthful while closed and open.
3. Provide a single existing-style in-page jump to the application heading from the public /contact hero; no second form or submission API.
4. Remove redundant Inter/Newsreader/IBM Plex Mono CSS `@import` from `canonical-system.css`, while retaining the earlier `registered-evidence.css` canonical import with the required font families/weights and keeping legacy Space Grotesk untouched.
5. Correct stale brand inventory documentation: only original reverse mark/wordmark are approved/current runtime assets; retired light artworks are not reinstated.

## Measured baseline (previous verified PR #491, GitHub Browser Acceptance run 37984841700)
Local Wrangler/Vinext compiled Worker mobile-lab Lighthouse:
- Homepage perf 69, a11y 100, best practices 96, SEO 100.
- Product perf 83; pricing 74; score 67.
- Home FCP 4.5s; LCP 5.3s; CLS 0; TBT 0ms.
- Main render-blocking CSS ~62 KB; unused CSS ~54 KB lab estimate; overlapping Google Fonts requests.
These estimates do not prove this change will improve p75 real-user web vitals. New PR must independently show before/after request waterfall and exact-head Lighthouse results. No fabricated p75 or guarantee of performance improvement.

## Technical and governance guardrails
- No changes to auth, tenant RLS, APIs, billing, cookies, analytics contracts or providers.
- No runtime dependencies, Tailwind migration or brand asset edits; native HTML, existing CSS and built-in icons retained. Upstream Base UI (MIT), Radix (MIT), shadcn/ui (MIT), Motion (MIT), diagram-design (MIT), Lucide (ISC) were evaluated; no source copied.
- Related #440 (stacked product PR) overlaps public page sources and /contact; #438/#439/#422 may collide with shared styling. **FM-00 owns reconciliation and final merge order**. Do not merge this PR independently based on green status alone.
- `CLAUDE.md` founder material-visual approval gate remains. Visuals were shown in prior FM-03 conversation; no claim of explicit final approval.
- FM-07 owns analytics spoofing event (#475/#483/#494); this UI branch deliberately does not mutate those contracts. Live success attribution must remain based on first-party persisted receipts.
- Real customer traction, rank control, consumer-LLM coverage, fabricated logos/testimonials, or pricing validation are not claimed.

## Acceptance
1. Confirm PR diff against freshest main and active PR #440; update conflict matrix.
2. `pnpm install --frozen-lockfile && pnpm test && pnpm lint && pnpm typecheck && pnpm build` and Cloudflare deploy dry-runs on exact head, plus security and authenticated journey.
3. Browser Acceptance on exact built Worker: Chromium/Firefox/WebKit as configured, axe, 1440/1024/768/375/320 captures, keyboard/screen reader checks, reduced motion and Lighthouse reports.
4. Explicit screenshot approval of copy and placement from founder; reconcile FM-00 and FM-08 release signoff.
5. Only FM-00-authorized exact SHA may merge and deploy; verify production SHA and comparable public routes afterward.

## Integrated FM-03 finalization — 2026-10-10

The combined release branch now also contains the already reviewed [#467](https://github.com/injamhaqq/foremention/pull/467) keyboard-accessibility correction and complete [#465](https://github.com/injamhaqq/foremention/pull/465) UX/performance audit. These were copied by exact committed source content into four additional files:
- `components/workspace-keyboard-shortcuts.tsx`
- `lib/workspace-shortcut-activation.ts`
- `tests/workspace-keyboard-shortcuts.test.mjs`
- `docs/FM-03-WEBSITE-UX-AUDIT-2026-10-09.md`

The result is a single FM-03 review candidate instead of four separately landing FM-03 PRs. Original #465, #467, #491 and #492 remain open as provenance until FM-00 confirms a successful merge or directs closing them as superseded. Their previous independent passing checks cannot substitute for a full exact-HEAD integrated test; GitHub Actions must complete on this branch after those additions.

### Performance comparison from GitHub PR browser artifacts (single synthetic Lighthouse run per route)

| Route | Original candidate #491 score | Combined site #496 before additional audit/keyboard files | Combined local LCP | Interpretation |
| --- | ---: | ---: | ---: | --- |
| Home `/` | 69 | 70 | 5.20 s | One-run noise; not proof of meaningful faster render |
| `/product` | 83 | 68 | 5.21 s | Worse single-run result; investigate before claiming improvement |
| `/pricing` | 74 | 73 | 4.48 s | `noindex` remains intentional SEO policy, not changed |
| `/score` | 67 | 67 | 5.25 s | No measured improvement |

This comparison is from two different isolated browser CI runs and **not** an A/B experiment; do not attribute a 15-point product-route change causally to removing one duplicated font import. The combined branch retains the exact same runtime production files after addition of only review docs/shortcut code; final browser build should be rechecked. Lighthouse warning thresholds are not blocking. P1 performance work remains documented in [#493](https://github.com/injamhaqq/foremention/issues/493).

### Integrated-release acceptance and ownership
- Founder's instruction to continue to completion is an instruction to make FM-03 engineering progress. This document **does not invent explicit signoff for an unreviewed final combined visual** or waive FM-00/FM-08 integration controls.
- **FM-00** reconciles conflict ownership with stacked #440 (homepage, contact, public shell and CSS), reviews combined PR #496 alongside specialist PRs, obtains founder visual acceptance of the final *combined* render, and authorizes merge sequencing.
- **FM-08** validates final code/security and production release policy, including manual screen-reader testing where required and trustworthy production-authenticated acceptance. The existing local synthetic authenticated journey is not production proof.
- Do not merge or deploy a PR while draft, pending exact-SHA CI, without authorization, or without exact-main release-plan verification. After authorized merge, validate the production `/api/health` `buildCommit` equals the resulting deployed commit, then perform live public-route and pilot-anchor smoke checks. Preserve rollback.
