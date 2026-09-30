#!/usr/bin/env node
// Safely summarize local-only Worker crash signatures. Never print raw logs,
// request bodies, URLs, account identifiers, credentials or stack frames.
import { readFile } from "node:fs/promises";

const path=process.argv[2];
if(path!==".isolated-browser-server.log")throw Error("Only the ephemeral local Worker log is supported.");
const log=await readFile(path,"utf8").catch(()=> "");
const lines=log.split(/\r?\n/);
const diagnostics=[];
const markers = [
  ["empty-log",/^\\s*$/],
  ["pnpm-launch-error",/ERR_PNPM|Command .* not found/i],
  ["vite-started",/VITE v\\d|Local:\\s+http/i],
  ["vite-config-failure",/failed to load config|Error when evaluating SSR module/i],
  ["missing-module",/Cannot find module|Cannot find package|Failed to resolve import|ERR_MODULE_NOT_FOUND/i],
  ["cloudflare-binding",/cloudflare:workers/i],
  ["workerd-startup",/workerd|Miniflare/i],
  ["listener-conflict",/EADDRINUSE|address already in use/i],
  ["runtime-version",/Unsupported engine|Node.js version|requires Node/i],
  ["memory-failure",/JavaScript heap out of memory|Allocation failed|Killed/i],
  ["syntax-failure",/SyntaxError|Unexpected token/i],
  ["generic-error-line",/\\b(?:error|failed|exception)\\b/i],
];
for(const [label,pattern] of markers){
  if(label==="empty-log" ? pattern.test(log) : pattern.test(log)){
    diagnostics.push({kind:"safe-startup-marker",label});
  }
}
diagnostics.push({kind:"safe-startup-log-range",bucket:lines.length>100?"100+":lines.length>20?"21-100":lines.length>3?"4-20":"0-3"});

for(let i=0;i<lines.length;i++){
 const line=lines[i];
 const onboardingPhase=/isolated-onboarding-stage[^\n]*\b(entry|origin|viewer|payload|invalid|db)\b/.exec(line);
 if(onboardingPhase){
   diagnostics.push({kind:"isolated-onboarding-stage",stage:onboardingPhase[1]});
   continue;
 }
 const resolutionMetric=/isolated-resolution-read-phase[^\n]*phase:\s*['"]?(base|related|answers|runs|assemble|serialize)['"]?[\s\S]*?duration:\s*['"]?(lt25ms|lt100ms|lt500ms|lt2s|gte2s)['"]?[\s\S]*?count:\s*['"]?(0|1-10|11-100|101-500|gt500)['"]?/.exec(line);
 if(resolutionMetric){
   diagnostics.push({kind:"isolated-resolution-read-phase",phase:resolutionMetric[1],duration:resolutionMetric[2],count:resolutionMetric[3]});
   continue;
 }
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
 if(/\b(?:uncaught|error|exception|database|failed|unable|unexpected)\b/i.test(line)){
  // Only fixed, allowlisted categories. Never render the raw local log.
  for(const [pattern,label] of [
    [/Cannot find module.*cloudflare:workers/i,"node-cannot-load-cloudflare-worker-module"],
    [/Cannot find package|Cannot find module|Failed to resolve/i,"missing-build-module"],
    [/ERR_UNKNOWN_FILE_EXTENSION/i,"unsupported-runtime-module"],
    [/EADDRINUSE|port.*already in use/i,"local-listener-conflict"],
    [/Command.*not found|Unknown command|ERR_PNPM/i,"local-cli-invocation-error"],
    [/SyntaxError|Unexpected token/i,"runtime-syntax-error"],
    [/Vite|Cloudflare Vite Plugin|Miniflare|workerd/i,"native-workerd-startup-error"],
  ]) if(pattern.test(line)){diagnostics.push({kind:"isolated-startup-error",category:label});break}
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
const unique=Array.from(new Map(diagnostics.map((x,i)=>[JSON.stringify(x),x])).values()).slice(-12);
process.stdout.write("[isolated-diagnostics] "+JSON.stringify(unique)+"\n");
