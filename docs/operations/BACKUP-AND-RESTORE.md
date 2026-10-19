# Backup and restore (FM-02)

Supabase free tier gives Foremention no point-in-time recovery and no listed
backups. `.github/workflows/nightly-db-backup.yml` closes that gap at $0:

- Every night at 19:23 UTC (01:23 Asia/Dhaka), and on manual dispatch, it runs
  `scripts/backup/create-encrypted-backup.sh` against production **read-only**
  (`pg_dump` plus `SELECT count(*)` in a `default_transaction_read_only` session).
- The custom-format dump is streamed straight into `age` public-key encryption.
  No plaintext is written to the runner. A manifest (UTC time, server version,
  exact row count of every `public` and `auth` table) is encrypted the same way.
- The ciphertext and `SHA256SUMS` are uploaded as a workflow artifact with
  **7-day retention**. The repository is public, so artifacts can be downloaded
  by any signed-in GitHub user; that is acceptable only because they are
  ciphertext. The age **private** key never goes into GitHub.

## One-time setup (Injam)

1. Install age (`brew install age` / `apt install age`) and create a key pair
   **offline**, kept somewhere durable that is not this repository (password
   manager + an offline copy):

   ```bash
   age-keygen -o foremention-backup-key.txt   # prints "Public key: age1..."
   ```

2. In Supabase: Project `vuujwdxivjsdikdstwib` -> Connect -> **Session pooler**
   connection string (port 5432, user `postgres.vuujwdxivjsdikdstwib`). The
   direct `db.<ref>.supabase.co` host is IPv6-only and GitHub runners have no
   IPv6. A dedicated read-only role is better than `postgres` if you create one.
3. GitHub -> Settings -> Secrets and variables -> Actions -> New repository secret:
   - `SUPABASE_DB_URL` = the session pooler connection string, with password.
   - `BACKUP_AGE_RECIPIENT` = the `age1...` public key (several keys may be
     space separated, e.g. a second key for a co-founder).
4. Actions -> nightly-db-backup -> Run workflow, and confirm it is green.

Until both secrets exist the workflow fails on purpose with
"Backup not configured", so a missing backup is visible.

## Restore drill (do one now, then monthly)

Needs Docker, the PostgreSQL 17 client (`psql`, `pg_restore`), `age`, `python3`.

```bash
# 1. Download the latest artifact (Actions -> nightly-db-backup -> run -> Artifacts)
gh run download --repo injamhaqq/foremention --name foremention-db-backup-<RUN_ID> --dir ./restore-drill

# 2. Disposable, empty Postgres 17
docker run --rm -d --name fm-restore -e POSTGRES_PASSWORD=postgres -p 55432:5432 postgres:17

# 3. Run the drill
AGE_IDENTITY_FILE=/path/to/foremention-backup-key.txt \
RESTORE_DB_URL=postgres://postgres:postgres@127.0.0.1:55432/postgres \
scripts/backup/restore-test.sh ./restore-drill/foremention-db-<STAMP>.dump.age

# 4. Clean up
docker rm -f fm-restore && rm -rf ./restore-drill
```

`restore-test.sh` verifies the ciphertext checksums, decrypts, checks the dump
table of contents, restores everything except Supabase platform-managed
schemas (storage, realtime, vault, graphql, ...), then compares the row count
of every table in the manifest. It prints `PASS ...` and exits 0 only when every
table matches. It refuses a non-empty target and any URL naming the production
project, and never connects to production.

Record each drill (date, artifact run id, PASS/FAIL) in the ops log. A real
recovery into a new Supabase project follows the same dump, but restore only the
`public` and `private` schemas plus `auth` data after the project's own auth
schema exists, and re-apply secrets/settings separately; rehearse that once on
a throwaway project before you need it.

## Tested

The scripts were exercised end to end on 2026-10-19 against a disposable local
PostgreSQL 17 built from this repository's migrations with synthetic rows:
backup -> decrypt -> restore -> `PASS all 132 tables restored with identical row
counts`; a tampered ciphertext, a non-empty target and a production URL were all
refused. They have **not** yet run against production (that needs the secrets
above).
