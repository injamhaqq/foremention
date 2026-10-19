#!/usr/bin/env bash
# FM-02: encrypted logical backup of the Foremention Supabase Postgres database.
#
# Streams `pg_dump --format=custom` straight into `age` public-key encryption,
# so no plaintext dump is ever written to disk. A small manifest (UTC time,
# server version, exact row counts per public/auth table) is encrypted the same
# way and is what restore-test.sh compares a restored copy against.
#
# Required env:
#   SUPABASE_DB_URL       Postgres connection string (Supabase *Session pooler*,
#                         port 5432; GitHub runners have no IPv6 for the direct host).
#   BACKUP_AGE_RECIPIENT  One or more age public keys (age1...), space/newline separated.
# Optional env:
#   BACKUP_OUT_DIR        Output directory (default: ./backup-out)
#   PG_DUMP / PSQL        Client binaries (must be >= the server major version, 17).
#
# Output (all ciphertext except the checksum list):
#   foremention-db-<stamp>.dump.age
#   foremention-db-<stamp>.manifest.json.age
#   SHA256SUMS
# READ-ONLY against the source database: pg_dump and SELECT count(*) only.
set -euo pipefail

: "${SUPABASE_DB_URL:?SUPABASE_DB_URL is required}"
: "${BACKUP_AGE_RECIPIENT:?BACKUP_AGE_RECIPIENT is required}"
PG_DUMP="${PG_DUMP:-pg_dump}"
PSQL="${PSQL:-psql}"
OUT_DIR="${BACKUP_OUT_DIR:-backup-out}"
command -v age >/dev/null || { echo "age is not installed" >&2; exit 1; }

recipients=()
for key in ${BACKUP_AGE_RECIPIENT}; do
  if [[ ! "${key}" =~ ^age1[0-9a-z]{58}$ ]]; then
    echo "BACKUP_AGE_RECIPIENT must contain only age public keys (age1...)." >&2
    exit 1
  fi
  recipients+=(-r "${key}")
done
[ "${#recipients[@]}" -gt 0 ] || { echo "No age recipient configured" >&2; exit 1; }

mkdir -p "${OUT_DIR}"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
base="${OUT_DIR}/foremention-db-${stamp}"

# Read-only session for everything below.
export PGOPTIONS="-c default_transaction_read_only=on -c statement_timeout=900000"

server_version="$("${PSQL}" "${SUPABASE_DB_URL}" -XAtqc "show server_version")"

# 1) Dump -> encrypt (stream). pipefail makes a failed pg_dump fail the step.
"${PG_DUMP}" --dbname="${SUPABASE_DB_URL}" --format=custom --compress=6 \
  --no-password --quote-all-identifiers \
  | age "${recipients[@]}" -o "${base}.dump.age"

# 2) Manifest with exact row counts for application (public) and account (auth) tables.
counts_sql="$("${PSQL}" "${SUPABASE_DB_URL}" -XAtq <<'SQL'
select coalesce(string_agg(
  format('select %L as t, count(*)::bigint as n from %I.%I', n.nspname || '.' || c.relname, n.nspname, c.relname),
  ' union all ' order by n.nspname, c.relname), 'select null::text as t, 0::bigint as n where false')
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where c.relkind in ('r','p') and n.nspname in ('public','auth')
  and not c.relispartition;
SQL
)"
row_counts="$("${PSQL}" "${SUPABASE_DB_URL}" -XAtq -c "select coalesce(json_object_agg(t, n order by t), '{}'::json) from (${counts_sql}) x")"

printf '{"format":"foremention-db-backup/v1","created_at":"%s","server_version":"%s","dump":"%s","row_counts":%s}\n' \
  "${stamp}" "${server_version}" "$(basename "${base}.dump.age")" "${row_counts}" \
  | age "${recipients[@]}" -o "${base}.manifest.json.age"

# 3) Ciphertext checksums (safe to publish; reveal nothing about content).
( cd "${OUT_DIR}" && sha256sum "$(basename "${base}.dump.age")" "$(basename "${base}.manifest.json.age")" > SHA256SUMS )

size="$(wc -c < "${base}.dump.age" | tr -d ' ')"
echo "Encrypted backup written: $(basename "${base}").* (${size} bytes ciphertext)"
