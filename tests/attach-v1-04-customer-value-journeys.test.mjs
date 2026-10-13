// Chat04 (attach-v1/04) behavioural journeys over the pure customer value loop
// contract. These are LOCAL FIXTURE journeys: an in-memory, tenant-scoped
// store stands in for Supabase. They prove the contract's state transitions,
// idempotent recovery and exclusion reasons — NOT production RLS, a real
// provider run, or a real elapsed customer cycle (origin: "fixture").
import assert from "node:assert/strict";
import test from "node:test";

const loop = await import("../lib/customer-value-loop.ts");
const { validateApprovedBuyerQuestions } = await import("../lib/approved-buyer-questions.ts");
const setup = await import("../lib/workspace-setup-state.ts");

const context = (overrides = {}) => ({
  locale: "en-US", market: "US", buyerStage: "evaluation", promptVersion: "p1", parserVersion: "x1",
  retrievalVersion: "r1", policyVersion: "c1", schemaVersion: "s1", evaluationVersion: "e1", ...overrides,
});

/** Minimal tenant-scoped fixture store with idempotent writes and injectable ACK loss. */
function createStore() {
  const rows = { runs: [], decisions: [] };
  let seq = 0;
  const id = (prefix) => `${prefix}-${++seq}`;
  const scope = (viewer) => (row) => row.organizationId === viewer.organizationId && row.projectId === viewer.projectId;
  return {
    rows,
    startRun(viewer, { key, questionSetVersion, createdAt }) {
      const existing = rows.runs.find((run) => run.key === key && scope(viewer)(run));
      if (existing) return existing; // retry with the same key never duplicates the provider call
      const run = { id: id("run"), key, organizationId: viewer.organizationId, projectId: viewer.projectId, status: "queued", createdAt, methodologyVersion: "m-2026-10", questionSetVersion, answers: [], origin: "fixture" };
      rows.runs.push(run);
      return run;
    },
    finishRun(viewer, runId, { status, answers }) {
      const run = rows.runs.find((row) => row.id === runId && scope(viewer)(row));
      if (!run) throw new Error("not found in scope");
      run.status = status;
      run.answers = answers;
      return run;
    },
    saveDecision(viewer, decision, { dropAck = false } = {}) {
      const existing = rows.decisions.find((row) => row.saveKey === decision.saveKey && scope(viewer)(row));
      if (!existing) rows.decisions.push({ ...decision, id: id("dec"), organizationId: viewer.organizationId, projectId: viewer.projectId });
      if (dropAck) throw new Error("network: acknowledgement lost");
      return rows.decisions.find((row) => row.saveKey === decision.saveKey && scope(viewer)(row));
    },
    snapshot(viewer, extra) {
      return {
        organizationId: viewer.organizationId,
        projectId: viewer.projectId,
        runs: rows.runs.filter(scope(viewer)).map((run) => ({ ...run })),
        decisions: rows.decisions.filter(scope(viewer)).map((row) => ({ ...row })),
        ...extra,
      };
    },
  };
}

const answers = (questions, { model = "model-a", sampling = "t=0;n=1", ctx = context(), review = "verified" } = {}) =>
  questions.map((question, index) => ({
    promptKey: `q${index + 1}`, promptText: question, provider: "provider-x", model, sampling,
    method: "provider_api", measurementContext: ctx, reviewStatus: review,
  }));

test("A28: approved question validation covers 0/1/5/custom/duplicate/>5 without silent fill", () => {
  assert.equal(validateApprovedBuyerQuestions([]).questions, null);
  assert.deepEqual(validateApprovedBuyerQuestions(["Best HRIS for 50 people?"]).questions, ["Best HRIS for 50 people?"]);
  const five = ["a1", "b2", "c3", "d4", "e5"].map((q) => `Which tool ${q}?`);
  assert.deepEqual(validateApprovedBuyerQuestions(five).questions, five);
  assert.equal(validateApprovedBuyerQuestions([...five, "sixth?"]).questions, null);
  assert.equal(validateApprovedBuyerQuestions(["Same?", " same? "]).questions, null);
  assert.equal(validateApprovedBuyerQuestions(["ok question", "   "]).questions, null);
  // Custom wording is persisted exactly as normalized, never replaced by a suggestion.
  assert.deepEqual(validateApprovedBuyerQuestions(["  Ｍy  custom wording?  "]).questions, ["My  custom wording?"]);
  assert.equal(validateApprovedBuyerQuestions(["x".repeat(1001)]).questions, null);
});

