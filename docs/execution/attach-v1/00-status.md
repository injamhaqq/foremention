# FM-00 — coordinator status — 2026-10-13 (IST) checkpoint: REBUILT ON NEW 01/04/06 HEADS

**Branch:** `fm-attach-v1/00-coordinator` (draft PR #562). **Canonical base:** `main@6b93c88cd22653fb17c9bec5ca91ca4e997d76b9` (re-fetched ~19:00 IST, unchanged). **Composed code candidate:** `2e318adc` (supersedes `5425d1ee`). Commits after it touch only `docs/execution/attach-v1/00-*`. **State:** INTEGRATION CANDIDATE READY FOR INDEPENDENT ACCEPTANCE — not a release; no readiness tier certified.

## 0. Rebuild checkpoint (~19:00 IST) — supersedes §1–§2 gate numbers below
1. Re-fetched all ten heads; each matched the handoff SHA. Resumed from `327237d6`.
2. Composed new heads `--no-ff`: 01 `3db135ad` (merge `94815ebe`), 04 `69a8e053` (merge `b9c75fad`), 06 `99a0d9c7` (merge `68f1c867`). 0 conflicts.
3. Adopted byte-identical in `2e318adc`: Chat04 `20261013140000_chat04_customer_value_loop_persistence.sql` (CV-05/A15) and Chat06 `20261013150000_chat06_email_delivery_claim_settle.sql` (CV-12; caller flag-off). A11 route (Chat04 caller on `update_prompt_versioned_in_project`) composed. Chat08 commercial-proof migration **still held back**.
4. PGlite 0.5.9 (scratch, outside lockfile): **101/101** migrations; RLS 10/10; Chat04 probe 17/17; Chat06 probe 21/21 (composed tree). Receipt: `00-proposals/composition-receipt.md` §6.

| Gate | Local @2e318adc | GitHub @2e318adc (pull_request on #562) |
|---|---|---|
| Tests | **1560 / 1560 pass, 0 fail, 0 todo** | CI run 38406013939 **success** (1560/1560; Supabase-local replay applied both new migrations, 101 files ×2 replays) |
| Typecheck / Lint / Build | pass / 0 errors, 11 pre-existing warnings / build complete | in CI — success |
| CodeQL + Analyze JS/TS, Security (actions-security, osv, secrets, trivy, dependency-review), semgrep-policy, quality, billing-provider-contract, benchmark | — | **all success** |
| Isolated Authenticated Journey | — | **success** (local Auth/PostgREST/Worker; not a real-Supabase receipt) |
| Browser Acceptance | — | see PR #562 comment (was in progress at write time) |
| Workers Builds (Cloudflare) | — | failure (fails on every head incl. main; founder decision 10) |

Blocker delta (reconciliation-71.csv): **precise blocker 7 rows / 4 IDs → 4 rows / 2 IDs.** CV-05 → external/customer-evidence gate (SQL adopted; real reload + later cycle need the nonprod approval step). A15 → implemented and tested (composed; signed-in reload pending). A11 stays blocker, narrowed to the phase-2 revoke of the legacy org-only RPC (+ founder authorization-boundary decision). A16 unchanged (ruleset admin setting; re-read via API). Totals: verified 6/4, implemented 33/22, manual bridge 5/3, deferred 1/1, external gate 22/15, precise blocker 4/2 = 71 rows / 47 IDs.

Pricing flag (no change made): `app/pricing/page.tsx` shows Signal **$299 / month** ("Proposed · not yet purchasable"); `scripts/setup-paddle-sandbox-catalog.mjs` and the 2026-10-11 Paddle sandbox evidence use Signal **24900 ($249)**. Founder decision 4 must reconcile before any live catalog.

---
## Previous checkpoint (5425d1ee) — kept for history
## 1. What was done this checkpoint
1. Re-fetched all ten `fm-attach-v1/*` heads; each matched the expected SHA. Resumed from prior checkpoint `2aa0c335` (not restarted).
2. Composed all nine worker heads onto this branch (`--no-ff`, provider-first order 01→02→03→06→04→05→07→08→09). 0 conflicts, 0 shared changed paths. Details: `00-proposals/composition-receipt.md`.
3. Reviewed every worker migration/schema/code proposal. **Adopted** (integration branch only): Chat03 reservation-settlement migration (required by composed billing routes), Chat02 project-bound prompt RPC migration (A11), Chat02 IPv6 SSRF guard patch (closes the last `todo`). **Held back:** Chat08 commercial-proof migration (sound, 17/17, but no consumer and touches a drifted production constraint), Chat04/Chat01/Chat06 prose-only schema proposals, live-pay CSP/$299 offer. Reasons + reopening conditions in the receipt §3.
4. Replayed all migrations on disposable PGlite 0.5.9 in `/workspace/work/pkg00-scratch` (outside the lockfile; never production): main 97/97, composed **99/99**; RLS probe 10/10; A11 probe 4/4; settlement 8/8; capacity 5/5.
5. Ran composed gates locally and pushed; GitHub CI ran on the pushed head (§2).
6. Reconciled all **71 index rows / 47 IDs** (`00-proposals/reconciliation-71.csv`), wrote interface contracts, the dependency-ordered PR/migration/config/rollback plan, readiness, the one approval step and the founder decision list.

## 2. Gates
| Gate | Local @5425d1ee | GitHub @5425d1ee (pull_request on #562) |
|---|---|---|
| Tests | **1530 / 1530 pass, 0 fail, 0 todo** | CI run 38395417070 **success** (includes isolated Supabase-local migration replay of 99 migrations, lint, typecheck, build) |
| Typecheck | pass | (in CI) |
| Lint | 0 errors, 11 pre-existing warnings | (in CI) |
| Build | vinext build complete | (in CI) |
| Security / CodeQL / AI Safety / Semgrep / Billing Provider Contract / Source Extraction Benchmark | — | **all success** (38395417088 / 38395417208 / 38395417254 / 38395417149 / 38395417064 / 38395417043) |
| Isolated Authenticated Journey | — | **success** 38395417345 (local Auth/PostgREST/Worker; not a real-Supabase receipt) |
| Browser Acceptance | — | in progress at write time (prior heads: public only, authenticated=skipped) |
| Workers Builds (Cloudflare) | — | not readable here; fails on every head incl. main per Chat09 (founder decision 10) |

## 3. Reconciliation (71 rows / 47 IDs) — `00-proposals/reconciliation-71.csv`
| FM-00 disposition | Rows | IDs | IDs |
|---|---:|---:|---|
| Verified current pass (nonproduction, composed) | 6 | 4 | CV-07, A04, A12, A29 |
| Implemented and tested fix (runtime/deploy acceptance pending) | 31 | 21 | CV-01, CV-02, CV-03, CV-08, CV-11, CV-12, CV-17, A01, A02, A03, A08, A09, A10, A13, A14, A17, A21, A25, A26, A27, A28 |
| Explicit manual bridge | 5 | 3 | CV-13, A06, A23 |
| Deferred with reopening condition | 1 | 1 | CV-18 (≥3 retained customers with the same blocker + paid request) |
| External approval / customer-evidence gate | 21 | 14 | CV-04, CV-06, CV-09, CV-10, CV-14, CV-15, CV-16, A05, A07, A18, A19, A20, A22, A24 |
| Precise blocker | 7 | 4 | CV-05 & A15 (decision `save_key` persistence not specified as SQL by 04), A11 (caller must move to the new RPC; phase-2 revoke), A16 (ruleset bypass `always`, strict off) |

Changes vs Chat09's 2026-10-13 matrix: A04 BLOCKED→verified (composed suite + CI green; QA09-B7 closed); CV-04 BLOCKED→external gate (code-level isolation green; needs disposable Supabase); A11 stays blocker but its migration half is now in the candidate. A01–A24 appear in both `_29` and `_24`; each pair shares one disposition, rows kept separately. No row was dropped or merged across different IDs.

**Missing-file boundary (corrected).** This workspace holds only the package index files. The 18 original source reports are **not present in this run**; the 2026-10-12 checkpoint's "18/18 SHA-verified from a stored archive" claim cannot be re-verified here and is withdrawn as unverified. Independently re-verified (by Chat07, byte-identical after LF→CRLF): `Foremention_Repository_Register_124.csv` = `docs/repository-register/register-2026-10.csv` on main; competitor source register + knowledge pack = PR #535 head `c79608d9`. **Missing:** `Repository_Register_67.csv` (67 rows carried by Chat07 from 2026-10-12, not re-verified) and `Foremention_Master_Backlog_28_v2.csv` (never fabricated). Route (71) and surface-state (92) originals are unavailable, so row-level route/state mapping is blocked; a current-code inventory replaces it: `00-proposals/route-inventory-composed.csv` (151 entries: 72 pages, 79 API routes; 26 changed by the composition).

## 4. Contracts, plan, readiness
- Interface contracts C1–C8: `00-proposals/interface-contracts.md`.
- PR / migration / configuration / rollback order (starts with a recovery point; Supabase prod has no backups): `00-proposals/release-and-rollback-plan.md`.
- Readiness: free design partner **not certified** (closest), paid pilot **not certified**, self-service **NO-GO**, 20-customer **NO-GO**; Stage-0 exit not evidenced. One approval step + 16 founder decisions: `00-proposals/readiness-and-approval.md`.

## 5. Pending / next action
- Chat09 independent acceptance on the exact head named in the #564 comment (requested 2026-10-13).
- Owner follow-ups: Chat04 move the prompt route to `update_prompt_versioned_in_project` and deliver SQL for `save_key` / `question_set_version` / nine-field context / optional `setup_only`; Chat01 adopt the IPv6 lines on its branch; Chat06 email claim/settle SQL.
- If any worker head moves, re-compose and re-run gates; do not reuse this receipt.
- No unattended work continues after this turn.

## Hard limits honoured
No merge to main, no deployment, no production DB access or migration, no Paddle/billing change, no spend, no outreach. Migrations were applied only to an in-process disposable PGlite database and in GitHub CI's throwaway Supabase-local container.

**Rollback:** close PR #562 or reset this branch to `2aa0c335`; worker branches are untouched.

---
## History
- 2026-10-12 `7c14d7ed`…`2aa0c335`: documentation-only coordination plan, 71-row crosswalk (`00-proposals/backlog-crosswalk.md`, superseded by `reconciliation-71.csv`), peer snapshot. Container then lacked git network; no tests were run.
