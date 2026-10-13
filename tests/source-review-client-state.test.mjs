import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import * as jsx from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
function fixture(options={}) {
  const calls=[],events=[],changes=[];let refreshes=0,finish;
  const pending=new Promise((resolve)=>{finish=resolve;});
  const mocks={"react":{...React,useState:(value)=>[value,(next)=>changes.push(next)],useRef:(value)=>({current:value})},"react/jsx-runtime":jsx,"next/link":{default:({href,children,...props})=>React.createElement("a",{href,...props},children)},"next/navigation":{useRouter:()=>({refresh:()=>refreshes++})},"@/lib/product-analytics":{captureProductEvent:(...args)=>events.push(args)}};
  const code=ts.transpileModule(readFileSync(new URL("../components/source-review-form.tsx",import.meta.url),"utf8"),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const exports={};vm.runInNewContext(code,{exports,require:(name)=>{if(!(name in mocks))throw new Error(name);return mocks[name];},fetch:async(url,init)=>{calls.push({url,init});return pending;}});
  const form=exports.SourceReviewForm({demo:options.demo||false,canEdit:options.canEdit??true,source:{id:"source-a",crawlerAccess:"open",clientPresent:false,competitors:["Recorded competitor"],route:"original research",feasibility:"unknown",influence:"unknown"}});
  return {form,calls,events,changes,finish,refreshes:()=>refreshes};
}
test("demo and viewer review fields and save controls are visibly read-only",()=>{
  for(const options of [{demo:true},{canEdit:false}]){
    const f=fixture(options);const html=renderToStaticMarkup(f.form);
    assert.match(html,/<fieldset[^>]*disabled=""/);assert.match(html,/<button[^>]*disabled=""/);assert.match(html,/Source review fields/);
    assert.match(html,options.demo?/fictional demo is read-only/:/Viewer access is read-only/);
  }
});
test("programmatic demo or viewer submissions cannot send a review mutation or activation event",async()=>{
  for(const options of [{demo:true},{canEdit:false}]){const f=fixture(options);await f.form.props.onSubmit({preventDefault(){}});assert.equal(f.calls.length,0);assert.equal(f.events.length,0);}
});
test("customer review keeps its existing request and synchronous duplicate-submit guard",async()=>{
  const f=fixture();const first=f.form.props.onSubmit({preventDefault(){}});await f.form.props.onSubmit({preventDefault(){}});assert.equal(f.calls.length,1);
  assert.equal(f.calls[0].url,"/api/sources/source-a/review");assert.equal(f.calls[0].init.method,"PATCH");const body=JSON.parse(f.calls[0].init.body);assert.deepEqual(body.competitors,["Recorded competitor"]);assert.equal(body.influence,"unknown");
  f.finish({ok:true,json:async()=>({opportunity:{action:"created"}})});await first;assert.equal(f.refreshes(),1);assert.deepEqual(f.events.map(([name])=>name),["evidence_review_completed","decision_insight_reached"]);
});
test("failed review cannot emit an accepted evidence/decision event",async()=>{
  const f=fixture();const task=f.form.props.onSubmit({preventDefault(){}});f.finish({ok:false,json:async()=>({error:"Review was not saved"})});await task;assert.equal(f.events.length,0);assert.equal(f.refreshes(),0);assert.ok(f.changes.includes("Review was not saved"));
});
