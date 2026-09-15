import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("F03 ledgers provider-attempt cost before the separate answer write can fail", async () => {
  const [worker, migration] = await Promise.all([
    text("lib/jobs/inngest.ts"),
    text("supabase/migrations/20260915171500_provider_attempt_cost_ledger.sql"),
  ]);
  const attemptWrite = worker.indexOf("run_attempts?on_conflict=run_id,prompt_id,provider,attempt_number");
  const answerWrite = worker.indexOf("run_answers?on_conflict=run_id,prompt_key,provider");
  assert.ok(attemptWrite >= 0 && answerWrite > attemptWrite, "provider attempt must persist before answer/evidence state");
  assert.match(migration, /create or replace function public\.ledger_run_attempt_cost/);
  assert.match(migration, /after insert or update of status, estimated_cost_usd, cost_source, completed_at on public\.run_attempts/i);
  assert.match(migration, /insert into public\.ai_cost_events/i);
  assert.match(migration, /on conflict \(run_attempt_id\) do update/i);
  assert.match(migration, /new\.status in \('complete','failed','rate_limited'\)/i);
});
