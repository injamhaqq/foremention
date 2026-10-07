import vm from "node:vm";
import { readFileSync } from "node:fs";
import ts from "typescript";
import React from "react";
import * as jsx from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
export const opportunitySourceUrl="https://example.com/buyer-guide?category=crm&region=us";
export function opportunityEntryMarkup({reviewed=true,demo=false}={}) {
  const exports={};
  const Link=({href,children,...props})=>React.createElement("a",{href,...props},children);
  const mocks={react:{...React,useState:(initial)=>[initial,()=>{}]},"react/jsx-runtime":jsx,"next/link":{default:Link},"@/components/brand":{Arrow:()=>null},"@/components/comment-thread":{CommentThread:()=>null}};
  const code=ts.transpileModule(readFileSync(new URL("../../components/opportunity-list.tsx",import.meta.url),"utf8"),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(code,{exports,require:(name)=>mocks[name]});
  return renderToStaticMarkup(exports.OpportunityList({demo,rows:[{id:"entry",sourceId:"source",score:reviewed?2:null,url:opportunitySourceUrl,domain:"example.com",title:"Buyer guide",type:"comparison",evidenceCount:2,engines:["ChatGPT"],influence:"low",feasibility:"medium",route:"comparison inclusion"}]}));
}
