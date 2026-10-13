// Chat02 (CV-04 / A11 / CV-08): two-org / three-project server-side denial
// matrix executed against the REAL route handlers with an in-memory PostgREST
// emulator (see tests/attach02-harness.mjs for exactly what is and is not real).
//
// Every denial asserts the HTTP status AND the persisted before/after state of
// the other tenant, so "200 with zero rows" or "403 after writing" cannot pass.
import assert from "node:assert/strict";
import test from "node:test";
import {
  FakePostgrest, ORG_A, ORG_B, PROJECT_A1, PROJECT_A2, PROJECT_B1, USERS,
  freshToken, loadModule, params, request, twoTenantTables, viewerFor, workspaceDeps,
} from "./attach02-harness.mjs";
import { sha256Hex } from "../lib/account-security.ts";

function setup({ tables = twoTenantTables(), modules = {}, activeProject } = {}) {
  const db = new FakePostgrest(tables, new Map());
  const viewer = { current: null };
  const deps = workspaceDeps(db, viewer, { modules, activeProject });
  return { db, viewer, deps, as(user, overrides) { viewer.current = user ? viewerFor(db, user, overrides) : null; return viewer.current; } };
}

const snapshot = (db, table, organizationId) => JSON.stringify(db.tables[table].filter((row) => row.organization_id === organizationId));

// ---------------------------------------------------------------- team members
test("Chat02 tenant: member role change and removal are confined to the caller's organization", async () => {
  const env = setup();
  const route = loadModule("app/api/team/members/[id]/route.ts", env.deps);
  const before = snapshot(env.db, "organization_members", ORG_B);

  env.as(USERS.aOwner);
  let response = await route.PATCH(request(`/api/team/members/${USERS.bOwner.id}`, { method: "PATCH", body: { role: "viewer" } }), params(USERS.bOwner.id));
  assert.equal(response.status, 404, "A owner must not resolve a B member by guessed user id");
  response = await route.DELETE(request(`/api/team/members/${USERS.bAnalyst.id}`, { method: "DELETE" }), params(USERS.bAnalyst.id));
  assert.equal(response.status, 404);
  assert.equal(snapshot(env.db, "organization_members", ORG_B), before, "B memberships unchanged");
  assert.deepEqual(env.db.writesTouching(ORG_B), [], "no mutation was even attempted against org B");

  for (const user of [USERS.aAnalyst, USERS.aViewer]) {
    env.as(user);
    response = await route.PATCH(request(`/api/team/members/${USERS.aViewer.id}`, { method: "PATCH", body: { role: "owner" } }), params(USERS.aViewer.id));
    assert.equal(response.status, 403, `${user.email} cannot change roles`);
  }
  assert.equal(env.db.tables.organization_members.find((m) => m.user_id === USERS.aViewer.id).role, "viewer", "no privilege escalation persisted");

  env.as(USERS.aOwner);
  response = await route.PATCH(request(`/api/team/members/${USERS.aOwner.id}`, { method: "PATCH", body: { role: "viewer" } }), params(USERS.aOwner.id));
  assert.equal(response.status, 409, "last owner cannot be demoted");
});

test("Chat02 tenant: a removed member loses workspace access on the next request", async () => {
  const env = setup();
  const route = loadModule("app/api/team/members/[id]/route.ts", env.deps);
  env.as(USERS.aOwner);
  let response = await route.DELETE(request(`/api/team/members/${USERS.aAnalyst.id}`, { method: "DELETE" }), params(USERS.aAnalyst.id));
  assert.equal(response.status, 200);
  assert.equal(env.db.tables.organization_members.some((m) => m.user_id === USERS.aAnalyst.id), false);

  // Same still-valid JWT, membership gone: every org-scoped route must 404.
  env.as(USERS.aAnalyst);
  const runs = loadModule("app/api/runs/[id]/route.ts", { ...env.deps, "@/lib/jobs/inngest": { inngest: { send: async () => {} } }, "@/lib/resolution-follow-ups": { finalizeResolutionFollowUpsForRun: async () => {} } });
  response = await runs.DELETE(request(`/api/runs/x`, { method: "DELETE" }), params("aaaa0001-0000-4000-8000-0000000000a1"));
  assert.equal(response.status, 404);
  assert.equal(env.db.tables.runs[0].status, "queued");
});

