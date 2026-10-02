import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { evaluateFollowUpContextParity } from "../lib/outcome-context-gate.ts";
import { buildOutcomeLedger } from "../lib/outcome-ledger.ts";
import { buildBusinessValueReport, buildDecisionEvidenceSummary } from "../lib/value-report.ts";

const context = Object.freeze({
  locale: "en-US", market: "US", buyerStage: "evaluation", promptVersion: "v1",
  parserVersion: "p1", retrievalVersion: "r1", policyVersion: "policy-1",
  schemaVersion: "schema-1", evaluationVersion: "evaluation-1",
});
const base = { id:"base", status:"complete", methodology_version:"method-1", answer_count:1,
  brand_presence_pct:20, first_mention_pct:10, citation_count:2, new_source_count:1, completed_at:"2026-09-01T00:00:00Z" };
const later = { ...base, id:"later", brand_presence_pct:35, citation_count:4, completed_at:"2026-09-08T00:00:00Z" };
const answer = (run_id, overrides={}) => ({
  run_id, prompt_key:"q1", prompt_text:"Which B2B tool fits this team?",
  provider:"cloudflare", model:"model-id-pinned", measurement_context_json:{...context}, ...overrides,
});
const followUp = {id:"followup-1", resolution_asset_id:"asset-1", baseline_run_id:"base", rerun_id:"later", status:"complete",
  // A real database follow-up can be requested only after the asset is applied
  // (this file's applied fixture is dated 5 September); 2 September was never valid.
  requested_at:"2026-09-06T00:00:00Z", completed_at:"2026-09-08T00:00:00Z", outcome:{}, limitation:"Observed association only." };
const evaluate = (options={}) => evaluateFollowUpContextParity({
  followUps:[followUp], runs:[base,later], verifiedAnswers:[answer("base"),answer("later")], ...options,
}).get(followUp.id);

test("independent nine-field gate accepts only full exact-context pairs", () => {
  assert.deepEqual(evaluate(), { comparable:true, reason:null });
  for (const field of Object.keys(context)) {
    const check=evaluate({verifiedAnswers:[answer("base"),answer("later",{
      measurement_context_json:{...context,[field]: field==="locale" ? "fr-FR" : "different"},
    })]});
    assert.equal(check.comparable,false, field);
  }
  for (const field of ["prompt_text","provider","model","prompt_key"]) {
    const check=evaluate({verifiedAnswers:[answer("base"),answer("later",{[field]:"changed"})]});
    assert.equal(check.comparable,false,field);
  }
});

test("missing model or missing historical context fails closed", () => {
  for (const modified of [
    answer("later",{model:null}),
    answer("later",{measurement_context_json:null}),
    answer("later",{measurement_context_json:{...context,retrievalVersion:null}}),
    answer("later",{prompt_text:null}),
  ]) {
    assert.equal(evaluate({verifiedAnswers:[answer("base"),modified]}).comparable,false);
  }
});

test("independent read rejects missing or incomplete verified answers and duplicate question/provider slots", () => {
  assert.match(evaluate({verifiedAnswers:[answer("base")]}).reason, /complete verified answer set/i);
  assert.equal(evaluate({runs:[base,{...later,answer_count:2}]}).comparable,false);
  const duplicate = [
    {...base,answer_count:2}, {...later,answer_count:2},
  ];
  const answers = [answer("base"),answer("base"),answer("later"),answer("later")];
  const outcome=evaluate({runs:duplicate,verifiedAnswers:answers});
  assert.equal(outcome.comparable,false);
  assert.match(outcome.reason,/Duplicate question\/provider/);
});

test("independent read refuses methodology changes, same-run pairs, missing runs, nonfinalized status and saturation", () => {
  assert.equal(evaluate({runs:[base,{...later,methodology_version:"method-2"}]}).comparable,false);
  assert.equal(evaluate({runs:[base]}).comparable,false);
  assert.equal(evaluate({runs:[{...base,status:"review"},later]}).comparable,false);
  assert.equal(evaluate({saturatedRunIds:new Set(["later"])}).comparable,false);
  const sameRun=evaluateFollowUpContextParity({
    followUps:[{...followUp,rerun_id:"base"}],runs:[base],verifiedAnswers:[answer("base")],
  });
  assert.equal(sameRun.get(followUp.id).comparable,false);
});

