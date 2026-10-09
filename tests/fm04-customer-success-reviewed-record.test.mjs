import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { reviewedRecordReadyForOperatingAgent } from "../lib/agent-os/reviewed-record-gate.ts";

const goodRecord = () => ({
  run: { id: "run-a", status: "complete" },
  answers: [{ id: "answer-a" }, { id: "answer-b" }],
  verifiedAnswers: 2,
  completePersistedAnswerSet: true,
  completeObservationCoverage: true,
});

test("only a fully persisted and explicitly reviewed terminal collection can activate Customer Success", () => {
  assert.equal(reviewedRecordReadyForOperatingAgent(goodRecord()), true);
  assert.equal(reviewedRecordReadyForOperatingAgent({ ...goodRecord(), run: { id: "run-a", status: "partial" } }), true);
});

test("unreviewed, missing, cancelled and failed events never become customer actions", () => {
  assert.equal(reviewedRecordReadyForOperatingAgent(null), false);
  for (const status of ["queued", "running", "review", "failed", "cancelled"]) {
    assert.equal(reviewedRecordReadyForOperatingAgent({ ...goodRecord(), run: { id: "run-a", status } }), false, status);
  }
});

test("truncated, missing, unverified or ambiguous record coverage fails closed", () => {
  assert.equal(reviewedRecordReadyForOperatingAgent({ ...goodRecord(), completePersistedAnswerSet: false }), false);
  assert.equal(reviewedRecordReadyForOperatingAgent({ ...goodRecord(), completeObservationCoverage: false }), false);
  assert.equal(reviewedRecordReadyForOperatingAgent({ ...goodRecord(), verifiedAnswers: 1 }), false);
  assert.equal(reviewedRecordReadyForOperatingAgent({ ...goodRecord(), answers: [] }), false);
});

test("the Customer Success agent revalidates scoped persisted evidence before writing or drafting", async () => {
  const src = await readFile(new URL("../lib/agent-os/customer-success.ts", import.meta.url), "utf8");
  assert.match(src, /loadRecordIntegrity\(\{/);
  assert.match(src, /projectId: input.projectId/);
  assert.match(src, /organizationId: input.organizationId/);
  assert.match(src, /reviewedRecordReadyForOperatingAgent\(record\)/);
  assert.ok(src.indexOf("reviewedRecordReadyForOperatingAgent(record)") < src.indexOf("proposeAgentAction({"));
  assert.ok(src.indexOf("reviewedRecordReadyForOperatingAgent(record)") < src.indexOf("runCustomerSuccessDraftReasoner({"));
  const jobs = await readFile(new URL("../lib/jobs/agent-os.ts", import.meta.url), "utf8");
  assert.match(jobs, /customerSuccessActionId: customerSuccess.skipped \? null/);
  assert.match(jobs, /customerSuccessDraftActionId: customerSuccess.skipped \? null/);
});

test("the Research agent independently validates full reviewed record integrity before writing evidence-ready actions", async () => {
  const src = await readFile(new URL("../lib/agent-os/research-insight.ts", import.meta.url), "utf8");
  assert.match(src, /loadRecordIntegrity\(\{/);
  assert.match(src, /organizationId: input.organizationId/);
  assert.match(src, /projectId: input.projectId/);
  assert.match(src, /reviewedRecordReadyForOperatingAgent\(record\)/);
  assert.match(src, /if \(!record \|\| !reviewedRecordReadyForOperatingAgent\(record\)\)/);
  assert.ok(src.indexOf("reviewedRecordReadyForOperatingAgent(record)") < src.indexOf("proposeAgentAction({"));
  assert.ok(src.indexOf("reviewedRecordReadyForOperatingAgent(record)") < src.indexOf("runResearchInsightReasoner({"));
});

test("Research reasoning packet is complete, bounded and refuses truncated inputs", async () => {
  const { assessResearchReasoningCoverage, MAX_RESEARCH_REASONING_ANSWERS, MAX_RESEARCH_REASONING_SOURCES } =
    await import("../lib/agent-os/research-reasoning-coverage.ts");
  assert.equal(assessResearchReasoningCoverage(5, 5, 2).ok, true);
  assert.equal(assessResearchReasoningCoverage(MAX_RESEARCH_REASONING_ANSWERS, MAX_RESEARCH_REASONING_ANSWERS, MAX_RESEARCH_REASONING_SOURCES).ok, true);
  assert.equal(assessResearchReasoningCoverage(0, 0, 0).ok, false);
  assert.equal(assessResearchReasoningCoverage(5, 4, 0).reason, "reasoning_verified_answer_set_incomplete");
  assert.equal(assessResearchReasoningCoverage(MAX_RESEARCH_REASONING_ANSWERS + 1, MAX_RESEARCH_REASONING_ANSWERS + 1, 0).reason, "reasoning_answer_budget_exceeded");
  assert.equal(assessResearchReasoningCoverage(5, 5, MAX_RESEARCH_REASONING_SOURCES + 1).reason, "reasoning_source_budget_exceeded");

  const reasoner = await readFile(new URL("../lib/agent-os/research-reasoning.ts", import.meta.url), "utf8");
  const researchAgent = await readFile(new URL("../lib/agent-os/research-insight.ts", import.meta.url), "utf8");
  assert.match(reasoner, /verifiedAnswerCount: number/);
  assert.match(reasoner, /limit=\$\{MAX_RESEARCH_REASONING_ANSWERS \+ 1\}/);
  assert.match(reasoner, /limit=\$\{MAX_RESEARCH_REASONING_SOURCES \+ 1\}/);
  assert.doesNotMatch(reasoner, /answers\.slice\(0, 24\)/);
  assert.match(reasoner, /answer_is_excerpt:/);
  assert.match(reasoner, /citation_list_truncated:/);
  assert.match(reasoner, /packet_limitations:/);
  assert.match(reasoner, /if \(!sourceCoverage\.ok\) return \{ skipped: true/);
  assert.match(researchAgent, /verifiedAnswerCount: record\.answers\.length/);
});
