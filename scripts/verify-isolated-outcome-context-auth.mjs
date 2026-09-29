#!/usr/bin/env node
// Disposable LOCAL Supabase Auth + RLS + true persisted answer-context test.
// Zero browser, external provider, production project, static credentials,
// customer data, raw JWT output, or evidence claims.
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { evaluateFollowUpContextParity } from "../lib/outcome-context-gate.ts";

const api = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "");
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const service = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const loopback = new Set(["127.0.0.1","localhost"]);
if (api.protocol!=="http:" || !loopback.has(api.hostname) || !anon || !service ||
    anon===service || !process.env.FOREMENTION_ISOLATED_APP_URL?.startsWith("http://127.0.0.1:")) {
  throw Error("Refusing to run evidence integration outside the disposable local Supabase test.");
}
const step = label => process.stdout.write("[isolated-evidence] "+label+"\n");
const questions = Array.from({length:5},(_,n)=>"Which synthetic source best supports fictional buyer question "+(n+1)+"?");
const context = Object.freeze({
  locale:"en-US",market:"Global",buyerStage:"evaluation",
  promptVersion:"fixture-1",parserVersion:"fixture-1",retrievalVersion:"fixture-1",
  policyVersion:"fixture-1",schemaVersion:"fixture-1",evaluationVersion:"fixture-1",
});
const id = prefix => prefix+"-"+randomBytes(9).toString("hex")+"@example.invalid";
const headers = (key,jwt) => ({
  apikey:key,authorization:"Bearer "+jwt,"content-type":"application/json",
  prefer:"return=representation",
});
async function call(method,path,key,jwt,data) {
  const response=await fetch(new URL(path,api),{
    method,headers:headers(key,jwt),
    ...(data===undefined?{}:{body:JSON.stringify(data)}),
    signal:AbortSignal.timeout(12_000),
  });
  if(!response.ok)throw Error("Local "+method+" "+path.split("?")[0]+" rejected: HTTP "+response.status);
  if(response.status===204)return [];
  return response.json();
}
async function user() {
  const email=id("proof"),secret=randomBytes(36).toString("base64url");
  const record=await call("POST","/auth/v1/admin/users",service,service,{
    email,password:secret,email_confirm:true,
  });
  assert.match(record.id,/^[0-9a-f-]{36}$/i);
  const login=await call("POST","/auth/v1/token?grant_type=password",anon,anon,{
    email,password:secret,
  });
  assert.ok(login.access_token && typeof login.access_token==="string");
  const token=login.access_token;
  // Strictly bounded local GoTrue vs PostgREST freshly issued JWT skew.
  // Only PGRST303 may be retried, not any other 401 or an app error.
  const preflight=new URL("/rest/v1/organization_members?select=user_id&limit=0",api);
  let ready=false;
  for(let attempt=0;attempt<12;attempt++){
    const res=await fetch(preflight,{headers:headers(anon,token)});
    if(res.ok){ready=true;break}
    let code="";
    try{code=String((await res.json()).code||"")}catch{}
    if(res.status!==401 || code!=="PGRST303")
      throw Error("Local JWT preflight rejected: HTTP "+res.status+" code "+(code||"unknown"));
    await new Promise(resolve=>setTimeout(resolve,750));
  }
  assert.equal(ready,true,"ephemeral signed-in PostgREST must accept its own local JWT");
  return {id:record.id,token};
}
async function onboard(actor,label){
  const obj=await call("POST","/rest/v1/rpc/complete_onboarding",anon,actor.token,{
    payload:{
      companyName:"Synthetic "+label,domain:"https://fixture.invalid",
      market:"Global",category:"Synthetic evidence fixture",
      categoryDescription:"Local-only access-control proof",locale:"en-US",
      competitors:["Fixture Alternative"],prompts:questions,
      goal:"Test persistent evidence comparison",constraint:"No real provider observations",
    },
  });
  for(const field of ["organizationId","projectId","categoryId"])
    assert.match(obj[field],/^[0-9a-f-]{36}$/i,field);
  return obj;
}
async function seed(actor,org,label,brandPct,verification=context){
  const now=new Date().toISOString();
  const [run]=await call("POST","/rest/v1/runs",service,service,[{
    organization_id:org.organizationId,project_id:org.projectId,
    category_id:org.categoryId,created_by:actor.id,status:"review",
    provider_ids:["fixture-mock"],prompt_count:5,answer_count:5,
    citation_count:0,new_source_count:0,brand_presence_pct:brandPct,
    first_mention_pct:0,requested_units:5,methodology_version:"fixture-method-v1",
    started_at:now,completed_at:now,
  }]);
  assert.ok(run.id,"local synthetic run must be persisted");
  const p=await call("GET",
    "/rest/v1/prompts?select=id,prompt_key,prompt_text&organization_id=eq."+org.organizationId+
    "&project_id=eq."+org.projectId+"&order=prompt_key.asc",
    service,service);
  assert.equal(p.length,5);
  const answers=p.map((question,i)=>({
    organization_id:org.organizationId,run_id:run.id,prompt_id:question.id,
    prompt_key:question.prompt_key,prompt_text:question.prompt_text,
    provider:"fixture-mock",model:"fixed-synthetic-model",
    answer_text:"Synthetic "+label+" only; no external results or causal claims.",
    citations_json:[],review_status:"verified",collected_at:now,
    measurement_context_json:i===0?verification:context,
  }));
  await call("POST","/rest/v1/run_prompt_selections",service,service,p.map(question=>({
    organization_id:org.organizationId,run_id:run.id,prompt_id:question.id,
    prompt_key:question.prompt_key,prompt_text:question.prompt_text,
    locale:"en-US",market:"Global",
  })));
  const created=await call("POST","/rest/v1/run_answers",service,service,answers);
  assert.equal(created.length,5);
  await call("PATCH","/rest/v1/runs?id=eq."+run.id,service,service,{status:"complete"});
  return {run,questions:p,answers:created};
}
async function scopedRead(actor,org,runIds){
  const ids=runIds.join(",");
  const runs=await call("GET",
    "/rest/v1/runs?select=id,status,methodology_version,answer_count,"+
    "brand_presence_pct,first_mention_pct,citation_count,new_source_count,completed_at"+
    "&organization_id=eq."+org.organizationId+"&project_id=eq."+org.projectId+
    "&id=in.("+ids+")",anon,actor.token);
  const answers=await call("GET",
    "/rest/v1/run_answers?select=run_id,prompt_key,prompt_text,provider,model,measurement_context_json"+
    "&organization_id=eq."+org.organizationId+"&run_id=in.("+ids+")"+
    "&review_status=eq.verified&order=collected_at.asc&limit=1000",anon,actor.token);
  return {runs,answers};
}

