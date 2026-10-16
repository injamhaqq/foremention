import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { pinCompleteBaseline, planTrialFollowUp } from "../lib/trial-repeat-policy.ts";

const source = readFileSync(new URL("../lib/reviewed-auto-measurement-schedule.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source,{fileName:"reviewed-auto.ts",compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const ctx = {locale:"en-US",market:"global",buyerStage:"research",promptVersion:"v1",parserVersion:"p1",retrievalVersion:"r1",policyVersion:"pl1",schemaVersion:"s1",evaluationVersion:"e1"};
const base={id:"run1",status:"complete",completed_at:"2026-10-16T01:00:00.000Z",answer_count:1,methodology_version:"3.0",category_id:"category1",created_by:"founder1",idempotency_key:"manual:run"};
const answers=[{prompt_key:"q1",prompt_text:"What is the best CRM?",provider:"groq",model:"exact-model",measurement_context_json:ctx,review_status:"verified"}];
const selections=[{prompt_id:"11111111-1111-4111-8111-111111111111",prompt_key:"q1",prompt_text:"What is the best CRM?",locale:"en-US",market:"global"}];
function harness(opts={}){
 const writes=[];
 const ent={status:"active",package_key:"core",billing_source:"trial",expires_at:"2026-10-23T00:00:00.000Z",...(opts.entitlement||{})};
 const tables={measurement_schedules:opts.existing||[],runs:[{...base,...(opts.run||{})}],run_answers:opts.answers||answers,run_prompt_selections:opts.selections||selections,organization_entitlements:[ent]};
 const rest=async(path,options={})=>{
   if(options.method==="POST"){writes.push(options.body);return []}
   const name=path.split("?")[0];assert.ok(name in tables,name);return tables[name];
 };
 const deps={
  "@/lib/measurement-schedules":{nextScheduleAt:(now)=>new Date(new Date(now).getTime()+7*86400000),validateMeasurementSchedule:(x)=>x},
  "@/lib/product-limits":{autoScheduleCadence:(row,now)=>row.status==="active"&&new Date(row.expires_at)>now?"weekly":null},
  "@/lib/supabase-rest":{supabaseRest:rest},
  "@/lib/trial-repeat-policy":{pinCompleteBaseline,planTrialFollowUp}
 };
 const exports={};
 runInNewContext(compiled,{exports,require:id=>{assert.ok(deps[id],id);return deps[id]},Date,Set,Map,Array,Number,String,Object,Promise,JSON,Error,encodeURIComponent});
 return {writes,call:()=>exports.ensureReviewedAutoMeasurementSchedule({organizationId:"org",projectId:"project",runId:"run1",actorId:"founder1",token:"synthetic",now:new Date("2026-10-16T02:00:00.000Z")})};
}
test("complete reviewed baseline creates one pinned short-interval trial follow-up",async()=>{
 const h=harness();assert.equal((await h.call()).status,"created");assert.equal(h.writes.length,1);
 const s=h.writes[0];assert.equal(s.schedule_origin,"trial");assert.equal(s.model_snapshot,"exact-model");
 assert.equal(s.next_run_at,"2026-10-19T01:00:00.000Z");assert.equal(s.baseline_run_id,"run1");
 assert.equal(s.baseline_contract_json.questionPins[0].promptId,selections[0].prompt_id);
});
test("partial, failed, cancelled, still running, or unreviewed baselines never schedule",async()=>{
 for(const status of ["partial","failed","cancelled","review","queued","running"]){
  const h=harness({run:{status}});assert.equal((await h.call()).status,"not_eligible",status);assert.equal(h.writes.length,0);
 }
});
test("existing disabled schedule is preserved, not reactivated",async()=>{
 const h=harness({existing:[{id:"paused",enabled:false}]});
 assert.equal((await h.call()).reason,"USER_PAUSED");assert.equal(h.writes.length,0);
});
test("unknown exact prompt version cannot establish comparable baseline",async()=>{
 const h=harness({answers:[{...answers[0],measurement_context_json:{...ctx,promptVersion:null}}]});
 assert.equal((await h.call()).reason,"BASELINE_UNKNOWN_CONTRACT");assert.equal(h.writes.length,0);
});
test("late baseline cannot promise a follow-up beyond trial expiry",async()=>{
 const h=harness({run:{completed_at:"2026-10-22T12:00:00.000Z"}});
 assert.equal((await h.call()).status,"not_eligible");assert.equal(h.writes.length,0);
});
