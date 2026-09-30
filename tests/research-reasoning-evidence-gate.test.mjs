import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  MAX_RESEARCH_REASONING_ANSWERS,
  assessResearchReasoningAnswerSet,
} from "../lib/agent-os/research-evidence-gate.mjs";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

const baseRun = {
  id: "run-a",
  status: "complete",
  answer_count: 2,
};

const completeRows = [
  { id: "answer-1", run_id: "run-a", prompt_key: "q1", provider: "cloudflare" },
  { id: "answer-2", run_id: "run-a", prompt_key: "q2", provider: "cloudflare" },
];

test("research reasoning requires the complete independently recorded verified answer-row set", () => {
  assert.equal(MAX_RESEARCH_REASONING_ANSWERS, 24);
  assert.deepEqual(assessResearchReasoningAnswerSet(baseRun, completeRows), { ok: true, reason: null });

  assert.equal(
    assessResearchReasoningAnswerSet(baseRun, completeRows.slice(0, 1)).reason,
    "incomplete_verified_answer_set",
  );
  assert.equal(
    assessResearchReasoningAnswerSet(baseRun, [...completeRows, { id: "answer-3", run_id: "run-a", prompt_key: "q3", provider: "cloudflare" }]).reason,
    "incomplete_verified_answer_set",
  );
  assert.equal(
    assessResearchReasoningAnswerSet(baseRun, [completeRows[0], { ...completeRows[1], id: completeRows[0].id }]).reason,
    "duplicate_answer_ids",
  );
  assert.equal(
    assessResearchReasoningAnswerSet(baseRun, [completeRows[0], { ...completeRows[1], prompt_key: "Q1" }]).reason,
    "duplicate_question_provider_slots",
  );
  assert.equal(
    assessResearchReasoningAnswerSet(baseRun, [completeRows[0], { ...completeRows[1], run_id: "run-b" }]).reason,
    "cross_run_answer_leakage",
  );
  assert.equal(
    assessResearchReasoningAnswerSet({ ...baseRun, answer_count: 25 }, completeRows).reason,
    "recorded_answer_set_exceeds_reasoning_packet",
  );
  assert.equal(
    assessResearchReasoningAnswerSet({ ...baseRun, answer_count: 0 }, []).reason,
    "invalid_recorded_answer_count",
  );
  assert.equal(
    assessResearchReasoningAnswerSet({ ...baseRun, status: "review" }, completeRows).reason,
    "reviewed_terminal_run_not_found",
  );
});

test("research reasoner scopes the source run to project and reserves overflow sentinels before any model reasoning", async () => {
  const source = await text("lib/agent-os/research-reasoning.ts");
  const gate = await text("lib/agent-os/research-evidence-gate.mjs");
  assert.equal(gate.includes("MAX_RESEARCH_REASONING_ANSWERS = 24"), true);
  assert.equal(gate.includes("incomplete_verified_answer_set"), true);
  assert.equal(gate.includes("duplicate_question_provider_slots"), true);
  assert.equal(source.includes("runs?select=id,status,answer_count"), true);
  assert.equal(source.includes("project_id=eq.${encodeURIComponent(input.projectId)}"), true);
  assert.equal(source.includes("status=in.(complete,partial)&limit=1"), true);
  assert.equal(source.includes("run_answers?select=id,run_id,prompt_key,prompt_text,provider,model"), true);
  assert.equal(source.includes("review_status=eq.verified&order=collected_at.asc&limit=25"), true);
  assert.equal(source.includes("const answerGate = assessResearchReasoningAnswerSet(run, answers)"), true);
  assert.equal(source.includes("answers.slice(0, 24)"), false);
  assert.equal(source.includes("source_map_entries?select="), true);
  assert.equal(source.includes("order=rank.asc&limit=41"), true);
  assert.equal(source.includes("active=eq.true&order=name.asc&limit=31"), true);
  assert.equal(source.includes("reviewed_answer_packet_complete: true"), true);
  assert.equal(source.includes("source_map_packet_complete: sourceRows.length <= 40"), true);
  assert.equal(source.includes("competitor_packet_complete: competitorRows.length <= 30"), true);
  assert.equal(source.includes('promptVersion: "research-memo-v2"'), true);
  assert.equal(source.includes("reasoning:research-insight:${input.runId}:v2"), true);
  const gateAt = source.indexOf("const answerGate = assessResearchReasoningAnswerSet");
  const reasoningAt = source.indexOf("await runStructuredReasoning");
  assert.ok(gateAt > 0 && reasoningAt > gateAt, "complete-answer gate must run before model reasoning");
});

test("zero-cost reviewed-evidence action is also withheld on an incomplete verified set", async () => {
  const source = await text("lib/agent-os/research-insight.ts");
  assert.equal(source.includes("MAX_RESEARCH_REASONING_ANSWERS"), true);
  assert.equal(source.includes("assessResearchReasoningAnswerSet"), true);
  assert.equal(source.includes("run_answers?select=id,run_id,prompt_key,provider"), true);
  assert.equal(source.includes("review_status=eq.verified&order=collected_at.asc&limit=25"), true);
  assert.equal(source.includes("const evidenceGate = assessResearchReasoningAnswerSet(run, verifiedAnswerRows)"), true);
  assert.equal(source.includes("research-insight:reviewed-run:${run.id}:v2"), true);
  const gateAt = source.indexOf("const evidenceGate = assessResearchReasoningAnswerSet");
  const actionAt = source.indexOf("await proposeAgentAction");
  assert.ok(gateAt > 0 && actionAt > gateAt, "evidence completeness must be proven before any reviewed-evidence action is written");
});
