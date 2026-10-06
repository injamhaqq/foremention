#!/usr/bin/env node
// Safely summarize local-only Worker crash signatures. Never print raw logs,
// request bodies, URLs, account identifiers, credentials or stack frames.
import { readFile } from "node:fs/promises";

const path=process.argv[2];
if(path!==".isolated-browser-server.log")throw Error("Only the ephemeral local Worker log is supported.");
const log=await readFile(path,"utf8").catch(()=> "");
const lines=log.split(/\r?\n/);
const diagnostics=[];
for(let i=0;i<lines.length;i++){
 const line=lines[i];
 const postReviewPhase=/isolated-post-review-resolution-read-stage[^\n]*\b(entry|viewer|workspace|loaded|catch)\b/.exec(line);
 if(postReviewPhase){
   diagnostics.push({kind:"isolated-post-review-resolution-read-stage",stage:postReviewPhase[1]});
   continue;
 }
 const finalPhase=/isolated-final-resolution-read-stage[^\n]*\b(entry|viewer|workspace|loaded|catch)\b/.exec(line);
 if(finalPhase){
   diagnostics.push({kind:"isolated-final-resolution-read-stage",stage:finalPhase[1]});
   continue;
 }
 const phase=/isolated-resolution-read-stage[^\n]*\b(entry|viewer|workspace|loaded|catch)\b/.exec(line);
 if(phase){
   diagnostics.push({kind:"isolated-resolution-read-stage",stage:phase[1]});
   continue;
 }
 if(line.includes("Resolution read failed")){
   const block=lines.slice(i+1,i+7).join("\n");
   const category=/category:\s*['"]?(database|type|other)/.exec(block)?.[1]||"unknown";
   const status=/status:\s*(\d{3})/.exec(block)?.[1]||"unknown";
   const code=/code:\s*['"]?([A-Z0-9_]+)/.exec(block)?.[1]||"unknown";
   diagnostics.push({kind:"sanitized-resolution-read",category,status,code});
   continue;
 }
 const state=line.match(/Supabase REST request failed\./);
 if(state){
  const block=lines.slice(i+1,i+10).join("\n");
  const get=(key,rx)=>rx.exec(block)?.[1]??"unknown";
  const resource=get("resource",/resource:\s*['"]?([a-z_]+)['"]?/);
  const method=get("method",/method:\s*['"]?(GET|POST|PATCH|DELETE)['"]?/);
  const status=get("status",/status:\s*(\d{3})/);
  const code=get("code",/code:\s*['"]?([A-Z0-9_]+)['"]?/);
  diagnostics.push({kind:"sanitized-supabase-request",resource,method,status,code});
  continue;
 }
 if(/\b(?:uncaught|error|exception|database)\b/i.test(line)){
  // Fixed labels only. Keep all raw text private: could contain user input or
  // auth errors returned by local GoTrue, never safe to print verbatim.
  for(const [pattern,label] of [
    [/invalid.*(?:column|relation|schema)/i,"schema-error"],
    [/connect|refused|dns|fetch failed/i,"upstream-connection-error"],
    [/auth|permission|policy|rls/i,"authorization-error"],
    [/onboarding|complete_onboarding/i,"onboarding-error"],
    [/TypeError/i,"type-error"],
    [/Internal Server Error/i,"internal-error"],
    [/Not Found/i,"not-found"],
  ]) if(pattern.test(line)){diagnostics.push({kind:"sanitized-worker-error",category:label});break}
 }
}
const unique=Array.from(new Map(diagnostics.map((x)=>[JSON.stringify(x),x])).values()).slice(-12);
process.stdout.write("[isolated-diagnostics] "+JSON.stringify(unique)+"\n");
