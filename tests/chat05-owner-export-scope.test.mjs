import assert from "node:assert/strict";
import test from "node:test";
import {
  FakePostgrest, ORG_A, ORG_B, USERS,
  loadModule, twoTenantTables, viewerFor, workspaceDeps,
} from "./attach02-harness.mjs";

function setup(user = USERS.aOwner, overrides={}) {
  const db=new FakePostgrest(twoTenantTables(),new Map());
  const ref={current:user ? viewerFor(db,user,overrides):null};
  const calls=[];
  const deps=workspaceDeps(db,ref,{
    modules:{
      "@/lib/workspace-export":{
        buildWorkspaceExport:async(arg)=>{
          calls.push(arg);
          return {archive:Uint8Array.from([80,75,3,4])};
        },
      },
    },
  });
  const route=loadModule("app/api/export/workspace/route.ts",deps);
  return {db,ref,calls,get:()=>route.GET()};
}

test("Chat05: A owner export is scoped to A, never B",async()=>{
 const x=setup(USERS.aOwner);
 const r=await x.get();
 assert.equal(r.status,200);
 assert.equal(r.headers.get("cache-control"),"private, no-store, max-age=0");
 assert.equal(x.calls.length,1);
 assert.equal(x.calls[0].organizationId,ORG_A);
 assert.equal(x.calls[0].token,x.ref.current.accessToken);
 assert.notEqual(x.calls[0].organizationId,ORG_B);
});

test("Chat05: B owner export is scoped to B",async()=>{
 const x=setup(USERS.bOwner);
 const r=await x.get();
 assert.equal(r.status,200);
 assert.equal(x.calls.length,1);
 assert.equal(x.calls[0].organizationId,ORG_B);
});

test("Chat05: analysts, viewers and nonmembers cannot export any workspace",async()=>{
 for(const user of [USERS.aAnalyst,USERS.aViewer,USERS.revoked]){
   const x=setup(user);
   const r=await x.get();
   assert.ok([403,404].includes(r.status),user.email);
   assert.equal(x.calls.length,0);
 }
});

test("Chat05: anonymous and fictional demo export do not invoke archive builder",async()=>{
 const a=setup(null);
 assert.equal((await a.get()).status,401);
 assert.equal(a.calls.length,0);
 const b=setup(USERS.aOwner,{mode:"demo"});
 assert.equal((await b.get()).status,401);
 assert.equal(b.calls.length,0);
});