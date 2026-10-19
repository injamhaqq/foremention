// FM-01 capacity track: per-workspace / per-plan evidence capacity, separate
// pools for public tools + canary, demo refusal, auth rate limits, and per-call
// search cost records. Real SQLite under a D1-shaped adapter; fake fetch and a
// fake Workers AI binding. No network, no provider spend.
import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, writeFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const capacity = await import("../lib/evidence-capacity.ts");
const demoGuard = await import("../lib/demo-cost-guard.ts");
const authLimits = await import("../lib/auth-rate-limit.ts");
const ledger = await import("../lib/search-cost-ledger.ts");

function sqliteStore() {
  const db = new DatabaseSync(":memory:");
  return {
    db,
    prepare(sql) {
      let values = [];
      const statement = {
        bind(...next) { values = next; return statement; },
        async first() { const row = db.prepare(sql).get(...values); return row ?? null; },
        async run() { db.prepare(sql).run(...values); return { success: true }; },
      };
      return statement;
    },
  };
}

const now = new Date(Date.UTC(2026, 9, 19, 10));
const ORG_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ORG_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const ORG_C = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const CANARY = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const customer = (organizationId, tier) => ({ pool: "customer", organizationId, tier });

test.afterEach(() => { delete globalThis.__FOREMENTION_EVIDENCE_CAPACITY__; });

async function admitMany(count, input) {
  const results = await Promise.allSettled(Array.from({ length: count }, () => capacity.admitEvidenceCall(input)));
  return { ok: results.filter((r) => r.status === "fulfilled").length, refused: results.filter((r) => r.status === "rejected").map((r) => r.reason) };
}

// ---------------------------------------------------------------- (1) per workspace

