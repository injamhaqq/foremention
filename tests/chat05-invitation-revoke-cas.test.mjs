import assert from "node:assert/strict";
import test from "node:test";
import {
  FakePostgrest, ORG_A, ORG_B, USERS,
  loadModule, params, request, twoTenantTables, viewerFor, workspaceDeps,
} from "./attach02-harness.mjs";

const ID = "d05a0000-0000-4000-8000-000000000005";

function setup({ actor = USERS.bOwner, alternate = null } = {}) {
  const tables = twoTenantTables();
  tables.invitations.push({
    id: ID, organization_id: ORG_B, email: "candidate@example.test",
    role: "analyst", status: "pending", token_hash: "f".repeat(64),
    expires_at: new Date(Date.now()+86400_000).toISOString(), invited_by: USERS.bOwner.id,
  });
  const db = new FakePostgrest(tables, new Map());
  const current = { current: viewerFor(db, actor) };
  const originalRest = db.rest;
  const dependencyRest = async(path, opts = {}) => {
    if (alternate) await alternate({path, opts, db});
    return originalRest(path,opts);
  };
  const deps = workspaceDeps(db,current,{
    modules: { "@/lib/supabase-rest": { supabaseRest: dependencyRest, isMissingRelationError:()=>false } },
  });
  const route=loadModule("app/api/team/invitations/[id]/route.ts",deps);
  const revoke=()=>route.DELETE(request("/api/team/invitations/"+ID,{method:"DELETE"}),params(ID));
  return {db,current,revoke};
}

test("Chat05: revocation succeeds and logs one tenant-scoped transition",async()=>{
  const x=setup();
  const r=await x.revoke();
  assert.equal(r.status,200);
  assert.equal(x.db.tables.invitations[0].status,"revoked");
  assert.equal(x.db.tables.audit_logs.filter(e=>e.action==="team.invitation.revoked").length,1);
});

test("Chat05: acceptance after preflight GET wins race, revoke returns 409 without false audit",async()=>{
  let switched=false;
  const x=setup({alternate:async({path,opts,db})=>{
    if(!switched && path.startsWith("invitations?") && opts.method==="PATCH"){
      switched=true;
      db.tables.invitations[0].status="accepted";
    }
  }});
  const r=await x.revoke();
  assert.equal(r.status,409);
  assert.equal(x.db.tables.invitations[0].status,"accepted");
  assert.equal(x.db.tables.audit_logs.filter(e=>e.action==="team.invitation.revoked").length,0);
});

test("Chat05: a wrong-organization owner cannot revoke a guessed invite",async()=>{
  const x=setup({actor:USERS.aOwner});
  const r=await x.revoke();
  assert.equal(r.status,404);
  assert.equal(x.db.tables.invitations[0].status,"pending");
  assert.equal(x.db.tables.audit_logs.length,0);
});

test("Chat05: unauthorized read-only tenant role cannot revoke",async()=>{
  const x=setup({actor:USERS.aViewer});
  const r=await x.revoke();
  assert.equal(r.status,403);
  assert.equal(x.db.tables.invitations[0].status,"pending");
});

test("Chat05: idempotent second revoke does not produce false success",async()=>{
  const x=setup();
  assert.equal((await x.revoke()).status,200);
  assert.equal((await x.revoke()).status,404);
  assert.equal(x.db.tables.audit_logs.filter(e=>e.action==="team.invitation.revoked").length,1);
});