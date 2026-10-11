import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { INNGEST_SELF_SYNC_CRON, MEASUREMENT_BACKUP_CRON, scheduledBackupPlan, WORKER_CRONS } from "../lib/jobs/schedule-backup-plan.mjs";

const product = await import("../lib/product-limits.ts");
const text = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("pilot limits default to a weekly cadence without raising the dollar cap", () => {
  const limits = product.foundationAccessLimits({});
  assert.equal(limits.runUnitsPerMonth, 50);
  assert.equal(limits.buyerQuestions, 10);
  assert.equal(limits.monthlyAiSpendCapUsd, 2);
  assert.equal(product.weeklyPilotFits(limits), true);
  assert.equal(product.weeklyPilotFits({ buyerQuestions: 10, providersPerRun: 1, runUnitsPerMonth: 20 }), false);
});

test("pilot limits are env-configurable within bounds and invalid values fall back", () => {
  const configured = product.foundationAccessLimits({
    FOREMENTION_FOUNDATION_RUN_UNITS_PER_MONTH: "120",
    FOREMENTION_FOUNDATION_BUYER_QUESTIONS: "20",
    FOREMENTION_FOUNDATION_MONTHLY_AI_SPEND_CAP_USD: "5.50",
    FOREMENTION_FOUNDATION_HISTORY_DAYS: "180",
  });
  assert.equal(configured.runUnitsPerMonth, 120);
  assert.equal(configured.buyerQuestions, 20);
  assert.equal(configured.monthlyAiSpendCapUsd, 5.5);
  assert.equal(configured.historyDays, 180);
  for (const bad of ["-1", "0", "abc", "1e9", "50.5", " "]) {
    assert.equal(product.foundationAccessLimits({ FOREMENTION_FOUNDATION_RUN_UNITS_PER_MONTH: bad }).runUnitsPerMonth, 50, bad);
  }
  for (const bad of ["-2", "abc", "2.555", "999999999"]) {
    assert.equal(product.foundationAccessLimits({ FOREMENTION_FOUNDATION_MONTHLY_AI_SPEND_CAP_USD: bad }).monthlyAiSpendCapUsd, 2, bad);
  }
});

test("settings shows the server-enforced workspace quota, not just the code default", async () => {
  const settings = await text("app/app/settings/page.tsx");
  assert.match(settings, /organization_entitlements\?select=monthly_run_units&organization_id=eq\.\$\{context\.organizationId\}/);
  assert.match(settings, /enforced for this workspace/);
});

test("Cloudflare cron backup runs the idempotent dispatcher at a different minute", async () => {
  assert.equal(MEASUREMENT_BACKUP_CRON, "47 * * * *");
  assert.deepEqual(scheduledBackupPlan(MEASUREMENT_BACKUP_CRON, {}), { dispatch: true, selfSync: false });
  assert.deepEqual(scheduledBackupPlan(MEASUREMENT_BACKUP_CRON, { FOREMENTION_SCHEDULE_BACKUP_CRON: "0" }), { dispatch: false, selfSync: false });
  assert.deepEqual(scheduledBackupPlan(INNGEST_SELF_SYNC_CRON, {}), { dispatch: false, selfSync: false });
  assert.deepEqual(scheduledBackupPlan(INNGEST_SELF_SYNC_CRON, { FOREMENTION_INNGEST_SELF_SYNC: "1" }), { dispatch: false, selfSync: false });
  assert.deepEqual(scheduledBackupPlan(INNGEST_SELF_SYNC_CRON, { FOREMENTION_INNGEST_SELF_SYNC: "1", INNGEST_SIGNING_KEY: "x" }), { dispatch: false, selfSync: true });
  assert.deepEqual(scheduledBackupPlan("0 0 * * *", { FOREMENTION_INNGEST_SELF_SYNC: "1", INNGEST_SIGNING_KEY: "x" }), { dispatch: false, selfSync: false });

  const [wrangler, prepare, worker, dispatcher] = await Promise.all([
    text("wrangler.jsonc"), text("scripts/prepare-worker-config.mjs"), text("worker/index.ts"), text("lib/jobs/measurement-schedule-dispatcher.ts"),
  ]);
  const config = JSON.parse(wrangler);
  assert.deepEqual(config.triggers.crons, [...WORKER_CRONS]);
  assert.match(prepare, /config\.triggers = .*crons: \[\.\.\.WORKER_CRONS\]/);
  assert.match(worker, /async scheduled\(controller: ScheduledController, env: Env, ctx: ExecutionContext\)/);
  assert.match(worker, /runMeasurementScheduleBackupPass\(\)/);
  // Inngest stays primary at minute 17 and both paths share one idempotent pass.
  assert.match(dispatcher, /triggers: \{ cron: "17 \* \* \* \*" \}/);
  assert.match(dispatcher, /export async function runMeasurementScheduleDispatchPass/);
  assert.match(dispatcher, /export async function runMeasurementScheduleBackupPass[\s\S]*runMeasurementScheduleDispatchPass\(/);
  assert.match(dispatcher, /sendEvent: \(_id, event\) => inngest\.send\(event\)/);
  assert.match(dispatcher, /id: `foremention-schedule-\$\{data\.runId\}`/);
  assert.match(dispatcher, /next_run_at=eq\.\$\{encodeURIComponent\(data\.scheduledFor\)\}/);
});
