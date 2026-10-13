# Chat06 — jobs, communications and recovery: status

**Role:** Chat06 (packet 06). **Branch:** `fm-attach-v1/06-operations`. **Base:** `main` @ `6b93c88cd22653fb17c9bec5ca91ca4e997d76b9` (still current main on 2026-10-13). **Head:** the branch tip on GitHub is authoritative (this file is committed inside it; the head SHA and CI receipt are recorded in draft PR #570). **Updated:** 2026-10-13 (second run; continues the 2026-10-12 checkpoint, prior commits kept).

## Source coverage

Assigned rows: **CV-12** (Commercial_Backlog_18 row 12), **A05 / A13 / A17** (Foremention_Master_Backlog_29 rows 5/13/17; Foremention_Master_Backlog_24 rows 5/13/17). Support rows: **A14** (owner Chat04; scheduling/admission/DST/cancel delegated to Chat06 by 04-status), **A18** (owner Chat01). The 18 original Source_Files were not attached to this run and `Foremention_Master_Backlog_28_v2.csv` is missing: work is from `Backlog_Source_Index.csv` rows, current repository code, `CLAUDE.md`/`FOREMENTION_STATE.md`, issues #283/#332/#504 and peer status files (00, 01, 02, 03, 04, 05, 09 at their 2026-10-13 heads). No unmapped finding outside these IDs except the backup gap (reported to FM-00 under CV-12/A05).

## Implemented this run (owned paths, test-backed)

| ID | Change | Files |
|---|---|---|
| CV-12, A14 | **Fenced terminal settlement.** Failure/cancel writes are compare-and-set from `queued|running`; never overwrite `review/complete/partial`; release capacity only when `queued AND started_at IS NULL`; retried handlers finish a lost release idempotently. Fixes: a late `onFailure` (e.g. after a notification step exhausted retries) used to turn a reviewable run into `failed` and send a false "run failed" notification; cancellation cleanup used to overwrite `review` runs as `cancelled`. | `lib/jobs/run-terminal-settlement.ts` (new), `lib/jobs/inngest.ts` |
| CV-12 | **Customer cancel route fenced.** CAS on `queued|running`; 409 if the collector reached review first; no `estimated_max_cost_usd=0` on a run that started between read and write. | `app/api/runs/[id]/route.ts` |
| CV-12 | **Interrupted runs.** Platform cancellation (Inngest start/finish timeout, dashboard cancel) of an active run now settles as `failed` with an explicit interrupted reason instead of masquerading as a customer cancel; new 3-hourly sweeper settles runs active > 140 min (lost events/unsynced app). | `lib/jobs/inngest.ts`, `app/api/inngest/route.ts` |
| CV-12 | **Replay-safe circuit-open path.** Exclusion rows were plain inserts outside `step.run`; the Inngest replay after the next step hit the unique attempt key and failed the function. Now one memoized, conflict-tolerant step; all `markRunFailed` calls are inside steps. | `lib/jobs/inngest.ts` |
| A14 | **Model pinned per run** (memoized step); on configuration drift no further provider calls, collected answers kept, never two models in one run. | `lib/jobs/inngest.ts` |
| A14, A18 | **Schedule model-pin hold** before any run/quota/budget when `model_snapshot` ≠ configured model; **bounded catch-up**: an overdue schedule runs once then jumps to the next future occurrence (was: one paid run per hourly pass per missed period). DST policy unchanged. | `lib/measurement-schedules.ts`, `lib/jobs/measurement-schedule-dispatcher.ts` |
| CV-12 | **Weekly digest dedup** key is ISO-week stable and memoized (was the UTC date of whichever day the job ran). | `lib/jobs/job-calendar.ts` (new), `lib/jobs/inngest.ts` |
| CV-12 | Observability: allow-listed log keys `scheduleId`, `reason`, `count` (no PII). | `lib/structured-logger.ts` |
| CV-12 (prior run, kept) | Same-origin `/app` alert links, stable Resend idempotency key, uncertain provider outcomes kept `pending`, 5xx = uncertain. | `lib/jobs/notification-delivery-policy.mjs`, `lib/workspace-email-alerts.ts`, `lib/application-email.ts` |

A13: no code change needed — current main keeps outbound webhooks off unless three explicit settings are present, checks public DNS before claim, refuses redirects, uses fenced 90 s leases; existing fm08-* suites cover it and still pass. Remaining A13 gates below.

## Tests and verification (run in `/workspace/work/fm-06`, Node 22.23.3, pnpm 10.25.0)

- New/updated Chat06 suites: `tests/06-run-terminal-settlement.test.mjs` (11), `06-collection-job-recovery-runtime.test.mjs` (7, replays `lib/jobs/inngest.ts` through an Inngest-style replay executor + in-memory PostgREST), `06-cancel-route-fencing-runtime.test.mjs` (4), `06-schedule-catch-up-and-pins.test.mjs` (8), `06-schedule-dispatch-runtime.test.mjs` (2), prior `06-notification-delivery-policy` + `06-workspace-alert-runtime` (10 combined) → **41/41 pass**. Harnesses: `tests/06-support/{fake-postgrest,inngest-replay}.mjs`.
- **RED proof against main:** the same runtime suites pointed at `main` sources (`FM06_INNGEST_SOURCE`, `FM06_CANCEL_ROUTE_SOURCE`, `FM06_DISPATCHER_SOURCE`): job recovery 0/7, cancel route 2/4, dispatcher 0/2 pass on main; all pass on this branch. Main's circuit path fails with `duplicate key value violates unique constraint on run_attempts`.
- `pnpm test`: **1357/1357 pass** (was 1326 at base + prior run). `pnpm typecheck`: pass. `eslint` on all changed paths: 0 errors/0 warnings. `pnpm build` (vinext + worker config): **pass**.
- GitHub Actions on the pushed head: see PR #570 checks (not claimed here).
- Not run: browser/accessibility/SEO gates (no UI change), live Inngest/Supabase integration, SQL against a real disposable Supabase.

## Operational / restore evidence (all read-only or local)

- **No production backup exists:** Supabase Management API `GET /database/backups` → `backups: []`, `pitr_enabled: false`; Supabase docs: Free projects are not backed up. Details/drill/rollback: `06-proposals/restore-and-rollback-plan.md`.
- **A05 lineage:** fresh 2026-10-13 ledger + server-side SQL digests (no SQL text exported): 100 prod rows / 97 files; 36 byte-identical, 33 LF-only, 31 unresolved, 30 repo files unmatched (`06-proposals/evidence/*2026-10-13.json`).
- **Catalog parity** (md5 fingerprints, same SQL on prod and local replay): 97/97 migrations replay; policies 215/215, RLS 126/126, indexes 434/434, triggers 108/108 identical; 15 function diffs are formatting-only; **production lacks the customer-confirmed-value columns/constraints/function/trigger**; production-only `rls_auto_enable()`; 4 views + 1 check differ (PG17 vs PG18 deparse suspected, unverified).
- **Local disposable restore + rollback rehearsal (PGlite):** synthetic two-org customer loop seeded 22/22; physical backup → restore: catalog and data identical; tenant isolation holds on the restored copy; later run proceeds; throwaway forward change rolled back to the exact pre-change catalog hash. Receipt `06-proposals/evidence/restore-rehearsal-receipt-2026-10-13.json`, tool `06-proposals/tools/restore-rehearsal.mjs`.
- **A17:** 7-day Cloudflare analytics: 2 `exceededResources` (1102) + 5 exceptions in 46,195 invocations; success CPU p50 11.2 ms / p99 139 ms vs Workers Free 10 ms → CPU-budget cause class; route attribution not available. `06-proposals/a17-runtime-503.md`.
- **Sender DNS (public resolver):** Resend DKIM `resend._domainkey` present, `send.` SPF/MX to Amazon SES return path, root SPF Zoho only, DMARC `p=none` (monitoring). Cloudflare DNS API listing denied to the token, so record ownership/proxy state was not read.
- Production state at read: 0 active runs, 0 stale-active runs, 0 pending emails, 0 enabled schedules — so the new sweeper and schedule changes have no backlog to act on at deploy.
- Capacity: `06-proposals/capacity-model-1-5-20.md` — founder review time and Workers Free CPU bind before Inngest/Resend/storage.

## Unverified live gates

1. Inngest behavior of `inngest/function.cancelled` for start/finish **timeouts** (assumed to fire, per current code's reliance on it) — verify on the Inngest dev server or dashboard.
2. Interrupted-run sweeper and fenced settlement against real PostgREST (`return=representation` on scoped PATCH with service role and with the viewer token under RLS).
3. Resend 24 h idempotency retention and recovery of `pending/delivery_outcome_uncertain` rows (operator reconciliation; no automatic replay).
4. Webhooks (A13): connection-time DNS rebinding cannot be pinned from Workers `fetch`; claim/settle RPC parity in production not proven; keep flags off.
5. Production restore drill (needs a recovery point and a disposable project), Postgres-17 replay for view/constraint deparse differences.
6. A17 per-route CPU and plan; authenticated 470/375/320 px journey on the exact production SHA (Chat09).

## Proposals for FM-00 / other owners (not implemented here)

- **FM-00 (migrations):** apply the missing customer-confirmed-value migration only after a recovery point exists and the §5 drill passes; private ledger mapping instead of `migration repair`; optional `run_status` value `interrupted`; email delivery claim/settle RPC with generation fencing (spec in `operations-acceptance.md`).
- **FM-00 (CI):** add `tests/06-*` to the required suite (they run under `pnpm test` already); consider a nightly read-only catalog-fingerprint diff job using `tools/catalog-fingerprint.sql` (needs a read-only token secret — owner decision).
- **Chat04:** consume `job-recovery-contract.md` (idempotency keys, terminal states, interrupted reason string, model pin, schedule hold/catch-up).
- **Chat02:** decide on Supabase default `anon` table grants (RLS currently governs rows on all 126 tables); webhook DNS/SSRF connection-time pinning; DMARC policy tightening with Zoho+Resend alignment check.
- **Chat01 (A18):** per-provider retry ratio and Workers AI neuron usage to replace capacity assumptions; Inngest 70% execution alert.
- **Chat05/Chat02:** CPU profile hot authenticated routes (A17 option 2).
- **Chat09:** acceptance list in `job-recovery-contract.md` §6 against a disposable Supabase + Inngest dev server.

## Founder-needed (collected; nothing was asked mid-run)

1. **Create a recovery point**: upgrade Supabase to Pro (daily backups) or run `supabase db dump` (roles/schema/data) to encrypted off-site storage with the DB password; until then approve **no** schema-changing migration.
2. Approve (or decline) a **disposable Supabase project** for the restore drill and later Chat09 acceptance.
3. **Workers plan decision** for A17 (Paid removes the 10 ms CPU limit; spend approval).
4. Confirm the origin of production-only function `rls_auto_enable()`.
5. Name an **incident contact** and alert channel for interrupted runs/backup failures (CV-12 "founder incident contact").
6. Confirm Inngest and Resend plans (Free assumed) and whether `RESEND_FROM_EMAIL` uses `foremention.com`.
7. Approve the customer-confirmed-value migration application window after (1) and (2).

## Rollback

Revert this branch's commits only (no migration, env or deploy change). Reverting restores read-then-write settlement and per-hour schedule catch-up; the new sweeper function disappears from `/api/inngest` on the next sync. Evidence/tool files under `06-proposals/` are documentation only.

## Next action

FM-00: review PR #570, decide items above, and integrate after Chat04's run consumers. On "continue": refresh main/peer heads, rebase if main moved, re-run `pnpm test`/typecheck/build and re-export the ledger/catalog fingerprint if any migration landed.

## 2026-10-13 update — CodeQL alerts #16/#17/#18 (js/incomplete-sanitization, high)

- Alerts: `06-proposals/tools/restore-rehearsal.mjs` lines 150, 151, 156 used `key.replace("\t", " ")`, replacing only the first tab when rendering catalog-diff example keys.
- Fix: one `displayKey` helper using `replaceAll("\t", " ")`, used at all three sites. Display-only output of the rehearsal tool; no runtime/app code, migration or config touched. No suppression. The rehearsal itself was not re-run (needs PGlite, not a repo dependency); `node --check` passes.
- Verified: `pnpm test` 1357/1357 pass; typecheck pass; lint 0 errors (10 pre-existing warnings in other owners' files).
- Previous head `59e592ea`; new head: this commit (PR #570).
