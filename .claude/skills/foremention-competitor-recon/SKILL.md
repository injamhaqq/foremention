---
name: foremention-competitor-recon
description: Evidence-led research on AI visibility competitors, with optional REA inspection of publicly observable product workflows and a safe Foremention handoff.
user-invocable: true
---

# Foremention competitor reconnaissance (research/dev only)

Use this workflow when asked to investigate Profound, Peec AI, Otterly.AI, Scrunch, Semrush, Ahrefs or a comparable product, or to apply REA to a competitor feature. Read `CLAUDE.md`, `.claude/skills/foremention-product-truth/SKILL.md`, `FOREMENTION_STATE.md`, `docs/integration-boundaries.md` and `docs/research/rea-competitive-investigation-2026-10-11.md` first. Resolve conflicts in favor of newer verified product truth and Stage-0 customer-proof gates.

## Tool routing and install boundary

REA (morluto/rea; npm package `rea-agents`) is an optional **local development investigation tool**, never an AI answer provider, customer data collector, production Cloudflare Worker dependency, or replacement for Foremention's question/record/evidence/comparison pipeline.

- For a competitor's public website, first obtain first-party product documents, help articles and visible pricing. URLs, help copy and marketing screenshots establish what is advertised, not the underlying implementation or authenticated behavior.
- Use REA only when the task requires shipped-client JavaScript, actual browser observations, source maps, or a reproducible flow unavailable through source/document review. For public GitHub source, prefer normal GitHub/source inspection; do not reverse engineer code already available.
- Use existing REA MCP tools if connected. Otherwise, ask for approval of any setup/installation; prepare a dry-run plan, e.g. `npx rea-agents@6.4.0 setup --client claude_code --dry-run --json` for Claude Code or substitute `codex`; review proposed user-level modifications. Do not silently run setup or edit `.mcp.json`. The skill alone is not an MCP registration.
- `rea list-browser-targets` and `rea inspect-web-page` observe a user-owned Chrome-family browser on a loopback CDP endpoint. Keep the debugging port loopback-only and use a dedicated, disposable profile. Never attach to browsers holding live customer/vendor sessions, cookies, credentials, email, billing, or client secrets.
- Work on public non-authenticated pages; do not bypass CAPTCHA, access controls, payment gates, rate limits, robots/terms, or private APIs. No mass scraping, authentication/session interception, or harvesting secrets.
- If an inspected page returns source code or scripts, preserve only necessary high-level architectural observations. Do not transplant competitor proprietary code, assets, text, trademarked design, data, or inferred backend API internals. Independently implement only lawful generic behavior in Foremention.

## Evidence contract

For each competing feature, record:
- vendor/product; verified first-party URL; UTC observation date; public/authenticated/unknown visibility;
- test question and hypothesized buyer benefit; public page/workflow and observable controls;
- REA operation, target URL/version, `evidence_id` when actually returned, artifacts, coverage/unknowns; never fabricate an REA run;
- observed capability vs marketing claim vs inference; limitations/contradictory evidence;
- closest Foremention route/file/object (Questions, Recommendation Record, reviewed Evidence, Competitor tracking, Comparisons, Change Specification);
- duplicate-present vs measurable pilot blocker; implementation candidate with smallest viable scope;
- buyer validation needed, acceptance tests and rollback strategy.

Write research-only findings under `docs/research/`, not to Supabase, seeded demo, customer Recommendation Records, marketing copy, or a signed-in customer UI. Customer records must originate from supported tenant-scoped measurement, never from third-party marketing pages or competitor reverse engineering.

## Prioritize and implement

1. Check `docs/research/rea-competitive-investigation-2026-10-11.md` and any open competing PRs before a new work item.
2. Prefer fixing irrelevant/unsupported citations, missing evidence, or a real customer's failure to reach a reviewed decision over adding a generic dashboard.
3. Rank by documented user need, evidence quality, reusable Foremention capability, Stage-0 customer value, implementation risk, license/privacy risk, and verification cost. No invented conversion or ROI.
4. Produce a short evidence matrix and **one** scoped recommendation: ADOPT ORIGINAL PATTERN / ADAPT / DEFER / REJECT, with explicit unknowns.
5. If justified by a user-approved pilot blocker, implement on an isolated branch, preserve RLS/tenant isolation, provenance, exact comparability, human review, and brand identity; write regression tests and open a review-only PR. No direct merge/deploy or new production integration by default.

### Ready-to-run research task

Investigate the public *missing buyer questions / competitor cited-source gap* workflow in Semrush and Peec AI, using official pages first and optional REA observation of a dedicated public browser. Explain what is demonstrably implemented, what remains unknown behind login, and how Foremention already handles the corresponding data. Propose one small evidence-grounded improvement to the existing Questions -> Records -> Evidence -> Opportunities -> Comparisons -> Change Specification journey. Do not clone competitors' code or design. Do not claim REA runtime evidence unless it was actually collected.
