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

function pushIndex(index, digest, source) {
  index.set(digest.sql_sha256, [...(index.get(digest.sql_sha256) || []), { ...source, ...digest }]);
}
function serializedMatches(rows) {
  return rows.map(({ version, name, path }) => ({ version, name, path }));
}

export function compareMigrationSqlReceipts(local, remote, receipts) {
  if (![local, remote, receipts].every(Array.isArray)) throw new TypeError('Migration SQL audit requires three arrays');
  const localBySql = new Map();
  // Separate strictly limited text-equivalence tier: local file has one final LF
  // absent from remote stored SQL. Do not perform general whitespace normalization.
  const localWithOneTerminalLfRemoved = new Map();
  const localKeys = new Set();
  for (const item of local) {
    if (!VERSION.test(item.version ?? '') || !NAME.test(item.name ?? '') || typeof item.sql !== 'string') {
      throw new Error('Invalid local migration source');
    }
    if (localKeys.has(key(item))) throw new Error(`Duplicate local migration identity: ${key(item)}`);
    localKeys.add(key(item));
    const source = { version: item.version, name: item.name, path: item.path ?? null };
    pushIndex(localBySql, migrationSqlDigests(item.sql), source);
    if (item.sql.endsWith('\n')) {
      pushIndex(localWithOneTerminalLfRemoved, migrationSqlDigests(item.sql.slice(0, -1)), source);
    }
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
  const terminalLfOnlyMatches = [];
  const unresolved = [];
  const trackedByteLocal = new Set();
  const trackedLfLocal = new Set();
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
    const possibleExact = localBySql.get(receipt.sql_sha256) || [];
    const localMatches = possibleExact.filter(source => source.git_blob_sha === receipt.git_blob_sha);
    if (localMatches.length > 0) {
      for (const source of localMatches) trackedByteLocal.add(key(source));
      matches.push({ version: item.version, name: item.name,
        local: serializedMatches(localMatches),
        exact_metadata_and_bytes: localMatches.some(source => source.version === item.version && source.name === item.name),
        identity_ambiguous: localMatches.length > 1 });
      continue;
    }
    // Same SHA-256 with inconsistent blob SHA is never downgraded to an LF match.
    if (possibleExact.length > 0) {
      unresolved.push({ version: item.version, name: item.name, reason: 'DIGEST_CROSSCHECK_FAILED' });
      continue;
    }
    const possibleLf = localWithOneTerminalLfRemoved.get(receipt.sql_sha256) || [];
    const lfMatches = possibleLf.filter(source => source.git_blob_sha === receipt.git_blob_sha);
    if (lfMatches.length > 0) {
      for (const source of lfMatches) trackedLfLocal.add(key(source));
      terminalLfOnlyMatches.push({ version: item.version, name: item.name,
        local: serializedMatches(lfMatches),
        same_metadata: lfMatches.some(source => source.version === item.version && source.name === item.name),
        identity_ambiguous: lfMatches.length > 1,
        limitation: 'Remote stored SQL plus exactly one terminal LF matches a local file; stored bytes are not identical.' });
      continue;
    }
    unresolved.push({ version: item.version, name: item.name, reason: possibleLf.length > 0
      ? 'TERMINAL_LF_DIGEST_CROSSCHECK_FAILED' : 'NO_FILE_MATCH_EVEN_WITH_ONE_TERMINAL_LF' });
  }
  const duplicateSql = [...remoteByHash].filter(([, group]) => group.length > 1)
    .map(([sha256, group]) => ({ sql_sha256: sha256, recorded_rows: group.map(({ version, name }) => ({ version, name })) }));
  const localWithoutMatch = local.filter(item => !trackedByteLocal.has(key(item)))
    .map(({ version, name, path }) => ({ version, name, path: path ?? null }));
  const localWithoutQualifiedMatch = local.filter(item => !trackedByteLocal.has(key(item)) && !trackedLfLocal.has(key(item)))
    .map(({ version, name, path }) => ({ version, name, path: path ?? null }));
  return {
    counts: {
      local: local.length, remote: remote.length, receipt_rows: receipts.length,
      byte_matched_remote: matches.length, terminal_lf_only_remote: terminalLfOnlyMatches.length,
      unresolved_remote: unresolved.length,
      byte_matched_but_metadata_drift: matches.filter(row => !row.exact_metadata_and_bytes).length,
      ambiguous_byte_matched_remote: matches.filter(row => row.identity_ambiguous).length,
      local_without_byte_match: localWithoutMatch.length,
      local_without_byte_or_terminal_lf_match: localWithoutQualifiedMatch.length,
      identical_sql_multiple_remote_versions_groups: duplicateSql.length,
    },
    matches, terminal_lf_only_matches: terminalLfOnlyMatches, unresolved,
    local_without_byte_match: localWithoutMatch,
    local_without_byte_or_terminal_lf_match: localWithoutQualifiedMatch,
    identical_sql_multiple_remote_versions: duplicateSql,
    evidence_limit: 'Stored SQL text may match byte-for-byte or differ only by one final LF. A matching tier does not prove successful historical execution, unchanged production schema, or safe history repair.',
  };
}
