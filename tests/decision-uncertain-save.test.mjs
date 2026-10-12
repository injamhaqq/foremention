import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { decisionEditorFixture, editorRecord, editorResponse, flushEditor } from "./helpers/decision-editor-fixture.mjs";

test("ambiguous save blocks a second write until a scoped persisted reload succeeds", async () => {
  const f = decisionEditorFixture();
  f.field("Title").props.onChange({ target: { value: "Uncertain title" } });
  f.form().props.onSubmit({ preventDefault() {} });
  f.requests[0].resolve(editorResponse(null)); await flushEditor();
  assert.doesNotMatch(renderToStaticMarkup(f.render()), /Decision updated\./);
  f.form().props.onSubmit({ preventDefault() {} }); assert.equal(f.requests.length, 1);
  const submit=f.button("Save & submit for review"); assert.equal(submit.props.disabled,true);
  submit.props.onClick(); assert.equal(f.requests.length,1);
  f.button("Reload saved decision").props.onClick(); f.requests[1].resolve(editorResponse(null,503)); await flushEditor();
  assert.equal(f.field("Title").props.value,"Uncertain title");
  f.button("Reload saved decision").props.onClick();
  f.requests[2].resolve({ok:true,status:200,text:async()=>JSON.stringify({data:[{...editorRecord,title:"Actually saved"}],permissions:{role:"analyst",canWrite:true,canDecide:false}})});
  await flushEditor(); assert.equal(f.field("Title").props.value,"Actually saved");
  assert.equal(f.button("Submit for review").props.disabled,false);
});

test("a definite validation refusal retains local edits and permits correction", async () => {
  const f=decisionEditorFixture(); f.field("Title").props.onChange({target:{value:"Fix me"}});
  f.form().props.onSubmit({preventDefault(){}}); f.requests[0].resolve(editorResponse(null,400)); await flushEditor();
  assert.equal(f.field("Title").props.value,"Fix me"); assert.equal(f.field("Title").props.disabled,false);
  assert.equal(f.button("Reload saved decision"),null);
});

test("dirty Save & submit stops after an uncertain submit and reloads the actual status",async()=>{
  const f=decisionEditorFixture(); f.field("Title").props.onChange({target:{value:"Changed title"}});
  f.button("Save & submit for review").props.onClick();
  f.requests[0].resolve(editorResponse({...editorRecord,title:"Changed title"})); await flushEditor();
  assert.equal(f.requests[1].body.action,"submit");
  f.requests[1].reject(new Error("Connection lost")); await flushEditor();
  assert.equal(f.button("Save & submit for review").props.disabled,true);
  assert.equal(f.requests.length,2); assert.doesNotMatch(renderToStaticMarkup(f.render()),/Decision updated\./);
});

test("an ambiguous manager decision blocks Approve/Reject until the persisted decision is reloaded", async () => {
  const f = decisionEditorFixture({ role: "owner", record: { ...editorRecord, status: "in_review", submittedAt: "2026-10-12T10:00:00Z" } });
  f.field("Decision note").props.onChange({ target: { value: "Owner note" } });
  f.button("Approve").props.onClick();
  assert.equal(f.requests.length, 1);
  assert.deepEqual({ action: f.requests[0].body.action, decision: f.requests[0].body.decision }, { action: "decision", decision: "approved" });
  // The write may have persisted; only the acknowledgement is lost.
  f.requests[0].resolve(editorResponse({ error: "upstream" }, 503)); await flushEditor();
  const html = renderToStaticMarkup(f.render());
  assert.match(html, /We cannot confirm what was saved\./);
  assert.doesNotMatch(html, /Decision updated\./);
  assert.equal(f.button("Approve").props.disabled, true);
  assert.equal(f.button("Reject").props.disabled, true);
  assert.equal(f.field("Decision note").props.disabled, true);
  f.button("Approve").props.onClick(); f.button("Reject").props.onClick();
  assert.equal(f.requests.length, 1, "no automatic or repeated decision write while the outcome is uncertain");
  // A failed reload keeps the uncertainty and the reviewer's local note.
  f.button("Reload saved decision").props.onClick(); f.requests[1].reject(new Error("offline")); await flushEditor();
  assert.equal(f.button("Approve").props.disabled, true);
  assert.equal(f.field("Decision note").props.value, "Owner note");
  // A successful scoped reload shows the decision that actually persisted.
  f.button("Reload saved decision").props.onClick();
  f.requests[2].resolve({ ok: true, status: 200, text: async () => JSON.stringify({ data: [{ ...editorRecord, status: "approved", decisionAt: "2026-10-12T10:05:00Z", approvalNote: "Owner note" }], permissions: { role: "owner", canWrite: true, canDecide: true } }) });
  await flushEditor();
  assert.equal(f.button("Approve"), null, "an already-persisted approval cannot be decided twice");
  assert.equal(f.button("Reload saved decision"), null);
  assert.match(renderToStaticMarkup(f.render()), /Decision recorded · 2026-10-12T10:05:00Z/);
  assert.equal(f.requests.length, 3);
});
