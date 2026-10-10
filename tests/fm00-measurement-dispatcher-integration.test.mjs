import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = readFileSync(new URL("../lib/jobs/measurement-schedule-dispatcher.ts", import.meta.url), "utf8");

test("FM-00: scheduled measurement pin gate precedes provider setup and reservation", () => {
  const start = source.indexOf("async function prepareMeasurementSchedule(");
  const next = source.indexOf("\nexport const dispatchMeasurementSchedules", start);
  assert.ok(start >= 0 && next > start);
  const body = source.slice(start, next);
  const free = body.indexOf("if (!providerAllowedForLiveCollection(providerId)) return null;");
  const pin = body.indexOf("if (!providerAllowedForMeasurementLane(providerId)) return null;");
  const adapter = body.indexOf("const provider = getProvider(providerId);");
  const quota = body.indexOf('supabaseRest("rpc/reserve_run_quota_server"');
  assert.ok(free >= 0 && pin > free && adapter > pin && quota > adapter);
});

test("FM-00: Inngest and backup share one schedule dispatcher", () => {
  assert.match(source, /export async function runMeasurementScheduleDispatchPass\(/);
  assert.match(source, /async \(\{ step: inngestStep \}\) => runMeasurementScheduleDispatchPass\(/);
  assert.match(source, /export async function runMeasurementScheduleBackupPass\(/);
  assert.match(source, /return runMeasurementScheduleDispatchPass\(\{/);
});

test("FM-00: backup preserves deterministic events and scoped compare-and-set", () => {
  assert.ok(source.includes("foremention-schedule-" + "$" + "{data.runId}"));
  assert.ok(source.includes("next_run_at=eq." + "$" + "{encodeURIComponent(data.scheduledFor)}"));
  assert.ok(source.includes("organization_id=eq." + "$" + "{data.organizationId}&project_id=eq." + "$" + "{data.projectId}"));
});
