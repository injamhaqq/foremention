// Chat06 (CV-12; A14 support): runtime replay tests for the collection job.
// lib/jobs/inngest.ts is transpiled and executed against an in-memory
// PostgREST emulator and a replaying Inngest executor. No network, provider,
// email or database is touched.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { NonRetriableError } from "inngest";
import * as collectionPolicy from "../lib/collection-policy.ts";
import * as reviewTransition from "../lib/jobs/run-review-transition.ts";
import * as attemptReceipt from "../lib/jobs/provider-attempt-receipt.ts";
import * as stepError from "../lib/jobs/provider-step-error.ts";
import * as settlement from "../lib/jobs/run-terminal-settlement.ts";
import * as jobCalendar from "../lib/jobs/job-calendar.ts";
import * as providerTypes from "../lib/providers/types.ts";
import * as evidenceReceipt from "../lib/evidence-receipt.ts";
import { firstBoundedNameIndex } from "../lib/source-page-presence.ts";
import * as trialRepeatPolicy from "../lib/trial-repeat-policy.ts";
import * as evidenceCapacity from "../lib/evidence-capacity.ts";
import { createFakePostgrest } from "./06-support/fake-postgrest.mjs";
import { runWithReplay } from "./06-support/inngest-replay.mjs";

// FM06_INNGEST_SOURCE lets a reviewer point the same tests at another revision
// (used for the RED check recorded in docs/execution/attach-v1/06-status.md).
const sourcePath = process.env.FM06_INNGEST_SOURCE || new URL("../lib/jobs/inngest.ts", import.meta.url);
const compiled = ts.transpileModule(await readFile(sourcePath, "utf8"), {
  fileName: "inngest.ts",
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

const ORG = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const PROJECT = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const RUN = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

function loadJobs({ tables, env = {}, adapterRun } = {}) {
  const store = createFakePostgrest({ tables });
  const processEnv = { GROQ_MODEL: "pinned-model-a", ...env };
  const providerCalls = [];
  const emails = [];
  const functions = {};
  class Inngest {
    constructor() {}
    createFunction(config, handler) {
      const fn = { config, handler };
      functions[config.id] = fn;
      return fn;
    }
    send() { return Promise.resolve({ ids: [] }); }
  }
  const deps = {
    "./run-review-transition": reviewTransition,
    "./run-terminal-settlement": settlement,
    "./job-calendar": jobCalendar,
    "inngest": { Inngest, NonRetriableError },
    "./provider-step-error": stepError,
    "./run-phase-timing": { measureRunPhase: (_phase, _id, fn) => fn() },
    "./provider-attempt-receipt": attemptReceipt,
    "@/lib/agent-control-plane": { recordAgentExecution: async () => undefined },
    "@/lib/collection-policy": {
      ...collectionPolicy,
      getProviderCostRates: () => ({ inputPerMillionUsd: 0, outputPerMillionUsd: 0, requestUsd: 0 }),
    },
    "@/lib/providers": {
      getProvider: () => ({
        configured: () => true,
        run: async (prompt, options) => {
          providerCalls.push({ promptId: prompt.promptId, model: processEnv.GROQ_MODEL });
          if (adapterRun) return adapterRun(prompt, options, processEnv);
          return {
            provider: "groq", model: processEnv.GROQ_MODEL, answer: `Synthetic answer for ${prompt.promptId}`,
            citations: [], raw: {}, collectedAt: "2026-10-13T00:00:00.000Z", latencyMs: 5,
            usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 }, requestId: "req-synthetic", finishReason: "stop",
          };
        },
      }),
    },
    "@/lib/measurement-lane.mjs": { providerAllowedForMeasurementLane: () => true },
    "@/lib/free-provider-mode": { providerAllowedForLiveCollection: () => true },
    "@/lib/providers/types": providerTypes,
    "@/lib/evidence-receipt": evidenceReceipt,
    "@/lib/source-page-presence": { firstBoundedNameIndex },
    "@/lib/trial-repeat-policy": trialRepeatPolicy,
    "@/lib/resolution-follow-ups": { finalizeResolutionFollowUpsForRun: async () => undefined },
    "@/lib/supabase-rest": { supabaseRest: store.rest },
    "@/lib/source-map-generation": { generateObservedSourceMap: async () => ({ sourceCount: 0 }) },
    "@/lib/workspace-email-alerts": { sendWorkspaceEmailAlert: async (input) => { emails.push(input); return { status: "sent" }; } },
    "@/lib/workspace-webhooks": { deliverWorkspaceWebhooks: async () => ({ status: "not_configured" }) },
    "@/lib/hubspot-connector": { deliverHubSpotCompletedAction: async () => undefined },
    "@/lib/notion-connector": { exportWeeklyDigestToNotion: async () => undefined },
    "@/lib/structured-logger": { logOperationalEvent: () => undefined },
    // FM-01: the run resolves its per-workspace capacity context from the real module.
    "@/lib/evidence-capacity": evidenceCapacity,
  };
  const exports = {};
  runInNewContext(compiled, {
    exports,
    require: (id) => {
      if (!Object.hasOwn(deps, id)) throw new Error("Unexpected module import: " + id);
      return deps[id];
    },
    process: { env: processEnv },
    console: { info() {}, warn() {}, log() {} },
    URL, Date, Promise, Set, Map, JSON, Math, Number, String, Array, Object, Error, DOMException,
    AbortController, setTimeout, clearTimeout, encodeURIComponent, crypto: globalThis.crypto,
  }, { filename: "inngest.synthetic.cjs" });
  return { exports, functions, store, processEnv, providerCalls, emails };
}

const minutesAgo = (m) => new Date(Date.now() - m * 60_000).toISOString();
const baseRun = (over = {}) => ({
  id: RUN, organization_id: ORG, project_id: PROJECT, category_id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
  status: "queued", provider_ids: ["groq"], created_by: USER, started_at: null, created_at: minutesAgo(1),
  estimated_max_cost_usd: 0.5, error_summary: null, ...over,
});
const prompts = (n) => Array.from({ length: n }, (_, i) => ({
  organization_id: ORG, run_id: RUN, prompt_id: `p${i + 1}`, prompt_key: `k${i + 1}`, prompt_text: `Question ${i + 1}`, locale: "en-US",
  created_at: `2026-10-13T00:00:0${i}.000Z`,
}));
const usage = () => [{ id: "usage-1", organization_id: ORG, run_id: RUN, units: 3 }];
const event = { name: "foremention/run.requested", data: { runId: RUN, organizationId: ORG, projectId: PROJECT } };

test("open provider circuit: replay-safe exclusions, run fails once, reservation released", async () => {
  const recentFailures = ["r1", "r2", "r3"].map((runId, i) => ({
    id: `f${i}`, organization_id: ORG, run_id: runId, prompt_id: "px", provider: "groq", attempt_number: 1, status: "failed", created_at: minutesAgo(1),
  }));
  const h = loadJobs({
    tables: {
      runs: [baseRun()], run_prompt_selections: prompts(2), usage_events: usage(),
      projects: [{ id: PROJECT, organization_id: ORG, status: "active", client_brand: "Acme" }], competitors: [],
      run_attempts: recentFailures, ai_cost_events: [],
    },
  });
  const outcome = await runWithReplay(h.functions["run-multi-engine-scan"].handler, { event });
  assert.equal(outcome.result.answers, 0);
  const excluded = h.store.db.run_attempts.filter((row) => row.run_id === RUN && row.status === "excluded");
  assert.equal(excluded.length, 2, "one exclusion per question, no replay duplicates");
  assert.equal(h.providerCalls.length, 0);
  const run = h.store.db.runs[0];
  assert.equal(run.status, "failed");
  assert.equal(h.store.db.usage_events.length, 0, "never-started run releases its reservation");
});

test("model configuration drift mid-run: memoized answers kept, no second model is called", async () => {
  const h = loadJobs({
    tables: {
      runs: [baseRun()], run_prompt_selections: prompts(3), usage_events: usage(),
      projects: [{ id: PROJECT, organization_id: ORG, status: "active", client_brand: "Acme" }], competitors: [],
      run_attempts: [], ai_cost_events: [], run_answers: [], notifications: [],
    },
  });
  const outcome = await runWithReplay(h.functions["run-multi-engine-scan"].handler, {
    event,
    afterStep: (id) => { if (id === "collect-groq-k1") h.processEnv.GROQ_MODEL = "different-model-b"; },
  });
  assert.deepEqual(h.providerCalls.map((call) => call.model), ["pinned-model-a"], "exactly one call, under the pinned model");
  const answers = h.store.db.run_answers;
  assert.equal(answers.length, 1);
  assert.equal(answers[0].model, "pinned-model-a");
  assert.equal(outcome.result.answers, 1);
  assert.equal(outcome.result.failures, 2);
  const run = h.store.db.runs[0];
  assert.equal(run.status, "review");
  assert.match(run.error_summary, /2 provider attempt\(s\) failed/);
});

test("late onFailure never overwrites a reviewable run or releases its usage", async () => {
  const h = loadJobs({ tables: { runs: [baseRun({ status: "review", started_at: minutesAgo(10) })], usage_events: usage(), ai_cost_events: [], notifications: [] } });
  await h.functions["run-multi-engine-scan"].config.onFailure({ event: { data: { event } } });
  assert.equal(h.store.db.runs[0].status, "review");
  assert.equal(h.store.db.runs[0].error_summary, null);
  assert.equal(h.store.db.usage_events.length, 1);
  assert.equal(h.store.db.notifications.length, 0, "no false 'run failed' notification");
});

test("platform cancellation of an active run settles as interrupted (failed), not as a customer cancel", async () => {
  const h = loadJobs({ tables: { runs: [baseRun({ status: "running", started_at: minutesAgo(31) })], usage_events: usage(), ai_cost_events: [], notifications: [] } });
  const outcome = await runWithReplay(h.functions["cleanup-cancelled-collection"].handler, {
    event: { name: "inngest/function.cancelled", data: { event } },
  });
  const run = h.store.db.runs[0];
  assert.equal(run.status, "failed");
  assert.equal(run.error_summary, h.exports.INTERRUPTED_RUN_SUMMARY);
  assert.equal(outcome.result.interrupted, true);
  assert.equal(h.store.db.usage_events.length, 1, "started run keeps consumed capacity");
});

test("customer-cancelled never-started run: stays cancelled and its reservation is released idempotently", async () => {
  const h = loadJobs({ tables: { runs: [baseRun({ status: "cancelled", error_summary: "Collection was cancelled." })], usage_events: usage(), ai_cost_events: [] } });
  const cleanup = h.functions["cleanup-cancelled-collection"].handler;
  const first = await runWithReplay(cleanup, { event: { name: "inngest/function.cancelled", data: { event } } });
  assert.equal(first.result.cancelled, true);
  assert.equal(h.store.db.runs[0].status, "cancelled");
  assert.equal(h.store.db.runs[0].error_summary, "Collection was cancelled.");
  assert.equal(h.store.db.usage_events.length, 0);
  await runWithReplay(cleanup, { event: { name: "inngest/function.cancelled", data: { event } } });
  assert.equal(h.store.db.runs[0].status, "cancelled");
});

test("cancellation cleanup never touches a completed/reviewable run", async () => {
  for (const status of ["review", "complete", "partial"]) {
    const h = loadJobs({ tables: { runs: [baseRun({ status, started_at: minutesAgo(40) })], usage_events: usage(), ai_cost_events: [] } });
    await runWithReplay(h.functions["cleanup-cancelled-collection"].handler, { event: { name: "inngest/function.cancelled", data: { event } } });
    assert.equal(h.store.db.runs[0].status, status);
    assert.equal(h.store.db.usage_events.length, 1);
  }
});

test("interrupted-run sweeper settles only runs stuck beyond the worker lifetime", async () => {
  const stale = baseRun({ id: "11111111-1111-4111-8111-111111111111", status: "queued", created_at: minutesAgo(600) });
  const staleRunning = baseRun({ id: "22222222-2222-4222-8222-222222222222", status: "running", created_at: minutesAgo(900), started_at: minutesAgo(800) });
  const slowButLive = baseRun({ id: "33333333-3333-4333-8333-333333333333", status: "running", created_at: minutesAgo(600), started_at: minutesAgo(20) });
  const fresh = baseRun({ id: "44444444-4444-4444-8444-444444444444", status: "queued", created_at: minutesAgo(5) });
  const reviewed = baseRun({ id: "55555555-5555-4555-8555-555555555555", status: "review", created_at: minutesAgo(900), started_at: minutesAgo(890) });
  const h = loadJobs({
    tables: {
      runs: [stale, staleRunning, slowButLive, fresh, reviewed],
      usage_events: [{ id: "u-stale", organization_id: ORG, run_id: stale.id }, { id: "u-running", organization_id: ORG, run_id: staleRunning.id }],
      ai_cost_events: [], notifications: [],
    },
  });
  assert.equal(typeof h.exports.reconcileInterruptedCollectionRunsPass, "function");
  const outcome = await runWithReplay(({ step }) => h.exports.reconcileInterruptedCollectionRunsPass(step), {});
  assert.equal(outcome.result.interrupted, 2);
  const byId = Object.fromEntries(h.store.db.runs.map((row) => [row.id, row]));
  assert.equal(byId[stale.id].status, "failed");
  assert.equal(byId[stale.id].error_summary, h.exports.INTERRUPTED_RUN_SUMMARY);
  assert.equal(byId[staleRunning.id].status, "failed");
  assert.equal(byId[slowButLive.id].status, "running");
  assert.equal(byId[fresh.id].status, "queued");
  assert.equal(byId[reviewed.id].status, "review");
  assert.deepEqual(h.store.db.usage_events.map((row) => row.id), ["u-running"], "only the never-started stuck run is released");
  // Re-running the sweeper is a no-op.
  const again = await runWithReplay(({ step }) => h.exports.reconcileInterruptedCollectionRunsPass(step), {});
  assert.equal(again.result.interrupted, 0);
  assert.ok(h.functions["reconcile-interrupted-collection-runs"], "registered as an Inngest cron function");
});

test("evidence receipts: every persisted answer stores its text and a write-time SHA-256 of the normalized text", async () => {
  const { createHash } = await import("node:crypto");
  const h = loadJobs({
    tables: {
      runs: [baseRun()], run_prompt_selections: prompts(2), usage_events: usage(),
      projects: [{ id: PROJECT, organization_id: ORG, status: "active", client_brand: "Acme" }], competitors: [],
      run_attempts: [], ai_cost_events: [], run_answers: [], notifications: [],
    },
    adapterRun: async (prompt, _options, env) => ({
      provider: "groq", model: env.GROQ_MODEL, answer: `  Acme leads for ${prompt.promptId}.\r\nCafe\u0301 \t`,
      citations: [], raw: { observationMethod: "synthetic" }, collectedAt: "2026-10-14T00:00:00.000Z", latencyMs: 5,
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 }, requestId: "req-synthetic", finishReason: "stop",
    }),
  });
  const outcome = await runWithReplay(h.functions["run-multi-engine-scan"].handler, { event });
  assert.equal(outcome.result.answers, 2);
  const answers = h.store.db.run_answers;
  assert.equal(answers.length, 2);
  for (const row of answers) {
    assert.ok(row.answer_text.length > 0, "raw answer text is persisted");
    assert.equal(row.answer_text_hash_version, evidenceReceipt.ANSWER_TEXT_HASH_VERSION);
    const normalized = row.answer_text.normalize("NFC").replace(/\r\n?/g, "\n").replace(/^[ \t\n\v\f]+|[ \t\n\v\f]+$/g, "");
    assert.equal(row.answer_text_sha256, createHash("sha256").update(normalized, "utf8").digest("hex"));
  }
  assert.notEqual(answers[0].answer_text_sha256, answers[1].answer_text_sha256, "distinct texts get distinct receipts");
});

test("FM-01: every provider call of a run carries the workspace's own capacity context (plan tier from its entitlement)", async () => {
  const seen = [];
  const h = loadJobs({
    tables: {
      runs: [baseRun()], run_prompt_selections: prompts(2), usage_events: usage(),
      projects: [{ id: PROJECT, organization_id: ORG, status: "active", client_brand: "Acme" }], competitors: [],
      run_attempts: [], ai_cost_events: [], run_answers: [], notifications: [],
      organization_entitlements: [{ organization_id: ORG, status: "active", package_key: "core", billing_source: "paddle", expires_at: null }],
    },
    adapterRun: (prompt, options, env) => {
      seen.push(options.capacity);
      return {
        provider: "groq", model: env.GROQ_MODEL, answer: `Synthetic answer for ${prompt.promptId}`,
        citations: [], raw: {}, collectedAt: new Date().toISOString(), latencyMs: 5,
        usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 }, requestId: "req-synthetic", finishReason: "stop",
      };
    },
  });
  await runWithReplay(h.functions["run-multi-engine-scan"].handler, { event });
  assert.equal(seen.length, 2);
  for (const context of seen) assert.deepEqual(context, { pool: "customer", organizationId: ORG, tier: "core", runId: RUN });
});
