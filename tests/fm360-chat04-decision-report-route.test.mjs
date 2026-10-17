import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const route = () => readFile(new URL("../app/api/records/[id]/decision-report/route.ts", import.meta.url), "utf8");

test("private report downloads require sign-in, reviewer role and the active project", async () => {
  const s = await route();
  for (const required of [
    "getViewer()", "getPrimaryWorkspaceRole(viewer)", "loadWorkspaceContext(viewer)",
    "viewer.mode === \"demo\"", "context.organizationId", "context.projectId",
    "recordDecision", "baseline_run_id=eq.", "project_id=eq.",
    "private, no-store", "x-content-type-options", "text/markdown",
  ]) assert.ok(s.includes(required), required);
  assert.ok(!s.includes("serviceRole: true"), "never elevate an export to the service role");
  assert.ok(!s.includes("getServiceRole"), "never elevate an export to the service role");
});

test("source observations are linked to reviewed Record answers and pre-decision source snapshots", async () => {
  const s = await route();
  for (const required of [
    "source_snapshot_observations?", "source_snapshots?", "source_observations?",
    "answerIds.has(observation.run_answer_id", "x.run_id === id",
    "Date.parse(x.retrieved_at) <= Date.parse(recordDecision.decided_at)",
    "sourceEdges", "evidenceLinks",
  ]) assert.ok(s.includes(required), required);
});

test("approved reports revalidate currently accessible evidence and never drop blocked support silently", async () => {
  const s = await route();
  for (const required of [
    "currentEvidenceItems", "usableEvidenceItemIds", "verification_status", "expires_at",
    "usage_rights", "source_url", "project_id=eq.", "evidenceIds: isApproved ? evidence.map",
  ]) assert.ok(s.includes(required), required);
});

test("later comparisons reuse both existing exact protocol and scoped context checks", async () => {
  const s = await route();
  for (const required of [
    "assessLaterCycle(", "assessWorkspaceRunPairComparability(",
    "canonical.comparable", "domain.status === \"comparable\"",
    "typeof x.brandPresent === \"boolean\"", "brandPresent",
    "complete ? [] : [...reasons",
  ]) assert.ok(s.includes(required), required);
  assert.ok(!s.includes("customerReportedOutcome: \""), "customer outcomes must not be invented");
});
