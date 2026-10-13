# Chat06 — database lineage, backup/restore and rollback plan (A05, CV-12)

Status: **proposal + local disposable rehearsal**. No production write, migration, restore, history repair or backup download was performed. Evidence below is dated 2026-10-13 and must be re-exported before any schema change.

## 1. What production actually has (read-only, 2026-10-13)

| Fact | Evidence | Source |
|---|---|---|
| Project `Foremention` (ref `vuujwdxivjsdikdstwib`, ap-northeast-2, Postgres 17.6.1.147) is the only Supabase project; it is production. | Management API `GET /v1/projects` | live read |
| **No restorable platform backup exists.** `backups: []`, `pitr_enabled: false` (`walg_enabled: true`). | Management API `GET /v1/projects/{ref}/database/backups` | live read |
| Supabase only backs up Pro/Team/Enterprise projects daily; Free projects are told to export with `supabase db dump` and keep off-site copies. | https://supabase.com/docs/guides/platform/backups (read 2026-10-13) | vendor docs |
| Database size 29.1 MiB; 12 organizations, 212 runs, 196 answers, 265 attempts; 0 active, 0 stale-active runs; 0 pending emails; 0 enabled schedules. | read-only `pg_database_size` / `count(*)` | live read |

**Conclusion:** today a destructive incident (bad migration, accidental delete, account deletion bug) has **no recovery point**. This is the single largest operational risk in packet 06 and only the founder can close it (plan upgrade or an off-site logical dump with the database password). See founder list in `06-status.md`.

## 2. Migration lineage / statement ledger (A05, issue #332)

Files: `evidence/production-migration-ledger-2026-10-13.json`, `evidence/production-sql-receipts-2026-10-13.json` (sha256 + git-blob sha1 computed **server-side** over `supabase_migrations.schema_migrations.statements`; no SQL text exported), `evidence/lineage-audit-report-2026-10-13.json` (output of existing `scripts/audit-production-migration-lineage.mjs --sql-receipts`).

| Tier | Count |
|---|---:|
| Repository migration files | 97 |
| Production ledger rows | 100 |
| Exact name+version metadata match | 44 |
| Stored SQL byte-identical to a repo file | 36 (9 of them under different version/name metadata) |
| Stored SQL identical except one terminal LF | 33 |
| Production rows with no SQL match (incl. 4 empty-statement rows) | 31 |
| Repo files with no byte-or-LF match in the production ledger | 30 |
| Identical SQL recorded under multiple production versions | 2 groups |

The ledger alone cannot prove schema state, so the decisive check is the catalog comparison below.

## 3. Catalog parity: repository replay vs production (DDL/policy/grant/trigger)

Tool: `tools/catalog-fingerprint.sql` (md5 digests only; same SQL runs read-only on production and locally) + `tools/restore-rehearsal.mjs`. Receipt: `evidence/restore-rehearsal-receipt-2026-10-13.json`.

All **97/97** repository migrations replay cleanly in a fresh local database (PGlite 0.5.9 = Postgres 18.6, with an auth/role shim). Compared with production:

| Object kind | identical | differing | only production | only repo replay |
|---|---:|---:|---:|---:|
| columns | 1828 | 0 | 0 | 3 |
| constraints (non-NOT-NULL) | 1032 | 1 | 0 | 3 |
| indexes | 434 | 0 | 0 | 0 |
| RLS flags | 126 | 0 | 0 | 0 |
| policies | 215 | 0 | 0 | 0 |
| triggers | 108 | 0 | 0 | 1 |
| enums | 6 | 0 | 0 | 0 |
| functions (exact body) | 59 | 15 | 1 | 1 |
| functions (whitespace/comment-normalized body) | 74 | **0** | 1 | 1 |
| views | 10 | 4 | 0 | 0 |
| function EXECUTE grants | 222 | 0 | 3 | 3 |
| table grants (anon/authenticated/service_role) | 5 | 227 | 72 | 0 |

Interpretation:

1. **Real schema drift (production is missing repo objects):** `customer_success_reviews.{customer_confirmed_value, confirmed_decision_event_id, confirmed_second_use_assessment_id}`, their two FKs and `customer_success_reviews_confirmed_value_evidence_check`, function `validate_customer_confirmed_value_evidence()` and trigger `customer_success_reviews_confirmed_value_validate`. This is the customer-confirmed-value migration that never executed in production (matches the Oct 12 finding).
2. **Production-only object:** function `rls_auto_enable()` (+3 grants) — not in the repository; origin must be identified by the owner (likely a dashboard/platform helper). Do not drop it blindly.
3. **15 function differences are formatting-only** (normalized bodies identical) — historical migrations were edited textually after execution. Not a behavior risk; a lineage hygiene issue.
4. **4 views and 1 check constraint differ** in deparsed text. Likely Postgres 17 vs 18 deparser differences; **unverified** — must be re-checked on a Postgres 17 disposable replay before claiming parity.
5. **Table grants differ by design of the local shim**: production keeps Supabase's default `anon`/`authenticated` table privileges (RLS on all 126 tables governs rows). The local shim does not reproduce Supabase defaults, so this row is not evidence of drift; Chat02 owns any grant-tightening decision.

