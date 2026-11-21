# Production-only migrations adopted into the repository (FM-07, 2026-10-19)

Read-only comparison on 2026-10-19 (Supabase Management API
`GET /v1/projects/vuujwdxivjsdikdstwib/database/migrations` and a read-only
`SELECT version, name, statements FROM supabase_migrations.schema_migrations`):
production had 115 migration rows, the repository 112 files; every repository
version was present in production and exactly three production rows had no file.
Those three are now committed **verbatim** (the single stored statement, plus one
terminal LF) under their original versions and names:

| Version | Name | sha256 of stored statement |
|---|---|---|
| 20260814002421 | placement_events_org_fk_index_20260814 | d887d39cbebc281acdf1da499aa79c763fba3fda6ab8912cb1819fc4e2de7f19 |
| 20260915185110 | qualified_paid_pilot_evidence_view | 6369f5ba87437e9945d2461117ea35f2a85e59b75875105594f8a3a27cc4dfba |
| 20260915185158 | customer_value_validation_evidence_compat | 44a1573df9b4878472be6e0cc1aadb52a94b525f52428669777a49ce8d076d85 |

`tests/ops-track.test.mjs` pins these digests. Nothing was written to production;
production already records all three as applied, so they never need to run there.

## What this changes for a rebuild from the repository

- `20260814002421` creates `placement_events_organization_idx` with
  `if not exists`; the later `20260814060000` file is then a no-op. Same index.
- `20260915185110` re-creates `qualified_paid_pilot_evidence` with the same
  logic as `20260915172000` (formatting differs only).
- `20260915185158` re-creates `customer_value_validation_evidence` as the
  **compat** view that production actually has. It joins any qualifying user
  decision and comparable assessment in the window and does **not** require
  `customer_success_reviews.customer_confirmed_value = true`. A replay therefore
  ends with the same weaker view production serves today, not the stricter
  `20260915172000` view. This is deliberate: the repository must reproduce
  production. Production is also missing the `20260915172000` columns, check
  constraint, function and trigger (see `docs/execution/332/ledger-reconciliation-2026-10-13.md`).
  Restoring the strict gate is #332 step 3, a separate founder-approved change.

Replay was proven locally on 2026-10-19: all 116 files (including the #351
migration) apply in order on a disposable PostgreSQL 17 and 18 with a Supabase
role/schema shim; CI's `supabase db reset` remains the authoritative replay.
