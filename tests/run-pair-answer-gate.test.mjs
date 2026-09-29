import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_VERIFIED_RUN_PAIR_ANSWERS,
  validPairedRunAnswerBudget,
  assessCompleteVerifiedRunPair,
} from "../lib/run-pair-answer-gate.ts";

const earlier={id:"00000000-0000-4000-8000-000000000001",answer_count:2};
const later={id:"00000000-0000-4000-8000-000000000002",answer_count:2};
const context={
  locale:"en-US",market:"US",buyerStage:"evaluation",
  promptVersion:"q-v1",parserVersion:"parser-v1",retrievalVersion:"retrieval-v1",
  policyVersion:"policy-v1",schemaVersion:"schema-v1",evaluationVersion:"eval-v1",
};
const row=(run_id,prompt_key,opts={})=>({
  run_id,prompt_key,prompt_text:"Who should we choose for "+prompt_key+"?",
  provider:"provider-a",model:"model-1",
  measurement_context_json:{...context},...opts,
});
const complete=[
  row(earlier.id,"question-a"),row(earlier.id,"question-b"),
  row(later.id,"question-a"),row(later.id,"question-b"),
];
test("fully verified equal-provenance answer matrices are comparable",()=>{
  const result=assessCompleteVerifiedRunPair(earlier,later,complete);
  assert.deepEqual(result,{comparable:true,reason:null});
});
test("a same-looking verified subset must never pass when one original answer is missing",()=>{
  for (const [label,rows,first,second] of [
    ["one unverified baseline answer",complete.filter(x=>!(x.run_id===earlier.id&&x.prompt_key==="question-b")),earlier,later],
    ["symmetric truncated subsets",complete,[{...earlier,answer_count:3}][0],{...later,answer_count:3}],
    ["verified later answer missing",complete.slice(0,-1),earlier,later],
    ["metadata lacks answer total",complete,{...earlier,answer_count:null},later],
  ]) {
    const result=assessCompleteVerifiedRunPair(first,second,rows);
    assert.equal(result.comparable,false,label);
    assert.match(result.reason,/complete|answer count/i,label);
  }
});
test("a near-response-cap pair is allowed only when both complete recorded sets fit",()=>{
  assert.equal(MAX_VERIFIED_RUN_PAIR_ANSWERS,500);
  assert.equal(validPairedRunAnswerBudget({...earlier,answer_count:250},
    {...later,answer_count:251}).comparable,false);
  assert.equal(validPairedRunAnswerBudget({...earlier,answer_count:250},
    {...later,answer_count:250}).comparable,true);
  for(const count of [0,-1,1.5,Number.MAX_SAFE_INTEGER+1,null]){
    assert.equal(validPairedRunAnswerBudget({...earlier,answer_count:count},later).comparable,false,String(count));
  }
});
test("duplicate or unidentified provider/question slots cannot manufacture comparable response pairs",()=>{
  const duplicate=[
    row(earlier.id,"question-a"),row(earlier.id,"question-a"),
    row(later.id,"question-a"),row(later.id,"question-a"),
  ];
  assert.match(assessCompleteVerifiedRunPair(earlier,later,duplicate).reason,/Duplicate/);
  const emptyProvider=complete.map(x=>({...x,provider:"  "}));
  assert.equal(assessCompleteVerifiedRunPair(earlier,later,emptyProvider).comparable,false);
  const emptyKey=complete.map(x=>({...x,prompt_key:"  "}));
  assert.equal(assessCompleteVerifiedRunPair(earlier,later,emptyKey).comparable,false);
});
test("unexpected third-run evidence or excess rows fail closed",()=>{
  assert.equal(assessCompleteVerifiedRunPair(earlier,later,
    [...complete,row("00000000-0000-4000-8000-000000000003","rogue")]).comparable,false);
  assert.equal(assessCompleteVerifiedRunPair(earlier,later,[...complete,...complete]).comparable,false);
  assert.equal(assessCompleteVerifiedRunPair(earlier,earlier,complete).comparable,false);
});
test("complete counts cannot override mismatched per-answer context or model",()=>{
  const drift=complete.map(x=>x.run_id===later.id&&x.prompt_key==="question-b"
    ? {...x,measurement_context_json:{...context,evaluationVersion:"eval-v2"}} : x);
  assert.equal(assessCompleteVerifiedRunPair(earlier,later,drift).comparable,false);
  assert.match(assessCompleteVerifiedRunPair(earlier,later,drift).reason,/matrix|context/i);
  const absent=complete.map(x=>x.run_id===later.id ? {...x,model:null}:x);
  assert.equal(assessCompleteVerifiedRunPair(earlier,later,absent).comparable,false);
  const changedText=complete.map(x=>x.run_id===later.id&&x.prompt_key==="question-b"
    ? {...x,prompt_text:"A different buyer question?"}:x);
  assert.equal(assessCompleteVerifiedRunPair(earlier,later,changedText).comparable,false);
});
