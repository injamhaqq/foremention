import test from "node:test";
import assert from "node:assert/strict";
import {inspectSourceUrl,validatePublicSourceUrl,SourceInspectionError} from "../lib/source-inspection.ts";
test("Chat05 numeric HTML entity payloads do not crash source inspection",async()=>{
 const html="<html><head><title>Safe &#9999999999999999; &#x110000;</title></head><body>Public &#9999999999999999999; evidence</body></html>";
 const obs=await inspectSourceUrl("https://example.com",{
  resolver:async()=>["93.184.216.34"],
  fetcher:async()=>new Response(html,{headers:{"content-type":"text/html"}}),
  includePageText:true});
 assert.equal(obs.access,"open");
 assert.match(obs.pageTitle,/Safe/);
 assert.match(obs.pageText,/Public/);
});
test("Chat05 private network URL disguises are rejected",()=>{
 for(const value of ["http://2130706433/","http://0177.0.0.1/","http://0x7f000001/","http://[::ffff:7f00:1]/","http://169.254.169.254/","http://user:password@example.com/","file:///etc/passwd"])
  assert.throws(()=>validatePublicSourceUrl(value),SourceInspectionError,value);
});
test("Chat05 public-to-private redirect is rejected before second fetch",async()=>{
 let count=0;
 await assert.rejects(inspectSourceUrl("https://example.com",{
  resolver:async()=>["93.184.216.34"],
  fetcher:async()=>{count++;return new Response(null,{status:302,headers:{location:"http://127.0.0.1/"}})}
 }),SourceInspectionError);
 assert.equal(count,1);
});
test("Chat05 DNS preflight is still not a deployed egress binding",async()=>{
 const steps=[];
 const obs=await inspectSourceUrl("https://example.com",{
  resolver:async()=>{steps.push("preflight");return ["93.184.216.34"]},
  fetcher:async()=>{steps.push("unbound fetch");return new Response("Text",{headers:{"content-type":"text/plain"}})}
 });
 assert.equal(obs.access,"open");
 assert.deepEqual(steps,["preflight","unbound fetch"]);
 // This observed design gap must remain explicitly open until platform egress is enforced.
});