---
name: foremention-release-gate
description: Run Foremention release verification and report exact evidence before merge or deployment.
disable-model-invocation: true
---

# Foremention Release Gate

Use this skill only when explicitly asked to verify, merge, or deploy a Foremention change.

Operating discipline: RED -> GREEN -> VERIFY.

## Required order

1. Confirm exact branch/head SHA and PR state.
2. Run `pnpm test`.
3. Run `pnpm lint`.
4. Run `pnpm typecheck`.
5. Run `pnpm build`.
6. Run configured security / CodeQL / quality workflows without weakening them.
7. Run browser acceptance and accessibility checks.
8. Visually verify 1440, 1024, 768, 375, and 320 layouts for affected public/product surfaces.
9. Verify reduced-motion behavior, retired visual identity absence (including no white/reverse/inverse variants or old assets), SEO metadata/crawlability, and performance.
10. Merge only the exact SHA that passed the gate.
11. Verify the exact `main` merge SHA and production deployment.
12. Run production smoke/canary acceptance and report evidence.

## Non-negotiable boundaries

- Do not delete or weaken tests simply to make a gate green.
- Do not restore or invent visual identity assets as part of release cleanup.
- Do not alter auth, Supabase RLS, organization isolation, secret boundaries, provider boundaries, billing/webhook semantics, or evidence integrity unless the change explicitly requires it and has dedicated review.
- Do not claim production success from a build alone.
- Do not claim a workflow passed unless the exact-head run proves it.
- Do not merge a moved head using stale verification.

## Reporting

Report: exact SHA, each required gate, production deployment identity, browser acceptance, accessibility/responsive result, retired-identity absence, remaining risks, and whether the release is GREEN / YELLOW / RED.
