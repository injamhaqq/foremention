import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as domain from "../lib/change-specification.ts";
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
function fixture(options = {}) {
  const calls = [];
  const mocks = {
    "next/server": { NextResponse: { json: (body, init) => ({ body, status: init?.status || 200 }) } },
    "@/lib/auth": { getViewer: async () => options.anonymous ? null : {id:id(9), mode:options.demo ? "demo" : "supabase", accessToken:"viewer-token"} },
    "@/lib/data": { loadWorkspaceContext: async () => ({ organizationId:id(10), projectId:id(11) }), getPrimaryWorkspaceRole: async () => options.role || "analyst" },
    "@/lib/change-specification": domain,
    "@/lib/request-security": { isTrustedMutationOrigin: () => !options.untrusted },
    "@/lib/supabase-rest": { isMissingRelationError: () => false, supabaseRest: async (query, auth) => {
      calls.push({query, auth});
      if (query === "audit_logs") {
        assert.equal(auth.serviceRole, true); assert.equal(auth.token, undefined);
        assert.equal(auth.body.actor_id, id(9)); assert.equal(auth.body.organization_id, id(10));
        if (options.auditFailure) throw new Error("audit write failed");
      } else { assert.equal(auth.token,"viewer-token"); assert.equal(auth.serviceRole,undefined); }
      if (auth.method === "POST") {
        if (query === "change_specifications") return [{...auth.body, id:id(8)}];
        if (query === "change_specification_evidence" && options.evidenceFailure) throw new Error("write failed");
        return [];
      }
      if (auth.method === "DELETE") return [];
      if (query.startsWith("opportunities?")) return options.foreignOpportunity ? [] : [{id:id(1),title:"Reviewed competitor gap",next_action:"Inspect the recorded answer"}];
      if (query.startsWith("runs?")) return options.foreignRun ? [] : [{id:id(3)}];
      if (query.startsWith("source_observations?")) return options.unreviewed ? [] : [{id:id(2),run_answer_id:id(5),review_status:"verified"}];
      if (query.startsWith("run_answers?")) return [{id:id(5),run_id:id(3),prompt_text:"Best platform for a buyer",provider:"provider",model:options.missingModel ? null : "model",review_status:"verified"}];
      throw new Error(`Unexpected query ${query}`);
    } },
  };
  const code = ts.transpileModule(readFileSync(new URL("../app/api/change-specifications/route.ts", import.meta.url),"utf8"), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const exports = {};
  vm.runInNewContext(code,{exports,require:(name)=>{if(!(name in mocks)) throw new Error(name);return mocks[name];},Date,Set,console});
  const request = {json:async()=>({action:"create_from_opportunity",opportunityId:id(1),baselineRunId:id(3),sourceObservationIds:[id(2)]})};
  return {calls, post:()=>exports.POST(request)};
}
test("decision creation rejects anonymous, demo, viewer and untrusted requests before writes",async()=>{
  for (const [options,status] of [[{anonymous:true},401],[{demo:true},409],[{role:"viewer"},403],[{untrusted:true},403]]) {
    const f=fixture(options);assert.equal((await f.post()).status,status);assert.equal(f.calls.length,0);
  }
});
test("decision creation refuses foreign opportunities, sibling-project runs, unreviewed or incomplete provenance",async()=>{
  for(const [options,status] of [[{foreignOpportunity:true},404],[{foreignRun:true},409],[{unreviewed:true},409],[{missingModel:true},409]]) {
    const f=fixture(options);assert.equal((await f.post()).status,status);assert.ok(f.calls.every(({auth})=>!auth.method));
  }
});
test("decision creation scopes reads and persists only a conservative draft, linked evidence and audit",async()=>{
  const f=fixture();const result=await f.post();assert.equal(result.status,201);
  for(const {query} of f.calls.filter(({auth})=>!auth.method)) {
    assert.ok(query.includes(`organization_id=eq.${id(10)}`));
    if(query.startsWith("opportunities?")||query.startsWith("runs?")) assert.ok(query.includes(`project_id=eq.${id(11)}`));
  }
  const writes=f.calls.filter(({auth})=>auth.method==="POST");assert.deepEqual(writes.map(({query})=>query),["change_specifications","change_specification_evidence","audit_logs"]);
  const draft=writes[0].auth.body;
  assert.equal(draft.status,"draft"); assert.equal(draft.truth_state,"HYPOTHESIS");assert.equal(draft.confidence_state,"INSUFFICIENT");assert.equal(draft.decision_state,"INSUFFICIENT_EVIDENCE");assert.equal(draft.eligibility_state,"UNKNOWN");assert.equal(draft.exact_change,null);
  const link=writes[1].auth.body[0];assert.equal(link.source_observation_id,id(2));assert.equal(link.project_id,id(11));assert.equal(link.change_specification_id,id(8));
  assert.equal(result.body.data.status,"draft");assert.equal(result.body.data.linkedEvidenceCount,1);
});
test("failed evidence persistence rolls back the new draft within the same organization and project",async()=>{
  const f=fixture({evidenceFailure:true});assert.equal((await f.post()).status,502);
  const deleted=f.calls.find(({auth})=>auth.method==="DELETE");assert.ok(deleted.query.includes(`id=eq.${id(8)}&organization_id=eq.${id(10)}&project_id=eq.${id(11)}`));
  assert.equal(f.calls.some(({query})=>query==="audit_logs"),false);
});

test("failed audit persistence rolls back a new decision draft without broadening business authority",async()=>{
  const f=fixture({auditFailure:true});assert.equal((await f.post()).status,502);
  const deleted=f.calls.find(({auth})=>auth.method==="DELETE");
  assert.equal(deleted.auth.token,"viewer-token"); assert.equal(deleted.auth.serviceRole,undefined);
  assert.ok(deleted.query.includes(`organization_id=eq.${id(10)}&project_id=eq.${id(11)}`));
});
