import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { compareMigrationLedger } from "../lib/migration-lineage-audit.mjs";

test("lineage audit distinguishes exact metadata, timestamp drift, unknown remote and unmatched local", () => {
  const local = [
    { version: "20260901000000", name: "example" },
    { version: "20260902000000", name: "different" },
    { version: "20260903000000", name: "not_applied" },
  ];
  const remote = [
    { version: "20260901000000", name: "example" },
    { version: "20260902000400", name: "different" },
    { version: "20260902000500", name: "extra" },
  ];
  const r = compareMigrationLedger(local, remote);
  assert.deepEqual([r.counts.exact_name_version_only, r.counts.name_match_version_drift,
    r.counts.remote_without_name_match, r.counts.local_without_name_match], [1, 1, 1, 1]);
  assert.deepEqual(r.name_match_version_drift[0].local_versions, ["20260902000000"]);
  assert.match(r.evidence_limit, /never proof of equivalent executed SQL/i);
});

test("the same remote basename twice stays duplicated, and inferred aliases have no proof", () => {
  const local = [{ version: "20260901000000", name: "company_proof" }];
  const remote = [
    { version: "20260901010000", name: "company_proof_main_1234567" },
    { version: "20260901030000", name: "company_proof_main_1234567" },
  ];
  const r = compareMigrationLedger(local, remote);
  assert.equal(r.counts.exact_name_version_only, 0);
  assert.equal(r.counts.duplicate_remote_name_groups, 1);
  assert.equal(r.counts.alias_candidates_without_sql_proof, 2);
  assert.match(r.alias_candidates_without_sql_proof[0].proof, /NONE/);
});

test("ledger input validation rejects ambiguous or injected migration metadata", () => {
  assert.throws(() => compareMigrationLedger([], [{ version: "20260901;DROP", name: "example" }]), /Invalid remote/);
  assert.throws(() => compareMigrationLedger([{ version: "20260901000000", name: "x-y" }], []), /Invalid repository/);
});

test("migration auditor never accesses a database, writes repair metadata or treats stored snapshots as current", async () => {
  const [cli, library] = await Promise.all([
    readFile(new URL("../scripts/audit-production-migration-lineage.mjs", import.meta.url), "utf8"),
    readFile(new URL("../lib/migration-lineage-audit.mjs", import.meta.url), "utf8")
  ]);
  assert.match(cli, /--snapshot/);
  assert.match(cli, /snapshot_is_historical: true/);
  assert.match(cli, /--fail-on-unresolved/);
  assert.doesNotMatch(cli + library, /from\s+["'](?:pg|postgres|@supabase\/supabase-js)|fetch\(|exec\(|schema_migrations\s+(?:set|update|delete|truncate)/i);
});
