import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

const capacity = await import("../lib/evidence-capacity.ts");

/** Minimal D1-shaped adapter over a real SQLite database (same upsert semantics). */
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

const now = new Date(Date.UTC(2026, 9, 12, 10));

test.afterEach(() => { delete globalThis.__FOREMENTION_EVIDENCE_CAPACITY__; });

test("A18: daily cap admits exactly N calls, then fails closed with a clear message", async () => {
  const store = sqliteStore();
  capacity.setEvidenceCapacityStore(store, true);
  const env = { FOREMENTION_DAILY_EVIDENCE_CALL_CAP: "3" };
  const results = await Promise.allSettled(Array.from({ length: 8 }, () => capacity.admitEvidenceCall({ brave: false, now, env })));
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 3);
  const refused = results.find((r) => r.status === "rejected");
  assert.equal(refused.reason.scope, "daily");
  assert.match(refused.reason.message, /00:00 UTC/);
  // Next UTC day starts fresh.
  await capacity.admitEvidenceCall({ brave: false, now: new Date(Date.UTC(2026, 9, 13, 0, 1)), env });
  const snap = await capacity.readEvidenceCapacity({ brave: false, now, env });
  assert.equal(snap.enforced, true);
  assert.equal(snap.dailyUsed, 3);
  assert.equal(snap.dailyRemaining, 0);
});

test("A18: Brave monthly cap stops before the paid search tier and releases on daily refusal", async () => {
  const store = sqliteStore();
  capacity.setEvidenceCapacityStore(store, true);
  const env = { FOREMENTION_DAILY_EVIDENCE_CALL_CAP: "1", FOREMENTION_MONTHLY_BRAVE_CALL_CAP: "2" };
  await capacity.admitEvidenceCall({ brave: true, now, env });
  await assert.rejects(capacity.admitEvidenceCall({ brave: true, now, env }), (e) => e.scope === "daily");
  let snap = await capacity.readEvidenceCapacity({ brave: true, now, env });
  assert.equal(snap.monthlyBraveUsed, 1, "daily refusal must not consume monthly Brave allowance");
  await capacity.admitEvidenceCall({ brave: true, now: new Date(Date.UTC(2026, 9, 14)), env });
  await assert.rejects(capacity.admitEvidenceCall({ brave: true, now: new Date(Date.UTC(2026, 9, 15)), env }), (e) => e.scope === "monthly" && /before any paid search charge/.test(e.message));
  snap = await capacity.readEvidenceCapacity({ brave: true, now: new Date(Date.UTC(2026, 9, 15)), env });
  assert.equal(snap.monthlyBraveRemaining, 0);
});

test("A18: required store missing or erroring fails closed; zero cap pauses; bad env falls back", async () => {
  capacity.setEvidenceCapacityStore(null, true);
  await assert.rejects(capacity.admitEvidenceCall({ brave: false, now }), (e) => e.scope === "unavailable");
  capacity.setEvidenceCapacityStore({ prepare() { throw new Error("d1 down"); } }, true);
  await assert.rejects(capacity.admitEvidenceCall({ brave: false, now }), (e) => e.scope === "unavailable");
  capacity.setEvidenceCapacityStore(sqliteStore(), true);
  await assert.rejects(capacity.admitEvidenceCall({ brave: false, now, env: { FOREMENTION_DAILY_EVIDENCE_CALL_CAP: "0" } }), (e) => e.scope === "daily");
  assert.deepEqual(capacity.evidenceCapacityLimits({ FOREMENTION_DAILY_EVIDENCE_CALL_CAP: "-5", FOREMENTION_MONTHLY_BRAVE_CALL_CAP: "lots" }), capacity.EVIDENCE_CAPACITY_DEFAULTS);
  assert.ok(capacity.EVIDENCE_CAPACITY_DEFAULTS.monthlyBraveCalls < 1000, "default stays under Brave's ~1,000 free requests");
});

test("A18: grounded calls, public tools, collections and the operator page are wired to the cap", async () => {
  const [provider, worker, runs, agents] = await Promise.all([
    readFile(new URL("../lib/providers/cloudflare.ts", import.meta.url), "utf8"),
    readFile(new URL("../worker/index.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/runs/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/app/agents/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.ok(provider.indexOf("admitEvidenceCall") < provider.indexOf("evidence = await retrieveFreeWebEvidence"), "admission precedes retrieval");
  assert.match(worker, /setEvidenceCapacityStore\(env\.DB, true\)/);
  assert.match(worker, /catch\(capacityRefusal\)/);
  assert.match(runs, /readEvidenceCapacity/);
  assert.match(agents, /EvidenceCapacityCard/);
});

