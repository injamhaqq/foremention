# Foremention production migration: stored SQL receipt provenance (read-only)

**Observed 26 September 2026. No production schema, migration history, or customer rows were modified. No raw stored SQL was exported.**

## New evidence beyond migration filename matching

The live `supabase_migrations.schema_migrations` ledger exposes a `statements` array. Authorized read-only inspection confirmed **96/96 records contain exactly one non-null SQL body**. Comparing Git-compatible blob hashes of stored SQL with all 93 current repository migration SQL blobs at `3d3b4cc6f063d46f34e0b2dc49aec222a309b5d2` found:

| Ledger SQL-text comparison | Count |
| --- | ---: |
| Remote recorded migrations | 96 |
| Local SQL files | 93 |
| Remote bodies strictly byte-identical to a current local Git blob | 36 |
| Strict byte-identical bodies with remote version/name drift | 9 |
| Additional bodies matching after appending **exactly one terminal LF** to remote stored SQL | 33 |
| Remote bodies unresolved after these two separately reported comparisons | 27 |
| Local SQL files without a strict byte-identical remote body | 57 |
| Local SQL files without a remote match even after the one-terminal-LF test | 26 |
| Distinct recorded SQL bodies appearing under two remote ledger versions | 2 |

The 33 terminal-LF-only matches were independently corroborated by read-only live SQL hashing and must not be called strictly byte-identical. An additional one-terminal-LF check is intentionally narrow; it does not normalize whitespace, comments, statements or line endings generally.

The two duplicated ledger SQL bodies have the names `source_snapshot_privilege_hardening` and `acquisition_outreach_control`. Exact stored-text matches also confirm all three latest production cost/support policy migrations, despite their different recorded versions/names. Their full SHA-256 and Git-blob hash receipts are in `PRODUCTION-MIGRATION-SQL-RECEIPTS-2026-09-26.json`.

A strict matching receipt means **stored SQL text equals repository SQL bytes**. A terminal-LF-only candidate means **stored SQL plus exactly one final line feed equals the repository file**, with all other bytes unchanged. Neither tier proves every statement was executed successfully, that later operations did not change the production schema, or that it is safe to rewrite any migration history. Nonmatching SQL may differ solely in formatting or reflect historical file revisions, consolidated migrations, or materially different SQL; it is not proof of a missing schema operation.

## Reproduce safely

Against the **explicitly identified authorized project**, run this read-only query. It exports **only version/name/count and hashes**, not raw SQL or customer information. The connected project's `pgcrypto` digest functions are installed in `extensions`:

```sql
select version, name,
  cardinality(statements) as statement_count,
  case when cardinality(statements)=1 and statements[1] is not null
    then encode(extensions.digest(convert_to(statements[1], 'UTF8'), 'sha256'), 'hex')
  end as sql_sha256,
  case when cardinality(statements)=1 and statements[1] is not null
    then encode(extensions.digest(
      convert_to('blob ' || octet_length(statements[1])::text, 'UTF8')
      || decode('00', 'hex') || convert_to(statements[1], 'UTF8'), 'sha1'), 'hex')
  end as git_blob_sha
from supabase_migrations.schema_migrations
order by version;
```

Export `{"observed_date":"YYYY-MM-DD","receipts":[...query result...]}`, with the actual observation date. Independently export versions/names using `list_migrations` as described by `PRODUCTION-MIGRATION-METADATA-AUDIT-2026-09-26.md`. Pin the repository to the intended exact commit, then run:

```bash
node scripts/audit-production-migration-lineage.mjs \
  --snapshot path/to/current-ledger-metadata.json \
  --sql-receipts path/to/current-ledger-hash-receipts.json \
  --fail-on-unresolved
```

The script reads local files only and **reports strict byte identity and one-terminal-LF-only candidates in separate fields**. It refuses mismatched observed dates, duplicate/invalid ledger receipts, malformed hashes, and unsupported statements cannot count as proof. It requires both SHA-256 and Git blob text digests to match before reporting byte identity. An observation date match alone does **not** establish a consistent same-instant database snapshot.

## Reconciliation remains blocked

1. Investigate the **27** remote text bodies still unmatched even after the strictly limited single-terminal-LF check against historical versioned Git blobs and available release receipts. Establish whether differences are formatting-only, historical revisions, combined steps, or material SQL differences.
2. Independently inspect the actual production schema (tables, constraints, indexes, RLS and grants, functions and triggers); compare effective behavior against an isolated reconstruction.
3. Verify current backup and restore readiness and rehearse a reversible bookkeeping-only proposal in a non-production environment.
4. Require an explicit owner-approved, reviewed version-level repair mapping before any production history mutation or resuming automatic bulk migration pushes.

An old inactive restore-drill project is not evidence that a current backup is restorable. Neither matching hashes nor successful CI authorizes a production database migration-history change.
