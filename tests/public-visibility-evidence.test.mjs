import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { assessPublicReportEvidence, PUBLIC_REPORT_ANSWER_READ_LIMIT } from "../lib/public-visibility-evidence.mjs";

const run = (id, overrides = {}) => ({
  id, status: "complete", provider_ids: ["cloudflare"], answer_count: 2,
  citation_count: 1, brand_presence_pct: 50, completed_at: "2026-09-29T10:00:00Z",
  ...overrides,
});
const answer = (runId, key, overrides = {}) => ({
  id: runId + "-" + key,
  run_id: runId, prompt_key: key, provider: "cloudflare", review_status: "verified",
  brand_present: key === "q1", citations_json: key === "q1" ? [{url:"https://official.example/evidence"}] : [],
  ...overrides,
});
const a = run("a");
const b = run("b", {completed_at:"2026-09-22T10:00:00Z"});
const baseRows = [answer("a", "q1"),answer("a", "q2"),answer("b", "q1"),answer("b", "q2")];
const verify = (runs, rows) => assessPublicReportEvidence(runs, rows);

test("publishes only two independently complete human-verified synthetic runs with reconciled counters", () => {
  const result=verify([a,b],baseRows);
  assert.equal(result.ok,true);
  assert.equal(result.totalAnswers,4);
  assert.equal(result.totalCitations,2);
  assert.equal(result.providerCoverage,1);
  assert.equal(result.latestBrandPresence,50);
});

test("one verified answer from a two-answer completed collection cannot publish public metrics",()=>{
  assert.equal(verify([a],[answer("a","q1")]).ok,false);
  assert.equal(verify([a],[answer("a","q1"),answer("a","q2",{review_status:"unreviewed"})]).ok,false);
  assert.equal(verify([a],[answer("a","q1"),answer("a","q2",{review_status:"excluded"})]).ok,false);
});

test("same-looking truncated and extra row subsets are both rejected",()=>{
  assert.equal(verify([a,b],baseRows.slice(0,3)).ok,false);
  assert.equal(verify([a], [...baseRows.slice(0,2),answer("a","q3")]).ok,false);
  assert.equal(verify([a], [...baseRows.slice(0,2),answer("outside","q3")]).ok,false);
  assert.equal(verify([a,a],baseRows.slice(0,2)).ok,false);
});

test("duplicate answer ids, repeated question/provider slots and missing question identity are not independent observations",()=>{
  assert.equal(verify([a],[baseRows[0], {...baseRows[1],id:baseRows[0].id}]).ok,false);
  assert.equal(verify([a],[baseRows[0], {...baseRows[1],prompt_key:"q1"}]).ok,false);
  assert.equal(verify([a],[baseRows[0], {...baseRows[1],prompt_key:"  "}]).ok,false);
  assert.equal(verify([a],[baseRows[0], {...baseRows[1],provider:"other"}]).ok,false);
});

test("stored aggregate citation and brand presence cannot override contradictory verified rows",()=>{
  assert.equal(verify([run("a",{citation_count:22})],baseRows.slice(0,2)).ok,false);
  assert.equal(verify([run("a",{brand_presence_pct:99})],baseRows.slice(0,2)).ok,false);
  assert.equal(verify([a],[baseRows[0], {...baseRows[1],brand_present:null}]).ok,false);
  assert.equal(verify([a],[baseRows[0], {...baseRows[1],citations_json:null}]).ok,false);
  assert.equal(verify([a],[baseRows[0], {...baseRows[1],citations_json:[{url:"javascript:bad"}]}]).ok,false);
});

test("unreviewed runs, missing/zero/unsafe denominators and overflowing reads fail closed",()=>{
  for(const count of [0,-2,1.5,null,Number.MAX_SAFE_INTEGER+1,PUBLIC_REPORT_ANSWER_READ_LIMIT]){
    const value=verify([run("a",{answer_count:count})],baseRows.slice(0,2));
    assert.equal(value.ok,false,String(count));
  }
  assert.equal(verify([run("a",{status:"review"})],baseRows.slice(0,2)).ok,false);
  assert.equal(verify([],[]).ok,false);
});

test("different legitimate providers are counted only when actually observed on complete verified answers",()=>{
  const result=verify(
    [run("a",{provider_ids:["cloudflare","groq"],citation_count:0,brand_presence_pct:0})],
    [answer("a","q1",{provider:"cloudflare",brand_present:false,citations_json:[]}),
      answer("a","q2",{provider:"groq",brand_present:false,citations_json:[]})],
  );
  assert.equal(result.ok,true);
  assert.equal(result.providerCoverage,2);
  assert.equal(result.latestBrandPresence,0);
});

test("the public server endpoint does not publish a recorded-only subset or an unbounded source count",()=>{
  const loader=readFileSync(new URL("../lib/public-visibility-report.ts",import.meta.url),"utf8");
  const page=readFileSync(new URL("../app/report/[domain]/page.tsx",import.meta.url),"utf8");
  assert.match(loader,/public_report_enabled=eq\.true/);
  assert.match(loader,/status=eq\.complete/);
  assert.match(loader,/run_answers\?select=id,run_id,prompt_key,provider,review_status,brand_present,citations_json/);
  assert.match(loader,/assessPublicReportEvidence\(runs, answers\)/);
  assert.match(loader,/if \(!assessment\.ok\)/);
  assert.match(loader,/sourceCount: sources\.length < 1000 \? sources\.length : undefined/);
  assert.match(page,/report\.sourceCount \?\? "Unavailable"/);
  assert.doesNotMatch(page,/Mapped for this organization/);
});
