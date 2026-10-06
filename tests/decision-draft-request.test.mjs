import test from "node:test";
import assert from "node:assert/strict";
import { buildDecisionDraftRequest } from "../lib/decision-draft-request.ts";
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const evidence = [{ id: id(2), kind: "source_observation", runId: id(3) }, { id: id(4), kind: "evidence_item" }];
test("decision handoff preserves selected canonical evidence and the baseline", () => {
  assert.deepEqual(buildDecisionDraftRequest(id(1), evidence, [id(2), id(4), id(2)], id(3)), { action: "create_from_opportunity", opportunityId: id(1), baselineRunId: id(3), sourceObservationIds: [id(2)], evidenceItemIds: [id(4)] });
  assert.equal(buildDecisionDraftRequest(id(1), evidence, [id(4)], "").baselineRunId, null);
});
test("decision handoff rejects unrecorded, unsupported, empty and malformed evidence", () => {
  for (const selected of [[], [id(99)]]) assert.throws(() => buildDecisionDraftRequest(id(1), evidence, selected, id(3)), /Select recorded evidence/);
  assert.throws(() => buildDecisionDraftRequest("problem-1", evidence, [id(2)], id(3)), /valid opportunity/);
  assert.throws(() => buildDecisionDraftRequest(id(1), [{id: id(2), kind: "predicted"}], [id(2)], ""), /Only persisted/);
});
test("source observations from different runs cannot silently borrow a baseline", () => {
  for (const run of ["", id(5)]) assert.throws(() => buildDecisionDraftRequest(id(1), evidence, [id(2)], run), /one baseline/);
  const mixed = [...evidence, { id: id(6), kind: "source_observation", runId: id(7) }];
  assert.throws(() => buildDecisionDraftRequest(id(1), mixed, [id(2),id(6)], id(3)), /one baseline/);
});
test("decision evidence limits fail visibly instead of dropping records", () => {
  for (const kind of ["source_observation", "evidence_item"]) {
    const rows = Array.from({length: 21}, (_, n) => ({ id: id(n + 10), kind, runId: id(3) }));
    assert.throws(() => buildDecisionDraftRequest(id(1), rows, rows.map((r) => r.id), id(3)), /No evidence will be silently omitted/);
  }
});
