#!/usr/bin/env node
// PR-only native HTTP authenticated application API acceptance. Never targets production;
// no external provider calls, scraped pages, static credentials or artifact logs.
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
// Native loopback HTTP intentionally avoids Playwright's request proxy and
// Chromium workload. Separate Isolated Outcome UI covers signed-in actual
// Worker-rendered Ledger/print routes. This suite covers the entire REAL
// reviewer/manager API, persistent second cycle and tenant denial.
class LocalContext {
  localCookies=[];
  request={
    fetch:async(url,options={})=>{
      const target=new URL(url);
      if(target.origin!==app.origin)throw Error("Refusing non-local application API target.");
      const cookie=this.localCookies.map(c=>c.name+"="+c.value).join("; ");
      const headers={...options.headers,...(options.data===undefined?{}:{"content-type":"application/json"}),...(cookie?{cookie}:{})};
      const result=await fetch(target,{
        method:options.method||"GET",
        headers,
        ...(options.data===undefined?{}:{body:JSON.stringify(options.data)}),
        redirect:"manual",
        signal:AbortSignal.timeout(options.timeout||30_000),
      });
      // Consume the first actual response; never retry or mask 5xx with
      // another diagnostic read. Safe errors do not dump JWT/header values.
      const body=await result.text();
      return {
        status:()=>result.status,
        json:async()=>JSON.parse(body),
        headersArray:()=>result.headers.getSetCookie().map(value=>({name:"set-cookie",value})),
      };
    },
    post:(url,options={})=>this.request.fetch(url,{...options,method:"POST"}),
  };
  async addCookies(cookies){this.localCookies.push(...cookies);}
  async cookies(){return this.localCookies;}
  async close(){this.localCookies=[];}
}
const browser={newContext:async()=>new LocalContext(),close:async()=>{}};


const app = new URL(process.env.FOREMENTION_ISOLATED_APP_URL || "http://127.0.0.1:4174");
const supabase = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321");
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const service = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
for (const url of [app, supabase]) {
  if (!["127.0.0.1", "localhost"].includes(url.hostname) || url.protocol !== "http:") {
    throw Error("Refusing any non-local authenticated acceptance target.");
  }
}
if (!anon || !service) throw Error("Isolated local Supabase credentials are missing.");
const stages = [];
const step = label => { stages.push(label); process.stdout.write("[isolated-journey] " + label + "\n"); };
const identity = prefix => prefix + "-" + randomBytes(7).toString("hex") + "@example.invalid";
const password = () => randomBytes(36).toString("base64url");
const requestHeaders = { apikey:service,authorization:"Bearer "+service,"content-type":"application/json" };
const projectQuestions = [
  "Which synthetic source should this fixture buyer independently inspect?",
  "What hypothetical evidence is needed for this fixture comparison?",
  "How should a synthetic buyer interpret a zero-citation answer?",
  "What makes two fictional recommendation observations comparable?",
  "Which assumptions should the synthetic decision record disclose?",
];
const context = {
  locale:"en-US",market:"Global",buyerStage:"consideration",
  promptVersion:"fixture-1",parserVersion:"fixture-1",retrievalVersion:"fixture-1",
  policyVersion:"fixture-1",schemaVersion:"fixture-1",evaluationVersion:"fixture-1",
};
const iso = () => new Date().toISOString();

