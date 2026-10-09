import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = async (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("FM-06 combined job keeps provider pin gate and cancellation-safe review transition", async () => {
  const worker = await source("lib/jobs/inngest.ts");
  const start = worker.indexOf("export const runMultiEngineScan");
  const end = worker.indexOf("export const cleanupCancelledCollection", start);
  assert.ok(start >= 0 && end > start, "expected bounded collector body");
  const body = worker.slice(start, end);
  const freeOnly = body.indexOf("providerAllowedForLiveCollection(providerId)");
  const measurementGate = body.indexOf("providerAllowedForMeasurementLane(providerId)");
  const adapter = body.indexOf("const adapter = getProvider(providerId)");
  const review = body.indexOf("confirmRunReviewTransition(");
  const runningCas = body.indexOf("&status=eq.running", review);
  const terminal = body.indexOf('if (reviewTransition === "terminal")', review);
  const firstNotification = body.indexOf('step.run("notify-run-owner"', review);
  const webhook = body.indexOf('step.sendEvent("deliver-collection-webhooks"', review);
  assert.ok(freeOnly >= 0 && measurementGate > freeOnly && adapter > measurementGate, "provider must be allowed and pinned before adapter execution");
  assert.ok(review > adapter && runningCas > review && terminal > runningCas, "status-conditional review commit must precede terminal early return");
  assert.ok(firstNotification > terminal && webhook > terminal, "cancellation must suppress owner notifications and collection webhooks");
  assert.match(body.slice(review, terminal), /organization_id=eq\.\$\{run\.organization_id\}&project_id=eq\.\$\{run\.project_id\}/);
});

test("FM-06 combined recurring schedule contract validates before persistence and retains shared backup gate", async () => {
  const [api, validation, dispatcher] = await Promise.all([
    source("app/api/schedules/route.ts"),
    source("lib/measurement-schedules.ts"),
    source("lib/jobs/measurement-schedule-dispatcher.ts"),
  ]);
  const validateIndex = api.indexOf("schedule = validateMeasurementSchedule(");
  const insertIndex = api.indexOf('supabaseRest<ScheduleRow[]>("measurement_schedules"', validateIndex);
  assert.ok(validateIndex >= 0 && insertIndex > validateIndex, "schedule constraints must be checked before persistence");
  assert.match(validation, /MAX_SCHEDULE_QUESTION_COUNT = 10/);
  assert.match(validation, /MAX_SCHEDULE_PROVIDER_COUNT = 1/);
  assert.match(dispatcher, /providerAllowedForMeasurementLane\(providerId\)/);
  assert.match(dispatcher, /runMeasurementScheduleBackupPass/);
  assert.match(dispatcher, /foremention-schedule-\$\{data\.runId\}/);
});
