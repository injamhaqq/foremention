// Chat06 (CV-12, A14 support): fenced terminal settlement for collection runs.
import test from "node:test";
import assert from "node:assert/strict";
import { createFakePostgrest } from "./06-support/fake-postgrest.mjs";
import {
  isStuckActiveRun,
  settleRunTerminal,
  STUCK_RUN_GRACE_MINUTES,
} from "../lib/jobs/run-terminal-settlement.ts";

const RUN = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ORG = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const PROJECT = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function harness(run, { dropReleaseOnce = false } = {}) {
  const store = createFakePostgrest({
    tables: {
      runs: [{ id: RUN, organization_id: ORG, project_id: PROJECT, started_at: null, estimated_max_cost_usd: 1, ...run }],
      usage_events: [{ id: "u1", organization_id: ORG, run_id: RUN, units: 5 }],
    },
    failNext: dropReleaseOnce ? [{ method: "DELETE", prefix: "usage_events" }] : [],
  });
  const scope = `id=eq.${RUN}&organization_id=eq.${ORG}&project_id=eq.${PROJECT}`;
  const io = {
    patchWhere: (filter, body) => store.rest(`runs?select=id,status,started_at&${scope}&${filter}`, { method: "PATCH", prefer: "return=representation", body }),
    reload: async () => (await store.rest(`runs?select=status,started_at&${scope}&limit=1`))[0] ?? null,
    releaseUsage: () => store.rest(`usage_events?organization_id=eq.${ORG}&run_id=eq.${RUN}`, { method: "DELETE" }),
  };
  return { store, io, run: () => store.db.runs[0], usage: () => store.db.usage_events.length };
}

test("never-started queued run fails once and releases its reservation", async () => {
  const h = harness({ status: "queued" });
  const result = await settleRunTerminal(h.io, { status: "failed", errorSummary: "x", releaseIfNeverStarted: true, body: { actual_cost_usd: 0 } });
  assert.deepEqual(result, { state: "settled", status: "failed", started: false, released: true });
  assert.equal(h.run().status, "failed");
  assert.equal(h.run().estimated_max_cost_usd, 0);
  assert.equal(h.usage(), 0);
});

test("started run settles without releasing consumed capacity", async () => {
  const h = harness({ status: "running", started_at: "2026-10-13T00:00:00.000Z" });
  const result = await settleRunTerminal(h.io, { status: "failed", errorSummary: "x", releaseIfNeverStarted: true });
  assert.equal(result.state, "settled");
  assert.equal(result.released, false);
  assert.equal(h.run().estimated_max_cost_usd, 1);
  assert.equal(h.usage(), 1);
});

for (const settled of ["review", "complete", "partial"]) {
  test(`a late failure/cancel never overwrites a ${settled} run`, async () => {
    for (const status of ["failed", "cancelled"]) {
      const h = harness({ status: settled, started_at: "2026-10-13T00:00:00.000Z", error_summary: null });
      const result = await settleRunTerminal(h.io, { status, errorSummary: "late handler", releaseIfNeverStarted: true });
      assert.equal(result.state, "already_settled");
      assert.equal(h.run().status, settled);
      assert.equal(h.run().error_summary, null);
      assert.equal(h.usage(), 1);
    }
  });
}

test("cancel and failure racing on one run settle exactly once (first writer wins)", async () => {
  const h = harness({ status: "running", started_at: "2026-10-13T00:00:00.000Z" });
  const [first, second] = await Promise.all([
    settleRunTerminal(h.io, { status: "cancelled", errorSummary: "Collection was cancelled.", releaseIfNeverStarted: true }),
    settleRunTerminal(h.io, { status: "failed", errorSummary: "late failure", releaseIfNeverStarted: true }),
  ]);
  assert.equal([first, second].filter((r) => r.state === "settled").length, 1);
  assert.equal(h.run().status, "cancelled");
  assert.equal(h.run().error_summary, "Collection was cancelled.");
});

test("a run that starts between read and write is not released (started_at fence)", async () => {
  const h = harness({ status: "queued" });
  // Collector wins the queued->running CAS before the failure handler writes.
  await h.store.rest(`runs?id=eq.${RUN}&status=eq.queued`, { method: "PATCH", body: { status: "running", started_at: "2026-10-13T01:00:00.000Z" } });
  const result = await settleRunTerminal(h.io, { status: "failed", errorSummary: "x", releaseIfNeverStarted: true });
  assert.equal(result.state, "settled");
  assert.equal(result.started, true);
  assert.equal(h.usage(), 1, "consumed capacity of a started run must not be deleted");
});

test("crash after the terminal write but before release is completed by the retried handler", async () => {
  const h = harness({ status: "queued" }, { dropReleaseOnce: true });
  await assert.rejects(settleRunTerminal(h.io, { status: "failed", errorSummary: "x", releaseIfNeverStarted: true }));
  assert.equal(h.run().status, "failed");
  assert.equal(h.usage(), 1, "first attempt lost its release");
  const retry = await settleRunTerminal(h.io, { status: "failed", errorSummary: "x", releaseIfNeverStarted: true });
  assert.deepEqual(retry, { state: "already_settled", currentStatus: "failed", released: true });
  assert.equal(h.usage(), 0);
});

test("a different terminal status never triggers someone else's release", async () => {
  const h = harness({ status: "cancelled" });
  const result = await settleRunTerminal(h.io, { status: "failed", errorSummary: "x", releaseIfNeverStarted: true });
  assert.deepEqual(result, { state: "already_settled", currentStatus: "cancelled", released: false });
  assert.equal(h.usage(), 1);
});

test("stuck-run detection uses started_at, else created_at, beyond the worker lifetime", () => {
  const now = new Date("2026-10-13T12:00:00.000Z");
  const minutesAgo = (m) => new Date(now.getTime() - m * 60_000).toISOString();
  const base = { id: RUN, organization_id: ORG, project_id: PROJECT };
  assert.ok(STUCK_RUN_GRACE_MINUTES >= 4 * 35, "grace must be well beyond start 5m + finish 30m");
  assert.equal(isStuckActiveRun({ ...base, status: "queued", created_at: minutesAgo(STUCK_RUN_GRACE_MINUTES + 1), started_at: null }, now), true);
  assert.equal(isStuckActiveRun({ ...base, status: "queued", created_at: minutesAgo(30), started_at: null }, now), false);
  assert.equal(isStuckActiveRun({ ...base, status: "running", created_at: minutesAgo(1000), started_at: minutesAgo(20) }, now), false);
  assert.equal(isStuckActiveRun({ ...base, status: "running", created_at: minutesAgo(1000), started_at: minutesAgo(STUCK_RUN_GRACE_MINUTES + 5) }, now), true);
  for (const status of ["review", "complete", "partial", "failed", "cancelled"]) {
    assert.equal(isStuckActiveRun({ ...base, status, created_at: minutesAgo(10_000), started_at: null }, now), false);
  }
  assert.equal(isStuckActiveRun({ ...base, status: "queued", created_at: "not-a-date", started_at: null }, now), false);
});