test("A26: setup-required state keeps account help reachable and never fakes membership", () => {
  const state = setup.resolveWorkspaceSetupState({ demo: false, hasWorkspace: false, email: "new@example.com" });
  assert.equal(state.kind, "setup_required");
  assert.match(state.accountHelpHref, /^mailto:hello@foremention\.com\?/);
  assert.equal(state.setupHref, "/app/onboarding");
  assert.equal(setup.resolveWorkspaceSetupState({ demo: false, hasWorkspace: true }).kind, "ready");
  assert.equal(setup.resolveWorkspaceSetupState({ demo: true, hasWorkspace: false }).kind, "demo");
  assert.equal(setup.isWorkspaceSetupRequiredPayload({ code: "workspace_setup_required" }), true);
  assert.equal(setup.isWorkspaceSetupRequiredPayload({ error: "Workspace not found." }), false);
  assert.equal(setup.isWorkspaceSetupRequiredPayload(null), false);
  // Loop contract agrees: no workspace => setup_required, not an empty history.
  const s = loop.computeCustomerValueLoop({ organizationId: null, projectId: null, brand: null, competitors: [], approvedQuestions: null, collectionRequested: false, runs: [], decisions: [] });
  assert.equal(s.stage, "setup_required");
});

test("CV-05 journey 1 (tenant A): setup -> approved questions -> Change Specification -> owner/date -> comparable later cycle", () => {
  const store = createStore();
  const viewer = { organizationId: "org-a", projectId: "proj-a" };
  const approved = validateApprovedBuyerQuestions(["Best payroll for remote teams?", "Gusto vs Deel?"]);
  const base = { brand: "Acme Payroll", competitors: ["Gusto", "Deel"], approvedQuestions: { version: 1, questions: approved.questions, approvedAt: "2026-10-01T00:00:00Z" } };

  // Setup-only is a valid, zero-provider-call state.
  let state = loop.computeCustomerValueLoop(store.snapshot(viewer, { ...base, collectionRequested: false }));
  assert.equal(state.stage, "setup_only");

  const r1 = store.startRun(viewer, { key: "c1", questionSetVersion: 1, createdAt: "2026-10-02T00:00:00Z" });
  assert.equal(loop.computeCustomerValueLoop(store.snapshot(viewer, { ...base, collectionRequested: true })).stage, "collecting");
  store.finishRun(viewer, r1.id, { status: "review", answers: answers(approved.questions, { review: "unreviewed" }) });
  assert.equal(loop.computeCustomerValueLoop(store.snapshot(viewer, { ...base, collectionRequested: true })).stage, "review_required");
  store.finishRun(viewer, r1.id, { status: "complete", answers: answers(approved.questions) });
  state = loop.computeCustomerValueLoop(store.snapshot(viewer, { ...base, collectionRequested: true }));
  assert.equal(state.stage, "decision_required");
  assert.equal(state.baselineRunId, r1.id);

  // Saved but incomplete decision: owner/action/date still required.
  const decision = {
    baselineRunId: r1.id, kind: "change_specification", decisionState: "DO_NOW",
    rationale: "Comparison page lacks a pricing table cited by the reviewed answer.", decidedBy: "user-a1", decidedAt: "2026-10-03T00:00:00Z",
    approvedBy: null, approvedAt: null, ownerId: null, ownerRole: null, actionSummary: null, dueDate: null, saveKey: "save-a-1",
  };
  store.saveDecision(viewer, decision);
  state = loop.computeCustomerValueLoop(store.snapshot(viewer, { ...base, collectionRequested: true }));
  assert.equal(state.stage, "action_required");
  assert.deepEqual(state.blockers.sort(), ["action", "approval", "dueDate", "owner"]);

  Object.assign(store.rows.decisions[0], { approvedBy: "owner-a", approvedAt: "2026-10-03T01:00:00Z", ownerRole: "Content lead", actionSummary: "Publish pricing comparison table", dueDate: "2026-10-10" });
  state = loop.computeCustomerValueLoop(store.snapshot(viewer, { ...base, collectionRequested: true }));
  assert.equal(state.stage, "awaiting_later_cycle");

  const r2 = store.startRun(viewer, { key: "c2", questionSetVersion: 1, createdAt: "2026-10-12T00:00:00Z" });
  store.finishRun(viewer, r2.id, { status: "complete", answers: answers(approved.questions) });
  state = loop.computeCustomerValueLoop(store.snapshot(viewer, { ...base, collectionRequested: true }));
  assert.equal(state.stage, "comparable_later_cycle");
  assert.equal(state.laterCycle.status, "comparable");
  assert.equal(state.laterCycle.baselineRunId, r1.id);
  assert.equal(state.causation, "not_proven");
  // Fixture clock: does not close the real customer-proof gate.
  assert.equal(state.closesCustomerProof, false);
});

