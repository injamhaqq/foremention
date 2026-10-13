# Chat05 — website, copy, UX and SEO — status

- Branch: `fm-attach-v1/05-website-ux` · Base: `main@6b93c88cd22653fb17c9bec5ca91ca4e997d76b9`
- Draft PR: #569 · Updated 2026-10-13 (replaces the 2026-10-12 record, which wrongly said no tests had run)
- Source boundary: the 18 original source files were not attached and `Foremention_Master_Backlog_28_v2.csv` is missing; work used the index rows, current code, state docs and peer status files. Line-by-line reconciliation against the route inventories and the 92-state register is NOT done.

## Implemented (original IDs)
- **Locked copy restored:** homepage hero lead and SEO description reverted to main (earlier run broke 9 locked-copy tests).
- **A01 public intake:** `lib/public-intake-state.ts`; `/contact` success only from a server-side receipt lookup (`?submitted=1` alone never shows success); distinct not-returned / not-found / rate-limited / failed states. Source-gap Next route returns 503 without a database (old 202 "demo mode" removed) and 201 `{received:true, reference}` only with a stored row id. Worker D1 handler aligned (see proposals #4). Form keeps typed values after an error (switched to `onSubmit`).
- **A19 wording (`/source-gap`):** lead, evidence item, next-move item, limits line and meta description rewritten to promise a supported gap or an explanation, distinguish returned vs retrieved pages, and disclaim consumer-app monitoring.
- **A21 indexing:** noindex/nocache + no-referrer on `/unsubscribe`, `/invite/[token]`; `/report/[domain]` noindex when unavailable; `not-found` noindex; `/pricing` noindex kept.
- **A25 / layout / a11y:** `/sample-report` 1024px overflow fixed; metric labels 9px→12px; 404 eyebrow contrast 2.93:1 fixed; duplicate `<main>` on `/api-docs/webhooks` removed; unsubscribe invalid-link dead end now links to Settings and home.

## Verification
- Local, final source: `pnpm test` 1328/1328 pass; typecheck pass; lint 0 errors (10 warnings in other owners' files); build pass. `tests/fm05-website-ux-contract.test.mjs` 12/12.
- Measured (headless Chromium, local build + local Worker/D1): 30 routes × 320/375/768/1024/1440 no horizontal overflow; 0 axe WCAG 2.1 AA violations at 375/1440; one h1 and one main per page; skip link first Tab stop with visible focus; no animation under reduced motion; forged/failed/429 contact URLs never show success; real source-gap save → 201 success; 429 announced with values kept.
- Production (read-only): no `X-Robots-Tag` anywhere; `/unsubscribe` no robots meta; unavailable `/report/*` indexable; robots.txt and 17-URL sitemap sound.
- Not measured: Lighthouse/performance (CI only), signed-in onboarding contrast live, <24px targets spacing exception, 200% zoom, Firefox/WebKit, action-detail dialog focus (needs Chat04 fixture), rendered unsubscribe link after final change (Playwright cache blocker, source test only).

## Gates
FM-00 review of `worker/index.ts`; Chat09 composed acceptance; `/pricing` noindex until commercial truth confirmed.

## Founder decisions
1. Approve/reject the A19 `/source-gap` copy.
2. Should unavailable public `/report/*` pages exist?
3. Legal/support/cancellation truth before a refund page (#509) or live pricing claim ($299 live vs "Proposed").
4. Confirm `/app/settings` as unsubscribe help destination.

Proposals: `05-proposals/handoffs-2026-10-13.md`, `05-proposals/cross-owner-gates.md`.