const uiMode = process.env.FOREMENTION_TEST_UI === "1";
const app = new URL(process.env.FOREMENTION_ISOLATED_APP_URL || "");
if (uiMode && (app.protocol!=="http:" || !loopback.has(app.hostname) || !["4174","4175"].includes(app.port)))
  throw Error("Refusing any non-loopback outcome-UI fixture target.");

/**
 * Synthetic-only persisted decision chain through real tenant-authenticated
 * PostgREST writes. This is NOT a person approving an actual evidence source;
 * each actor and document below belongs only to the isolated test database.
 */
async function createLocalDecisionChain(actor,org,first){
  const O=org.organizationId,P=org.projectId,auth=actor.token;
  const [source]=await call("POST","/rest/v1/sources",service,service,[{
    organization_id:O,canonical_url:"https://fixture.invalid/source",
    domain:"fixture.invalid",page_title:"Local synthetic evidence source",
  }]);
  const [observation]=await call("POST","/rest/v1/source_observations",service,service,[{
    organization_id:O,source_id:source.id,
    run_answer_id:first.answers[0].id,prompt_id:first.questions[0].id,
    provider:"fixture-mock",citation_ordinal:1,observed_at:new Date().toISOString(),
    review_status:"unreviewed",
  }]);
  await call("PATCH","/rest/v1/source_observations?id=eq."+observation.id,anon,auth,{
    review_status:"verified",reviewer_id:actor.id,
  });
  const [opportunity]=await call("POST","/rest/v1/opportunities",anon,auth,[{
    organization_id:O,project_id:P,source_id:source.id,
    title:"Synthetic controllable source gap",owner_id:actor.id,
    next_action:"Document fictional source context",status:"open",
  }]);
  const [spec]=await call("POST","/rest/v1/change_specifications",anon,auth,[{
    organization_id:O,project_id:P,primary_opportunity_id:opportunity.id,
    baseline_run_id:first.run.id,title:"Synthetic evidence change",
    problem_statement:"Fixture-only source gap",created_by:actor.id,
    control_class:"CONTROLLABLE",control_surface:"Synthetic documentation",
    eligibility_state:"ELIGIBLE",decision_state:"TEST_FIRST",
    truth_state:"HYPOTHESIS",confidence_state:"LOW",
    exact_change:"Write a fictional local-only source note",owner_role:"Fixture owner",
    effort:"LOW",acceptance_criteria_json:["Synthetic evidence reviewed"],
    verification_plan_json:{intent:"Repeat same local fixture protocol"},
  }]);
  const snapshot={verification:"verified",id:"fixture-observation",kind:"source_observation",
    provider:"fixture-mock",excerpt:"No real external source has been verified."};
  await call("POST","/rest/v1/change_specification_evidence",anon,auth,[{
    organization_id:O,project_id:P,change_specification_id:spec.id,
    source_observation_id:observation.id,evidence_snapshot:snapshot,
  }]);
  const submitAt=new Date().toISOString();
  await call("PATCH","/rest/v1/change_specifications?id=eq."+spec.id,anon,auth,{
    status:"in_review",submitted_by:actor.id,submitted_at:submitAt,
  });
  await call("PATCH","/rest/v1/change_specifications?id=eq."+spec.id,anon,auth,{
    status:"approved",decision_by:actor.id,decision_at:new Date().toISOString(),
    approval_note:"Local synthetic fixture only",
  });
  const [asset]=await call("POST","/rest/v1/resolution_assets",anon,auth,[{
    organization_id:O,project_id:P,opportunity_id:opportunity.id,source_id:source.id,
    baseline_run_id:first.run.id,asset_type:"source_page_brief",
    title:"Fixture documentation intervention",
    problem_statement:"Synthetic source context is absent",
    proposal:{schemaVersion:"1.0",assetType:"source_page_brief",
      headline:"Fixture only",objective:"Test isolated proof boundaries",
      draftSections:[],evidenceBoundary:"No real customer data",
      nextStep:"Local fixture verification only"},
    limitations:["Synthetic non-causal acceptance only"],created_by:actor.id,
  }]);
  await call("POST","/rest/v1/resolution_asset_evidence",anon,auth,[{
    organization_id:O,project_id:P,resolution_asset_id:asset.id,
    source_observation_id:observation.id,evidence_snapshot:snapshot,
  }]);
  await call("POST","/rest/v1/change_execution_assets",anon,auth,[{
    organization_id:O,project_id:P,change_specification_id:spec.id,
    resolution_asset_id:asset.id,execution_role:"documentation",
    created_by:actor.id,
  }]);
  await call("PATCH","/rest/v1/resolution_assets?id=eq."+asset.id,anon,auth,{
    status:"in_review",submitted_by:actor.id,submitted_at:new Date().toISOString(),
  });
  const approvedAt=new Date().toISOString();
  await call("PATCH","/rest/v1/resolution_assets?id=eq."+asset.id,anon,auth,{
    status:"approved",review_decision:"approved",approved_by:actor.id,
    approved_at:approvedAt,decision_by:actor.id,decision_at:approvedAt,
    approval_note:"Synthetic fixture acceptance",
  });
  await call("PATCH","/rest/v1/resolution_assets?id=eq."+asset.id,anon,auth,{
    status:"applied",applied_by:actor.id,applied_at:new Date().toISOString(),
    application_reference:"fixture-only:synthetic-owned-intervention",
  });
  const [followUp]=await call("POST","/rest/v1/resolution_follow_ups",anon,auth,[{
    organization_id:O,project_id:P,resolution_asset_id:asset.id,
    baseline_run_id:first.run.id,requested_by:actor.id,
  }]);
  return {asset,followUp,spec};
}
async function completeLocalFollowUp(actor,later,chain) {
  const id=chain.followUp.id,auth=actor.token;
  await call("PATCH","/rest/v1/resolution_follow_ups?id=eq."+id,anon,auth,{
    rerun_id:later.run.id,status:"queued",
  });
  const [complete]=await call("PATCH","/rest/v1/resolution_follow_ups?id=eq."+id,anon,auth,{
    status:"complete",recorded_by:actor.id,
  });
  assert.equal(complete.status,"complete",
    "the disposable pre-correction trigger must finalize a synthetic matching-model follow-up");
}
async function readLocalUi(actor,path){
  const res=await fetch(new URL(path,app),{
    headers:actor ? {cookie:"foremention-session="+actor.token} : {},
    redirect:"manual",signal:AbortSignal.timeout(45_000),
  });
  const body=await res.text();
  return {status:res.status,body,location:res.headers.get("location")};
}
function requireCounter(html,label,value) {
  // These fixed-label UI counters contain no regex metacharacters.
  const expression = new RegExp("<span>"+label+"<\\/span>(?:\\s|<!--.*?-->)*<strong>"+value+"<\\/strong>","i");
  assert.ok(expression.test(html),label+" must be "+value+" in the authenticated server-rendered view");
}

