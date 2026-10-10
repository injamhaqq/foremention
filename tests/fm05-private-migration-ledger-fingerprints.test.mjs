import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sqlFile = new URL("../scripts/audit/fm05-private-ledger-fingerprints.sql", import.meta.url);

test("FM-05 migration-ledger snapshot is transactionally read-only and hash-only", async () => {
  const sql = await readFile(sqlFile, "utf8");
  const executable = sql.split("\n").filter(line => !/^\s*--/.test(line)).join("\n");
  assert.match(executable, /^\s*BEGIN TRANSACTION READ ONLY\s*;/i);
  assert.match(executable, /ROLLBACK\s*;\s*$/i);
  assert.match(executable, /FROM supabase_migrations\.schema_migrations/i);
  assert.match(executable, /SET LOCAL statement_timeout\s*=\s*'30s'/i);
  assert.match(executable, /extensions\.digest\(/);
  assert.match(executable, /convert_to\('blob '\s*\|\|\s*octet_length\(sql_body\)/i);
  assert.match(executable, /decode\('00'\s*,\s*'hex'\)/);
  assert.match(executable, /convert_to\(sql_body\s*\|\|\s*chr\(10\)/i);
  assert.match(executable, /'sha1'/i);
  assert.match(executable, /'sha256'/i);
  assert.match(executable, /'raw_git_blob_sha'/);
  assert.match(executable, /'append_lf_git_blob_sha'/);
  assert.match(executable, /'ledger_content_root_sha256'/);
  assert.match(executable, /'invalid_sql_receipts'/);
  assert.match(executable, /'receipts_with_rollback'/);
  assert.doesNotMatch(executable, /\b(INSERT|UPDATE|DELETE|ALTER|DROP|TRUNCATE|CREATE|GRANT|REVOKE|CALL|PERFORM|EXECUTE)\b\s+(?:TABLE|FUNCTION|INTO|FROM|ON|PUBLIC|AUTHENTICATED|SERVICE_ROLE)/i);
  assert.doesNotMatch(executable, /\b(?:COPY|\\copy)\b/i);
  const record = executable.split("'records', coalesce((")[1]?.split("FROM fingerprints")[0];
  assert.ok(record, "Missing hash-only record JSON projection");
  assert.doesNotMatch(record, /'statements'|'sql_body'|'rollback'|'created_by'|'idempotency_key'/i);
});

test("FM-05 release gate requires owner-controlled private hash comparison, never blanket db push", async () => {
  const doc = await readFile(new URL("../docs/operations/FM-05-MIGRATION-FINGERPRINT-RELEASE-GATE-2026-10-10.md", import.meta.url), "utf8");
  for (const token of ["#332", "#354", "outside the repository", "not a restore", "FM-00", "96", "27", "scripts/release-gates"]) {
    assert.ok(doc.includes(token), "Missing release control " + token);
  }
});