test("FM-01: each workspace has its own daily allowance; one workspace exhausting it does not touch another", async () => {
  capacity.setEvidenceCapacityStore(sqliteStore(), true);
  const env = { FOREMENTION_DAILY_EVIDENCE_CALL_CAP: "1000", FOREMENTION_WORKSPACE_EVIDENCE_CAPS: JSON.stringify({ core: { dailyCalls: 4, monthlyCalls: 100 } }) };
  const a = await admitMany(10, { brave: false, now, env, context: customer(ORG_A, "core") });
  assert.equal(a.ok, 4);
  assert.ok(a.refused.every((e) => e.scope === "workspace_daily"));
  assert.match(a.refused[0].message, /This workspace has used today's live-evidence allowance/);
  const b = await admitMany(4, { brave: false, now, env, context: customer(ORG_B, "core") });
  assert.equal(b.ok, 4, "workspace B keeps its full allowance");
});

test("FM-01: three workspaces running at once each get their plan allowance and never exceed the customer pool", async () => {
  capacity.setEvidenceCapacityStore(sqliteStore(), true);
  // Global 40/day: public reserve 15, canary 5 (clamped to half = 20), customer pool 20.
  const env = { FOREMENTION_DAILY_EVIDENCE_CALL_CAP: "40", FOREMENTION_EVIDENCE_POOLS: JSON.stringify({ canary: { dailyCalls: 5 } }) };
  const pools = capacity.evidencePoolLimits(env);
  assert.deepEqual([pools.public.dailyCalls, pools.canary.dailyCalls, pools.customer.dailyCalls], [15, 5, 20]);
  const [signal, core, trial] = await Promise.all([
    admitMany(30, { brave: false, now, env, context: customer(ORG_A, "signal") }),
    admitMany(30, { brave: false, now, env, context: customer(ORG_B, "core") }),
    admitMany(30, { brave: false, now, env, context: customer(ORG_C, "trial") }),
  ]);
  assert.equal(signal.ok + core.ok + trial.ok, 20, "the three workspaces together stop exactly at the customer pool");
  const snap = await capacity.readEvidenceCapacity({ brave: false, now, env });
  assert.equal(snap.dailyUsed, 20);
  assert.equal(snap.dailyRemaining, 0);
  assert.equal(snap.globalDailyCap, 40);
});

test("FM-01: plan tiers map to different allowances and fail closed to free", () => {
  const future = new Date(now.getTime() + 86_400_000).toISOString();
  const past = new Date(now.getTime() - 86_400_000).toISOString();
  assert.equal(capacity.evidencePlanTier(null, now), "free");
  assert.equal(capacity.evidencePlanTier({ status: "active", package_key: "core", billing_source: "paddle" }, now), "core");
  assert.equal(capacity.evidencePlanTier({ status: "active", package_key: "signal", billing_source: "paddle", expires_at: future }, now), "signal");
  assert.equal(capacity.evidencePlanTier({ status: "active", package_key: "signal", billing_source: "paddle", expires_at: past }, now), "free");
  assert.equal(capacity.evidencePlanTier({ status: "past_due", package_key: "core", billing_source: "paddle" }, now), "free");
  assert.equal(capacity.evidencePlanTier({ status: "active", package_key: "core", billing_source: "trial", expires_at: future }, now), "trial");
  assert.equal(capacity.evidencePlanTier({ status: "active", package_key: "core", billing_source: "manual" }, now), "manual");
  assert.equal(capacity.evidencePlanTier({ status: "active", package_key: "core", billing_source: "unknown-source" }, now), "free");
  const d = capacity.WORKSPACE_EVIDENCE_CAPACITY_DEFAULTS;
  assert.ok(d.free.dailyCalls < d.core.dailyCalls && d.core.monthlyCalls < d.signal.monthlyCalls);
  assert.deepEqual(capacity.workspaceEvidenceLimits("core", { FOREMENTION_WORKSPACE_EVIDENCE_CAPS: "{not json" }), d.core, "invalid override falls back");
  assert.deepEqual(capacity.workspaceEvidenceLimits("core", { FOREMENTION_WORKSPACE_EVIDENCE_CAPS: JSON.stringify({ core: { dailyCalls: -4, monthlyCalls: "lots" } }) }), d.core);
});

test("FM-01: monthly workspace allowance is enforced and a refusal releases the units already taken", async () => {
  const store = sqliteStore();
  capacity.setEvidenceCapacityStore(store, true);
  const env = { FOREMENTION_DAILY_EVIDENCE_CALL_CAP: "1000", FOREMENTION_WORKSPACE_EVIDENCE_CAPS: JSON.stringify({ core: { dailyCalls: 2, monthlyCalls: 3 } }) };
  await capacity.admitEvidenceCall({ brave: true, now, env, context: customer(ORG_A, "core") });
  await capacity.admitEvidenceCall({ brave: true, now, env, context: customer(ORG_A, "core") });
  await assert.rejects(capacity.admitEvidenceCall({ brave: true, now, env, context: customer(ORG_A, "core") }), (e) => e.scope === "workspace_daily");
  const used = (key) => store.db.prepare("SELECT used FROM evidence_capacity_counters WHERE period_key = ?").get(key)?.used ?? 0;
  assert.equal(used(`org:${ORG_A}:month:2026-10`), 2, "a daily refusal gives back the monthly unit");
  assert.equal(used("brave-month:2026-10"), 2, "and never reached the Brave pool counter");
  const tomorrow = new Date(Date.UTC(2026, 9, 20, 10));
  await capacity.admitEvidenceCall({ brave: true, now: tomorrow, env, context: customer(ORG_A, "core") });
  await assert.rejects(capacity.admitEvidenceCall({ brave: true, now: tomorrow, env, context: customer(ORG_A, "core") }), (e) => e.scope === "workspace_monthly" && /this month's live-evidence allowance/.test(e.message));
  const snap = await capacity.readEvidenceCapacity({ brave: true, now: tomorrow, env, context: customer(ORG_A, "core") });
  assert.equal(snap.workspace.monthlyUsed, 3);
  assert.equal(snap.workspace.monthlyRemaining, 0);
});

test("FM-01: free workspaces share one bounded slice, so a crowd of free signups cannot starve a paying workspace", async () => {
  capacity.setEvidenceCapacityStore(sqliteStore(), true);
  const env = { FOREMENTION_DAILY_EVIDENCE_CALL_CAP: "60", FOREMENTION_EVIDENCE_POOLS: JSON.stringify({ public: { dailyCalls: 0 }, canary: { dailyCalls: 0 }, freeWorkspaces: { dailyCalls: 12 } }) };
  let freeAdmitted = 0;
  for (let i = 0; i < 6; i += 1) {
    const org = `eeeeeeee-eeee-4eee-8eee-${String(i).padStart(12, "0")}`;
    freeAdmitted += (await admitMany(10, { brave: false, now, env, context: customer(org, "free") })).ok;
  }
  assert.equal(freeAdmitted, 12, "free workspaces together stop at their shared slice");
  const paid = await admitMany(50, { brave: false, now, env, context: customer(ORG_A, "core") });
  assert.equal(paid.ok, 48, "the paying workspace still gets the rest of the customer pool");
});

// ---------------------------------------------------------------- (2) separate pools

test("FM-01: public tools and the canary have separate pools; exhausting them never spends customer capacity", async () => {
  const store = sqliteStore();
  capacity.setEvidenceCapacityStore(store, true);
  const env = { FOREMENTION_DAILY_EVIDENCE_CALL_CAP: "100", FOREMENTION_MONTHLY_BRAVE_CALL_CAP: "900" };
  const pools = capacity.evidencePoolLimits(env);
  assert.equal(pools.public.dailyCalls + pools.canary.dailyCalls + pools.customer.dailyCalls, 100, "pools sum to the one global ceiling");
  assert.equal(pools.public.monthlyBraveCalls + pools.canary.monthlyBraveCalls + pools.customer.monthlyBraveCalls, 900);
  const publicRun = await admitMany(50, { brave: true, now, env, context: { pool: "public", label: "score" } });
  assert.equal(publicRun.ok, pools.public.dailyCalls);
  assert.match(publicRun.refused[0].message, /free public tools have used today's capacity/);
  const unlabelled = await admitMany(5, { brave: true, now, env });
  assert.equal(unlabelled.ok, 0, "a caller that does not identify itself is admitted from the PUBLIC pool, never customer capacity");
  const canaryRun = await admitMany(50, { brave: true, now, env, context: { pool: "canary", organizationId: CANARY } });
  assert.equal(canaryRun.ok, pools.canary.dailyCalls);
  const snap = await capacity.readEvidenceCapacity({ brave: true, now, env });
  assert.equal(snap.dailyUsed, 0, "customer pool untouched by public and canary traffic");
  assert.equal(snap.monthlyBraveUsed, 0);
  assert.equal(snap.pools.public.dailyRemaining, 0);
  assert.equal(snap.pools.canary.dailyRemaining, 0);
  const paying = await admitMany(5, { brave: true, now, env, context: customer(ORG_A, "core") });
  assert.equal(paying.ok, 5, "paying workspace unaffected after both reserves are exhausted");
});

test("FM-01: reserves never take more than half the ceiling; zero ceiling pauses every pool", () => {
  const small = capacity.evidencePoolLimits({ FOREMENTION_DAILY_EVIDENCE_CALL_CAP: "6", FOREMENTION_EVIDENCE_POOLS: JSON.stringify({ public: { dailyCalls: 100 }, canary: { dailyCalls: 100 } }) });
  assert.equal(small.public.dailyCalls + small.canary.dailyCalls, 3);
  assert.equal(small.customer.dailyCalls, 3);
  const paused = capacity.evidencePoolLimits({ FOREMENTION_DAILY_EVIDENCE_CALL_CAP: "0", FOREMENTION_MONTHLY_BRAVE_CALL_CAP: "0" });
  assert.deepEqual([paused.public.dailyCalls, paused.canary.dailyCalls, paused.customer.dailyCalls, paused.customer.monthlyBraveCalls], [0, 0, 0, 0]);
});

test("FM-01: the configured canary workspace is routed to the canary pool, other workspaces by plan", () => {
  const env = { FOREMENTION_CANARY_ORGANIZATION_IDS: ` ${CANARY.toUpperCase()} , not-a-uuid` };
  assert.deepEqual(capacity.customerEvidenceContext({ organizationId: CANARY, entitlement: null, runId: null, env }), { pool: "canary", organizationId: CANARY, runId: null });
  const ctx = capacity.customerEvidenceContext({ organizationId: ORG_A, entitlement: { status: "active", package_key: "core", billing_source: "paddle" }, env, now });
  assert.equal(ctx.pool, "customer");
  assert.equal(ctx.tier, "core");
  assert.equal(capacity.isCanaryOrganization(ORG_A, {}), false);
});

// ---------------------------------------------------------------- (4) demo

test("FM-01: the demo pool is refused even when no capacity store is registered", async () => {
  await assert.rejects(capacity.admitEvidenceCall({ brave: false, now, context: { pool: "demo" } }), (e) => e.scope === "demo");
  capacity.setEvidenceCapacityStore(sqliteStore(), true);
  await assert.rejects(capacity.admitEvidenceCall({ brave: true, now, context: { pool: "demo" } }), (e) => e.scope === "demo" && /fictional demo never calls a live provider/.test(e.message));
});

test("FM-01: a demo cookie is refused at every cost-bearing endpoint, before the application handler", async () => {
  const cookie = "foo=1; foremention-demo=1; foremention-session=abc";
  for (const { method, path } of demoGuard.DEMO_BLOCKED_COST_ENDPOINTS) {
    const refused = demoGuard.demoCostBearingRefusal(new Request(`https://foremention.com${path}`, { method, headers: { cookie } }));
    assert.ok(refused, `${method} ${path} must be refused for the demo`);
    assert.equal(refused.status, 403);
    assert.match((await refused.json()).error, /fictional demo cannot run live searches or model calls/);
  }
  for (const path of ["/api/onboarding/analyze", "/api/public/score", "/api/public/prompt-check"]) {
    assert.ok(demoGuard.DEMO_BLOCKED_COST_ENDPOINTS.some((entry) => entry.path === path), `${path} is listed`);
    assert.equal(demoGuard.demoCostBearingRefusal(new Request(`https://foremention.com${path}`, { method: "POST", headers: { cookie: "foremention-session=abc" } })), null, "non-demo session passes");
  }
  assert.equal(demoGuard.demoCostBearingRefusal(new Request("https://foremention.com/api/public/score?id=x", { method: "GET", headers: { cookie } })), null, "reading a shared score is not cost-bearing");
  assert.equal(demoGuard.demoCostBearingRefusal(new Request("https://foremention.com/app", { method: "GET", headers: { cookie } })), null);
  assert.equal(demoGuard.hasDemoCookie("xforemention-demo=1"), false);
  assert.equal(demoGuard.hasDemoCookie("foremention-demo="), false);

  const [worker, analyze] = await Promise.all([read("worker/index.ts"), read("app/api/onboarding/analyze/route.ts")]);
  assert.ok(worker.indexOf("demoCostBearingRefusal(correlatedRequest)") > 0);
  assert.ok(worker.indexOf("demoCostBearingRefusal(correlatedRequest)") < worker.indexOf('url.pathname === "/api/public/score"'), "guard precedes the public score handler");
  assert.ok(worker.indexOf("demoCostBearingRefusal(correlatedRequest)") < worker.indexOf("await handler.fetch(correlatedRequest"), "guard precedes the app router");
  assert.ok(analyze.indexOf('viewer.mode === "demo"') > 0 && analyze.indexOf('viewer.mode === "demo"') < analyze.indexOf("inspectSourceUrl(publicUrl"), "onboarding analysis refuses the demo before any fetch or model call");
});

// ---------------------------------------------------------------- grounded path

async function loadCloudflare() {
  const scratch = await mkdtemp(join(tmpdir(), "fm01-capacity-"));
  const source = await read("lib/providers/cloudflare.ts");
  const resolved = source.replace(/from "@\/lib\/([^"]+)"/g, (_m, target) =>
    `from "${new URL(`lib/${target}${/\.(m?js|ts)$/.test(target) ? "" : ".ts"}`, root).href}"`);
  const file = join(scratch, "cloudflare.ts");
  await writeFile(file, resolved);
  return import(pathToFileURL(file).href);
}
const cf = await loadCloudflare();
const fixture = async (name) => JSON.parse(await read(`tests/fixtures/fm01/${name}`));

async function groundedCall(context, { store = sqliteStore(), env = {} } = {}) {
  const fx = await fixture("brave-b2b-positive-control.json");
  const modelAnswer = await fixture("workers-ai-grounded-answer.json");
  const saved = { key: process.env.BRAVE_SEARCH_API_KEY, fetch: globalThis.fetch, info: console.info };
  const savedEnv = Object.fromEntries(Object.keys(env).map((key) => [key, process.env[key]]));
  Object.assign(process.env, env);
  process.env.BRAVE_SEARCH_API_KEY = "offline-fixture-key";
  const searchCalls = [];
  const modelCalls = [];
  const logs = [];
  globalThis.fetch = async (input) => {
    searchCalls.push(String(input));
    return new Response(JSON.stringify(fx.response), { status: 200, headers: { "content-type": "application/json" } });
  };
  console.info = (line) => logs.push(String(line));
  capacity.setEvidenceCapacityStore(store, true);
  const binding = { async run(model, body) { modelCalls.push({ model, body }); return modelAnswer; } };
  try {
    const result = await cf.runGroundedCloudflareWithBinding({ binding, model: "@cf/fixture/pinned", prompt: fx.question, maxOutputTokens: 300, capacity: context })
      .then((value) => ({ ok: true, value }), (error) => ({ ok: false, error }));
    return { result, searchCalls, modelCalls, logs: logs.filter((l) => l.startsWith("{")).map((l) => JSON.parse(l)), store };
  } finally {
    globalThis.fetch = saved.fetch;
    console.info = saved.info;
    if (saved.key === undefined) delete process.env.BRAVE_SEARCH_API_KEY; else process.env.BRAVE_SEARCH_API_KEY = saved.key;
    for (const [key, value] of Object.entries(savedEnv)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
}

test("FM-01: the grounded path refuses a demo context with 403 before any search or model call", async () => {
  const { result, searchCalls, modelCalls } = await groundedCall({ pool: "demo" });
  assert.equal(result.ok, false);
  assert.equal(result.error.status, 403);
  assert.equal(searchCalls.length, 0);
  assert.equal(modelCalls.length, 0);
});

test("FM-01: an exhausted workspace gets 429 with no search or model call; another workspace still runs", async () => {
  const store = sqliteStore();
  const env = { FOREMENTION_WORKSPACE_EVIDENCE_CAPS: JSON.stringify({ free: { dailyCalls: 1, monthlyCalls: 10 } }) };
  const first = await groundedCall(customer(ORG_A, "free"), { store, env });
  assert.equal(first.result.ok, true);
  const second = await groundedCall(customer(ORG_A, "free"), { store, env });
  assert.equal(second.result.ok, false);
  assert.equal(second.result.error.status, 429);
  assert.match(second.result.error.message, /This workspace has used today's live-evidence allowance/);
  assert.equal(second.searchCalls.length, 0);
  assert.equal(second.modelCalls.length, 0);
  const other = await groundedCall(customer(ORG_B, "free"), { store, env });
  assert.equal(other.result.ok, true);
});

// ---------------------------------------------------------------- (5) search cost

test("FM-01: every grounded search logs one cost record with provider, units, estimated cost and account", async () => {
  const { result, logs } = await groundedCall({ pool: "customer", organizationId: ORG_A, tier: "core", runId: ORG_C });
  assert.equal(result.ok, true);
  const costs = logs.filter((l) => l.event === "search_cost_recorded");
  assert.equal(costs.length, 1);
  assert.deepEqual(costs[0], { event: "search_cost_recorded", provider: "brave-search", units: 1, estimatedCostUsd: 0.005, pool: "customer", accountId: ORG_A, runId: ORG_C, outcome: "completed" });
  const publicCall = await groundedCall({ pool: "public", label: "score" });
  const publicCost = publicCall.logs.find((l) => l.event === "search_cost_recorded");
  assert.equal(publicCost.accountId, "pool:public");
  assert.equal(publicCost.pool, "public");
});

test("FM-01: search cost events, the opt-in ledger and the not-applied migration", async () => {
  const event = ledger.searchCostEvent({ provider: "brave-search", units: 3, context: { pool: "customer", organizationId: ORG_A.toUpperCase(), tier: "core", runId: "bad" }, outcome: "failed", now });
  assert.deepEqual(event, { provider: "brave-search", units: 3, estimatedCostUsd: 0.015, costSource: "estimated_list_price", capacityPool: "customer", organizationId: ORG_A, runId: null, outcome: "failed", observedAt: now.toISOString() });
  assert.equal(ledger.searchCostEvent({ provider: "bing-rss", context: { pool: "public" }, outcome: "completed" }).estimatedCostUsd, 0);

  const writes = [];
  const silence = console.info;
  console.info = () => {};
  try {
    assert.deepEqual(await ledger.recordSearchCost(event, { env: {}, write: async (row) => writes.push(row) }), { persisted: false });
    assert.deepEqual(await ledger.recordSearchCost(event, { env: { FOREMENTION_SEARCH_COST_LEDGER: "1" }, write: async (row) => writes.push(row) }), { persisted: false }, "no service role, no write");
    assert.equal(writes.length, 0, "ledger stays off until the operator opts in after the migration");
    const enabled = { FOREMENTION_SEARCH_COST_LEDGER: "1", SUPABASE_SERVICE_ROLE_KEY: "test" };
    assert.deepEqual(await ledger.recordSearchCost(event, { env: enabled, write: async (row) => writes.push(row) }), { persisted: true });
    assert.equal(writes[0].organization_id, ORG_A);
    assert.equal(writes[0].estimated_cost_usd, 0.015);
    assert.equal(writes[0].capacity_pool, "customer");
    assert.deepEqual(await ledger.recordSearchCost(event, { env: enabled, write: async () => { throw new Error("relation missing"); } }), { persisted: false }, "a failed write never throws");
  } finally {
    console.info = silence;
  }

  const migrations = await readdir(new URL("supabase/migrations/", root));
  const name = migrations.find((item) => item.endsWith("_fm01_search_cost_events.sql"));
  assert.ok(name, "search cost migration is in the repo");
  const sql = await read(`supabase/migrations/${name}`);
  assert.match(sql, /create table if not exists public\.search_cost_events/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /revoke all on public\.search_cost_events from anon/);
  assert.doesNotMatch(sql, /grant (insert|update|delete)/i);
  assert.match(sql, /NOT APPLIED/);
});

// ---------------------------------------------------------------- (3) auth limits

test("FM-01: login and auth routes have method-specific limits; sign-in is also limited per account", () => {
  const login = authLimits.authRateLimitRule("/api/auth/login", "POST");
  assert.equal(login.endpoint, "auth-login");
  assert.ok(login.limit > 0 && login.perAccountLimit > 0 && login.perAccountLimit <= login.limit);
  for (const [path, method] of [["/api/auth/verify", "POST"], ["/api/auth/password", "POST"], ["/api/auth/session", "POST"], ["/api/auth/refresh", "GET"], ["/api/auth/sso", "POST"], ["/api/auth/google", "GET"], ["/api/auth/demo", "POST"], ["/api/auth/login/", "post"]]) {
    assert.ok(authLimits.authRateLimitRule(path, method), `${method} ${path} is limited`);
  }
  assert.equal(authLimits.authRateLimitRule("/api/auth/login", "GET"), null);
  assert.equal(authLimits.authRateLimitRule("/api/runs", "POST"), null);
  assert.equal(authLimits.loginAccountIdentifier({ email: "  Person@Example.COM " }), "person@example.com");
  assert.equal(authLimits.loginAccountIdentifier({ email: "nope" }), null);
  assert.equal(authLimits.loginAccountIdentifier(null), null);
});

test("FM-01: the auth limiter is atomic: N concurrent attempts admit exactly the limit, then the window resets", async () => {
  const store = sqliteStore();
  store.db.exec((await import("../db/schema.ts")).publicToolRateLimitsTable);
  const input = { endpoint: "auth-login", fingerprint: "f".repeat(64), limit: 5, windowMs: 15 * 60 * 1000, now: 1_000_000 };
  // Node 22.13 (CI) node:sqlite cannot bind positional values to numbered ?NNN parameters.
  assert.doesNotMatch(authLimits.ATOMIC_WINDOW_SQL, /\?\d/, "anonymous placeholders only");
  assert.equal((authLimits.ATOMIC_WINDOW_SQL.match(/\?/g) || []).length, 8, "eight bound values");
  const results = await Promise.all(Array.from({ length: 12 }, () => authLimits.admitWindowedAttempt(store, input)));
  assert.equal(results.filter(Boolean).length, 5);
  assert.equal(await authLimits.admitWindowedAttempt(store, { ...input, now: input.now + input.windowMs - 1 }), false, "still inside the window");
  assert.equal(await authLimits.admitWindowedAttempt(store, { ...input, now: input.now + input.windowMs }), true, "a new window starts");
  assert.equal(await authLimits.admitWindowedAttempt(store, { ...input, fingerprint: "a".repeat(64) }), true, "another network or account is counted separately");
});

test("FM-01: the Worker enforces auth limits before the app router and never logs an address or email", async () => {
  const worker = await read("worker/index.ts");
  const limitAt = worker.indexOf("await enforceAuthRateLimit(correlatedRequest, env, url.pathname)");
  assert.ok(limitAt > 0 && limitAt < worker.indexOf("await handler.fetch(correlatedRequest"));
  assert.match(worker, /event: "auth_rate_limit_hit", endpoint: rule\.endpoint/);
  assert.match(worker, /request\.clone\(\)\.json\(\)/, "the handler still receives the unread body");
  const fn = worker.slice(worker.indexOf("async function enforceAuthRateLimit"), worker.indexOf("async function handleHealth"));
  const logLines = fn.split("\n").filter((line) => /console\.(warn|info|log)\(|logOperationalEvent\(/.test(line));
  assert.ok(logLines.length >= 1);
  for (const line of logLines) assert.doesNotMatch(line, /\$\{|address\b(?!")|\baccount\b(?!")|email|fingerprint|secret/i, line);
  assert.match(fn, /sha256\(`\$\{secret\}:\$\{rule\.endpoint\}-account:\$\{account\}`\)/, "account key is salted and hashed");
});

// ---------------------------------------------------------------- wiring

test("FM-01: collection runs pass a per-workspace context; public tools pass the public pool", async () => {
  const [jobs, runs, worker] = await Promise.all([read("lib/jobs/inngest.ts"), read("app/api/runs/route.ts"), read("worker/index.ts")]);
  assert.match(jobs, /step\.run\("resolve-evidence-capacity", \(\) => resolveRunCapacityContext\(run\)\)/);
  assert.match(jobs, /maxOutputTokens: LIVE_COLLECTION_LIMITS\.maxOutputTokensPerAnswer, budget, capacity: capacityContext \}/);
  assert.match(jobs, /customerEvidenceContext\(\{ organizationId: run\.organization_id/);
  assert.match(runs, /customerEvidenceContext\(\{ organizationId: context\.organizationId, entitlement: entitlementRow \}\)/);
  assert.match(runs, /EVIDENCE_CAPACITY_WORKSPACE_DAILY_MESSAGE/);
  assert.match(worker, /capacity: \{ pool: "public", label: tool \}/);
});
