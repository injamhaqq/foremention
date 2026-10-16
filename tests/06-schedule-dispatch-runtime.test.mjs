// Chat06 (A14 support): runtime test of the measurement schedule dispatcher.
// Model-pin hold before any reservation, bounded catch-up after an outage, and
// idempotent re-dispatch of one occurrence. In-memory PostgREST, no network.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as schedules from "../lib/measurement-schedules.ts";
import { createFakePostgrest } from "./06-support/fake-postgrest.mjs";

const compiled = ts.transpileModule(await readFile(process.env.FM06_DISPATCHER_SOURCE || new URL("../lib/jobs/measurement-schedule-dispatcher.ts", import.meta.url), "utf8"), {
  fileName: "dispatcher.ts", compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

const ORG = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const PROJECT = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const CATEGORY = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const USER = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const SCHEDULE = "99999999-9999-4999-8999-999999999999";
const Q1 = "11111111-1111-4111-8111-111111111111";

function harness({ modelSnapshot, configuredModel, nextRunAt, origin = "manual", billingSource = "trial_expired", trialEndsAt = null, monthlyRunUnits = 10 }) {
  const rpcCalls = [];
  const store = createFakePostgrest({
    tables: {
      measurement_schedules: [{
        id: SCHEDULE, organization_id: ORG, project_id: PROJECT, category_id: CATEGORY, cadence: "weekly", timezone: "America/New_York",
        question_ids: [Q1], provider_ids: ["groq"], model_snapshot: modelSnapshot, methodology_snapshot: "m1", locale: "en-US", market: "global",
        next_run_at: nextRunAt, created_by: USER, enabled: true,
        schedule_origin: origin, trial_ends_at: trialEndsAt,
        baseline_contract_json: origin === "manual" ? { type: "manual", provider: "groq", model: modelSnapshot } : null,
      }],
      organization_members: [{ organization_id: ORG, user_id: USER, role: "owner" }],
      organization_entitlements: [{ organization_id: ORG, status: "active", expires_at: billingSource === "trial" ? trialEndsAt : null, billing_source: billingSource, monthly_run_units: monthlyRunUnits }],
      projects: [{ id: PROJECT, organization_id: ORG, status: "active" }],
      categories: [{ id: CATEGORY, organization_id: ORG, active: true }],
      prompts: [{ id: Q1, organization_id: ORG, project_id: PROJECT, category_id: CATEGORY, active: true, prompt_key: "q1", prompt_text: "Q1", locale: "en-US", market: "global" }],
      runs: [], run_prompt_selections: [],
    },
    rpc: {
      reserve_run_quota_server: (body) => { rpcCalls.push(["quota", body.p_run_id]); return true; },
      reserve_run_budget_server: (body) => { rpcCalls.push(["budget", body.p_run_id]); return true; },
      release_queued_run_server: () => false,
    },
  });
  const events = [];
  const logs = [];
  const deps = {
    "@/lib/collection-policy": { estimateReservedRunCost: () => 0.1, getProviderCostRates: () => ({ inputPerMillionUsd: 0, outputPerMillionUsd: 0, requestUsd: 0 }), safeOperationalError: () => "sanitized" },
    "@/lib/measurement-lane.mjs": { providerAllowedForMeasurementLane: () => true },
    "@/lib/methodology-registry": { currentObservationMethodologyVersion: () => "m1" },
    "@/lib/free-provider-mode": { providerAllowedForLiveCollection: () => true },
    "@/lib/measurement-schedules": schedules,
    "@/lib/trial-repeat-policy": { admitRepeatDispatch: ({origin, pinned, currentBillingSource, remainingObservationUnits, requestedObservationUnits, now, trialExpiresAt}) => {
      if (!origin || !pinned) return { eligible: false, reason: "CONTRACT_NOT_PINNED" };
      if (origin === "trial" && (currentBillingSource !== "trial" || !trialExpiresAt || new Date(now).getTime() >= new Date(trialExpiresAt).getTime() - 7200000)) return { eligible: false, reason: "TRIAL_WINDOW_EXPIRED" };
      if (origin === "paid" && currentBillingSource !== "paddle") return { eligible: false, reason: "ENTITLEMENT_CHANGED" };
      if (remainingObservationUnits < requestedObservationUnits) return { eligible: false, reason: "CAPACITY_UNAVAILABLE" };
      return { eligible: true };
    }, TRIAL_COMPLETION_BUFFER_MS: 7200000 },
    "@/lib/structured-logger": { logOperationalEvent: (event, fields) => logs.push({ event, ...fields }) },
    "@/lib/providers": { getProvider: () => ({ configured: () => true }) },
    "@/lib/supabase-rest": { supabaseRest: store.rest },
    "@/lib/jobs/inngest": { inngest: { createFunction: (c, h) => ({ c, h }), send: async (e) => { events.push(e); return { ids: [e.id] }; } } },
  };
  const exports = {};
  runInNewContext(compiled, {
    exports, require: (id) => { if (!Object.hasOwn(deps, id)) throw new Error("Unexpected import " + id); return deps[id]; },
    process: { env: { SUPABASE_SERVICE_ROLE_KEY: "synthetic", INNGEST_EVENT_KEY: "synthetic", GROQ_MODEL: configuredModel } },
    console: { warn() {}, info() {} }, crypto: globalThis.crypto, Date, Promise, JSON, Set, Map, Array, Number, String, Object, Error, encodeURIComponent, Math, Intl,
  });
  const pass = () => exports.runMeasurementScheduleBackupPass();
  return { pass, store, events, rpcCalls, logs };
}

test("drifted deployment model holds the occurrence before any run, quota or budget", async () => {
  const due = new Date(Date.now() - 3_600_000).toISOString();
  const h = harness({ modelSnapshot: "baseline-model", configuredModel: "newer-model", nextRunAt: due });
  const result = await h.pass();
  assert.equal(result.queued, 0);
  assert.equal(h.store.db.runs.length, 0);
  assert.deepEqual(h.rpcCalls, []);
  assert.equal(h.events.length, 0);
  assert.equal(h.store.db.measurement_schedules[0].next_run_at, due, "occurrence stays due for an operator decision");
  assert.ok(h.logs.some((l) => l.event === "measurement_schedule_model_pin_hold" && l.scheduleId === SCHEDULE));
});

test("after a long outage one run is queued and the schedule jumps to the next future occurrence", async () => {
  const due = new Date(Date.now() - 60 * 24 * 3_600_000).toISOString(); // ~8.5 weeks overdue
  const h = harness({ modelSnapshot: "baseline-model", configuredModel: "baseline-model", nextRunAt: due });
  const first = await h.pass();
  assert.equal(first.queued, 1);
  assert.equal(h.store.db.runs.length, 1);
  const next = new Date(h.store.db.measurement_schedules[0].next_run_at);
  assert.ok(next > new Date(), "next_run_at is in the future, not one week after the stale occurrence");
  assert.ok(next.getTime() - Date.now() <= 8 * 24 * 3_600_000);
  assert.ok(h.logs.some((l) => l.event === "measurement_schedule_catch_up_skipped_missed_occurrences"));
  // The next hourly pass finds nothing due: no paid backfill burst.
  const second = await h.pass();
  assert.equal(second.due, 0);
  assert.equal(h.store.db.runs.length, 1);
  assert.equal(h.events.length, 1);
  assert.equal(h.events[0].id, `foremention-schedule-${h.store.db.runs[0].id}`);
});

test("legacy unknown origin cannot run even if a legacy model was configured", async () => {
  const h = harness({modelSnapshot:"baseline-model",configuredModel:"baseline-model",nextRunAt:new Date(Date.now()-3600000).toISOString(),origin:"legacy_unknown"});
  const result=await h.pass();
  assert.equal(result.queued,0);
  assert.equal(h.store.db.runs.length,0);
  assert.deepEqual(h.rpcCalls,[]);
});
test("downgraded trial cannot borrow Free quota for old trial repeat", async () => {
  const h = harness({modelSnapshot:"baseline-model",configuredModel:"baseline-model",nextRunAt:new Date(Date.now()-3600000).toISOString(),origin:"trial",billingSource:"trial_expired",trialEndsAt:new Date(Date.now()-3600000).toISOString()});
  const result=await h.pass();
  assert.equal(result.queued,0);
  assert.deepEqual(h.rpcCalls,[]);
});
test("explicit manual schedule cannot exceed its monthly entitlement ceiling", async () => {
  const h = harness({modelSnapshot:"baseline-model",configuredModel:"baseline-model",nextRunAt:new Date(Date.now()-3600000).toISOString(),monthlyRunUnits:0});
  const result=await h.pass();
  assert.equal(result.queued,0);
  assert.deepEqual(h.rpcCalls,[]);
});
