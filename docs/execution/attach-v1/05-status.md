# Chat05 — website, copy, UX and SEO checkpoint

**Date:** 2026-10-12. **Role:** Chat05, isolated public site/intake/style/SEO worker. **Base:** `main@6b93c88cd22653fb17c9bec5ca91ca4e997d76b9`. **Branch:** `fm-attach-v1/05-website-ux`. **Integration authority:** FM-00. **Production status:** NOT deployed and NOT verified. **Draft PR:** see matching branch's GitHub PR; no main merge authorized.

## Changed files (only owned website code, namespaced tests and handoff)

- `app/compare/[competitor]/page.tsx`: remove unsupported claim that outside pages "shaped the answer"; distinguish provider-returned references, independently retrieved pages, human review, and causality; qualify URL provenance and later-reference claims in all three comparison types.
- `app/api-docs/webhooks/page.tsx`: add canonical title, description, OG/Twitter metadata through existing `pageMetadata`; restore existing `PublicShell`, and describe webhooks as conditional on configuration/enabling.
- `app/public-contrast-repair.css`: scoped six-step signed-in onboarding dark-surface contrast and 12px+ critical hints, explicit light-input ink, 44px review edit target, reduced-motion treatment. No palette/logo/IA redesign.
- `app/contact/page.tsx`: report rate limits accurately and distinguish unverifiable or repeat intake feedback from authoritative receipt confirmation.
- `components/goat-home-experience.tsx` and `app/page.tsx`: narrowly qualify hero lead/SEO summary to recorded AI observations and returned versus retrieved source distinction.
- `tests/fm05-website-ux-contract.test.mjs`: new namespaced source-contract/contrast calculations for A01/A19/A21/A25.
- `docs/execution/attach-v1/05-proposals/cross-owner-gates.md`: FM-00/Chat02/Chat04/Chat09 and legal/billing gates.
- This status record.

No new runtime dependencies, shared type or migration edits, security bypass, provider spend, real customer edits, email/outreach, payment activation, root CI config, deployment or main merge.

## Backlog original IDs and disposition

| Original reference | Historical rows | Current Chat05 disposition |
|---|---|---|
| CV-17 | Commercial_Backlog_18.csv:17 | **Partial**: code-level onboarding contrast/input/touch/reduced motion repaired; 320/375/768/1024/1440 visual, keyboard and recovery testing not run. |
| A01 | Foremention_Master_Backlog_29.csv:1; Foremention_Master_Backlog_24.csv:1 | **Partially already mitigated on main** via previously merged #513 receipt lookup; refined rate-limit/repeat UI. Server 201-without-receipt on duplicate remains cross-owner proposal; never infer persistence from `submitted=1`. |
| A19 | Foremention_Master_Backlog_29.csv:19; Foremention_Master_Backlog_24.csv:19 | **Partial fix**: precise homepage, comparison and SEO copy; other public and private source/provenance presentations not exhaustively verified. |
| A21 | Foremention_Master_Backlog_29.csv:21; Foremention_Master_Backlog_24.csv:21 | **Partial fix**: webhook docs SEO metadata and PublicShell; existing sitemap/robots/pricing noindex inspected but crawl/header/rendered SEO tests not run. |
| A25 | Foremention_Master_Backlog_29.csv:25 | **Source-level fix**: scoped visible foreground/background styles for wizard step/labels, review cells, hints. Dynamic browser computed-style measurements still needed. |
| CV-11 (presentation only) | Commercial_Backlog_18.csv:11, assigned 01 | **Consumer presentation only**: public references/citation/causality copy. Provider/record/export provenance contracts owned by Chat01/Chat04; not claimed integrated. |

**No inferred closure for any end-to-end backlog ID.** The source index includes **71 historical rows** from three historical CSVs; Chat05's assigned packet contains **8 historical rows**, not 8 independent verified current defects.

## Input/source coverage

**Physically received:** `START_HERE(5).md`, `PACKAGE_ID(5).json`, `PROMPT(5).md`, `SHARED_RULES(5).md`, `OWNERSHIP_AND_COORDINATION(5).md`, `Backlog_Source_Index(5).csv`, `Source_File_Checklist_19(5).csv`.