const owner=await user();
const stranger=await user();
const ownOrg=await onboard(owner,"owner");
const otherOrg=await onboard(stranger,"stranger");
assert.notEqual(ownOrg.organizationId,otherOrg.organizationId);
step("two-ephemeral-users-and-independent-local-workspaces");

const first=await seed(owner,ownOrg,"baseline",20);
const chain=uiMode ? await createLocalDecisionChain(owner,ownOrg,first) : null;
const later=await seed(owner,ownOrg,"follow-up",35);
if (chain) await completeLocalFollowUp(owner,later,chain);
const other=await seed(stranger,otherOrg,"other-tenant",40);
const ownedIds=[first.run.id,later.run.id];
const initial=await scopedRead(owner,ownOrg,ownedIds);
assert.equal(initial.runs.length,2);
assert.equal(initial.answers.length,10);
const outsider=await scopedRead(stranger,ownOrg,ownedIds);
assert.equal(outsider.runs.length,0,"RLS must hide another tenant's runs");
assert.equal(outsider.answers.length,0,"RLS must hide another tenant's verified answers");
const ownerCross=await scopedRead(owner,otherOrg,[other.run.id]);
assert.equal(ownerCross.runs.length,0);
assert.equal(ownerCross.answers.length,0);
const strangerOwn=await scopedRead(stranger,otherOrg,[other.run.id]);
assert.equal(strangerOwn.runs.length,1);
assert.equal(strangerOwn.answers.length,5);
step("real-signed-in-postgrest-cross-tenant-rls-isolation");

