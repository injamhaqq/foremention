#!/usr/bin/env bash
# FM-02 restore drill: prove an encrypted nightly backup can be decrypted and
# restored, and that every public/auth table comes back with the exact row count
# recorded at backup time.
#
# Usage:
#   AGE_IDENTITY_FILE=~/.config/foremention/backup-key.txt \
#   RESTORE_DB_URL=postgres://postgres:postgres@127.0.0.1:55432/postgres \
#   scripts/backup/restore-test.sh path/to/foremention-db-<stamp>.dump.age
#
# RESTORE_DB_URL must be a disposable, EMPTY scratch database (local Docker
# Postgres 17 or a throwaway Supabase project). The script refuses the
# production project. It never connects to production.
#
# Exit 0 = PASS (decrypted, restored, all row counts equal). Non-zero = FAIL.
set -euo pipefail

dump_age="${1:?usage: restore-test.sh <foremention-db-STAMP.dump.age>}"
: "${AGE_IDENTITY_FILE:?AGE_IDENTITY_FILE (age private key file) is required}"
: "${RESTORE_DB_URL:?RESTORE_DB_URL (empty scratch database) is required}"
PSQL="${PSQL:-psql}"
PG_RESTORE="${PG_RESTORE:-pg_restore}"
PRODUCTION_PROJECT_REF="vuujwdxivjsdikdstwib"

case "${RESTORE_DB_URL}" in
  *"${PRODUCTION_PROJECT_REF}"*) echo "Refusing: RESTORE_DB_URL points at the production project." >&2; exit 2 ;;
esac
command -v age >/dev/null || { echo "age is not installed" >&2; exit 1; }
[ -f "${dump_age}" ] || { echo "No such file: ${dump_age}" >&2; exit 1; }
manifest_age="${dump_age%.dump.age}.manifest.json.age"
[ -f "${manifest_age}" ] || { echo "Missing manifest next to dump: ${manifest_age}" >&2; exit 1; }

dir="$(cd "$(dirname "${dump_age}")" && pwd)"
if [ -f "${dir}/SHA256SUMS" ]; then
  ( cd "${dir}" && sha256sum --check --ignore-missing --quiet SHA256SUMS ) \
    || { echo "FAIL: ciphertext checksum mismatch" >&2; exit 1; }
  echo "ok   ciphertext checksums match SHA256SUMS"
fi

work="$(mktemp -d)"
chmod 700 "${work}"
cleanup() { rm -rf "${work}"; }
trap cleanup EXIT

age -d -i "${AGE_IDENTITY_FILE}" -o "${work}/db.dump" "${dump_age}"
age -d -i "${AGE_IDENTITY_FILE}" -o "${work}/manifest.json" "${manifest_age}"
echo "ok   decrypted dump and manifest"

"${PG_RESTORE}" --list "${work}/db.dump" > "${work}/toc.txt"
grep -q 'TABLE DATA public' "${work}/toc.txt" || { echo "FAIL: dump has no public table data" >&2; exit 1; }
echo "ok   dump TOC readable ($(wc -l < "${work}/toc.txt" | tr -d ' ') entries)"

existing="$("${PSQL}" "${RESTORE_DB_URL}" -XAtqc "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p')")"
[ "${existing}" = "0" ] || { echo "Refusing: scratch database already has ${existing} public tables." >&2; exit 2; }

# Supabase roles/extensions the schema references. Harmless on a scratch
# Supabase project (all IF NOT EXISTS); required on vanilla Postgres.
"${PSQL}" "${RESTORE_DB_URL}" -X -v ON_ERROR_STOP=1 -q <<'SQL'
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
end $$;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;
SQL

# Restore everything except Supabase platform-managed schemas (storage,
# realtime, vault, graphql, ...), which a scratch target provides itself or does
# not need. Application data lives in public/private; accounts in auth.
platform_schemas=(storage realtime _realtime vault graphql graphql_public pgsodium pgsodium_masks
  supabase_functions net cron pgbouncer _analytics extensions)
exclude_args=()
for schema in "${platform_schemas[@]}"; do exclude_args+=(--exclude-schema="${schema}"); done
set +e
"${PG_RESTORE}" --dbname="${RESTORE_DB_URL}" --no-owner --no-privileges \
  "${exclude_args[@]}" "${work}/db.dump" 2> "${work}/restore.log"
restore_status=$?
set -e
restore_errors="$(grep -c '^pg_restore: error' "${work}/restore.log" || true)"
echo "info pg_restore exit ${restore_status}, ${restore_errors} error line(s) (non-fatal unless row counts differ)"

# Compare every table recorded in the manifest.
python3 - "${work}/manifest.json" "${RESTORE_DB_URL}" "${PSQL}" <<'PY'
import json, subprocess, sys
manifest_path, url, psql = sys.argv[1:4]
manifest = json.load(open(manifest_path))
expected = manifest["row_counts"]
missing, mismatched = [], []
for table, want in sorted(expected.items()):
    schema, name = table.split(".", 1)
    sql = 'select count(*) from "%s"."%s"' % (schema.replace('"', '""'), name.replace('"', '""'))
    r = subprocess.run([psql, url, "-XAtqc", sql], capture_output=True, text=True)
    if r.returncode != 0:
        missing.append(table)
        continue
    got = int(r.stdout.strip())
    if got != int(want):
        mismatched.append((table, want, got))
print("info backup created_at %s, source server %s, %d tables in manifest" % (manifest["created_at"], manifest["server_version"], len(expected)))
for t in missing:
    print("FAIL missing table %s" % t)
for t, want, got in mismatched:
    print("FAIL row count %s: expected %s, restored %s" % (t, want, got))
if missing or mismatched or not expected:
    sys.exit(1)
print("PASS all %d tables restored with identical row counts" % len(expected))
PY
