# FM-05 — Private hash-only migration-lineage release preflight (10 October 2026)

**Release status: BLOCKED.** This is evidence gathering, not permission to merge, deploy, apply any migration, modify Supabase's migration history, or repair customer data. See [P1 #332](https://github.com/injamhaqq/foremention/issues/332) and the existing independent provenance audit [draft PR #354](https://github.com/injamhaqq/foremention/pull/354). FM-00 is the only integration and release authority.

## Verified live ledger, read-only

At review time, connected Supabase project `vuujwdxivjsdikdstwib` (PostgreSQL 17.6) returned:

| Gate | Verified value |
| --- | --- |
| Executed migration-ledger rows | 96 |
| Distinct migration versions | 96 |
| Rows with one nonempty recorded statement | 96 |
| Rows with nonempty rollback statements | 0 |
| Current last ledger version | `20260926071020` |
| SHA-256 fingerprint over the ordered version + Git blob SHA-1 pairs | `5b4ca45008a72ef3e28e02ddfb6f963566e11ab654c8b6014c9d7b7a4eb44427` |

The SHA-256 root covers recorded **version** and SQL **Git blob hash** in deterministic version order. It is a non-secret change detector, **not** an independent cryptographic execution attestation, an attestation of live object parity or a substitute for raw-history preservation. Every ledger row had one statement-array item; that observation is not proof every SQL statement ran to completion.

To validate SHA implementation, the sample `20260719000100_initial_schema` independently reproduced historical Git blob ID `a5ea0f3f254235d44885be6d258aa1e03bbe892e`; latest `20260926071020_support_ticket_auth_rls_initplan_20260926` reproduced `8b0d139492fad292d87f40a8b53d6d55d4106200`.

## Secure, repeatable export

`scripts/audit/fm05-private-ledger-fingerprints.sql` is designed for an owner-controlled production read-only SQL session. It starts `BEGIN TRANSACTION READ ONLY`, sets short timeouts, reads only `supabase_migrations.schema_migrations`, and ends `ROLLBACK`. It emits a JSON object with `schemaVersion: 1`, an array of **version, name, raw Git blob SHA-1, plus-one-LF Git blob SHA-1, text byte length**, and aggregate counts/root. It **never emits raw recorded SQL**, original rollback SQL, authentication secrets or customer rows.

Run it only through an authenticated, authorized read-only SQL interface. Save its JSON output to a controlled private path **outside the repository**. Do not upload the raw ledger, the private JSON export, deployment credentials or execution traces into public GitHub PRs, issues or Actions artifacts.

To perform an offline whole-file comparison, use the existing `scripts/audit/compare-migration-fingerprints.mjs` from [PR #354](https://github.com/injamhaqq/foremention/pull/354) on a separately reviewed local checkout. That utility expects the same version-1 record shape and rejects unknown per-record fields; the extra top-level `audit` summary is informational. Keep its input path outside the repo and preserve the report in the owner-controlled review folder, not in GitHub.

## What this proves and does not prove

The September audit documented **36 exact Git blob matches**, **33 matches after appending exactly one terminal LF**, and **27 unmatched remote records** against **93 historic checked-in migration SQL files** (26 unmatched locals). Two remote versions can have identical recorded SQL; matching by names or versions is not sufficient.

**The 27 remaining mismatches are not cleared by the new snapshot.** They require owner-restricted raw SQL statement review, semantically mapped multi-file operations, live schema/policy/grant/index/trigger comparisons, and a reviewed drift-reconciliation plan; at least some may be split/combined migrations. Do not presume that hash-equivalent text necessarily ran successfully. Do not rewrite Supabase migration-history versions, invent missing history, or blanket `supabase db push`.

## Mandatory release order

1. Privately capture the hash-only snapshot and encrypted, access-controlled original ledger SQL as needed; verify provenance with the already reviewed offline comparator. Compare the aggregate root and counts to this checkpoint; any drift forces fresh audit.
2. Establish an independently verified production backup, **restore to a separate isolated target**, record the restore receipt and verify schema/object parity. A successful CI `supabase db reset` is **not a restore**.
3. Obtain a reviewer-approved 96-vs-93 many-to-many reconciliation. Update #332 with **only sanitized class counts and owner signoff references**, never customer data or raw SQL.
4. FM-00 authorizes and integrates only selected FM-05 changes, validates current main SHA and exact-head checks, then follows additive RPC migration → matching application deploy and smoke test → later independently approved activation migrations.
5. The three SQL candidates in `scripts/release-gates/` remain outside auto-applied migrations until individually approved and materialized. No unilateral production SQL execution is authorized by this runbook.

This preflight reduces unknowns; it cannot complete the missing owner/restore/semantic review gates by itself.