**NOT physically received:** original `Source_Files/` sources described in the checklist (18 marked included by packager but absent from this chat's upload); `Foremention_Master_Backlog_28_v2.csv` was flagged missing at packaging. In particular neither historical 71-route CSV nor historical 92-state CSV was available to perform line-by-line reconciliation. Their historical findings are leads only.

**Current repo files inspected directly:** `CLAUDE.md`, `FOREMENTION_STATE.md`, `docs/TESTING.md`, `docs/billion-dollar-build/EXECUTION-STATUS.md`, `app/page.tsx`, `app/contact/page.tsx`, `app/api/design-partner/route.ts`, `lib/design-partner-receipt.ts`, `components/public-activation-analytics.tsx`, `components/goat-home-experience.tsx`, `app/compare/[competitor]/page.tsx`, `app/monitoring-vs-execution/page.tsx`, `app/sample-report/page.tsx`, `app/pricing/page.tsx`, `app/api-docs/webhooks/page.tsx`, `app/robots.ts`, `app/sitemap.ts`, `lib/seo.ts`, root/app layouts, onboarding page/wizard/score bridge, relevant source/contrast/responsive/accessibility CSS, design-partner/public/SEO/responsive tests.

**Route directory inventory:** Github `main` recursive tree returned **72 `app/**/page.tsx` files** and **78 `app/api/**/route.ts` files**, of which a first-pass name-pattern classification marked **38 signed-in/auth/token-like pages** and **34 public-candidate pages**. This is a file existence classification, **not** rendered route/link/state/robots verification. Checked implementations: `/`, `/contact`, `/api-docs/webhooks`, dynamic `/compare/[competitor]`, `/sample-report`, `/pricing`, `/monitoring-vs-execution`, `/app/onboarding`; inspected SEO route generator + layouts. **Uninspected**: the remaining page contents, 78 API behavioral paths other than public intake, all 92 historical UI states, contact deliverability, error-email receipt, all modal/recovery transitions, private-token index responses, real OG previews, real browser performance, and complete crawl/link graph.

## Verification actually performed

- GitHub connector fetch of exact live repository files and isolation via branch created from SHA `6b93c88cd22653fb17c9bec5ca91ca4e997d76b9`.
- **15/15** connector-side assertions passed against files fetched from the worker branch: contact receipt/rate-limit/retry, source-truth wording, comparison causality, docs metadata/shell/conditional copy, and scoped contrast rules.
- Local WCAG mathematical contrast for approved colors on `#151817`: `#fffdf9` **17.59:1**, `#d7dbd5` **12.75:1**, `#9ea69e` **7.15:1**; `#65b58e` on `#0d0f0e` **7.83:1**. These are calculated tokens, **not browser-computed styles**.
- Existing repo Node test suite, eslint, TypeScript typecheck, build, GitHub checks, playwright/browser screenshots, Lighthouse/axe and current production HTTP tests were **not** executed by this chat: connector write/read was available but local repo clone failed due unavailable DNS and external website fetch was inaccessible.
- Existing source-level regression tests are preserved. This new namespaced test must be executed by exact-head CI before integration. Do not infer release readiness from connector assertions.

## External/peer dependencies and integration

- No `fm-attach-v1/00-coordinator` branch/status was found at the initial read. Refresh coordinator/peer exact-head records before integration.
- Cross-owner proposals at `docs/execution/attach-v1/05-proposals/cross-owner-gates.md`: duplicate claim's authoritative receipt, Chat04 action-detail focus/Escape/restoration, exact-head browser gates, private HTTP robots headers, legal support/refund/cancellation truth.
- PR #509 is a proposed refund policy and cannot be assumed merged. Existing `/pricing` noindex must stay until commercial truth is verified.
- FM-00 resolves shared changes, schema, tests/CI and composed verdict; Chat09 supplies independent acceptance.
- Rollback: revert these branch commits or decline the draft PR; no main or live state changed.

## Next checkpoint

Refresh exact `main`, worker/peer refs, and this branch's SHA; run `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, browser acceptance including five requested widths, and audit actual HTTP/SEO header behavior. Resolve any exact-head failures without overwriting other owner paths, and give FM-00 the draft PR and verified head. After independent peer fixture/receipt review, recheck integration and publish statuses; no background/unattended execution.
