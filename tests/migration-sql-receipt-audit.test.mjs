import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrationSqlDigests, compareMigrationSqlReceipts } from '../lib/migration-sql-receipt-audit.mjs';

const source = { version: '20260901010000', name: 'safe_example', path: 'supabase/migrations/safe.sql', sql: '-- example\nselect 1;\n' };
const remote = [{ version: '20260901090000', name: 'safe_example_renamed' }];
const receipt = [{ ...remote[0], statement_count: 1, ...migrationSqlDigests(source.sql) }];

test('proves byte-identical stored SQL while preserving version and name drift', () => {
  const r = compareMigrationSqlReceipts([source], remote, receipt);
  assert.equal(r.counts.byte_matched_remote, 1);
  assert.equal(r.counts.byte_matched_but_metadata_drift, 1);
  assert.equal(r.matches[0].exact_metadata_and_bytes, false);
  assert.match(r.evidence_limit, /does not prove successful historical execution/);
});

test('exact identity with modified SQL bytes cannot be treated as a match', () => {
  const r = compareMigrationSqlReceipts([source], [{ version: source.version, name: source.name }],
    [{ version: source.version, name: source.name, statement_count: 1, ...migrationSqlDigests(source.sql + ' ') }]);
  assert.equal(r.counts.byte_matched_remote, 0);
  assert.equal(r.unresolved[0].reason, 'NO_FILE_MATCH_EVEN_WITH_ONE_TERMINAL_LF');
});

test('incomplete and multi-statement receipts remain unresolved', () => {
  assert.equal(compareMigrationSqlReceipts([source], remote, []).unresolved[0].reason, 'NO_SQL_RECEIPT');
  assert.equal(compareMigrationSqlReceipts([source], remote, [{ ...remote[0], statement_count: 2 }])
    .unresolved[0].reason, 'UNSUPPORTED_STATEMENT_COUNT');
});

test('two remote rows storing identical SQL remain separately visible', () => {
  const extra = { version: '20260901090001', name: 'safe_example_renamed' };
  const r = compareMigrationSqlReceipts([source], [...remote, extra],
    [...receipt, { ...extra, statement_count: 1, ...migrationSqlDigests(source.sql) }]);
  assert.equal(r.counts.byte_matched_remote, 2);
  assert.equal(r.counts.identical_sql_multiple_remote_versions_groups, 1);
});

test('rejects mismatched or duplicate ledger identities and malformed digests', () => {
  assert.throws(() => compareMigrationSqlReceipts([source], remote, [{ ...receipt[0], name: 'wrong' }]), /does not correspond/);
  assert.throws(() => compareMigrationSqlReceipts([source], remote, [...receipt, ...receipt]), /Duplicate SQL receipt/);
  assert.throws(() => compareMigrationSqlReceipts([source], remote, [{ ...receipt[0], sql_sha256: 'bad' }]), /valid digests/);
  assert.throws(() => compareMigrationSqlReceipts([source], [...remote, ...remote], receipt), /Duplicate remote/);
});

test('hashing preserves SQL bytes, including line endings', () => {
  const same = migrationSqlDigests('-- a\n');
  assert.equal(same.sql_sha256.length, 64);
  assert.equal(same.git_blob_sha.length, 40);
  assert.notDeepEqual(same, migrationSqlDigests('-- a\r\n'));
});

// Historical fixture corroboration only: this dated audit is never a live parity check.
test('26 September pinned stored SQL receipt snapshot reproduces measured evidence bounds', async () => {
  const fixture = JSON.parse(await readFile(new URL('../docs/operations/PRODUCTION-MIGRATION-LEDGER-METADATA-SNAPSHOT-2026-09-26.json', import.meta.url), 'utf8'));
  const evidence = JSON.parse(await readFile(new URL('../docs/operations/PRODUCTION-MIGRATION-SQL-RECEIPTS-2026-09-26.json', import.meta.url), 'utf8'));
  assert.equal(fixture.observed_date, evidence.observed_date);
  assert.equal(evidence.repo_migrations_at_sha, '3d3b4cc6f063d46f34e0b2dc49aec222a309b5d2');
  const root = fileURLToPath(new URL('../supabase/migrations/', import.meta.url));
  const files = (await readdir(root)).filter(name => /^\d{14}_[a-z0-9_]+\.sql$/.test(name));
  assert.equal(files.length, 93, 'historical proof fixture must be explicitly refreshed after migration changes');
  const sources = await Promise.all(files.map(async name => ({
    version: name.slice(0, 14), name: name.slice(15, -4), path: name, sql: await readFile(join(root, name), 'utf8')
  })));
  const r = compareMigrationSqlReceipts(sources, fixture.migrations, evidence.receipts);
  assert.deepEqual({ remote: r.counts.remote, byteMatched: r.counts.byte_matched_remote,
    drift: r.counts.byte_matched_but_metadata_drift, terminalLf: r.counts.terminal_lf_only_remote,
    unresolved: r.counts.unresolved_remote, localUnmatchedExact: r.counts.local_without_byte_match,
    localUnmatchedAfterLf: r.counts.local_without_byte_or_terminal_lf_match,
    duplicate: r.counts.identical_sql_multiple_remote_versions_groups },
    { remote: 96, byteMatched: 36, drift: 9, terminalLf: 33, unresolved: 27,
      localUnmatchedExact: 57, localUnmatchedAfterLf: 26, duplicate: 2 });
});


test('single terminal LF discrepancy is separately reported and never labeled byte-identical', () => {
  const withoutLf = [{ ...remote[0], statement_count: 1, ...migrationSqlDigests(source.sql.slice(0, -1)) }];
  const r = compareMigrationSqlReceipts([source], remote, withoutLf);
  assert.equal(r.counts.byte_matched_remote, 0);
  assert.equal(r.counts.terminal_lf_only_remote, 1);
  assert.equal(r.counts.unresolved_remote, 0);
  assert.equal(r.counts.local_without_byte_match, 1);
  assert.equal(r.counts.local_without_byte_or_terminal_lf_match, 0);
});

test('non-terminal SQL edits cannot be silently counted as whitespace-equivalent', () => {
  const changed = [{ ...remote[0], statement_count: 1,
    ...migrationSqlDigests(source.sql.replace('select', ' select').slice(0, -1)) }];
  const r = compareMigrationSqlReceipts([source], remote, changed);
  assert.equal(r.counts.terminal_lf_only_remote, 0);
  assert.equal(r.counts.unresolved_remote, 1);
});
