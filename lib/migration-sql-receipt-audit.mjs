// Read-only, hash-only comparison of stored Supabase migration SQL receipts
// against repository migration files. No database or network access.
import { createHash } from 'node:crypto';

const VERSION = /^\d{14}$/;
const NAME = /^[a-z0-9_]+$/;
const SHA1 = /^[a-f0-9]{40}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const key = ({ version, name }) => `${version}:${name}`;

export function migrationSqlDigests(sql) {
  if (typeof sql !== 'string') throw new TypeError('SQL file content must be UTF-8 text');
  const bytes = Buffer.from(sql, 'utf8');
  return {
    sql_sha256: createHash('sha256').update(bytes).digest('hex'),
    git_blob_sha: createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'),
  };
}

export function compareMigrationSqlReceipts(local, remote, receipts) {
  if (![local, remote, receipts].every(Array.isArray)) throw new TypeError('Migration SQL audit requires three arrays');
  const localBySql = new Map();
  const localKeys = new Set();
  for (const item of local) {
    if (!VERSION.test(item.version ?? '') || !NAME.test(item.name ?? '') || typeof item.sql !== 'string') {
      throw new Error('Invalid local migration source');
    }
    if (localKeys.has(key(item))) throw new Error(`Duplicate local migration identity: ${key(item)}`);
    localKeys.add(key(item));
    const digests = migrationSqlDigests(item.sql);
    localBySql.set(digests.sql_sha256, [...(localBySql.get(digests.sql_sha256) || []), {
      version: item.version, name: item.name, path: item.path ?? null, ...digests
    }]);
  }
  const remoteByVersion = new Map();
  for (const item of remote) {
    if (!VERSION.test(item.version ?? '') || !NAME.test(item.name ?? '')) throw new Error('Invalid remote migration identity');
    if (remoteByVersion.has(item.version)) throw new Error(`Duplicate remote migration version: ${item.version}`);
    remoteByVersion.set(item.version, item);
  }
  const byVersion = new Map();
  for (const item of receipts) {
    if (!VERSION.test(item.version ?? '') || !NAME.test(item.name ?? '') ||
      !Number.isSafeInteger(item.statement_count) || item.statement_count < 0) {
      throw new Error('Invalid SQL receipt identity or statement count');
    }
    if (byVersion.has(item.version)) throw new Error(`Duplicate SQL receipt version: ${item.version}`);
    if (!remoteByVersion.has(item.version) || remoteByVersion.get(item.version).name !== item.name) {
      throw new Error(`SQL receipt does not correspond to remote ledger: ${key(item)}`);
    }
    if (item.statement_count === 1 && (!SHA256.test(item.sql_sha256 ?? '') || !SHA1.test(item.git_blob_sha ?? ''))) {
      throw new Error(`SQL receipt missing valid digests: ${key(item)}`);
    }
    byVersion.set(item.version, item);
  }
  const matches = [];
  const unresolved = [];
  const trackedLocal = new Set();
  const remoteByHash = new Map();
  for (const item of remote) {
    const receipt = byVersion.get(item.version);
    if (!receipt) {
      unresolved.push({ version: item.version, name: item.name, reason: 'NO_SQL_RECEIPT' });
      continue;
    }
    if (receipt.statement_count !== 1) {
      unresolved.push({ version: item.version, name: item.name,
        reason: 'UNSUPPORTED_STATEMENT_COUNT', statement_count: receipt.statement_count });
      continue;
    }
    remoteByHash.set(receipt.sql_sha256, [...(remoteByHash.get(receipt.sql_sha256) || []), item]);
    const localMatches = (localBySql.get(receipt.sql_sha256) || []).filter(source => source.git_blob_sha === receipt.git_blob_sha);
    if (localMatches.length === 0) {
      const reason = localBySql.has(receipt.sql_sha256) ? 'DIGEST_CROSSCHECK_FAILED' : 'NO_BYTE_IDENTICAL_LOCAL_FILE';
      unresolved.push({ version: item.version, name: item.name, reason });
      continue;
    }
    for (const source of localMatches) trackedLocal.add(key(source));
    matches.push({ version: item.version, name: item.name,
      local: localMatches.map(({ version, name, path }) => ({ version, name, path })),
      exact_metadata_and_bytes: localMatches.some(source => source.version === item.version && source.name === item.name),
      identity_ambiguous: localMatches.length > 1 });
  }
  const duplicateSql = [...remoteByHash].filter(([, group]) => group.length > 1)
    .map(([sha256, group]) => ({ sql_sha256: sha256, recorded_rows: group.map(({ version, name }) => ({ version, name })) }));
  const localWithoutMatch = local.filter(item => !trackedLocal.has(key(item)))
    .map(({ version, name, path }) => ({ version, name, path: path ?? null }));
  return {
    counts: {
      local: local.length, remote: remote.length, receipt_rows: receipts.length,
      byte_matched_remote: matches.length, unresolved_remote: unresolved.length,
      byte_matched_but_metadata_drift: matches.filter(row => !row.exact_metadata_and_bytes).length,
      ambiguous_byte_matched_remote: matches.filter(row => row.identity_ambiguous).length,
      local_without_byte_match: localWithoutMatch.length,
      identical_sql_multiple_remote_versions_groups: duplicateSql.length,
    },
    matches, unresolved, local_without_byte_match: localWithoutMatch,
    identical_sql_multiple_remote_versions: duplicateSql,
    evidence_limit: 'Only SQL text stored in migration ledger has been compared byte-for-byte to repository files. A matching receipt does not prove successful historical execution, unchanged production schema, or safe history repair.',
  };
}
