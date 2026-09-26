# Production migration lineage read-only audit (observed 2026-09-26)

This is the machine-readable extension to [the production lineage warning](./PRODUCTION-MIGRATION-LINEAGE-2026-09-26.md). Source data: a read-only enumeration of 93 migration filenames/blobs in the repository at commit `c903d2ebf6fe5db0e086a1326886b0f10ade4847` and 96 records in the connected Foremention production migration ledger. The accompanying JSON snapshot contains ONLY migration versions and names, no credentials, customer data or application database rows.

| Comparison | Records |
| --- | ---: |
| Repo SQL files | 93 |
| Production recorded migrations | 96 |
| Exact version **and** name metadata matches | 40 |
| Same name but different recorded version (remote rows) | 29 |
| Remote records with no exact repository basename | 27 |
| Local files with no exact remote basename | 26 |
| Repeated remote basename groups | 3 |

**Caution:** This differs from the earlier human report's 30 timestamp mismatches because that report counted distinct local/remote name groups. The 29 number counts remote rows failing exact version+name pairing while matching a local basename; two remote rows share one basename. Neither metric proves SQL equivalence.

The duplicate remote basenames are `collaboration_lifecycle_alerts`, `source_snapshot_privilege_hardening`, and `acquisition_outreach_control`. Some remote records include historical `_main_<commit>` suffixes that resemble local names. **A probable alias does not prove the same SQL was run.**

## Safe repeatable inspection

The checked-in snapshot is historical. To audit a new date, use the existing authorized Supabase read-only `list_migrations` tool to export just `{"observed_date":"YYYY-MM-DD","migrations":[{"version":"...","name":"..."}]}` into a private temporary local file. Then run:

```bash
node scripts/audit-production-migration-lineage.mjs --snapshot path/to/dated-ledger.json
node scripts/audit-production-migration-lineage.mjs --snapshot path/to/dated-ledger.json --fail-on-unresolved
```

The first command prints classified metadata differences; the second exits nonzero while differences exist. Neither reads live database credentials, opens network connections, modifies production schema, repairs migration versions or executes migrations. Do not substitute the checked-in 2026-09-26 snapshot for a newly exported ledger when reviewing a future release.

## Controlled reconciliation is still required

1. Obtain an approved schema backup/restore plan and authoritative remote executed-SQL receipts where available.
2. Independently compare source SQL and resulting production schema. Establish evidence-backed version mappings, including duplicate basenames, consolidated migrations and manual dashboard changes. Preserve uncertainty if historical SQL is unavailable.
3. Test a proposed bookkeeping-only reconciliation in a non-production clone. Obtain project-owner sign-off before any history mutation. Only afterward consider restoring automated production migrations with a strict version/release-SHA audit gate.

Local CI migration replay, successful production builds and customer canaries do not establish migration-history parity. Do not run a blanket `supabase db push` against the current production project.
