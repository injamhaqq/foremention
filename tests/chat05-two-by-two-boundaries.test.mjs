import assert from "node:assert/strict";
import test from "node:test";
import {
  FakePostgrest, ORG_A, ORG_B, PROJECT_A1, PROJECT_A2, PROJECT_B1,
  USERS, loadModule, params, request, twoTenantTables, viewerFor, workspaceDeps,
} from "./attach02-harness.mjs";

// Separate fourth synthetic project: do not mutate production and do not
// silently substitute 2x3 fixture coverage for a full 2x2 boundary matrix.
const PROJECT_B2 = "b2b2b2b2-0000-4000-8000-0000000000b2";
const RUN_B2 = "bbbb0002-0000-4000-8000-0000000000b2";

function setup() {
  const tables = twoTenantTables();
  tables.projects.push({ id: PROJECT_B2, organization_id: ORG_B, name: "B2", status: "active" });
  tables.runs.push({ id: RUN_B2, organization_id: ORG_B, project_id: PROJECT_B2, status: "queued", started_at: null });
  const db = new FakePostgrest(tables, new Map());
  const viewer = { current: null };
  const activeProject = new Map();
  const deps = workspaceDeps(db, viewer, {
    activeProject,
    modules: {
      "@/lib/jobs/inngest": { inngest: { send: async () => {} } },
      "@/lib/resolution-follow-ups": { finalizeResolutionFollowUpsForRun: async () => {} },
    },
  });
  const route = loadModule("app/api/runs/[id]/route.ts", deps);
  const select = (user, project) => {
    viewer.current = viewerFor(db,user);
    activeProject.set(user.id,project);
  };
  const cancel = (id) => route.DELETE(request("/api/runs/" + id,{method:"DELETE"}), params(id));
  return { db, route, select, cancel };
}

test("Chat05 2x2: A owner cannot mutate B2 by guessed run ID", async () => {
  const e=setup(); e.select(USERS.aOwner,PROJECT_A1);
  const res=await e.cancel(RUN_B2);
  assert.equal(res.status,404);
  assert.equal(e.db.tables.runs.find(x=>x.id===RUN_B2).status,"queued");
});

test("Chat05 2x2: B analyst selecting B1 cannot mutate sibling B2", async () => {
  const e=setup(); e.select(USERS.bAnalyst,PROJECT_B1);
  const res=await e.cancel(RUN_B2);
  assert.equal(res.status,404);
  assert.equal(e.db.tables.runs.find(x=>x.id===RUN_B2).status,"queued");
});

test("Chat05 2x2: B analyst selecting B2 can cancel own B2", async () => {
  const e=setup(); e.select(USERS.bAnalyst,PROJECT_B2);
  const res=await e.cancel(RUN_B2);
  assert.equal(res.status,200);
  assert.equal(e.db.tables.runs.find(x=>x.id===RUN_B2).status,"cancelled");
  assert.equal(e.db.tables.runs.find(x=>x.id==="aaaa0001-0000-4000-8000-0000000000a1").status,"queued");
});

test("Chat05 2x2: selecting wrong tenant project cannot switch active organization", async () => {
  const e=setup(); e.select(USERS.aAnalyst,PROJECT_B2);
  const res=await e.cancel(RUN_B2);
  assert.equal(res.status,404);
  assert.equal(e.db.tables.runs.find(x=>x.id===RUN_B2).status,"queued");
});