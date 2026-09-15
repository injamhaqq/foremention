import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("F04 keeps failed page retrieval unknown, records reference origin, and withholds unsupported absence", async () => {
  const [migration, generator, types, publicExplorer, sourceTable] = await Promise.all([
    text("supabase/migrations/20260915170000_evidence_semantics_hardening.sql"),
    text("lib/source-map-generation.ts"),
    text("lib/types.ts"),
    text("components/public-source-map-explorer.tsx"),
    text("components/source-map-table.tsx"),
  ]);
  assert.match(migration, /add column if not exists page_presence_state text not null default 'unknown'/i);
  assert.match(migration, /page_presence_state in \('unknown','present','absent'\)/i);
  assert.match(migration, /add column if not exists reference_origin text not null default 'provider_citation'/i);
  assert.match(migration, /reference_origin in \('provider_citation'\)/i);
  assert.match(migration, /normalize_source_map_entry_presence_state/);
  assert.match(generator, /pagePresenceState:\s*"unknown"/);
  assert.match(generator, /isReachable[\s\S]*clientPresent \? "present" : "absent"[\s\S]*"unknown"/);
  assert.match(generator, /page_presence_state:\s*pagePresenceState/);
  assert.match(generator, /reference_origin:\s*"provider_citation"/);
  assert.match(types, /pagePresence\?:\s*"present" \| "absent" \| "unknown"/);
  assert.match(types, /referenceOrigin\?:\s*"provider_citation"/);
  assert.match(publicExplorer, /presence === "absent"/);
  assert.match(publicExplorer, /"Unknown"/);
  assert.match(sourceTable, /!entry\.reviewedAt \? "Not human-reviewed"/);
});

test("F06 rejects follow-up runs whose persisted locale or market context changed", async () => {
  const migration = await text("supabase/migrations/20260915170500_comparability_context_hardening.sql");
  assert.match(migration, /create or replace function public\.validate_resolution_follow_up_context/);
  assert.match(migration, /prompt_key, prompt_text, locale, market/i);
  assert.match(migration, /except[\s\S]*prompt_key, prompt_text, locale, market/i);
  assert.match(migration, /Follow-up run changed the persisted buyer-question locale or market context/);
  assert.match(migration, /before insert or update of rerun_id, status on public\.resolution_follow_ups/i);
});

test("F15 exposes one service-only run diagnostic with account, failure, and reconciled cost", async () => {
  const migration = await text("supabase/migrations/20260915171000_operator_run_diagnostics.sql");
  assert.match(migration, /create or replace function public\.operator_run_diagnostic/);
  assert.match(migration, /organizationName/);
  assert.match(migration, /errorSummary/);
  assert.match(migration, /actualCostUsd/);
  assert.match(migration, /costEventsTotalUsd/);
  assert.match(migration, /accountingReconciled/);
  assert.match(migration, /revoke all on function public\.operator_run_diagnostic\(uuid\) from public, anon, authenticated/i);
  assert.match(migration, /grant execute on function public\.operator_run_diagnostic\(uuid\) to service_role/i);
});

test("F03/F21 scheduled dispatch retries safely and one blocked schedule does not starve peers", async () => {
  const dispatcher = await text("lib/jobs/measurement-schedule-dispatcher.ts");
  assert.match(dispatcher, /for \(const schedule of schedules\)/);
  assert.match(dispatcher, /if \(prepared\) preparedRuns\.push\(prepared\)/);
  assert.doesNotMatch(dispatcher, /if \(!prepared\) (?:return|throw)/);
  const sendIndex = dispatcher.indexOf("step.sendEvent");
  const advanceIndex = dispatcher.lastIndexOf("advance-measurement-schedule-");
  assert.ok(sendIndex >= 0 && advanceIndex > sendIndex, "schedule advancement must remain a separate post-dispatch retryable step");
  const preparationCatch = dispatcher.indexOf("await releaseScheduledCandidate(schedule, runId, error)");
  assert.ok(preparationCatch >= 0 && preparationCatch < sendIndex, "reservation release must remain confined to pre-dispatch preparation failure");
  assert.match(dispatcher, /id:\s*`foremention-schedule-\$\{data\.runId\}`/);
});
