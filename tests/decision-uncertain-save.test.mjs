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
