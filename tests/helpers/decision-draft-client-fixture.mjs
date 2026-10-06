import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import * as jsx from "react/jsx-runtime";
import * as request from "../../lib/decision-draft-request.ts";
const id=(n)=>`00000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
export const decisionDraftRecord={id:"problem-row",status:"observed",problem:{id:id(1),type:"gap",title:"Reviewed gap",summary:"Recorded evidence",confidence:"limited",observedAt:"2026-07-20"},changeSpecification:null,evidence:[{id:id(2),kind:"source_observation",title:"Reviewed answer source",detail:"Recorded citation",runId:id(3),observedAt:"2026-07-20"}],proposal:null,approval:{status:"pending",note:""},application:{status:"not_applied",targetUrl:""},followUp:{status:"not_requested"}};
export function decisionDraftClientFixture(options={}) {
  const state=[],refs=[];let cursor=0,refCursor=0,arrays=0;const posts=[],navigations=[];let finish;
  const pending=new Promise((resolve)=>{finish=resolve;});
  const hooks={...React,useState:(initial)=>{
    const slot=cursor++;
    if(!(slot in state)) {
      state[slot]=initial;
      if(Array.isArray(initial)) { arrays++; state[slot]=arrays===1?[id(2)]:[options.record||decisionDraftRecord]; }
      if(slot===2)state[slot]=id(3);
      // The fixture supplies records that would normally arrive through the scoped GETs.
      if(slot===9)state[slot]=false;
    }
    return [state[slot],(value)=>{state[slot]=typeof value==="function"?value(state[slot]):value;}];
  },useRef:(value)=>refs[refCursor++] ||= {current:value},useMemo:(f)=>f(),useCallback:(f)=>f,useEffect:()=>{}};
  const fetch=async(url,init={})=>{
    if(init.method==="POST") {posts.push(JSON.parse(init.body));return pending;}
    const data=url==="/api/resolutions"?{resolutions:[decisionDraftRecord]}:url==="/api/change-specifications"?options.saved?[{id:id(8),opportunityId:id(1),title:"Decision",status:"draft"}]:[]:[];
    return {ok:true,text:async()=>JSON.stringify({data})};
  };
  const mocks={"next/link":{default:({href,children,...props})=>React.createElement("a",{href,...props},children)},"next/navigation":{useRouter:()=>({push:(url)=>navigations.push(url)})},"react":hooks,"react/jsx-runtime":jsx,"@/lib/decision-draft-request":request,"@/app/app/resolutions/resolution-center.module.css":{default:new Proxy({},{get:(_,key)=>String(key)})}};
  const source=readFileSync(new URL("../../components/resolution-center.tsx",import.meta.url),"utf8");
  const code=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const exports={};vm.runInNewContext(code,{exports,require:(name)=>mocks[name],fetch,Date,Set,Map,console,Response,DOMException});
  const render=()=>{cursor=0;refCursor=0;return exports.ResolutionCenter({demo:options.demo||false,role:options.role||"analyst"});};
  const walk=(node,predicate)=>{if(!node||typeof node!=="object")return null;if(predicate(node))return node;for(const child of React.Children.toArray(node.props?.children)){const found=walk(child,predicate);if(found)return found;}return null;};
  return {render,walk,posts,navigations,finish};
}
