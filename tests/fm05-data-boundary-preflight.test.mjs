import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const path = new URL("../scripts/audit-fm05-data-boundaries.sql", import.meta.url);

test("FM-05 preflight is a bounded read-only database inspection", async () => {
  const sql = await readFile(path, "utf8");
  const executable = sql.replace(/--[^\n]*/g, "").trim();
  assert.match(executable, /^BEGIN TRANSACTION READ ONLY;/i);
  assert.match(executable, /ROLLBACK;$/i);
  assert.match(executable, /SET LOCAL statement_timeout = '15s';/i);
  assert.doesNotMatch(executable, /\b(?:INSERT|UPDATE|DELETE|ALTER|CREATE|DROP|TRUNCATE|GRANT|REVOKE|CALL|COPY|DO|EXECUTE)\s+(?:TABLE\s+|INTO\s+|FROM\s+)?(?:public\.|supabase_migrations\.|auth\.|[\w"]+\s)/i);
  assert.doesNotMatch(executable, /\b(?:pg_read_file|pg_ls_dir|lo_import|dblink_exec)\s*\(/i);
});

test("FM-05 preflight covers project relationships, role grants and migration hashes", async () => {
  const sql = await readFile(path, "utf8");
  for (const required of [
    "pg_constraint", "pg_policies", "has_table_privilege",
    "has_function_privilege", "run_attempts", "prompt_versions",
    "source_observations", "jobs", "supabase_migrations.schema_migrations",
    "sql_sha256", "git_blob_sha", "runs_to_projects",
    "prompts_to_projects", "jobs_to_projects", "run_answers_to_runs",
    "source_maps_to_runs", "support_tickets_to_projects",
    "missing_initial_version", "missing_current_version",
    "history_gap_with_run_selection", "both_missing_same_question",
  ]) assert.ok(sql.includes(required), `Missing FM-05 boundary: ${required}`);
  assert.doesNotMatch(sql, /SELECT\s+\*\s+FROM\s+public\./i);
});
