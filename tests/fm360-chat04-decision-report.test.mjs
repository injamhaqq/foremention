import assert from "node:assert/strict";
import test from "node:test";
import { buildPortableDecisionReviewMarkdown as render } from "../lib/decision-review-report.ts";

const base = {
  origin: "synthetic_fixture", generatedAt: "2026-10-16T11:00:00Z",
  organizationId: "org-A", projectId: "project-A", brand: "Synthetic Cloud",
  questions: ["Where are sources from?", "Which brand is recommended?"],
  baseline: { id: "baseline-A", organizationId: "org-A", projectId: "project-A",
    collectedAt: "2026-10-01T00:00:00Z", provider: "mock API", model: "fixture-v1",
    method: "synthetic", reviewedAnswers: 2, totalAnswers: 2 },
  evidence: [
    { id: "source-A", runId: "baseline-A", reviewStatus: "verified", accessStatus: "open", origin: "independent_retrieval" },
    { id: "blocked", runId: "baseline-A", reviewStatus: "unreviewed", accessStatus: "blocked", origin: "model_written_link" },
  ],
  decision: { id: "decision-A", organizationId: "org-A", projectId: "project-A", baselineRunId: "baseline-A",
    evidenceIds: ["source-A"], kind: "change_specification", disposition: "approved", decisionState: "DO_NOW",
    decidedAt: "2026-10-02T00:00:00Z", reviewerRole: "PMM", rationale: "Synthetic basis only",
    changeSpecificationId: "change-A", ownerRole: "PMM", action: "Test proof copy",
    dueDate: "2026-10-23", successCriteria: "Buyer comprehends proof",
    reversalCriteria: "Evidence contradicts claim" },
  followUp: { id: "later-A", organizationId: "org-A", projectId: "project-A",
    collectedAt: "2026-10-08T00:00:00Z", provider: "mock API", model: "fixture-v1",
    method: "synthetic", reviewedAnswers: 2, totalAnswers: 2,
    comparison: { eligible: true, reasons: [] },
    observation: { label: "Recommended", baselineCount: 0, laterCount: 1, baselineTotal: 2, laterTotal: 2 },
    customerReportedOutcome: null },
};
const expectReject = (snapshot, pattern) => assert.throws(() => render(snapshot), pattern);

test("renders a labelled synthetic buyer packet with scoped dates, model, denominators, decision and noncausal outcome", () => {
  const md = render(base);
  for (const s of ["SYNTHETIC FIXTURE", "2026-10-01T00:00:00.000Z", "2/2", "PMM",
    "Reversal criteria", "0/2 → 1/2", "not necessarily a native provider citation",
    "Not external activation", "Customer-reported outcome"]) assert.ok(md.includes(s), s);
  assert.ok(!md.includes("org-A")); assert.ok(!md.includes("project-A"));
});

test("does not export unverified, blocked, unknown or model-written links as reviewed support", () => {
  for (const ev of [
    { ...base.evidence[0], accessStatus: "blocked" },
    { ...base.evidence[0], accessStatus: "unknown" },
    { ...base.evidence[0], reviewStatus: "unreviewed" },
    { ...base.evidence[0], origin: "model_written_link" },
  ]) expectReject({ ...base, evidence: [ev] }, /unsupported\/broken/);
  expectReject({ ...base, decision: { ...base.decision, evidenceIds: ["missing"] } }, /unsupported\/broken/);
});

test("cross-project, old-cycle and out-of-order review fail closed", () => {
  expectReject({ ...base, decision: { ...base.decision, projectId: "B" } }, /cross-project/);
  expectReject({ ...base, evidence: [{ ...base.evidence[0], runId: "other-run" }] }, /unrelated Record/);
  expectReject({ ...base, followUp: { ...base.followUp, collectedAt: "2026-09-01T00:00:00Z" } }, /chronology/);
  expectReject({ ...base, decision: { ...base.decision, decidedAt: "2026-09-01T00:00:00Z" } }, /predates/);
});

test("comparison withholding suppresses even caller-supplied favourable movement", () => {
  const md = render({ ...base, followUp: { ...base.followUp,
    comparison: { eligible: false, reasons: ["Model changed"] } } });
  assert.ok(md.includes("WITHHELD")); assert.ok(md.includes("Model changed"));
  assert.ok(!md.includes("0/2 → 1/2"));
  expectReject({ ...base, followUp: { ...base.followUp,
    observation: { ...base.followUp.observation, laterTotal: 20 } } }, /denominators/);
});

test("neutral non-action and disagreement dispositions are legitimate without made-up owners", () => {
  for (const kind of ["no_action", "reviewer_disagreement"]) {
    const md = render({ ...base, followUp: null, evidence: [],
      decision: { ...base.decision, kind,
        disposition: kind === "no_action" ? "no_change" : "disagreement",
        decisionState: kind === "no_action" ? "DO_NOT_DO" : "INSUFFICIENT_EVIDENCE",
        changeSpecificationId: null, evidenceIds: [], ownerRole: null,
        action: null, dueDate: null, successCriteria: null, reversalCriteria: null } });
    assert.ok(md.includes("No later reviewed cycle"));
    assert.ok(md.includes("not assigned"));
  }
});

test("approval packet requires action only when canonical decision state is actionable", () => {
  const noAction = { ...base.decision, decisionState: "MONITOR_ONLY",
    ownerRole: null, action: null, dueDate: null, successCriteria: null, reversalCriteria: null };
  const md = render({ ...base, decision: noAction });
  assert.ok(md.includes("not recorded"));
  for (const missing of ["ownerRole", "action", "dueDate"]) {
    const actionable = { ...base.decision, decisionState: "DO_NOW", [missing]: null };
    expectReject({ ...base, decision: actionable }, /approved action incomplete/);
  }
  const approved = render({ ...base, decision: {
    ...base.decision, decisionState: "TEST_FIRST", reversalCriteria: null } });
  assert.ok(approved.includes("Reversal criteria"));
});

test("unknown or invalid decision state cannot bypass approval requirements", () => {
  expectReject({ ...base, decision: { ...base.decision, decisionState: undefined, ownerRole: null, action: null } }, /canonical decision state missing/);
  expectReject({ ...base, decision: { ...base.decision, kind: "no_action", disposition: "no_change", decisionState: "DO_NOW" } }, /no-action decision cannot be actionable/);
});

test("HTML/Markdown injection, addresses and API-looking secrets are escaped/redacted", () => {
  const md = render({ ...base, decision: { ...base.decision,
    rationale: "<script>evil()</script>\n# Fake verdict\nprivate@example.org sk-supersecretcredential123456789" } });
  assert.ok(!md.includes("<script>"));
  assert.ok(!md.includes("private@example.org"));
  assert.ok(!md.includes("sk-supersecretcredential123456789"));
  assert.ok(md.includes("&lt;script&gt;")); assert.ok(md.includes("email redacted"));
});
