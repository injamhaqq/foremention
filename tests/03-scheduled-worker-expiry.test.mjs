import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { admitManualScheduleAuthorization } from "../lib/trial-repeat-policy.ts";

const whole = await readFile(new URL("../lib/jobs/inngest.ts", import.meta.url), "utf8");
const start = whole.indexOf("async function scheduledRunMayCallProvider(");
const end = whole.indexOf("async function persistFailureAttempt(", start);
assert.ok(start > 0 && end > start, "worker entitlement check is a discrete replay-safe helper");
const compiled = ts.transpileModule(
  whole.slice(start, end).replace("async function scheduledRunMayCallProvider(", "export async function scheduledRunMayCallProvider("),
  { fileName: "scheduled-check.ts", compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText;

const run = { id: "test-run", originating_schedule_id: "schedule-1", idempotency_key: "measurement-schedule:schedule-1",
  organization_id: "org-1", project_id: "project-1" };
const later = (hours) => new Date(Date.now() + hours * 3600000).toISOString();

async function execute({
  origin = "manual", enabled = true,
  source = "trial", originalSource = source,
  expiresAt = later(72), originalExpiresAt = expiresAt,
  packageKey = "core", originalPackageKey = packageKey,
  runOverride = {}, legacyMissing = false,
} = {}) {
  let calls = 0;
  const schedule = { schedule_origin: origin, enabled,
    trial_ends_at: originalExpiresAt,
    baseline_contract_json: { type: "manual", authorizationBillingSource: originalSource,
      authorizationPackageKey: originalPackageKey, authorizationExpiresAt: originalExpiresAt },
  };
  const entitlement = { status: "active", billing_source: source, package_key: packageKey, expires_at: expiresAt };
  const supabaseRest = async (path) => {
    calls++;
    if (path.startsWith("measurement_schedules?")) return [schedule];
    if (path.startsWith("organization_entitlements?")) return [entitlement];
    throw new Error("Unexpected data access in scheduled authorization test");
  };
  const out = {};
  runInNewContext(compiled, { exports: out, supabaseRest, admitManualScheduleAuthorization, Date,
    Promise, Array, Math, Number, String, Object });
  const result = await out.scheduledRunMayCallProvider(
    legacyMissing ? { ...run, originating_schedule_id: null } : { ...run, ...runOverride },
  );
  return { result, calls };
}

test("verified explicit manual trial within original window admits worker", async () => {
  assert.equal((await execute()).result, true);
});

test("manual trial expired or downgraded while queued holds before provider request", async () => {
  assert.equal((await execute({ expiresAt: later(-2), originalExpiresAt: later(-2) })).result, false);
  assert.equal((await execute({ source: "trial_expired", originalSource: "trial" })).result, false);
  assert.equal((await execute({ source: "paddle", originalSource: "trial" })).result, false);
});

test("paid/manual change to another package requires explicit authorization", async () => {
  assert.equal((await execute({ source: "paddle", originalSource: "paddle", packageKey: "signal", originalPackageKey: "core" })).result, false);
  assert.equal((await execute({ source: "paddle", originalSource: "paddle", packageKey: "core", originalPackageKey: "core", expiresAt: later(30) })).result, true);
});

test("paused and unknown-source scheduled work fail closed", async () => {
  assert.equal((await execute({ enabled: false })).result, false);
  const missing = await execute({ legacyMissing: true });
  assert.equal(missing.result, false);
  assert.equal(missing.calls, 0);
});

test("originating schedule identity fences scheduled work despite modified request key", async () => {
  const held = await execute({ source: "trial_expired", originalSource: "trial", runOverride: { idempotency_key: "manual:changed" } });
  assert.equal(held.result, false);
  const ordinary = await execute({ runOverride: { originating_schedule_id: null, idempotency_key: "manual:run" } });
  assert.equal(ordinary.result, true);
  assert.equal(ordinary.calls, 0);
});

test("automatically authorized trial respects original and current trial expiry", async () => {
  assert.equal((await execute({ origin: "trial", originalExpiresAt: later(36), expiresAt: later(48) })).result, true);
  assert.equal((await execute({ origin: "trial", originalExpiresAt: later(1) })).result, false);
});
