import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { reviewedRecordReadyForCustomerSuccess } from "../lib/agent-os/customer-success-record-gate.ts";

const goodRecord = () => ({
  run: { id: "run-a", status: "complete" },
  answers: [{ id: "answer-a" }, { id: "answer-b" }],
  verifiedAnswers: 2,
  completePersistedAnswerSet: true,
  completeObservationCoverage: true,
});

test("only a fully persisted and explicitly reviewed terminal collection can activate Customer Success", () => {
  assert.equal(reviewedRecordReadyForCustomerSuccess(goodRecord()), true);
  assert.equal(reviewedRecordReadyForCustomerSuccess({ ...goodRecord(), run: { id: "run-a", status: "partial" } }), true);
});

test("unreviewed, missing, cancelled and failed events never become customer actions", () => {
  assert.equal(reviewedRecordReadyForCustomerSuccess(null), false);
  for (const status of ["queued", "running", "review", "failed", "cancelled"]) {
    assert.equal(reviewedRecordReadyForCustomerSuccess({ ...goodRecord(), run: { id: "run-a", status } }), false, status);
  }
});

test("truncated, missing, unverified or ambiguous record coverage fails closed", () => {
  assert.equal(reviewedRecordReadyForCustomerSuccess({ ...goodRecord(), completePersistedAnswerSet: false }), false);
  assert.equal(reviewedRecordReadyForCustomerSuccess({ ...goodRecord(), completeObservationCoverage: false }), false);
  assert.equal(reviewedRecordReadyForCustomerSuccess({ ...goodRecord(), verifiedAnswers: 1 }), false);
  assert.equal(reviewedRecordReadyForCustomerSuccess({ ...goodRecord(), answers: [] }), false);
});

test("the Customer Success agent revalidates scoped persisted evidence before writing or drafting", async () => {
  const src = await readFile(new URL("../lib/agent-os/customer-success.ts", import.meta.url), "utf8");
  assert.match(src, /loadRecordIntegrity\(\{/);
  assert.match(src, /projectId: input.projectId/);
  assert.match(src, /organizationId: input.organizationId/);
  assert.match(src, /reviewedRecordReadyForCustomerSuccess\(record\)/);
  assert.ok(src.indexOf("reviewedRecordReadyForCustomerSuccess(record)") < src.indexOf("proposeAgentAction({"));
  assert.ok(src.indexOf("reviewedRecordReadyForCustomerSuccess(record)") < src.indexOf("runCustomerSuccessDraftReasoner({"));
  const jobs = await readFile(new URL("../lib/jobs/agent-os.ts", import.meta.url), "utf8");
  assert.match(jobs, /customerSuccessActionId: customerSuccess.skipped \? null/);
  assert.match(jobs, /customerSuccessDraftActionId: customerSuccess.skipped \? null/);
});