async function localAdminUser() {
  const email = identity("review-test"), pass = password();
  const response=await fetch(new URL("/auth/v1/admin/users",supabase),{
    method:"POST",headers:requestHeaders,
    body:JSON.stringify({email,password:pass,email_confirm:true}),
  });
  if (!response.ok) throw Error("Local Auth Admin creation rejected: HTTP "+response.status);
  const body=await response.json();
  assert.match(body.id,/^[0-9a-f-]{36}$/i);
  return {id:body.id,email,password:pass};
}
async function db(method,resource,body) {
  const response=await fetch(new URL("/rest/v1/"+resource,supabase),{
    method,headers:{...requestHeaders,prefer:"return=representation"},
    ...(body===undefined?{}:{body:JSON.stringify(body)}),
  });
  if (!response.ok) throw Error("Isolated PostgREST fixture "+method+" "+resource.split("?")[0]+" rejected: HTTP "+response.status);
  if (response.status===204) return [];
  return response.json();
}
async function appCall(ctx,method,path,data,extraHeaders={}) {
  // Never allow Playwright's exception renderer to print request headers:
  // transport errors can otherwise echo LOCAL synthetic auth cookies.
  let response;
  try {
    response=await ctx.request.fetch(new URL(path,app).toString(),{
      method,headers:{origin:app.origin,accept:"application/json",...extraHeaders},
      // Local Worker cold-route compilation can exceed Playwright's 30s
      // default on the first authenticated post-review or final fully linked
      // Resolution read. Only those TWO tagged first attempts get 75s. Never
      // retry a failed 500 or count a diagnostic repeat as passing acceptance.
      timeout:extraHeaders["x-foremention-isolated-final-read"]==="1"
        || extraHeaders["x-foremention-isolated-post-review-read"]==="1" ? 75_000 : 30_000,
      ...(data===undefined?{}:{data}),
    });
  } catch {
    return {status:0,body:null};
  }
  let body=null;
  try {body=await response.json();}catch{}
  return {status:response.status(),body};
}
// Transport cross-check: the authenticated server-rendered Outcome UI
// acceptance already uses native fetch for the same disposable Worker and
// local GoTrue session. Exercise the FINAL real Resolution API read directly
// rather than routing its full JSON body through Playwright request.fetch,
// whose proxy intermittently stalled for 75s after the Worker logged "loaded".
// This performs ONE real request; it is not a retry or a result substitution.
async function nativeFinalResolutionRead(ctx) {
  const session=(await ctx.cookies()).find(c=>c.name==="foremention-session");
  if(!session?.value)throw Error("Local authenticated final read has no signed-in session.");
  let response;
  try {
    response=await fetch(new URL("/api/resolutions",app),{
      method:"GET",
      redirect:"manual",
      headers:{
        origin:app.origin,
        accept:"application/json",
        cookie:"foremention-session="+session.value,
        "x-foremention-isolated-final-read":"1",
      },
      signal:AbortSignal.timeout(75_000),
    });
    const json=await response.json().catch(()=>null);
    if(!json || typeof json!=="object")
      return {status:0,body:null};
    return {status:response.status,body:json};
  } catch {
    // Never emit a fetch error that might reflect local synthetic JWT headers.
    return {status:0,body:null};
  }
}
// The SAME actual app-created and approved synthetic second-cycle record is
// now independently read through both real authenticated server-rendered
// Worker routes. This closes the cross-suite fixture gap without Chromium.
async function readSignedInServerPage(ctx,path) {
  const target=new URL(path,app);
  if(target.origin!==app.origin || !["/app/outcomes","/app/outcomes/print"].includes(target.pathname))
    throw Error("Only the two local signed-in Outcome report routes may be tested.");
  const session=(await ctx.cookies()).find(c=>c.name==="foremention-session");
  const headers={accept:"text/html",...(session?{cookie:"foremention-session="+session.value}:{})};
  let response;
  try {
    response=await fetch(target,{headers,redirect:"manual",signal:AbortSignal.timeout(60_000)});
    const body=await response.text();
    return {status:response.status,body,location:response.headers.get("location")};
  } catch {
    throw Error("The first authenticated local Outcome report request did not complete.");
  }
}
function requireServerCounter(html,label,value) {
  const escaped=label.replace(/[.*+?^${}()|[\]\\]/g,"\\function must(actual,status,stepName) {");
  const matcher=new RegExp("<span>"+escaped+"<\\/span>(?:\\s|<!--.*?-->)*<strong>"+value+"<\\/strong>","i");
  assert.ok(matcher.test(html),"The real authenticated "+label+" count must equal "+value+".");
}
function must(actual,status,stepName) {
  if(actual.status!==status) throw Error("Isolated "+stepName+" returned HTTP "+actual.status+" (expected "+status+").");
  return actual.body;
}
// Bound the *local test fixture's* initial JWT readiness only. Supabase's
// PostgREST can transiently report PGRST303 (fresh token issued in the future)
// even when GoTrue accepted it. This is not a production auth workaround and
// never retries a permission denial, an unknown 401, or a later app API failure.
async function awaitLocalPostgrestJwt(jwt) {
  const target=new URL("/rest/v1/organization_members?select=user_id&limit=0",supabase);
  let successes=0;
  for(let attempt=0;attempt<12;attempt++){
    let response;
    try {
      response=await fetch(target,{headers:{apikey:anon,authorization:"Bearer "+jwt}});
    } catch {
      throw Error("Isolated local PostgREST fixture transport unavailable.");
    }
    if(response.ok){
      if(++successes>=2)return;
    } else {
      let code="";
      try { code=String((await response.json()).code||""); } catch {}
      if(response.status!==401||code!=="PGRST303"){
        throw Error("Isolated local PostgREST JWT preflight rejected: HTTP "+
          response.status+" code "+(code||"unknown")+".");
      }
      successes=0;
    }
    await new Promise(resolve=>setTimeout(resolve,750));
  }
  throw Error("Local Auth/PostgREST JWT PGRST303 did not stabilize within the bounded fixture budget.");
}

