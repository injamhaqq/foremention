import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { decisionDraftClientFixture as fixture, decisionDraftRecord as record } from "./helpers/decision-draft-client-fixture.mjs";
const id=(n)=>`00000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
const tick=()=>new Promise((resolve)=>setImmediate(resolve));
function submit(f){const form=f.walk(f.render(),(n)=>n.type==="form"&&n.props.id==="decision-draft");assert.ok(form);form.props.onSubmit({preventDefault(){}});}
test("reviewed problem renders one decision handoff without downstream execution controls",()=>{
  const f=fixture();const html=renderToStaticMarkup(f.render());assert.match(html,/Create decision draft/);assert.match(html,/Baseline Record/);assert.doesNotMatch(html,/Request comparable measurement|Approve asset|Asset title/);
});
test("viewer and demo cannot create a decision even if a submit event is dispatched",async()=>{
  for(const options of [{role:"viewer"},{demo:true}]){const f=fixture(options);submit(f);await tick();assert.equal(f.posts.length,0);}
});
test("rapid duplicate submits create one draft and navigate to the existing canonical editor",async()=>{
  const f=fixture({saved:true});submit(f);submit(f);assert.equal(f.posts.length,1);assert.equal(f.posts[0].baselineRunId,id(3));
  f.finish({ok:true,status:201,text:async()=>JSON.stringify({data:{id:id(8),status:"draft"}})});await tick();assert.deepEqual(f.navigations,[`/app/change-specifications/${id(8)}`]);
});
test("an uncertain save blocks another mutation and tells the customer to inspect existing decisions",async()=>{
  const f=fixture();submit(f);f.finish({ok:true,status:201,text:async()=>"unreadable"});await tick();submit(f);await tick();assert.equal(f.posts.length,1);assert.match(renderToStaticMarkup(f.render()),/another save is blocked/);assert.equal(f.navigations.length,0);
});
test("legacy assets retain their history without manufacturing a decision parent",()=>{
  const f=fixture({record:{...record,proposal:{assetType:"faq",title:"Legacy",summary:"Historical",content:"Recorded",limitations:"Unknown",version:1,updatedAt:"2026-07-20"}}});const html=renderToStaticMarkup(f.render());assert.match(html,/Legacy Resolution Asset/);assert.doesNotMatch(html,/id="decision-draft"/);
});