const followUp={
  id:"fixture-followup",resolution_asset_id:"fixture-asset",
  baseline_run_id:first.run.id,rerun_id:later.run.id,status:"complete",
  requested_at:new Date().toISOString(),outcome:{},limitation:"Association only.",
};
function parity(state) {
  return evaluateFollowUpContextParity({
    followUps:[followUp],runs:state.runs,verifiedAnswers:state.answers,
  }).get(followUp.id);
}
assert.deepEqual(parity(initial),{comparable:true,reason:null});
step("persisted-five-question-exact-nine-field-comparison-eligible");

if(uiMode){
  const anonOutcome=await readLocalUi(null,"/app/outcomes");
  assert.ok([302,303,307,308].includes(anonOutcome.status));
  assert.ok((anonOutcome.location||"").includes("/login"),"anonymous outcome report must require sign-in");
  const ownerPage=await readLocalUi(owner,"/app/outcomes");
  assert.equal(ownerPage.status,200,"exact-context owner Outcome Ledger returns real HTTP 200");
  assert.match(ownerPage.body,/Fixture documentation intervention/);
  requireCounter(ownerPage.body,"Complete chains",1);
  requireCounter(ownerPage.body,"Eligible comparisons",1);
  const ownerExport=await readLocalUi(owner,"/app/outcomes/print");
  assert.equal(ownerExport.status,200,"signed-in board export returns real HTTP 200");
  requireCounter(ownerExport.body,"Complete evidence chains",1);
  const otherPage=await readLocalUi(stranger,"/app/outcomes");
  assert.equal(otherPage.status,200,"other tenant has private empty report");
  assert.ok(!/Fixture documentation intervention/.test(otherPage.body),"cross-tenant outcome page must not disclose the owner title");
  requireCounter(otherPage.body,"Complete chains",0);
  step("signed-in-server-rendered-owner-board-and-tenant-isolation");
}

const changed={...context,evaluationVersion:"changed-evaluator-v2"};
await call("PATCH",
  "/rest/v1/run_answers?organization_id=eq."+ownOrg.organizationId+
  "&run_id=eq."+later.run.id+"&prompt_key=eq."+later.questions[0].prompt_key,
  service,service,{measurement_context_json:changed});
const drifted=await scopedRead(owner,ownOrg,ownedIds);
assert.equal(drifted.runs.length,2);
assert.equal(drifted.answers.length,10);
assert.equal(parity(drifted).comparable,false,
  "an actually persisted single-answer evaluator-version drift must fail closed");
step("persisted-one-answer-evaluator-drift-withheld");
if(uiMode){
  const ownerPage=await readLocalUi(owner,"/app/outcomes");
  assert.equal(ownerPage.status,200);
  requireCounter(ownerPage.body,"Complete chains",0);
  requireCounter(ownerPage.body,"Eligible comparisons",0);
  assert.match(ownerPage.body,/incomparable/i);
  const board=await readLocalUi(owner,"/app/outcomes/print");
  assert.equal(board.status,200);
  requireCounter(board.body,"Complete evidence chains",0);
  requireCounter(board.body,"Incomparable",1);
  step("signed-in-server-rendered-nine-field-drift-withheld-page-and-board");
}

process.stdout.write("[isolated-evidence] PASSED; Auth, scoped PostgREST RLS, five frozen questions and true persisted nine-field parity; no external provider or production project.\n");
