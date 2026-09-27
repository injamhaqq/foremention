import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { gitBlobSha, auditMigrationFingerprints } from "../scripts/audit/compare-migration-fingerprints.mjs";

const record = (version, name, raw, trailing) => ({
  version, name, raw_git_blob_sha: gitBlobSha(raw), append_lf_git_blob_sha: gitBlobSha(trailing ?? raw + "\n"),
});
test("Git blob fingerprint uses real Git object header and byte count", () => {
  assert.equal(gitBlobSha("abc"), "f2ba8f84ab5c1bce84a7b441cb1959cfc7093b7f");
  assert.equal(gitBlobSha("abc\n"), "8baef1b4abc478178b004d62031cf7fe6db6f903");
});
test("strict and single trailing LF match; duplicates and names do not grant extra proof", () => {
  const files = [
    { name: "20260101000000_first.sql", content: "select 1;\n" },
    { name: "20260101000001_second.sql", content: "select 2;\n" },
    { name: "20260101000002_unapplied.sql", content: "select 3;\n" },
  ];
  const first = record("20260101000000", "first", "select 1;\n");
  const second = record("20260101000011", "renamed", "select 2;");
  const repeated = record("20260101000022", "duplicate_label", "select 1;\n");
  const missing = record("20260101000033", "first", "different statement");
  const report = auditMigrationFingerprints({ schemaVersion: 1, records: [first, second, repeated, missing] }, files);
  assert.deepEqual(report.totals, { remote: 4, local: 3, exact: 2, trailingLf: 1, unmatchedRemote: 1, unmatchedLocal: 1 });
  assert.equal(report.rows[0].proof, "exact_git_blob");
  assert.equal(report.rows[1].proof, "one_trailing_lf");
  assert.deepEqual(report.rows[1].local, ["20260101000001_second.sql"]);
  assert.equal(report.rows[3].proof, "unmatched", "a matching label cannot establish SQL identity");
  assert.deepEqual(report.duplicatedContent, [["20260101000000_first", "20260101000022_duplicate_label"]]);
  assert.deepEqual(report.unmatchedLocal, ["20260101000002_unapplied.sql"]);
});
test("fail closed when snapshot contains raw SQL, unknown fields, missing hashes or duplicate versions", () => {
  const r = record("20260101000000", "first", "select 1;");
  const file = [{ name: "20260101000000_first.sql", content: "select 1;" }];
  assert.throws(() => auditMigrationFingerprints({ schemaVersion: 1, records: [{ ...r, statements: ["secret"] }] }, file), /hashes and labels only/);
  assert.throws(() => auditMigrationFingerprints({ schemaVersion: 1, records: [{ ...r, raw_git_blob_sha: "" }] }, file), /Invalid migration/);
  assert.throws(() => auditMigrationFingerprints({ schemaVersion: 1, records: [r, r] }, file), /Duplicate ledger version/);
  assert.throws(() => auditMigrationFingerprints({ schemaVersion: 1, records: [r] }, [{ name: "../unsafe.sql", content: "" }]), /trusted local/);
});
test("report and audit instructions never permit production mutation", async () => {
  const [code, doc] = await Promise.all([
    readFile(new URL("../scripts/audit/compare-migration-fingerprints.mjs", import.meta.url), "utf8"),
    readFile(new URL("../docs/operations/PRODUCTION-MIGRATION-CONTENT-PROVENANCE-2026-09-27.md", import.meta.url), "utf8"),
  ]);
  assert.match(code, /private ledger snapshot OUTSIDE/i);
  assert.doesNotMatch(code, /pg_read_file|apply_migration|migration repair|supabase db push|fetch\(/);
  assert.match(doc, /READ-ONLY EVIDENCE/);
  assert.match(doc, /36/);
  assert.match(doc, /33/);
  assert.match(doc, /27 unmatched remote/i);
  assert.match(doc, /explicit owner authorization/);
});