test("record rendering withholds even previously stored directional outcomes on failed independent parity", () => {
  const asset = {
    id:"asset-1", opportunity_id:"op-1", source_id:"source-1", baseline_run_id:"base",
    asset_type:"comparison_brief", title:"Reviewed gap", problem_statement:"Source gap", status:"applied",
    review_decision:"approved", created_at:"2026-09-01T00:00:00Z", updated_at:"2026-09-05T00:00:00Z",
    submitted_at:"2026-09-02T00:00:00Z", approved_at:"2026-09-03T00:00:00Z", decision_at:"2026-09-03T00:00:00Z",
    approval_note:"Approved", applied_at:"2026-09-05T00:00:00Z", application_reference:"ticket-123",
    application_note:null, change_specification_id:"change-1",
  };
  const stored = {
    ...followUp, outcome:{
      baselineRunId:"base", followUpRunId:"later",
      brandPresencePct:{before:20,after:35,delta:15},
      firstMentionPct:{before:10,after:10,delta:0},
      citationCount:{before:2,after:4,delta:2},
      newSourceCount:{before:1,after:1,delta:0},
    },
  };
  const build = (parity, row=asset) => buildOutcomeLedger({
    assets:[row], evidence:[{id:"evidence-1",resolution_asset_id:row.id,evidence_snapshot:{verification:"verified"},created_at:"2026-09-02T00:00:00Z"}],
    opportunities:[{id:"op-1",owner_id:"user-1",due_at:null,next_action:null,status:"in_progress",updated_at:"2026-09-02T00:00:00Z"}],
    followUps:[stored],runs:[base,later],contextParityByFollowUp:parity,
  })[0];
  const denied=build(new Map([[followUp.id,{comparable:false,reason:"The retrieval version changed."}]]));
  assert.equal(denied.comparison,null);
  assert.equal(denied.comparisonEligible,false);
  assert.equal(denied.outcomeState,"incomparable");
  assert.equal(denied.steps.find((s)=>s.key==="measurement").done,true);
  assert.equal(denied.steps.find((s)=>s.key==="outcome").done,false);
  assert.match(denied.limitation,/retrieval version changed/i);
  assert.equal(buildBusinessValueReport([denied]).higherObserved,0);
  assert.equal(buildDecisionEvidenceSummary([denied]).completeDecisionChains,0);
  const accepted=build(new Map([[followUp.id,{comparable:true,reason:null}]]));
  assert.equal(accepted.comparisonEligible,true);
  assert.equal(accepted.outcomeState,"higher_observed");
  assert.equal(buildDecisionEvidenceSummary([accepted]).completeDecisionChains,1);
  const mismatchedAsset=build(new Map([[followUp.id,{comparable:true,reason:null}]]),{...asset,baseline_run_id:"different"});
  assert.equal(mismatchedAsset.comparisonEligible,false);
  assert.match(mismatchedAsset.limitation,/does not match this resolution asset/);
});

test("a more recent complete but context-ineligible follow-up must not inherit an older eligible outcome", () => {
  const owned = {
    id:"asset-latest",opportunity_id:"opp-latest",source_id:"source-latest",
    baseline_run_id:"base",asset_type:"comparison_brief",title:"Fixture intervention",
    problem_statement:"Synthetic observation",status:"applied",review_decision:"approved",
    created_at:"2026-09-01T00:00:00Z",updated_at:"2026-09-05T00:00:00Z",
    submitted_at:"2026-09-02T00:00:00Z",approved_at:"2026-09-03T00:00:00Z",
    decision_at:"2026-09-03T00:00:00Z",approval_note:"Approved",applied_at:"2026-09-05T00:00:00Z",
    application_reference:"synthetic-local-ticket",change_specification_id:"change-latest",
  };
  const first={...followUp,id:"followup-first",resolution_asset_id:owned.id};
  const changed={...later,id:"later-drift",completed_at:"2026-09-15T00:00:00Z"};
  const newest={...first,id:"followup-drift",rerun_id:changed.id,requested_at:"2026-09-10T00:00:00Z",
    completed_at:"2026-09-15T00:00:00Z"};
  const parity=evaluateFollowUpContextParity({
    followUps:[first,newest],runs:[base,later,changed],
    verifiedAnswers:[answer("base"),answer("later"),
      answer("later-drift",{measurement_context_json:{...context,evaluationVersion:"drift-v2"}})],
  });
  assert.equal(parity.get(first.id)?.comparable,true);
  assert.equal(parity.get(newest.id)?.comparable,false);
  const [record]=buildOutcomeLedger({
    assets:[owned],evidence:[{id:"evidence-1",resolution_asset_id:owned.id,
      evidence_snapshot:{verification:"verified"},created_at:"2026-09-02T00:00:00Z"}],
    opportunities:[{id:"opp-latest",owner_id:"local-owner",updated_at:"2026-09-03T00:00:00Z"}],
    followUps:[first,newest],runs:[base,later,changed],contextParityByFollowUp:parity,
  });
  assert.equal(record.measurementStatus,"complete");
  assert.equal(record.comparisonEligible,false);
  assert.equal(record.comparison,null);
  assert.equal(record.outcomeState,"incomparable");
  assert.equal(buildDecisionEvidenceSummary([record]).completeDecisionChains,0);
  assert.equal(buildBusinessValueReport([record]).higherObserved,0);
});

test("the user-visible page and board export use the scoped independent parity gate", async () => {
  const root = new URL("../", import.meta.url);
  const read=(path)=>readFile(new URL(path,root),"utf8");
  const [page,print,loader] = await Promise.all([
    read("app/app/outcomes/page.tsx"),read("app/app/outcomes/print/page.tsx"),read("lib/outcome-context-read.ts"),
  ]);
  for (const file of [page,print]) {
    assert.match(file,/loadOutcomeContextParity/);
    assert.match(file,/contextParityByFollowUp/);
    assert.match(file,/runs\?select=id,status,methodology_version,answer_count/);
    assert.match(file,/project_id=eq\.\$\{context\.projectId\}/);
    assert.match(file,/organization_id=eq\.\$\{context\.organizationId\}/);
  }
  assert.match(loader,/run_answers\?select=run_id,prompt_key,prompt_text,provider,model,measurement_context_json/);
  assert.match(loader,/organization_id=eq\.\$\{input\.organizationId\}/);
  assert.match(loader,/run_id=in\.\(\$\{batch\.join/);
  assert.match(loader,/review_status=eq\.verified/);
  assert.match(loader,/rows\.length >= 1000/);
  assert.doesNotMatch(loader,/serviceRole|answer_text|citations_json|apikey/);
});