async function login(browser,user) {
  const ctx=await browser.newContext({baseURL:app.origin,serviceWorkers:"block"});
  let response;
  try {
    response=await ctx.request.post(new URL("/api/auth/login",app).toString(),{
      headers:{origin:app.origin,accept:"application/json"},
      data:{email:user.email,password:user.password},
    });
  } catch {
    throw Error("Isolated local sign-in transport failed; no request headers were logged.");
  }
  if(response.status()!==200)throw Error("Isolated synthetic sign-in returned HTTP "+response.status());
  // Production correctly marks authentication cookies Secure over HTTPS.
  // Wrangler's isolated HTTP loopback cannot transport Secure cookies.
  // Reinsert ONLY local synthetic cookies as insecure transport for this
  // test harness; the live app's production cookie policy stays unchanged.
  const rawCookies=response.headersArray()
    .filter(header=>header.name.toLowerCase()==="set-cookie")
    .map(header=>header.value);
  const localhostCookies=[];
  for(const raw of rawCookies){
    const first=raw.split(";")[0],separator=first.indexOf("=");
    if(separator<1)continue;
    const name=first.slice(0,separator),value=first.slice(separator+1);
    if(!["foremention-session","foremention-refresh"].includes(name))continue;
    localhostCookies.push({name,value,url:app.origin,httpOnly:true,secure:false,sameSite:"Lax"});
  }
  if(!localhostCookies.some(x=>x.name==="foremention-session"))
    throw Error("Local synthetic login did not set its expected auth-session cookie.");
  await ctx.addCookies(localhostCookies);
  const sessionValue=localhostCookies.find(c=>c.name==="foremention-session")?.value;
  if(!sessionValue)throw Error("Isolated auth-session value missing from loopback cookie fixture.");
  await awaitLocalPostgrestJwt(sessionValue);
  // The local Auth and PostgREST containers can cross their JWT issued-at
  // second boundary at different instants; avoid flaking the VERY FIRST
  // protected database request, without relaxing or retrying auth failures.
  await new Promise(resolve=>setTimeout(resolve,1250));
  const ready=await appCall(ctx,"GET","/api/prompts");
  must(ready,200,"local authenticated prompt route after loopback cookie adaptation");
  return ctx;
}
async function onboard(ctx,label) {
  const payload={
    companyName:"Local "+label,
    domain:"https://fixture.invalid",
    market:"Global",
    category:"Synthetic B2B evidence fixture",
    categoryDescription:"Isolated tenant boundary verification only",
    competitors:["Example A","Example B"],
    goal:"Verify isolated human-controlled decision workflow",
    constraint:"This is synthetic, not commercial or externally verified.",
    prompts:projectQuestions,locale:"en-US",
  };
  const body=must(await appCall(ctx,"POST","/api/onboarding",payload),201,"synthetic onboarding");
  for(const field of ["organizationId","projectId","categoryId"])assert.match(body[field]||"",/^[0-9a-f-]{36}$/i,field);
  const prompts=must(await appCall(ctx,"GET","/api/prompts"),200,"buyer questions").data;
  assert.equal(prompts.filter(x=>x.approved).length,5);
  return {org:body.organizationId,project:body.projectId,category:body.categoryId,prompts};
}

