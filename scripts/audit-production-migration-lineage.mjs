#!/usr/bin/env node
// Fail-closed, read-only Supabase migration ledger auditor.
// Usage: node scripts/audit-production-migration-lineage.mjs --snapshot path/to/dated-remote.json [--fail-on-unresolved]
// The snapshot is read-only remote ledger metadata exported via the authorized
// Supabase list_migrations tool; this script never connects to or changes a DB.
import { readFile, readdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { compareMigrationLedger } from "../lib/migration-lineage-audit.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const snapshotFlag = process.argv.indexOf("--snapshot");
if (snapshotFlag < 0 || !process.argv[snapshotFlag + 1]) {
  process.stderr.write("A dated --snapshot JSON path is required. A historical snapshot is NOT live ledger parity.\n");
  process.exitCode = 2;
} else {
  const snapshotPath = resolve(process.argv[snapshotFlag + 1]);
  const fixture = JSON.parse(await readFile(snapshotPath, "utf8"));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fixture.observed_date || "") || !Array.isArray(fixture.migrations)) {
    throw new Error("Snapshot requires observed_date (YYYY-MM-DD) and migrations array");
  }
  const entries = (await readdir(join(root, "supabase/migrations")))
    .filter(name => /^\d{14}_[a-z0-9_]+\.sql$/.test(name))
    .map(name => { const m = name.match(/^(\d{14})_(.+)\.sql$/); return { version: m[1], name: m[2], path: "supabase/migrations/" + name }; });
  const report = compareMigrationLedger(entries, fixture.migrations);
  process.stdout.write(JSON.stringify({
    snapshot_observed_date: fixture.observed_date,
    snapshot_is_historical: true,
    counts: report.counts,
    warnings: [
      "A metadata match does not prove SQL equivalence or execution.",
      "A dated snapshot is not a live comparison. Re-export before a proposed change.",
      "NEVER run blanket production db push or edit schema_migrations from this report."
    ],
    details: {
      versionDrift: report.name_match_version_drift,
      remoteUnmatched: report.remote_without_name_match,
      localUnmatched: report.local_without_name_match,
      duplicateRemote: report.duplicate_remote_names,
      aliasCandidatesWithoutSqlProof: report.alias_candidates_without_sql_proof
    }
  }, null, 2) + "\n");
  const unresolved = report.counts.name_match_version_drift
    + report.counts.remote_without_name_match + report.counts.local_without_name_match;
  if (process.argv.includes("--fail-on-unresolved") && unresolved > 0) process.exitCode = 1;
}