// ---------------------------------------------------------------- invitations
async function seedInvitation(db, { organizationId = ORG_B, email = USERS.invitee.email, role = "analyst", status = "pending", expiresInMs = 86_400_000, token = "t".repeat(48) } = {}) {
  const row = { id: `inv-${db.tables.invitations.length + 1}-0000-4000-8000-000000000000`.slice(0, 36), organization_id: organizationId, email, role, status, expires_at: new Date(Date.now() + expiresInMs).toISOString(), invited_by: USERS.bOwner.id, token_hash: await sha256Hex(token) };
  db.tables.invitations.push(row);
  return { row, token };
}

test("Chat02 tenant: invitations cannot be revoked across organizations or by non-admins", async () => {
  const env = setup();
  const { row } = await seedInvitation(env.db);
  const route = loadModule("app/api/team/invitations/[id]/route.ts", env.deps);
  env.as(USERS.aOwner);
  const id = "c0ffee00-0000-4000-8000-000000000001";
  row.id = id;
  let response = await route.DELETE(request(`/api/team/invitations/${id}`, { method: "DELETE" }), params(id));
  assert.equal(response.status, 404);
  assert.equal(row.status, "pending");
  env.as(USERS.bAnalyst);
  response = await route.DELETE(request(`/api/team/invitations/${id}`, { method: "DELETE" }), params(id));
  assert.equal(response.status, 403);
  assert.equal(row.status, "pending");
  env.as(USERS.bOwner);
  response = await route.DELETE(request(`/api/team/invitations/${id}`, { method: "DELETE" }), params(id));
  assert.equal(response.status, 200);
  assert.equal(row.status, "revoked");
});

test("Chat02 lifecycle: invitation acceptance is bound to the verified invited mailbox and single use", async () => {
  const env = setup();
  const route = loadModule("app/api/team/invitations/accept/route.ts", env.deps);
  const { row, token } = await seedInvitation(env.db);
  const membersOfB = () => env.db.tables.organization_members.filter((m) => m.organization_id === ORG_B).map((m) => m.user_id).sort();
  const before = membersOfB();

  env.as(USERS.aOwner); // possession of the link alone is not enough
  let response = await route.POST(request("/api/team/invitations/accept", { body: { token } }));
  assert.equal(response.status, 403);
  env.as(USERS.invitee, { emailVerified: false });
  response = await route.POST(request("/api/team/invitations/accept", { body: { token } }));
  assert.equal(response.status, 403, "unconfirmed email must not accept");
  assert.deepEqual(membersOfB(), before);
  assert.equal(row.status, "pending");

  env.as(USERS.invitee);
  response = await route.POST(request("/api/team/invitations/accept", { body: { token } }));
  assert.equal(response.status, 200);
  const joined = env.db.tables.organization_members.filter((m) => m.user_id === USERS.invitee.id);
  assert.deepEqual(joined.map((m) => [m.organization_id, m.role]), [[ORG_B, "analyst"]], "joined only the inviting org with the invited role");
  assert.equal(row.status, "accepted");

  response = await route.POST(request("/api/team/invitations/accept", { body: { token } }));
  assert.equal(response.status, 409, "replay refused");
});

test("Chat02 lifecycle: expired and revoked invitations grant nothing", async () => {
  const env = setup();
  const route = loadModule("app/api/team/invitations/accept/route.ts", env.deps);
  const expired = await seedInvitation(env.db, { expiresInMs: -1000, token: "e".repeat(48) });
  const revoked = await seedInvitation(env.db, { status: "revoked", token: "r".repeat(48) });
  env.as(USERS.invitee);
  assert.equal((await route.POST(request("/api/team/invitations/accept", { body: { token: expired.token } }))).status, 410);
  assert.equal((await route.POST(request("/api/team/invitations/accept", { body: { token: revoked.token } }))).status, 409);
  assert.equal((await route.POST(request("/api/team/invitations/accept", { body: { token: "short" } }))).status, 400);
  assert.equal(env.db.tables.organization_members.some((m) => m.user_id === USERS.invitee.id), false);
});

test("Chat02 lifecycle: accepting a lower-role invite never downgrades an existing owner", async () => {
  const env = setup();
  const route = loadModule("app/api/team/invitations/accept/route.ts", env.deps);
  const { token } = await seedInvitation(env.db, { organizationId: ORG_B, email: USERS.bOwner.email, role: "viewer", token: "o".repeat(48) });
  env.as(USERS.bOwner);
  const response = await route.POST(request("/api/team/invitations/accept", { body: { token } }));
  assert.equal(response.status, 200);
  assert.equal(env.db.tables.organization_members.find((m) => m.user_id === USERS.bOwner.id && m.organization_id === ORG_B).role, "owner");
});

