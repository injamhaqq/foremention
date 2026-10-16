import assert from "node:assert/strict";
import test from "node:test";
import {
  FakePostgrest, ORG_A, ORG_B, USERS, loadModule, request,
  twoTenantTables, viewerFor, workspaceDeps,
} from "./attach02-harness.mjs";
import { sha256Hex } from "../lib/account-security.ts";

// Real route, no live Supabase. Tests intentionally verify the reduced
// race window; an atomic claim + membership RPC remains separate Chat01 work.
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

test("Chat05: revoke between pending lookup and conditional claim cannot grant membership", async () => {
  const env = await setup();
  const original = env.db.rest;
  env.db.rest = async (path, opts = {}) => {
    if (opts.method === "PATCH" && path.startsWith("invitations?") && path.includes("status=eq.pending")) {
      env.db.tables.invitations[0].status = "revoked";
    }
    return original(path, opts);
  };
  // loadModule has already captured db.rest; inject before constructing route
  // by replacing the dependency used by the route loader (see next test).
  const deps = workspaceDeps(env.db, env.current, { modules: { "@/lib/supabase-rest": { supabaseRest: env.db.rest } } });
  const route = loadModule("app/api/team/invitations/accept/route.ts", deps);
  const response = await route.POST(request("/api/team/invitations/accept", { body: { token: TOKEN } }));
  assert.equal(response.status, 409);
  assert.deepEqual(env.members(), []);
  assert.equal(env.db.tables.invitations[0].status, "revoked");
});

test("Chat05: a successful claim precedes member write and denies replay", async () => {
  const env = await setup();
  const response = await env.accept();
  assert.equal(response.status, 200);
  const claimIndex = env.db.calls.findIndex(call => call.resource === "invitations" && call.method === "PATCH" && call.query.includes("status=eq.pending"));
  const insertIndex = env.db.calls.findIndex(call => call.resource === "organization_members" && call.method === "POST");
  assert.ok(claimIndex >= 0 && insertIndex > claimIndex, "membership must follow DB-confirmed claim");
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

test("Chat05: member-write failure is NOT atomic; document recovery requirement", async () => {
  const env = await setup();
  const original = env.db.rest;
  env.db.rest = async (path,opts={}) => {
    if (path.startsWith("organization_members?on_conflict=") && opts.method === "POST") {
      throw new Error("synthetic member insert failure");
    }
    return original(path,opts);
  };
  const deps = workspaceDeps(env.db, env.current, { modules: { "@/lib/supabase-rest": { supabaseRest: env.db.rest } } });
  const route = loadModule("app/api/team/invitations/accept/route.ts", deps);
  await assert.rejects(
    route.POST(request("/api/team/invitations/accept", { body: {token:TOKEN} })),
    /synthetic member insert failure/,
  );
  assert.equal(env.db.tables.invitations[0].status, "accepted", "non-atomic failure remains until Chat01 RPC");
  assert.equal(env.members().length, 0);
});

test("Chat05: anonymous/demo cannot claim invitation", async () => {
  const env = await setup();
  env.current.current = null;
  assert.equal((await env.accept()).status, 401);
  env.current.current = { id: "demo", email: USERS.invitee.email, mode: "demo" };
  assert.equal((await env.accept()).status, 409);
  assert.equal(env.db.tables.invitations[0].status, "pending");
});