async function seedLocalRun(tenant,userId,label,{review=true,cited=false,metrics=[20,0,1,1],contextOverride=null}={}) {
  const created = iso();
  const run=(await db("POST","runs",[{
    organization_id:tenant.org,project_id:tenant.project,category_id:tenant.category,
    created_by:userId,status:review?"review":"queued",provider_ids:["fixture-mock"],
    prompt_count:5,answer_count:5,citation_count:metrics[2],
    brand_presence_pct:metrics[0],first_mention_pct:metrics[1],
    new_source_count:metrics[3],requested_units:5,methodology_version:"fixture-methodology-v1",
    started_at:created, ...(review?{completed_at:created}:{}),
  }]))[0];
  assert.ok(run?.id,"mock run saved");
  // Read original onboarding prompt keys, not client-generated guesses.
  const prompts=await db("GET","prompts?select=id,prompt_key,prompt_text,locale,market&id=in.("+tenant.prompts.map(p=>p.id).join(",")+")");
  assert.equal(prompts.length,5);
  await db("POST","run_prompt_selections",prompts.map(p=>({
    organization_id:tenant.org,run_id:run.id,prompt_id:p.id,
    prompt_key:p.prompt_key,prompt_text:p.prompt_text,locale:"en-US",market:"Global",
  })));
  const answers=await db("POST","run_answers",prompts.map((p,index)=>({
    organization_id:tenant.org,run_id:run.id,prompt_id:p.id,
    prompt_key:p.prompt_key,prompt_text:p.prompt_text,
    provider:"fixture-mock",model:"no-cost-model-v1",
    answer_text:"Synthetic "+label+" observation only; it does not establish real source support or causality.",
    citations_json:cited&&index===0?[{url:"https://fixture.invalid/source",title:"Synthetic fixture-only source"}]:[],
    review_status:review?"unreviewed":"verified",collected_at:created,
    measurement_context_json:index===0 && contextOverride ? {...context,...contextOverride} : context,
  })));
  assert.equal(answers.length,5);
  return {run,answers,prompts};
}