## 4. Local disposable backup → restore → rollback rehearsal (performed)

`tools/restore-rehearsal.mjs` (run from a scratch dir with `@electric-sql/pglite@0.5.9`; not a repo dependency), receipt `evidence/restore-rehearsal-receipt-2026-10-13.json`:

1. Replay 97/97 migrations; catalog hash `3466db4c…`.
2. Seed a synthetic **two-organization customer loop** through the real schema (auth user → org → owner → project → category → approved question → queued run → prompt snapshot → running → answer → review): 22/22 steps succeed.
3. Physical backup (PGlite data-dir tar.gz, 7.1 MB, sha256 `2f2edd64…`).
4. Restore into a new instance: **catalog identical, all 8 seeded tables' data digests identical**; on the restored copy: tenant-A RLS context sees its own run and **zero** tenant-B runs; a later second run for the same project/question goes queued→running→review; a fenced cancel cannot overwrite the reviewed run.
5. Rollback: apply a throwaway forward change (new table + column) → catalog hash changes → restore the pre-change backup → **catalog hash and data return exactly to the pre-change state**.

Limits: PGlite is not Supabase (no auth service, storage, realtime, pg_cron, Vault, real role defaults); a PGlite tarball is not a WAL-G/PITR backup; data is synthetic. This proves **procedure and repository replayability**, not production recoverability.

## 5. Proposed production procedure (FM-00 executes; founder approves)

Preconditions (all required, in order):
1. **Recovery point exists**: either (a) founder upgrades to Supabase Pro so daily physical backups exist (≥1 listed by `GET /database/backups`), or (b) founder runs `supabase db dump` (roles, schema, data as three files) to encrypted off-site storage, recording timestamp, sha256 and custody. Without (a) or (b) **no schema-changing migration should be applied**.
2. Disposable restore target: Supabase "restore to a new project" (Pro) or a fresh Free project used only for the drill — **never** restore over production.
3. Quiesce side effects on the drill target: unset `RESEND_API_KEY`, `INNGEST_EVENT_KEY`, provider keys, `WEBHOOK_SIGNING_SECRET`, `WORKSPACE_WEBHOOK_*` flags.

Drill:
4. Restore the recovery point into the disposable target; run `tools/catalog-fingerprint.sql` there and diff against the production fingerprint taken at the same time (expect 0 differences on every kind).
5. Run the two-org customer-loop acceptance (Chat09 fixtures) against the drill target; record request IDs.
6. Apply the **one** missing migration (customer-confirmed value) to the drill target only; re-fingerprint; confirm the 3 columns / 3 constraints / function / trigger now exist and nothing else changed; run the loop again.
7. Record RTO (restore start → loop green) and RPO (recovery point age).

Production change (separate approval):
8. Fresh recovery point (≤1 h old). Apply only the reviewed migration via `supabase migration up` / SQL editor — **no blanket `db push`, no `migration repair`** until FM-00 approves a many-to-many ledger mapping.
9. Re-fingerprint production; expect only the intended additions.

Rollback:
- Additive migration (this case): roll forward with a reviewed `drop trigger / drop function / alter table drop column` script prepared and tested on the drill target in step 6; data loss is limited to the new columns.
- Destructive incident: restore the recovery point into a **new** project, verify fingerprint + loop, then switch `NEXT_PUBLIC_SUPABASE_URL`/keys (Worker secrets) and redeploy — or Supabase in-place restore with planned downtime after founder sign-off. Expected data loss = RPO.
- Application rollback is independent: Cloudflare Workers keep previous versions (`wrangler rollback`), and `.github/workflows` has a manual deploy; neither touches the database.

## 6. Ledger reconciliation proposal (FM-00)

Do not rewrite history. Create a private, dated mapping `production_version → repository file(s) + tier (byte / LF-only / none)` from `lineage-audit-report-2026-10-13.json`; the 31 unresolved rows need owner explanation (dashboard-applied SQL, renamed files, empty statements). The schema is reconciled by **catalog parity**, not by making the ledger look tidy. Close #332 only when: catalog diff = 0 on a Postgres-17 replay (or every difference has an owner disposition) and the customer-confirmed-value migration is applied under §5.
