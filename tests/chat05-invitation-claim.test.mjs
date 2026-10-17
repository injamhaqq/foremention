import assert from "node:assert/strict";
import test from "node:test";
import {
  FakePostgrest, ORG_B, USERS, loadModule, request,
  twoTenantTables, viewerFor, workspaceDeps,
} from "./attach02-harness.mjs";
import { sha256Hex } from "../lib/account-security.ts";

// Real route, no live Supabase. Since Chat 01 the route delegates the whole
// accept to the atomic accept_foremention_invitation RPC (migration
// 20261017150000); the harness models it, and CI proves the real SQL.
const TOKEN = "A".repeat(48);
const INVITE_ID = "a1130000-0000-4000-8000-000000000005";

async function setup({ invitedUser = USERS.invitee, role = "analyst" } = {}) {
  const db = new FakePostgrest(twoTenantTables(), new Map());
  const current = { current: null };
  const deps = workspaceDeps(db, current);
  const tokenHash = await sha256Hex(TOKEN);
  db.tables.invitations.push({
    id: INVITE_ID, organization_id: ORG_B,
    email: invitedUser.email, role, status: "pending",
    token_hash: tokenHash,
    expires_at: new Date(Date.now() + 60_000).toISOString(),
    invited_by: USERS.bOwner.id,
  });
  const route = loadModule("app/api/team/invitations/accept/route.ts", deps);
  current.current = viewerFor(db, invitedUser);
  const accept = () => route.POST(request("/api/team/invitations/accept", { body: { token: TOKEN } }));
  const members = () => db.tables.organization_members.filter(row => row.user_id === invitedUser.id && row.organization_id === ORG_B);
  return { db, current, accept, members };
}

test("Chat05: revoke between pending lookup and the atomic accept cannot grant membership", async () => {
  const env = await setup();
  const original = env.db.rest;
  const rest = async (path, opts = {}) => {
    if (path === "rpc/accept_foremention_invitation") env.db.tables.invitations[0].status = "revoked";
    return original(path, opts);
  };
  const deps = workspaceDeps(env.db, env.current, { modules: { "@/lib/supabase-rest": { supabaseRest: rest } } });
  const route = loadModule("app/api/team/invitations/accept/route.ts", deps);
  const response = await route.POST(request("/api/team/invitations/accept", { body: { token: TOKEN } }));
  assert.equal(response.status, 409);
  assert.deepEqual(env.members(), []);
  assert.equal(env.db.tables.invitations[0].status, "revoked");
});

test("Chat01: acceptance is one service-role RPC bound to the verified viewer, and replay is refused", async () => {
  const env = await setup();
  const response = await env.accept();
  assert.equal(response.status, 200);
  const rpc = env.db.calls.filter(call => call.resource === "rpc/accept_foremention_invitation");
  assert.equal(rpc.length, 1);
  assert.equal(rpc[0].auth, "service-role");
  assert.deepEqual(Object.keys(rpc[0].body).sort(), ["p_token_hash", "p_user_id"]);
  assert.equal(rpc[0].body.p_user_id, USERS.invitee.id);
  assert.equal(env.db.calls.some(call => call.method !== "GET" && ["organization_members", "invitations", "audit_logs", "notifications"].includes(call.resource)), false,
    "no direct table writes outside the transactional RPC");
  assert.equal(env.members().length, 1);
  assert.equal(env.members()[0].role, "analyst");
  assert.equal(env.db.tables.invitations[0].status, "accepted");
  const replay = await env.accept();
  assert.equal(replay.status, 409);
  assert.equal(env.members().length, 1);
});

test("Chat05: wrong mailbox and unconfirmed mailbox never claim invitation", async () => {
  const env = await setup();
  env.current.current = viewerFor(env.db, USERS.aOwner);
  let result = await env.accept();
  assert.equal(result.status, 403);
  assert.equal(env.db.tables.invitations[0].status, "pending");
  env.current.current = viewerFor(env.db, USERS.invitee, { emailVerified: false });
  result = await env.accept();
  assert.equal(result.status, 403);
  assert.equal(env.db.tables.invitations[0].status, "pending");
  assert.deepEqual(env.members(), []);
  assert.doesNotMatch(JSON.stringify(await result.json()), /invitee@new\.example\.test/);

});

test("Chat05: expiration before request refuses and never grants", async () => {
  const env = await setup();
  env.db.tables.invitations[0].expires_at = new Date(Date.now() - 2_000).toISOString();
  const result = await env.accept();
  assert.equal(result.status, 410);
  assert.equal(env.members().length, 0);
});

test("Chat05: existing owner is not downgraded by a viewer invitation", async () => {
  const env = await setup({ invitedUser: USERS.bOwner, role: "viewer" });
  const result = await env.accept();
  assert.equal(result.status, 200);
  assert.equal(env.members().length, 1);
  assert.equal(env.members()[0].role, "owner");
});

test("Chat01: a late failure inside the accept transaction consumes nothing and grants nothing", async () => {
  const env = await setup();
  env.db.failAcceptBeforeCommit = () => { throw Object.assign(new Error("synthetic notification failure"), { status: 500 }); };
  const result = await env.accept();
  assert.equal(result.status, 503);
  assert.equal(env.db.tables.invitations[0].status, "pending", "invite stays usable after rollback");
  assert.equal(env.members().length, 0);
  env.db.failAcceptBeforeCommit = undefined;
  assert.equal((await env.accept()).status, 200, "retry after rollback succeeds");
  assert.equal(env.members().length, 1);
});

test("Chat05: anonymous/demo cannot claim invitation", async () => {
  const env = await setup();
  env.current.current = null;
  assert.equal((await env.accept()).status, 401);
  env.current.current = { id: "demo", email: USERS.invitee.email, mode: "demo" };
  assert.equal((await env.accept()).status, 409);
  assert.equal(env.db.tables.invitations[0].status, "pending");
});