test("CV-05 journey 2 (tenant B): reviewer disagreement/no-action persists; changed model is explained as not comparable; tenant A invisible", () => {
  const store = createStore();
  const a = { organizationId: "org-a", projectId: "proj-a" };
  const b = { organizationId: "org-b", projectId: "proj-b" };
  const qs = ["Best LMS for compliance training?"];
  const base = { brand: "Beta Learn", competitors: ["Docebo"], approvedQuestions: { version: 1, questions: qs, approvedAt: "2026-10-01T00:00:00Z" }, collectionRequested: true };

  const aRun = store.startRun(a, { key: "a1", questionSetVersion: 1, createdAt: "2026-10-02T00:00:00Z" });
  store.finishRun(a, aRun.id, { status: "complete", answers: answers(["tenant A question"]) });

  const b1 = store.startRun(b, { key: "b1", questionSetVersion: 1, createdAt: "2026-10-02T00:00:00Z" });
  store.finishRun(b, b1.id, { status: "partial", answers: [...answers(qs), { ...answers(["second slot"])[0], promptKey: "q9", provider: "provider-y", reviewStatus: "rejected" }] });
  assert.throws(() => store.finishRun(b, aRun.id, { status: "failed", answers: [] }), /not found in scope/);

  store.saveDecision(b, {
    baselineRunId: b1.id, kind: "reviewer_disagreement", decisionState: "MONITOR_ONLY",
    rationale: "Reviewer disputes that the cited source is relevant; no company change.", decidedBy: "user-b1", decidedAt: "2026-10-03T00:00:00Z",
    approvedBy: null, approvedAt: null, ownerId: null, ownerRole: null, actionSummary: null, dueDate: null, saveKey: "save-b-1",
  });
  let state = loop.computeCustomerValueLoop(store.snapshot(b, base));
  assert.equal(state.stage, "awaiting_later_cycle", "explicit no-action/disagreement is a complete decision without a fabricated owner");
  assert.ok(store.snapshot(b, base).runs.every((run) => run.organizationId === "org-b"));

  const b2 = store.startRun(b, { key: "b2", questionSetVersion: 1, createdAt: "2026-10-12T00:00:00Z" });
  store.finishRun(b, b2.id, { status: "complete", answers: answers(qs, { model: "model-b" }) });
  state = loop.computeCustomerValueLoop(store.snapshot(b, base));
  assert.equal(state.stage, "later_cycle_not_comparable");
  assert.ok(state.blockers.some((reason) => /provider\/model\/measurement context matrix changed/.test(reason)));
  assert.ok(state.laterCycle.exclusions.some((row) => /q9\/provider-y excluded \(rejected\)/.test(row)));
  assert.equal(state.causation, "not_proven");
});

test("later-cycle eligibility explains each mismatch: question-set version, locale, sampling, methodology, order", () => {
  const run = (id, over = {}) => ({ id, organizationId: "o", projectId: "p", status: "complete", createdAt: id === "r1" ? "2026-10-01T00:00:00Z" : "2026-10-08T00:00:00Z", methodologyVersion: "m1", questionSetVersion: 1, answers: answers(["Q?"]), origin: "customer_cycle", ...over });
  assert.equal(loop.assessLaterCycle(run("r1"), run("r2")).status, "comparable");
  assert.equal(loop.assessLaterCycle(run("r1"), run("r2")).evidence, "customer_cycle");
  const reasons = (later, baseline = run("r1")) => loop.assessLaterCycle(baseline, later).reasons.join(" | ");
  assert.match(reasons(run("r2", { questionSetVersion: 2 })), /question set version/);
  assert.match(reasons(run("r2", { answers: answers(["Q?"], { ctx: context({ locale: "en-GB" }) }) })), /matrix changed/);
  assert.match(reasons(run("r2", { answers: answers(["Q?"], { sampling: "t=0.7;n=3" }) })), /Sampling settings or observation method changed/);
  assert.match(reasons(run("r2", { answers: answers(["Q?"], { sampling: null }) })), /Sampling or observation-method provenance is unavailable/);
  assert.match(reasons(run("r2", { methodologyVersion: "m2" })), /Methodology version/);
  assert.match(reasons(run("r2", { createdAt: "2026-09-01T00:00:00Z" })), /newer than the reviewed baseline/);
  assert.match(reasons(run("r2", { status: "review" })), /completed human review/);
  assert.match(reasons(run("r2", { projectId: "other" })), /same organization and project/);
  assert.match(reasons(run("r2", { answers: answers(["Q?"], { ctx: null }) })), /measurement context is unavailable/);
});

