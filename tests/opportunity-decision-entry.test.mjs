import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { decisionDraftClientFixture as fixture, decisionDraftRecord as record } from "./helpers/decision-draft-client-fixture.mjs";
import { opportunityEntryMarkup, opportunitySourceUrl as url } from "./helpers/opportunity-entry-fixture.mjs";
const matching={...record,id:"matching",problem:{...record.problem,title:"Selected cited page"},evidence:record.evidence.map((e)=>({...e,sourceUrl:url}))};
test("reviewed Opportunity navigates with exact cited-page context without legacy mutation",()=>{
  const html=opportunityEntryMarkup();assert.ok(html.includes(`/app/resolutions?source=${encodeURIComponent(url)}`));assert.match(html,/Review decision/);assert.doesNotMatch(html,/Create action/);
});
test("unreviewed and fictional Opportunities have actionable evidence review links only",()=>{
  for(const options of [{reviewed:false},{demo:true}]){const html=opportunityEntryMarkup(options);assert.match(html,/\/app\/source-map#source-review-queue/);assert.doesNotMatch(html,/\/app\/resolutions\?source=/);assert.match(html,/Review source evidence/);}
});
test("navigation hint selects only matching scoped evidence, not the first unrelated problem",()=>{
  const f=fixture({sourceUrl:url,records:[record,matching]});const html=renderToStaticMarkup(f.render());assert.match(html,/Selected cited page/);assert.doesNotMatch(html,/>Reviewed gap</);assert.match(html,/Create decision draft/);assert.equal(f.posts.length,0);
});
test("unknown or foreign source hint never falls back to an unrelated editable problem",()=>{
  const f=fixture({sourceUrl:"https://another-tenant.example/private"});const html=renderToStaticMarkup(f.render());assert.match(html,/No reviewed decision evidence/);assert.doesNotMatch(html,/id="decision-draft"|>Reviewed gap</);assert.equal(f.posts.length,0);
});
