# FM-00 dependency-ordered PR / migration / configuration / rollback plan — 2026-10-13

**Status: PLAN ONLY.** Nothing below has been executed against production. No merge to main, deploy, production DB access, Paddle/billing change, spend or outreach is authorised by this document. Every production step needs its own explicit founder approval.

**Production facts this plan must respect** (from Chat06 read-only evidence, `06-proposals/restore-and-rollback-plan.md`, 2026-10-13): Supabase project is production, Postgres 17.6; **no backups (`backups: []`), PITR off**; production ledger has 100 rows vs 97 repo files (31 unmatched); production lacks the customer-confirmed-value objects; production has an extra `rls_auto_enable()`; production app serves `b13e5327`, not main `6b93c88`.

## Step 0 — Recovery point (mandatory, first, founder-only)
1. Founder creates a recovery point: upgrade to Supabase Pro (daily backups) **or** `supabase db dump` (roles, schema, data — three files) to encrypted off-site storage using the DB password. Record time, sizes and sha256 in the release record (not in git).
2. Restore that dump into a **disposable** Supabase project and run Chat06 `tools/catalog-fingerprint.sql` on both; catalog digests must match (same drill Chat06 rehearsed locally on PGlite).
3. **Stop condition:** no recovery point or failed restore drill ⇒ no migration, no merge that requires one.

## Step 1 — Pre-flight on the disposable project (nonproduction)
1. Replay all 99 repo migrations on Postgres 17 (disposable Supabase project) — closes the PG18/PG15 fidelity gap.
2. Run Chat02 RLS probe + A11 probe + Chat03 settlement/capacity probes there; run CI workflow `isolated-authenticated-journey` and Chat09 QA09-01…35 against it (this is the founder approval step in `readiness-and-approval.md`).
3. Re-export the production ledger/catalog fingerprint read-only immediately before Step 3; abort if it changed since the drill.

## Step 2 — Code integration order (PRs)
Recommended: merge **PR #562 as the single integration PR** — its tree is exactly what passed the composed gates and contains every worker head as a merge commit (history preserved). Then close #563–#571 as "merged via #562". Only allowed after: CI green at the exact head, Chat09 independent acceptance comment on #564/#562, founder approval, and the A16 ruleset fix (otherwise a bypass actor can merge red).

If the founder prefers per-worker merges, the dependency order is: #565 (01) → #567 (02) → #566 (03) → #570 (06) → #563 (04) → #569 (05) → #568 (07) → #571 (08) → #564 (09) → #562 (FM-00 migrations + SSRF patch + docs); re-run full gates after each, because worker PRs are individually green but were only verified **together** on the composed head.

## Step 3 — Production migrations (only after Steps 0–1), in order
| # | Migration | Type | Must precede | Rollback |
|---|---|---|---|---|
| M0 | Founder decision on drift: apply the missing customer-confirmed-value migration (repo file already exists) and map the private ledger; **no `supabase migration repair`, no blanket `db push`** | additive columns/FKs/trigger | M1/M2 (so ledger and catalog line up) | restore from Step 0 point, or drop the added columns/trigger/function after confirming no rows use them |
| M1 | `20261013090000_billing_checkout_reservation_settlement.sql` | additive functions, service_role | code deploy (reconcile route returns 503 if RPC missing; webhook settle is best-effort) | `drop function public.settle_paddle_checkout_reservation(uuid,text,text); drop function public.release_paddle_checkout_reservation(uuid,uuid,text);` — reconciled rows keep their evidence |
| M2 | `20261013100000_update_prompt_versioned_in_project.sql` | additive function | Chat04 caller change | `drop function public.update_prompt_versioned_in_project(uuid,uuid,uuid,text,boolean,text);` |
| M3 (later) | Phase-2 revoke of `update_prompt_versioned(uuid,uuid,text,boolean,text)` from `authenticated` | privilege change | — | `grant execute … to authenticated` |
| held | Chat08 commercial proof fields | see composition-receipt §3 | — | rollback in proposal file |

Apply each in its own transaction (files already wrap `begin/commit`), record time + ledger row + catalog fingerprint after each, one at a time, never in the same window as a code deploy.

## Step 4 — Configuration (all off by default)
- Paddle: **sandbox only** (`BILLING_PROVIDER`/Paddle sandbox keys on a staging host); live catalog, prices, CSP for live checkout untouched. Live activation is a separate founder decision.
- Webhook/egress flags stay **off** (A13: DNS rebinding cannot be pinned from Workers fetch).
- Perplexity stays disabled (CV-03). Groq onboarding goes through internal-model admission (CV-07/A29).
- Inngest: new recovery sweeper registers on next `/api/inngest` sync; schedules remain 0 enabled in production until a design partner exists.
- No new secrets are introduced by the composed code beyond those already used by owners (verify with owner status files before deploy).

## Step 5 — Deploy (founder-run)
`production-deploy.yml` is `workflow_dispatch` only. Deploy the exact merged SHA; verify `buildCommit` in the production provenance check equals it (today that check fails because prod = `b13e5327`). Then run browser-acceptance with acceptance credentials and the first-evidence canary.

## Rollback matrix
| Failure | Action |
|---|---|
| Code regression after deploy | Redeploy previous build (`b13e5327` is today's production build) via `production-deploy` dispatch; migrations M1/M2 are additive and safe to leave in place |
| M1/M2 problem | Drop the added function(s) (above); no data change |
| M0 / data damage | Restore from the Step 0 recovery point (drilled in Step 0.2) |
| Integration branch rejected | Close #562; worker PRs remain independent; nothing on main changed |