test("recoverable failure: interrupted collection and a lost decision ACK recover without duplicate runs or decisions", () => {
  const store = createStore();
  const v = { organizationId: "org-c", projectId: "proj-c" };
  const qs = ["Top SOC 2 automation tools?"];
  const base = { brand: "Gamma", competitors: [], approvedQuestions: { version: 1, questions: qs, approvedAt: "2026-10-01T00:00:00Z" }, collectionRequested: true };

  const r1 = store.startRun(v, { key: "first", questionSetVersion: 1, createdAt: "2026-10-02T00:00:00Z" });
  store.finishRun(v, r1.id, { status: "interrupted", answers: [] });
  let state = loop.computeCustomerValueLoop(store.snapshot(v, base));
  assert.equal(state.stage, "collection_interrupted");
  assert.match(state.nextAction, /separate explicit choice/);

  // A browser retry with the same key returns the same durable run (no second provider call).
  assert.equal(store.startRun(v, { key: "first", questionSetVersion: 1, createdAt: "2026-10-02T00:05:00Z" }).id, r1.id);
  assert.equal(store.rows.runs.length, 1);
  // Explicit user retry is a new keyed run; it then completes.
  const r2 = store.startRun(v, { key: "retry-1", questionSetVersion: 1, createdAt: "2026-10-02T01:00:00Z" });
  store.finishRun(v, r2.id, { status: "complete", answers: answers(qs) });
  state = loop.computeCustomerValueLoop(store.snapshot(v, base));
  assert.equal(state.stage, "decision_required");
  assert.equal(state.baselineRunId, r2.id);

  const decision = {
    baselineRunId: r2.id, kind: "no_action", decisionState: "DO_NOT_DO", rationale: "Evidence insufficient for a company change.",
    decidedBy: "user-c1", decidedAt: "2026-10-03T00:00:00Z", approvedBy: null, approvedAt: null, ownerId: null, ownerRole: null,
    actionSummary: null, dueDate: null, saveKey: "save-c-1",
  };
  assert.throws(() => store.saveDecision(v, decision, { dropAck: true }), /acknowledgement lost/);
  // Reload: the client reconciles by save key instead of guessing or re-posting blindly.
  const reconciled = loop.reconcileDecisionSave({ saveKey: "save-c-1", baselineRunId: r2.id }, store.snapshot(v, base).decisions);
  assert.equal(reconciled.outcome, "saved");
  store.saveDecision(v, decision); // idempotent retry
  assert.equal(store.rows.decisions.length, 1);
  assert.equal(loop.computeCustomerValueLoop(store.snapshot(v, base)).stage, "awaiting_later_cycle");
  assert.equal(loop.reconcileDecisionSave({ saveKey: "never-sent", baselineRunId: r2.id }, store.rows.decisions).outcome, "not_saved_retry_same_key");
  assert.equal(loop.reconcileDecisionSave({ saveKey: "save-c-1", baselineRunId: "other" }, store.rows.decisions).outcome, "conflict");
});

test("loop never treats missing questions as approved and never reports causation", () => {
  const s = loop.computeCustomerValueLoop({ organizationId: "o", projectId: "p", brand: "B", competitors: [], approvedQuestions: { version: 1, questions: [], approvedAt: "2026-10-01T00:00:00Z" }, collectionRequested: true, runs: [], decisions: [] });
  assert.equal(s.stage, "questions_required");
  assert.deepEqual(s.blockers, ["approved buyer questions"]);
  for (const stage of loop.LOOP_STAGES) assert.equal(typeof stage, "string");
  assert.equal(s.causation, "not_proven");
});

test("A28: question create/edit rejects over-length wording instead of truncating; edit stays org+project scoped before the RPC", async () => {
  const { exceedsBuyerQuestionLength, MAX_BUYER_QUESTION_LENGTH } = await import("../lib/approved-buyer-questions.ts");
  assert.equal(MAX_BUYER_QUESTION_LENGTH, 1000);
  assert.equal(exceedsBuyerQuestionLength("x".repeat(1000)), false);
  assert.equal(exceedsBuyerQuestionLength(` ${"x".repeat(1000)} `), false);
  assert.equal(exceedsBuyerQuestionLength("x".repeat(1001)), true);
  assert.equal(exceedsBuyerQuestionLength(null), false);
  const { readFile } = await import("node:fs/promises");
  const route = await readFile(new URL("../app/api/prompts/route.ts", import.meta.url), "utf8");
  assert.equal((route.match(/exceedsBuyerQuestionLength\(body\.text\)/g) || []).length, 2);
  const scopedRead = route.indexOf("&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&limit=1");
  const rpc = route.indexOf("updatePromptInProject(");
  assert.ok(scopedRead > 0 && rpc > scopedRead, "project-scoped prompt read precedes the project-bound RPC call (A11)");
});
