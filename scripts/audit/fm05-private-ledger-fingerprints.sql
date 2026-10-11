-- FM-05 / #332: hash-only export for the private migration-lineage audit.
-- READ-ONLY. No user rows, original SQL statements, or credentials are emitted.
-- Save the output to an owner-controlled file OUTSIDE the repository.
-- This is NOT evidence of migration execution, schema parity or backup safety.
BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '30s';
SET LOCAL lock_timeout = '3s';

WITH source AS (
  SELECT
    version,
    name,
    statements,
    cardinality(statements) AS body_count,
    coalesce(cardinality(rollback),0) AS rollback_count,
    statements[1] AS sql_body
  FROM supabase_migrations.schema_migrations
),
fingerprints AS (
  SELECT
    version,
    name,
    body_count,
    rollback_count,
    octet_length(sql_body) AS text_bytes,
    encode(
      extensions.digest(
        convert_to('blob ' || octet_length(sql_body)::text, 'UTF8')
        || decode('00','hex')
        || convert_to(sql_body,'UTF8'),
        'sha1'
      ), 'hex'
    ) AS raw_git_blob_sha,
    encode(
      extensions.digest(
        convert_to('blob ' || octet_length(sql_body || chr(10))::text, 'UTF8')
        || decode('00','hex')
        || convert_to(sql_body || chr(10),'UTF8'),
        'sha1'
      ), 'hex'
    ) AS append_lf_git_blob_sha
  FROM source
),
summary AS (
  SELECT
    count(*)::int AS records_total,
    count(*) FILTER (WHERE body_count <> 1 OR text_bytes IS NULL OR text_bytes = 0)::int AS invalid_sql_receipts,
    count(*) FILTER (WHERE rollback_count <> 0)::int AS receipts_with_rollback,
    count(DISTINCT version)::int AS distinct_versions,
    encode(
      extensions.digest(
        coalesce(string_agg(version || ':' || coalesce(raw_git_blob_sha,'NULL'), E'\\n' ORDER BY version), ''),
        'sha256'
      ), 'hex'
    ) AS ledger_content_root_sha256
  FROM fingerprints
)
SELECT jsonb_build_object(
  'schemaVersion', 1,
  'records', coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'version', version,
      'name', name,
      'raw_git_blob_sha', raw_git_blob_sha,
      'append_lf_git_blob_sha', append_lf_git_blob_sha,
      'text_bytes', text_bytes
    ) ORDER BY version)
    FROM fingerprints
  ), '[]'::jsonb),
  'audit', jsonb_build_object(
    'records_total', records_total,
    'invalid_sql_receipts', invalid_sql_receipts,
    'receipts_with_rollback', receipts_with_rollback,
    'distinct_versions', distinct_versions,
    'ledger_content_root_sha256', ledger_content_root_sha256
  )
) AS private_hash_only_migration_snapshot
FROM summary;
ROLLBACK;
