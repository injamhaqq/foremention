# FM-00 readiness verdicts, the one external approval step, and founder decisions — 2026-10-13

Evidence classes: composed local gates + CI at the exact head + disposable PGlite replay = **nonproduction**. There are **0 paying customers, $0 cash, 0 recorded qualified interviews, 0 Paddle transactions** (Chat03/08 read-only receipts). Nothing is deployed; production serves `b13e5327`.

## Readiness (separated)

| Tier | Verdict | What the composed candidate now covers | What blocks it |
|---|---|---|---|
| **Free design partner (founder-led)** | **NOT CERTIFIED — closest; conditional GO is possible after the approval step below** | Tenant/route isolation tests, fail-closed measurement, 1–5 approved questions, role-bound share/export, recovery/cancel fencing — all green on one composed tree | No signed-in browser journey (authenticated=skipped everywhere); no token-bound RLS run on real Supabase; decision save/reload SQL adopted at `2e318adc` but not yet exercised on real Supabase (A15/CV-05); no production recovery point; candidate not deployed. Manual bridges allowed: founder-run second collection, labour/account logs |
| **Paid founder-led pilot** | **NOT CERTIFIED** | Paddle adapter, verified-event entitlements, reservation settlement migration (replayed) | Everything above + Paddle sandbox lifecycle receipt (no sandbox key), pricing/offer decision, legal/payout/entity (CV-15), recovery point, A16 merge gate |
| **Self-service paid** | **NO-GO** | — | Above + account help before workspace (A26 "Workspace not found" on ~35 routes), live pricing approval, signed-in a11y/mobile, refund/cancel/export/deletion end-to-end, ruleset bypass removed |
| **20 customers** | **NO-GO** | Capacity model (06 `capacity-model-1-5-20.md`) as a hypothesis only | Workers Free CPU-limit incidents (A17, spend decision), no measured support load/retention/second cycles, no restore drill on real infra, no distribution channel (CV-16) |

Stage-0 exit (issue #283: 3–5 active partners, ≥1 paid pilot/commitment, ≥2 orgs with a second reviewed cycle): **not evidenced**.

## The ONE concrete external approval step (for the founder)

> **Approve a $0 nonproduction validation of composed SHA `<see 00-status.md>` by replying "Approved: FM-00 nonproduction validation" on PR #562.**
>
> Scope of the approval, and nothing more: (1) create **one new, empty Supabase Free project** named `foremention-acceptance` (not production; Free plan, $0); (2) FM-00/Chat09 apply the 101 repo migrations (as of code `2e318adc`) to it, seed two synthetic organisations (A/B) with synthetic users, and add its URL/anon/service keys plus two dedicated acceptance logins as **GitHub Actions secrets** (entered by the founder through GitHub's secret UI, never in chat); (3) run the existing `isolated-authenticated-journey` and `browser-acceptance` workflows (signed-in) and Chat09 scenarios QA09-01…35 against it; (4) tear-down allowed by deleting the project.
>
> Explicitly excluded: production database, deploy, merge to main, Paddle live or sandbox activation, any paid API call, any customer data or outreach.
>
> Why this one first: it is the cheapest step that converts the largest number of rows from "tested in memory" to "verified on real Postgres/GoTrue" (CV-04, CV-08, A04, A11, A15 reload, A26/A27 role matrix, CV-17/A21/A25 signed-in UI) and it rehearses the Postgres-17 replay that every production migration needs.

## Founder decisions (collected; nothing was asked mid-run)

1. **Recovery point** before any production migration: Supabase Pro backups or encrypted off-site `supabase db dump`; then a restore drill into a disposable project (release plan Step 0). *Blocks every migration.*
2. **The approval step above** (disposable acceptance project + acceptance credentials).
3. **Paddle sandbox** credentials, sandbox catalog and a staging host (connected key is live-only). Live billing stays off.
4. **Pricing/ICP**: $299 agency pilot vs $3k/$6k SaaS vs the live catalog (USD 99/299 monthly). Until decided, no price appears in product copy. **Discrepancy flagged 2026-10-13 (not changed):** `/pricing` shows Signal $299/month while `scripts/setup-paddle-sandbox-catalog.mjs` and the 2026-10-11 sandbox lifecycle evidence used Signal 24900 ($249).
5. **Ruleset 20223161 (A16)**: remove/limit `RepositoryRole` bypass `always`, enable strict status checks, decide whether the alert-gating `CodeQL` check is required.
6. **Project as an authorization boundary (A11)** for agency client-viewers: the Chat04 route already calls `update_prompt_versioned_in_project` (composed at `2e318adc`); if yes, FM-00 ships the phase-2 revoke of the org-only RPC; broader per-project RLS would be a new design.
7. **Drift M0**: apply the missing customer-confirmed-value migration in production (after 1) and identify the production-only `rls_auto_enable()` (do not drop blindly).
8. **Chat08 commercial-proof schema**: record commercial evidence in the production DB (adopt held migration) or keep it in founder-owned sheets (manual bridge).
9. **Workers plan / CPU limit (A17)** — spend decision.
10. **`Workers Builds: foremention-mvp`** fails on every head including main: expected, or a broken Cloudflare Git deploy path? Production is still on `b13e5327`.
11. **Legal/entity**: entity, IP, payout/bank, tax, agreements, refund policy (#509), subprocessor/data-handling copy (CV-15, A20, A24).
12. **Copy approval** for A19 hero/sample wording.
13. **Commercial RSS/Brave rights (A07)** and whether Perplexity is re-enabled via a paid Agent-API receipt (CV-03).
14. **A06 attestation**: confirm credential rotation/revocation and log retention for issue #323.
15. **Incident contact** and alert channel for interrupted runs/backup failures (CV-12).
16. **Merge strategy** when ready: single integration PR #562 (recommended) vs per-worker PRs in dependency order.
