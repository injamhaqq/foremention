# FM-03 — Founder review: pilot clarity and mobile navigation
Date: 2026-10-10
Base: `d4fea60a7bb8e047f2282cea9134121e9496c67e`
Status: draft UI implementation; **not founder-approved, not merged or deployed**.

## Proposed direction
Preserve the already-approved hero ("See where AI recommends your brand."), canonical reverse SVG artwork, graphite/registered-green system, illustrative recommendation graph, and existing request-pilot and explore-sample links. Beneath the lead sentence, add a compact, visually subordinate plain-language explanation of the audience and pilot journey:
- For B2B software marketing and growth teams
- Five buyer questions → Inspectable evidence → One approved change to test

Keep the technical graph but explicitly clarify that the example is Workers AI + Bing RSS grounded synthesis, *not* direct monitoring of consumer ChatGPT/Gemini/Perplexity applications. The mobile menu's summary label changes from "Open navigation" (inaccurate after opening) to "Site navigation" (accurate in both states).

## Why
Reduce qualified buyer uncertainty over who Foremention serves, what they bring, and what a pilot delivers. Claims stay evidentiary rather than promised results.

## What is locked
Brand art and company expression, public Recommendation Intelligence positioning, all authenticated application screens and navigation, sample data truth, human-reviewed Change Specifications, forms and API route logic, SEO, pricing claims and underlying providers.

## Collision and owner gates
PR #440 already modifies the public homepage, navigation, contact, and CSS. FM-00 should reconcile that exact-head diff and assign ownership before merge. CLAUDE.md requires founder's approval for the presented visual direction before material UI change can ship. FM-08 owns security/release verification.

## External dependency review
Verified 2026-10-10 from upstream repository LICENSE text:
- mui/base-ui: MIT; compatible in principle; **not installed**, as native menu/select/form semantics suffice for this scope.
- radix-ui/primitives: MIT; not installed; reserve for demonstrated focus-management defects.
- shadcn-ui/ui: MIT; not installed; no styling migration.
- motiondivision/motion: MIT; not installed; existing CSS/IntersectionObserver motion with reduced-motion treatment retained.
- cathrynlavery/diagram-design: MIT; inspiration only; no copied code/graphics/assets; existing graph retained.
- lucide-icons/lucide: ISC; not installed; existing icons/arrows retained.
No dependency manifest, lockfile, Cloudflare Worker, Next/Vinext configuration, or brand assets changed. If future external code is copied, retain the source license/notice and retest bundling/SSR.

## Verification requirements
This branch contains source-level node:test contract tests. Before merge, run `pnpm install --frozen-lockfile && pnpm test && pnpm lint && pnpm typecheck && pnpm build` on the exact PR SHA, then browser acceptance and manual responsive/a11y checks at 1440, 1024, 768, 375 and 320 px, keyboard and screen-reader semantics, reduced motion and production evidence after any authorized deployment. No screenshot artifact is claimed in this branch.