// ---------------------------------------------------------------- project switch
test("Chat02 tenant: active-project selection only accepts the caller's own active projects", async () => {
  const env = setup();
  const route = loadModule("app/api/workspace/project/route.ts", env.deps);
  env.as(USERS.aOwner);
  let response = await route.POST(request("/api/workspace/project", { body: { projectId: PROJECT_B1 } }));
  assert.equal(response.status, 404, "cannot select another org's project");
  assert.equal(response.headers.get("set-cookie"), null, "no active-project cookie for a denied project");
  response = await route.POST(request("/api/workspace/project", { body: { projectId: PROJECT_A2 } }));
  assert.equal(response.status, 200);
  assert.match(response.headers.get("set-cookie") || "", new RegExp(`foremention-active-project=${PROJECT_A2}.*HttpOnly`, "i"));
  response = await route.POST(request("/api/workspace/project", { body: { projectId: "../../etc" } }));
  assert.equal(response.status, 400);
  env.as(USERS.revoked);
  response = await route.POST(request("/api/workspace/project", { body: { projectId: PROJECT_A1 } }));
  assert.equal(response.status, 404);
});

// ---------------------------------------------------------------- jobs (run cancel)
test("Chat02 tenant: run cancellation denies guessed cross-org, wrong-project and viewer requests", async () => {
  const activeProject = new Map([[USERS.aAnalyst.id, PROJECT_A1]]);
  const sent = [];
  const env = setup({ activeProject, modules: { "@/lib/jobs/inngest": { inngest: { send: async (e) => { sent.push(e); } } }, "@/lib/resolution-follow-ups": { finalizeResolutionFollowUpsForRun: async () => {} } } });
  const route = loadModule("app/api/runs/[id]/route.ts", env.deps);
  const [runA1, runA2, runB1] = env.db.tables.runs;

  env.as(USERS.aAnalyst);
  assert.equal((await route.DELETE(request("/api/runs/x", { method: "DELETE" }), params(runB1.id))).status, 404);
  assert.equal((await route.DELETE(request("/api/runs/x", { method: "DELETE" }), params(runA2.id))).status, 404, "sibling project run is outside the active project");
  env.as(USERS.aViewer);
  assert.equal((await route.DELETE(request("/api/runs/x", { method: "DELETE" }), params(runA1.id))).status, 403);
  assert.deepEqual([runA1.status, runA2.status, runB1.status], ["queued", "running", "queued"]);
  assert.deepEqual(env.db.rpcCalls, [], "no capacity release RPC for denied requests");
  assert.deepEqual(sent, []);

  env.as(USERS.aAnalyst);
  assert.equal((await route.DELETE(request("/api/runs/x", { method: "DELETE" }), params(runA1.id))).status, 200);
  assert.equal(runA1.status, "cancelled");
  assert.equal(runB1.status, "queued");
  assert.deepEqual(env.db.rpcCalls.map((c) => c.body.p_organization_id), [ORG_A]);
});

// ---------------------------------------------------------------- billing portal
test("Chat02 tenant: billing portal never opens another organization's customer", async () => {
  const portals = [];
  const provider = { id: "paddle", configured: () => true, createPortal: async ({ customerId }) => { portals.push(customerId); return { url: "https://customer-portal.paddle.test/synthetic" }; } };
  const env = setup({ modules: { "@/lib/billing-provider": { billingProvider: () => provider } } });
  const route = loadModule("app/api/billing/portal/route.ts", env.deps);
  env.as(USERS.aAnalyst);
  assert.equal((await route.POST(request("/api/billing/portal"))).status, 403);
  env.as(USERS.aOwner);
  assert.equal((await route.POST(request("/api/billing/portal"))).status, 409, "org A has no billing customer; must not fall back to B's");
  assert.deepEqual(portals, []);
  env.as(USERS.bOwner);
  const response = await route.POST(request("/api/billing/portal"));
  assert.equal(response.status, 303);
  assert.deepEqual(portals, ["ctm_synthetic_org_b"]);
});

// ---------------------------------------------------------------- deletion
function deletionModules(log) {
  return {
    "@/lib/application-email": { sendProductAlertEmail: async () => { log.push("email"); } },
    "@/lib/jobs/inngest": { inngest: { send: async () => {} } },
    "@/lib/session-revocation": { revokeAllSupabaseSessions: async () => true },
  };
}

