// Chat06 (CV-12 "stuck jobs/cancel recover"): the customer cancel route uses
// compare-and-set writes so it cannot overwrite a run the collector already
// moved to review, and never deletes capacity of a run that started.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { createFakePostgrest } from "./06-support/fake-postgrest.mjs";

const sourcePath = process.env.FM06_CANCEL_ROUTE_SOURCE || new URL("../app/api/runs/[id]/route.ts", import.meta.url);
const compiled = ts.transpileModule(await readFile(sourcePath, "utf8"), {
  fileName: "route.ts",
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

const ORG = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const PROJECT = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const RUN = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CREATOR = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const OTHER = "ffffffff-ffff-4fff-8fff-ffffffffffff";

function route({ run, viewerId = CREATOR, beforeWrite } = {}) {
  const store = createFakePostgrest({
    tables: {
      runs: [{ id: RUN, organization_id: ORG, project_id: PROJECT, created_by: CREATOR, started_at: null, estimated_max_cost_usd: 0.5, ...run }],
      usage_events: [{ id: "u1", organization_id: ORG, run_id: RUN }],
    },
    rpc: {
      // Mirrors public.release_queued_run_server (20260914000300).
      release_queued_run_server: (body, db) => {
        const row = db.runs.find((r) => r.id === body.p_run_id && r.organization_id === body.p_organization_id
          && r.created_by === body.p_actor_id && r.status === "queued" && r.started_at === null);
        if (!row) return false;
        db.usage_events = db.usage_events.filter((u) => u.run_id !== body.p_run_id);
        Object.assign(row, { status: "failed", error_summary: body.p_reason, estimated_max_cost_usd: 0 });
        return true;
      },
    },
  });
  let reads = 0;
  const rest = async (path, options = {}) => {
    // Inject the collector's state change right after the route's first read.
    if ((options.method || "GET") !== "GET" && reads === 1 && beforeWrite) { await beforeWrite(store); reads += 1; }
    if ((options.method || "GET") === "GET") reads += 1;
    return store.rest(path, options);
  };
  const sent = [];
  const deps = {
    "next/server": { NextResponse: { json: (body, init) => ({ body, status: init?.status ?? 200 }) } },
    "@/lib/auth": { getViewer: async () => ({ id: viewerId, mode: "live", accessToken: "synthetic-token" }) },
    "@/lib/data": {
      getPrimaryWorkspaceRole: async () => "analyst",
      loadWorkspaceContext: async () => ({ organizationId: ORG, projectId: PROJECT }),
    },
    "@/lib/jobs/inngest": { inngest: { send: async (e) => { sent.push(e); return { ids: [e.id] }; } } },
    "@/lib/resolution-follow-ups": { finalizeResolutionFollowUpsForRun: async () => undefined },
    "@/lib/request-security": { isTrustedMutationOrigin: () => true },
    "@/lib/supabase-rest": { supabaseRest: rest },
  };
  const exports = {};
  runInNewContext(compiled, {
    exports, require: (id) => { if (!Object.hasOwn(deps, id)) throw new Error("Unexpected import " + id); return deps[id]; },
    Date, Promise, JSON, URL,
  });
  const call = () => exports.DELETE(new Request("https://foremention.com/api/runs/" + RUN, { method: "DELETE" }), { params: Promise.resolve({ id: RUN }) });
  return { call, store, sent };
}

test("creator cancels a never-started run: cancelled, reservation released, worker notified", async () => {
  const h = route({ run: { status: "queued" } });
  const res = await h.call();
  assert.equal(res.status, 200);
  assert.equal(h.store.db.runs[0].status, "cancelled");
  assert.equal(h.store.db.runs[0].estimated_max_cost_usd, 0);
  assert.equal(h.store.db.usage_events.length, 0);
  assert.equal(h.sent[0].name, "foremention/run.cancelled");
});

test("collector moves the run to review between read and write: 409 and review preserved", async () => {
  const h = route({
    run: { status: "running", started_at: "2026-10-13T00:00:00.000Z" },
    beforeWrite: (store) => { store.db.runs[0].status = "review"; },
  });
  const res = await h.call();
  assert.equal(res.status, 409);
  assert.equal(h.store.db.runs[0].status, "review");
  assert.equal(h.store.db.usage_events.length, 1);
  assert.equal(h.sent.length, 0, "no cancellation event for a settled run");
});

test("run starts between read and release: capacity kept, run cancelled as started", async () => {
  const h = route({
    run: { status: "queued" },
    beforeWrite: (store) => Object.assign(store.db.runs[0], { status: "running", started_at: "2026-10-13T00:00:01.000Z" }),
  });
  const res = await h.call();
  assert.equal(res.status, 200);
  assert.equal(h.store.db.runs[0].status, "cancelled");
  assert.equal(h.store.db.runs[0].estimated_max_cost_usd, 0.5);
  assert.equal(h.store.db.usage_events.length, 1);
});

test("non-creator analyst cancels a queued run: cancelled; release deferred to the idempotent cleanup job", async () => {
  const h = route({ run: { status: "queued" }, viewerId: OTHER });
  const res = await h.call();
  assert.equal(res.status, 200);
  assert.equal(h.store.db.runs[0].status, "cancelled");
  assert.equal(h.sent.length, 1);
});
