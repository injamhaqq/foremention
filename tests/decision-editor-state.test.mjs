import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { decisionEditorFixture, editorRecord, editorResponse, flushEditor } from "./helpers/decision-editor-fixture.mjs";

test("unsaved draft edits cannot submit an older persisted decision", async () => {
  const f = decisionEditorFixture(); f.field("Title").props.onChange({ target: { value: "Changed draft title" } });
  assert.equal(f.button("Submit for review").props.disabled, true);
  f.button("Submit for review").props.onClick(); await flushEditor(); assert.equal(f.requests.length, 0);
});
test("saving verification intent preserves the existing remeasurement contract", () => {
  const f = decisionEditorFixture(); f.field("Verification intent").props.onChange({ target: { value: "Inspect a comparable later result" } });
  f.form().props.onSubmit({ preventDefault() {} });
  assert.deepEqual(f.requests[0].body.verificationPlan, { ...editorRecord.verificationPlan, intent: "Inspect a comparable later result" });
});
test("clearing intent preserves other verification context without inventing a new intent", () => {
  const f = decisionEditorFixture(); f.field("Verification intent").props.onChange({ target: { value: "" } });
  f.form().props.onSubmit({ preventDefault() {} });
  const expected = { ...editorRecord.verificationPlan }; delete expected.intent;
  assert.deepEqual(f.requests[0].body.verificationPlan, expected);
});
test("a synchronous duplicate save sends one write and adopts only confirmed saved state", async () => {
  const f = decisionEditorFixture(); f.field("Title").props.onChange({ target: { value: "Saved title" } });
  const form = f.form(); form.props.onSubmit({ preventDefault() {} }); form.props.onSubmit({ preventDefault() {} });
  assert.equal(f.requests.length, 1); assert.equal(f.field("Title").props.disabled, true);
  f.requests[0].resolve(editorResponse({ ...editorRecord, title: "Saved title" })); await flushEditor();
  assert.equal(f.field("Title").props.value, "Saved title"); assert.equal(f.requests.length, 1);
  assert.equal(f.button("Submit for review").props.disabled, false);
});
test("uncertain save blocks another write until the persisted decision can be read", async () => {
  const f = decisionEditorFixture(); f.field("Title").props.onChange({ target: { value: "Uncertain title" } });
  f.form().props.onSubmit({ preventDefault() {} }); f.requests[0].resolve(editorResponse(null)); await flushEditor();
  assert.doesNotMatch(renderToStaticMarkup(f.render()), /Decision updated\./);
  assert.equal(f.button("Submit for review").props.disabled, true);
  f.form().props.onSubmit({ preventDefault() {} }); assert.equal(f.requests.length, 1);
  f.button("Reload saved decision").props.onClick(); f.requests[1].resolve(editorResponse(null, 503)); await flushEditor();
  assert.equal(f.field("Title").props.value, "Uncertain title");
  assert.doesNotMatch(renderToStaticMarkup(f.render()), /Decision updated\./);
  f.button("Reload saved decision").props.onClick(); f.requests[2].resolve(editorResponse([{ ...editorRecord, title: "Actually saved" }])); await flushEditor();
  assert.equal(f.field("Title").props.value, "Actually saved"); assert.equal(f.button("Submit for review").props.disabled, false);
});
test("viewer/demo controls are read-only and analyst review cannot perform a manager decision", () => {
  for (const options of [{ role: "viewer" }, { demo: true }]) {
    const f = decisionEditorFixture(options); assert.equal(f.field("Title").props.disabled, true);
    f.form().props.onSubmit({ preventDefault() {} }); assert.equal(f.requests.length, 0);
    assert.equal(f.button("Submit for review"), null);
  }
  assert.equal(decisionEditorFixture({ record: { ...editorRecord, status: "in_review" } }).button("Approve"), null);
  assert.ok(decisionEditorFixture({ role: "owner", record: { ...editorRecord, status: "in_review" } }).button("Approve"));
});