async function main() {
  // The native localhost transport has no browser process.
  const clients=[];
  try {
    const [owner,outsider,analyst]=await Promise.all([localAdminUser(),localAdminUser(),localAdminUser()]);
    step("three-ephemeral-local-auth-users-created");
    // Cold LOCAL Wrangler + PostgREST on a disposable runner can overload
    // while three first-ever authenticated login/prompt route compilations
    // race. Serialize only fixture setup; real customer permission checks
    // below remain independent and fail immediately on 5xx.
    const ownerCtx=await login(browser,owner);
    const otherCtx=await login(browser,outsider);
    const analystCtx=await login(browser,analyst);
    clients.push(ownerCtx,otherCtx,analystCtx);
    const publicCtx=await browser.newContext({baseURL:app.origin});
    clients.push(publicCtx);
    must(await appCall(publicCtx,"GET","/api/resolutions"),401,"anonymous resolution access");
    must(await appCall(publicCtx,"POST","/api/change-specifications",{action:"create_from_opportunity"}),401,"anonymous decision mutation");
    // Preflight the ordinary route before a valid workspace request. This
    // distinguishes an auth/routing 500 from later RPC/validation failures.
    const blank=await appCall(ownerCtx,"POST","/api/onboarding",{});
    must(blank,400,"authenticated invalid onboarding payload boundary");
    step("authenticated-onboarding-invalid-payload-rejected");
    const tenant=await onboard(ownerCtx,"Tenant A");
    const other=await onboard(otherCtx,"Tenant B");
    assert.notEqual(tenant.org,other.org);
    // Compare both empty, authenticated GET routes before any reviewer action.
    // Only status counts are emitted; never expose synthetic Auth responses.
    const [ownerEmpty,otherEmpty]=await Promise.all([
      appCall(ownerCtx,"GET","/api/resolutions"),
      appCall(otherCtx,"GET","/api/resolutions"),
    ]);
    step("baseline-isolated-resolution-read-status-"+ownerEmpty.status+"-"+otherEmpty.status);
    await db("POST","organization_members",[{
      organization_id:tenant.org,user_id:analyst.id,role:"analyst"
    }]);
    step("real-app-onboarding-five-questions-and-tenant-sessions");

    const initial=await seedLocalRun(tenant,owner.id,"first",{review:true,cited:true});
    const beforeReview=await db("GET","source_observations?select=id&organization_id=eq."+tenant.org);
    assert.equal(beforeReview.length,0);
    const source=(await db("POST","sources",[{
      organization_id:tenant.org,canonical_url:"https://fixture.invalid/source",
      domain:"fixture.invalid",page_title:"Synthetic-only returned reference"
    }]))[0];
    const observation=(await db("POST","source_observations",[{
      organization_id:tenant.org,source_id:source.id,run_answer_id:initial.answers[0].id,
      prompt_id:initial.prompts[0].id,provider:"fixture-mock",
      citation_ordinal:1,observed_at:iso(),review_status:"unreviewed",
    }]))[0];
    // The browser application's ordinary review API must make a returned
    // citation reviewable; four zero-citation questions get NO fake sources.
    const review=must(await appCall(ownerCtx,"POST","/api/runs/"+initial.run.id+"/review",{}),200,"human-gated run publication");
    assert.equal(review.status,"complete");
    assert.equal(review.sourceCount,1);
    const verifiedObs=await db("GET","source_observations?select=review_status,reviewer_id&id=eq."+observation.id);
    assert.equal(verifiedObs[0].review_status,"verified");
    assert.equal(verifiedObs[0].reviewer_id,owner.id);
    const entries=await db("GET","source_map_entries?select=id,source_id,client_present,reviewed_at&organization_id=eq."+tenant.org);
    assert.equal(entries.length,1);
    assert.equal(entries[0].reviewed_at,null);
    step("ordinary-run-review-published-one-citation-four-zero-citation-questions");

    // Reader isolation and mutation authorization apply to the same real app.
    // Run post-review tenant reads serially to distinguish a real read
    // error from a dev Worker transport crash caused by overlapping requests.
    // Both must return 200 independently: there is no 500/503 allowance.
    // Independent local PostgREST read separates transient PGRST303 JWT
    // validation from an application-owned Resolution aggregation failure.
    // Emit only HTTP status and one allowlisted code. Do not output JWTs,
    // raw database errors, org IDs or any synthetic user-identifying data.
    const ownerCookie=(await ownerCtx.cookies()).find(c=>c.name==="foremention-session");
    if(!ownerCookie) throw Error("Authenticated post-review fixture lost its local session cookie.");
    const probe=await fetch(new URL("/rest/v1/organization_members?select=user_id&limit=0",supabase),{
      headers:{apikey:anon,authorization:"Bearer "+ownerCookie.value},
    });
    let probeCode="none";
    if(!probe.ok){
      try {
        const candidate=String((await probe.json()).code||"");
        probeCode=candidate==="PGRST303"?"PGRST303":"other";
      } catch {probeCode="other";}
    }
    step("post-review-local-postgrest-status-"+probe.status+"-code-"+probeCode);
    const ownerAfterReview=await appCall(ownerCtx,"GET","/api/resolutions",undefined,{"x-foremention-isolated-post-review-read":"1"});
    const localHealthAfterReview=await appCall(publicCtx,"GET","/api/health");
    const otherAfterReview=await appCall(otherCtx,"GET","/api/resolutions");
    step("reviewed-local-worker-health-"+localHealthAfterReview.status);
    step("reviewed-resolution-read-status-owner-"+ownerAfterReview.status+"-other-"+otherAfterReview.status);
    if (ownerAfterReview.status!==200 || otherAfterReview.status!==200) {
      const [ownerOpportunityRows,otherOpportunityRows,otherAssetRows]=await Promise.all([
        db("GET","opportunities?select=id&organization_id=eq."+tenant.org),
        db("GET","opportunities?select=id&organization_id=eq."+other.org),
        db("GET","resolution_assets?select=id&organization_id=eq."+other.org),
      ]);
      // Only anonymous status and COUNT diagnostics. Never render Auth
      // cookies, tokens, SQL payloads, workspace IDs or raw worker logs.
      step("reviewed-resolution-isolation-fixture-counts-"+ownerOpportunityRows.length+
        "-"+otherOpportunityRows.length+"-"+otherAssetRows.length);
      const category = value => {
        const text=String(value?.body?.error||"");
        if (/database/i.test(text)) return "database";
        if (/workspace/i.test(text)) return "workspace";
        if (/auth|session/i.test(text)) return "auth";
        return "opaque";
      };
      step("reviewed-resolution-safe-error-category-owner-"+category(ownerAfterReview)+"-other-"+category(otherAfterReview));
    }
    const ownerRecords=must(ownerAfterReview,200,"owner resolution read after source review").data.resolutions;
    assert.ok(Array.isArray(ownerRecords));
    const outsiderData=must(otherAfterReview,200,"other-tenant resolution read");
    assert.equal(outsiderData.data.resolutions.length,0);
    must(await appCall(analystCtx,"PATCH","/api/sources/"+entries[0].id+"/review",{
      crawlerAccess:"blocked",feasibility:"high",influence:"high",route:"editorial outreach",clientPresent:false,
      competitors:[],note:"Fictional local-only human route review."
    }),200,"analyst source-map review");
    const opps=await db("GET","opportunities?select=id&organization_id=eq."+tenant.org);
    assert.equal(opps.length,1);
    const wrong=await appCall(otherCtx,"POST","/api/change-specifications",{
      action:"create_from_opportunity",opportunityId:opps[0].id,
      baselineRunId:initial.run.id,sourceObservationIds:[observation.id]
    });
    assert.equal(wrong.status,404,"other tenant cannot create this decision");
    must(await appCall(ownerCtx,"GET","/api/resolutions"),200,"reviewed-source observed-problem read");
    step("reviewed-source-opportunity-cross-tenant-denial");

    const spec=must(await appCall(ownerCtx,"POST","/api/change-specifications",{
      action:"create_from_opportunity",opportunityId:opps[0].id,
      baselineRunId:initial.run.id,sourceObservationIds:[observation.id]
    }),201,"evidenced change-specification creation").data;
    assert.ok(spec.id);
    const premature=await appCall(ownerCtx,"PATCH","/api/change-specifications",{action:"submit",id:spec.id});
    assert.equal(premature.status,409,"incomplete decision must fail closed");
    must(await appCall(ownerCtx,"PATCH","/api/change-specifications",{
      action:"update_draft",id:spec.id,controlClass:"CONTROLLABLE",controlSurface:"synthetic-owned documentation",
      eligibilityState:"ELIGIBLE",decisionState:"TEST_FIRST",truthState:"HYPOTHESIS",
      confidenceState:"LOW",exactChange:"Add a fixture-only source disclosure",
      ownerRole:"synthetic owner",effort:"LOW",
      acceptanceCriteria:["Test reviewer confirms local-only example"],
      verificationPlan:{intent:"repeat five unchanged fictional questions"},
    }),200,"customer-authored exact change");
    must(await appCall(ownerCtx,"PATCH","/api/change-specifications",{action:"submit",id:spec.id}),200,"decision submitted");
    const forbidden=await appCall(analystCtx,"PATCH","/api/change-specifications",{
      action:"decision",id:spec.id,decision:"approved"
    });
    assert.equal(forbidden.status,403,"analyst cannot authorize manager decision");
    must(await appCall(ownerCtx,"PATCH","/api/change-specifications",{
      action:"decision",id:spec.id,decision:"approved",approvalNote:"Synthetic owner approval only"
    }),200,"owner manager approval");
    step("real-change-spec-review-role-gates-and-manager-approval");

    const generated=must(await appCall(ownerCtx,"POST","/api/resolutions",{
      action:"generate",changeSpecificationId:spec.id,assetType:"source_page_brief",
      sourceObservationIds:[observation.id]
    }),201,"evidence-linked solution generated").data.resolution;
    assert.ok(generated.id);
    must(await appCall(ownerCtx,"GET","/api/resolutions"),200,"new evidence-linked asset read before follow-up");
    must(await appCall(ownerCtx,"PATCH","/api/resolutions",{
      action:"decision",resolutionId:generated.id,decision:"submit"
    }),200,"resolution submission");
    must(await appCall(ownerCtx,"PATCH","/api/resolutions",{
      action:"decision",resolutionId:generated.id,decision:"approved",note:"Local owner acceptance only"
    }),200,"resolution review approval");
    must(await appCall(ownerCtx,"PATCH","/api/resolutions",{
      action:"mark_applied",resolutionId:generated.id,
      reference:"fixture-only:local-documentation",note:"No real external publication"
    }),200,"owned execution recorded");
    step("evidence-linked-resolution-and-company-controlled-execution");

    const request=must(await appCall(ownerCtx,"POST","/api/resolutions",{
      action:"remeasure",resolutionId:generated.id
    }),202,"governed follow-up request").data;
    assert.ok(request.measurementRequestId);
    must(await appCall(ownerCtx,"GET","/api/resolutions"),200,"pending follow-up read");
    const second=await seedLocalRun(tenant,owner.id,"second",{review:true,cited:false,metrics:[40,20,0,0]});
    must(await appCall(ownerCtx,"POST","/api/resolutions",{
      action:"remeasure",resolutionId:generated.id,rerunId:second.run.id,
      measurementId:request.measurementRequestId
    }),200,"attach exact five-question fixture run");
    const secondReview=must(await appCall(ownerCtx,"POST","/api/runs/"+second.run.id+"/review",{}),200,"second customer-visible review");
    assert.equal(secondReview.sourceCount,0,"zero-citation follow-up generated no fake sources");
    const persisted=await db("GET","resolution_follow_ups?select=status,outcome&resolution_asset_id=eq."+generated.id+"&organization_id=eq."+tenant.org);
    assert.equal(persisted.length,1,"exactly one synthetic follow-up");
    step("post-review-persisted-followup-state-"+persisted[0].status+"-"+(typeof persisted[0].outcome?.interpretation==="string"));
    // Tag only this GET: earlier successful GET stage labels do not tell us
    // whether the final failing request reached the Worker route at all.
    // Preserve strict first-request acceptance; a diagnostic retry never
    // converts a failed 500 into a passing test.
    const finalRead=await nativeFinalResolutionRead(ownerCtx);
    if(finalRead.status!==200){
      const session=(await ownerCtx.cookies()).find(c=>c.name==="foremention-session");
      if(!session)throw Error("Final local diagnostic lost its synthetic session.");
      const auth=await fetch(new URL("/rest/v1/organization_members?select=user_id&limit=0",supabase),{
        headers:{apikey:anon,authorization:"Bearer "+session.value},
      });
      let authCode="none";
      if(!auth.ok){
        try {authCode=(await auth.json()).code==="PGRST303"?"PGRST303":"other";}catch{authCode="other";}
      }
      step("final-local-postgrest-status-"+auth.status+"-code-"+authCode);
      const localHealth=await appCall(publicCtx,"GET","/api/health");
      step("final-local-worker-health-"+localHealth.status);
      const repeat=await appCall(ownerCtx,"GET","/api/resolutions");
      step("final-diagnostic-repeat-read-status-"+repeat.status);
    }
    const state=must(finalRead,200,"final audited resolution read").data.resolutions;
    const record=state.find(x=>x.id===generated.id);
    assert.equal(record?.followUp?.status,"complete");
    assert.match(record?.followUp?.summary||"",/does not establish|association/i);
    const absent=must(await appCall(otherCtx,"GET","/api/resolutions"),200,"other tenant cannot read completed solution").data.resolutions;
    assert.ok(!absent.some(x=>x.id===generated.id),"cross-tenant answer must be absent");
    step("ordinary-reviewed-zero-citation-second-cycle-noncausal-tenant-scoped-result");

    step("real-local-auth-reviewed-second-cycle-api-and-tenant-isolation");
    // Same session + same database as the completed real API flow above;
    // not a second manually fabricated Change Specification / Asset fixture.
    const page=await readSignedInServerPage(ownerCtx,"/app/outcomes");
    assert.equal(page.status,200,"API-owned complete chain should render in the actual Outcome Ledger");
    assert.ok(page.body.includes(record.title),"actual API-generated intervention title must remain visible to its owner");
    requireServerCounter(page.body,"Complete chains",1);
    requireServerCounter(page.body,"Eligible comparisons",1);
    const board=await readSignedInServerPage(ownerCtx,"/app/outcomes/print");
    assert.equal(board.status,200,"API-owned complete chain should render in the actual board report");
    requireServerCounter(board.body,"Complete evidence chains",1);
    const otherPage=await readSignedInServerPage(otherCtx,"/app/outcomes");
    assert.equal(otherPage.status,200,"second tenant's report should remain independent");
    assert.ok(!otherPage.body.includes(record.title),"real API-generated owner data must never cross tenants");
    requireServerCounter(otherPage.body,"Complete chains",0);
    const anonymous=await readSignedInServerPage(publicCtx,"/app/outcomes");
    assert.ok([302,303,307,308].includes(anonymous.status));
    assert.ok(anonymous.location?.includes("/login"),"anonymous viewers must not see an Outcome Ledger");
    step("same-API-owned-verified-decision-chain-visible-only-to-owner-in-ledger-and-board");

    // The original database trigger can mark this follow-up complete without
    // all nine fields. Change exactly ONE saved, already verified later answer
    // and prove BOTH real owner reports refuse the previously eligible result.
    const drifted=await db("PATCH","run_answers?id=eq."+second.answers[0].id+
      "&organization_id=eq."+tenant.org,{
        measurement_context_json:{...context,evaluationVersion:"synthetic-independent-drift-v2"},
      });
    assert.equal(drifted.length,1,"exactly one later answer must be changed");
    const historical=await db("GET","resolution_follow_ups?select=status&id=eq."+
      request.measurementRequestId+"&organization_id=eq."+tenant.org);
    assert.equal(historical[0]?.status,"complete",
      "the old trigger's historical completion must remain true for this negative test");
    const withheld=await readSignedInServerPage(ownerCtx,"/app/outcomes");
    assert.equal(withheld.status,200);
    requireServerCounter(withheld.body,"Complete chains",0);
    requireServerCounter(withheld.body,"Eligible comparisons",0);
    assert.match(withheld.body,/incomparable/i);
    const withheldBoard=await readSignedInServerPage(ownerCtx,"/app/outcomes/print");
    assert.equal(withheldBoard.status,200);
    requireServerCounter(withheldBoard.body,"Complete evidence chains",0);
    requireServerCounter(withheldBoard.body,"Incomparable",1);
    step("same-API-owned-context-drift-suppressed-in-both-authenticated-reports");

    process.stdout.write("[isolated-api] PASSED "+stages.length+" native-local HTTP stages; no browser, no providers, no production, no customer-value claim.\n");
  } finally {
    await Promise.all(clients.map(async c => c.close().catch(()=>{})));
    await browser.close();
  }
}
await main();