test("Chat02 privacy: deletion requires owner role and a recent interactive sign-in, not just a refreshed token", async () => {
  const tables = twoTenantTables();
  tables.runs.forEach((run) => { run.status = "complete"; });
  const log = [];
  const env = setup({ tables, modules: deletionModules(log) });
  const route = loadModule("app/api/account/deletion/route.ts", env.deps);
  const body = { confirmation: "DELETE FOREMENTION" };

  env.as(USERS.aAnalyst);
  assert.equal((await route.POST(request("/api/account/deletion", { body }))).status, 403);
  env.as(USERS.revoked);
  assert.equal((await route.POST(request("/api/account/deletion", { body }))).status, 404);

  // Silent refresh: token minted 30s ago, but interactive sign-in was 6 hours ago.
  env.as(USERS.aOwner, { tokenOptions: { tokenAgeSeconds: 30, authAgeSeconds: 6 * 3600 } });
  let response = await route.POST(request("/api/account/deletion", { body }));
  assert.equal(response.status, 401);
  assert.equal((await response.json()).reauthenticationRequired, true);
  // Recovery-link session is not an interactive reauthentication.
  env.as(USERS.aOwner, { tokenOptions: { method: "recovery" } });
  assert.equal((await route.POST(request("/api/account/deletion", { body }))).status, 401);
  assert.equal(env.db.tables.account_deletion_requests.length, 0);

  env.as(USERS.aOwner);
  response = await route.POST(request("/api/account/deletion", { body }));
  assert.equal(response.status, 201);
  assert.deepEqual(env.db.tables.account_deletion_requests.map((r) => r.organization_id), [ORG_A]);

  // Second confirmation is refused inside the seven-day window.
  response = await route.PUT(request("/api/account/deletion", { method: "PUT", body: { confirmation: "DELETE Synthetic Org A", exportAcknowledged: true } }));
  assert.equal(response.status, 409);
  assert.deepEqual(env.db.rpcCalls, []);

  // B owner cannot cancel or execute A's request.
  env.as(USERS.bOwner);
  assert.equal((await route.DELETE(request("/api/account/deletion", { method: "DELETE" }))).status, 404);
  assert.equal(env.db.tables.account_deletion_requests[0].status, "pending");
  assert.deepEqual(log, []);
});

// ---------------------------------------------------------------- origin first
test("Chat02 origin: hostile origins are rejected before any database call on every audited mutation", async () => {
  const env = setup({ modules: { ...deletionModules([]), "@/lib/billing-provider": { billingProvider: () => ({ id: "paddle", configured: () => true, createPortal: async () => ({ url: "x" }) }) }, "@/lib/resolution-follow-ups": { finalizeResolutionFollowUpsForRun: async () => {} } } });
  env.as(USERS.aOwner);
  const cases = [
    ["app/api/team/members/[id]/route.ts", "PATCH"], ["app/api/team/members/[id]/route.ts", "DELETE"],
    ["app/api/team/invitations/[id]/route.ts", "DELETE"], ["app/api/team/invitations/accept/route.ts", "POST"],
    ["app/api/workspace/project/route.ts", "POST"], ["app/api/runs/[id]/route.ts", "DELETE"],
    ["app/api/billing/portal/route.ts", "POST"], ["app/api/account/deletion/route.ts", "POST"],
    ["app/api/account/deletion/route.ts", "PUT"], ["app/api/account/deletion/route.ts", "DELETE"],
  ];
  for (const origin of ["https://evil.example", "null", "https://foremention.com.evil.example", "https://foremention.com/path"]) {
    for (const [path, method] of cases) {
      const route = loadModule(path, env.deps);
      const response = await route[method](request("/api/x", { method, origin, body: { role: "viewer", projectId: PROJECT_A2, token: "t".repeat(48) } }), params(USERS.aAnalyst.id));
      assert.equal(response.status, 403, `${method} ${path} with origin ${origin}`);
    }
  }
  assert.deepEqual(env.db.calls, [], "no database request happened for any hostile-origin mutation");
});

test("Chat02 harness self-check: emulator RLS hides other-org rows from user tokens but not service role", async () => {
  const db = new FakePostgrest(twoTenantTables(), new Map());
  const token = freshToken(USERS.aOwner.id);
  db.tokens.set(token, USERS.aOwner.id);
  assert.equal((await db.rest(`runs?select=id&organization_id=eq.${ORG_B}`, { token })).length, 0);
  assert.equal((await db.rest(`runs?select=id&organization_id=eq.${ORG_B}`, { serviceRole: true })).length, 1);
  assert.equal((await db.rest(`runs?select=id`, {})).length, 0, "anon sees nothing");
});
