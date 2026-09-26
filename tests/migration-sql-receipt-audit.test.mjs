import assert from 'node:assert/strict';
import test from 'node:test';
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
  assert.equal(r.unresolved[0].reason, 'NO_BYTE_IDENTICAL_LOCAL_FILE');
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
