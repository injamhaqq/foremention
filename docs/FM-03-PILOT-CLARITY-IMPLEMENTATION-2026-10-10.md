# FM-03 — Pilot comprehension and mobile navigation patch

**Date:** 2026-10-10  
**Base:** `d4fea60a7bb8e047f2282cea9134121e9496c67e`  
**Owner:** FM-03; **integration authority:** FM-00  
**Status:** Draft, review-only; **not approved for merge or deployment**.

## Before / after design preview

Before: the approved graphite/registered-green hero had an existing promise, short product lead, two CTAs, sample evidence graph and technical boundary; pilot audience and the three practical steps required further page navigation.

After: preserve that exact hero, two CTA labels/order, canonical reverse logo SVGs and interactive sample graph. Place a small, left-column, separator-delimited three-step list under the lead: **B2B software marketing and growth teams → five buyer questions → inspectable evidence → one approved change to test**. Keep both existing CTAs and add an explicit provider-surface limitation in the small print. No logo, color token, illustration, full-page visual direction or product behavior is replaced.

At narrow widths, the new three-step list stacks in DOM order instead of forcing a long inline row. The mobile navigation summary uses the neutral accessible name **Site navigation** in both collapsed and expanded states instead of incorrectly saying **Open navigation** when it is open. No JS menu framework or dynamic ARIA state is introduced.

## Scope

- `components/goat-home-experience.tsx`: one semantic `ol` for intended buyer and founder-led pilot scope; clear example-provider limitations.
- `app/public-cinematic-home.css`: scoped styles and <=620px stacking only; existing brand colors reused.
- `components/public-shell.tsx`: accessible mobile navigation summary name only.
- `tests/fm03-public-pilot-clarity.test.mjs`: static regression guards.
- No package manifest, lockfile, dependencies, identity assets, analytics, API routes, Supabase, auth, Inngest, Cloudflare config or production system changes.

## External-source decisions

All six candidate repositories were evaluated; **none is required as a runtime dependency for this narrow patch**:
- `mui/base-ui` MIT: prefer for a future proven focus-management defect requiring a custom dialog/menu; the existing native `details` and `select` have no demonstrated need for replacement.
- `radix-ui/primitives` MIT: alternative to Base UI, not both together for one control.
- `shadcn-ui/ui` MIT: selective reference only; no Tailwind/style migration.
- `motiondivision/motion` MIT: current CSS and site-motion code already support reduced motion; no new animation necessary to explain this scope.
- `cathrynlavery/diagram-design` MIT: editorial diagram guidance (few steps, one controlled accent) informs the static, scannable sequence; no borrowed source.
- `lucide-icons/lucide` ISC plus MIT-derived Feather icons: current `Arrow` is already coherent, so no new icon set or risk to canonical logo assets.

GitHub project-license notices apply if future source/packages are redistributed; **no third-party code has been copied into this patch**.

## Integration and release gates

PR #440 overlaps `components/goat-home-experience.tsx`, `app/public-cinematic-home.css`, and `components/public-shell.tsx`. This PR must **not be auto-merged**. FM-00 must reconcile the write-set/merge order. Material visual direction requires founder review under `CLAUDE.md`. FM-08 must verify auth/billing/source evidence regressions remain absent.

**Still required:** run `pnpm install --frozen-lockfile && pnpm test && pnpm lint && pnpm typecheck && pnpm build` on the exact head; GitHub Actions browser acceptance, keyboard/screen-reader checks, 1440/1024/768/375/320 responsive screenshots, forced colors, reduced-motion, identity assets and performance; staging preview/screenshots; founder approval; FM-00 integration permission; exact-SHA production validation after any separately authorized merge.

No screenshot, deployment, real-user conversion change, production uplift, axe or Lighthouse result is asserted by this implementation note.
