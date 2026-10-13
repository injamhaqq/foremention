// Chat04 (attach-v1/04): A11 project-bound prompt edit caller + CV-05/A15
// decision persistence callers + A14 comparison-context mapping.
// RPCs are MOCKED here (no Supabase): these prove the caller contracts. The
// SQL itself is exercised on disposable PGlite by
// docs/execution/attach-v1/04-proposals/migrations/chat04-probe.mjs (see 04-status.md).
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const edit = await import("../lib/buyer-question-edit.ts");
const decisions = await import("../lib/record-decisions.ts");
const snapshot = await import("../lib/customer-value-loop-snapshot.ts");
const loop = await import("../lib/customer-value-loop.ts");

const ORG_A = "aaaaaaaa-0000-4000-8000-00000000000a";
const PROJECT_A1 = "a1a1a1a1-0000-4000-8000-0000000000a1";
const PROJECT_A2 = "a2a2a2a2-0000-4000-8000-0000000000a2";
const ORG_B = "bbbbbbbb-0000-4000-8000-00000000000b";
const PROMPT_IN_A2 = "9a200000-0000-4000-8000-0000000000a2";
const RUN = "7a000000-0000-4000-8000-00000000000a";
const RUN_2 = "7a000000-0000-4000-8000-00000000000b";
const USER = "11111111-0000-4000-8000-000000000001";
const KEY = "savekey-0123456789abcdef";
const dbError = (status, code) => Object.assign(new Error(`db ${status} ${code}`), { status, code });

/**
 * Mock PostgREST that behaves like the adopted migration 20261013100000:
 * the project-bound RPC only edits a prompt whose org AND project match.
 */
function promptRpcMock({ deployed = true, prompts }) {
  const calls = [];
  const call = async (path, body) => {
    calls.push({ path, body });
    if (path === edit.PROJECT_SCOPED_PROMPT_RPC) {
      if (!deployed) throw dbError(404, "PGRST202");
      const row = prompts.find((p) => p.id === body.p_prompt_id && p.organization_id === body.p_organization_id && p.project_id === body.p_project_id);
      if (!row) throw dbError(400, "P0001"); // 'Buyer question not found in this project'
      if (body.p_prompt_text !== null) row.prompt_text = body.p_prompt_text;
      row.version += 1;
      return { id: row.id, prompt_key: row.prompt_key, prompt_text: row.prompt_text, active: row.active, version: row.version };
    }
    if (path === edit.LEGACY_PROMPT_RPC) {
      assert.equal("p_project_id" in body, false, "legacy body must not carry a project it cannot enforce");
      const row = prompts.find((p) => p.id === body.p_prompt_id && p.organization_id === body.p_organization_id);
      if (!row) throw dbError(400, "P0001");
      row.version += 1;
      return { id: row.id, prompt_key: row.prompt_key, prompt_text: row.prompt_text, active: row.active, version: row.version };
    }
    throw new Error(`unexpected ${path}`);
  };
  return { call, calls };
}

const promptA2 = () => ({ id: PROMPT_IN_A2, organization_id: ORG_A, project_id: PROJECT_A2, prompt_key: "k-a2", prompt_text: "A2 buyer question", active: true, version: 1 });
const change = (text = "Edited buyer question text") => ({ promptId: PROMPT_IN_A2, text, active: null, changeReason: "Edited by workspace member" });

test("A11: edit calls update_prompt_versioned_in_project with the server-resolved org AND project", async () => {
  const prompts = [promptA2()];
  const { call, calls } = promptRpcMock({ prompts });
  const result = await edit.updatePromptInProject(call, { organizationId: ORG_A, projectId: PROJECT_A2 }, change());
  assert.equal(result.ok, true);
  assert.equal(result.rpc, "rpc/update_prompt_versioned_in_project");
  assert.deepEqual(calls.map((c) => c.path), ["rpc/update_prompt_versioned_in_project"]);
  assert.deepEqual(calls[0].body, {
    p_prompt_id: PROMPT_IN_A2, p_organization_id: ORG_A, p_project_id: PROJECT_A2,
    p_prompt_text: "Edited buyer question text", p_active: null, p_change_reason: "Edited by workspace member",
  });
  assert.equal(prompts[0].version, 2);
});

test("A11: cross-project denial — a sibling-project prompt cannot be edited from another active project, and the legacy RPC is NOT tried", async () => {
  const prompts = [promptA2()];
  const { call, calls } = promptRpcMock({ prompts });
  const result = await edit.updatePromptInProject(call, { organizationId: ORG_A, projectId: PROJECT_A1 }, change("Sibling project takeover attempt"));
  assert.deepEqual(result, { ok: false, status: 404, error: "Buyer question not found in the active project." });
  assert.deepEqual(calls.map((c) => c.path), ["rpc/update_prompt_versioned_in_project"], "denial must not fall back to the org-only RPC");
  assert.equal(prompts[0].prompt_text, "A2 buyer question");
  assert.equal(prompts[0].version, 1);
});

test("A11: cross-org denial and permission errors map without leaking existence; unknown errors propagate", async () => {
  const prompts = [promptA2()];
  const { call } = promptRpcMock({ prompts });
  const crossOrg = await edit.updatePromptInProject(call, { organizationId: ORG_B, projectId: PROJECT_A2 }, change());
  assert.equal(crossOrg.ok, false);
  assert.equal(crossOrg.status, 404);
  const denied = await edit.updatePromptInProject(async () => { throw dbError(403, "42501"); }, { organizationId: ORG_A, projectId: PROJECT_A2 }, change());
  assert.deepEqual(denied, { ok: false, status: 403, error: "Your workspace role cannot edit buyer questions in this project." });
  await assert.rejects(edit.updatePromptInProject(async () => { throw dbError(500, "XX000"); }, { organizationId: ORG_A, projectId: PROJECT_A2 }, change()), /db 500/);
  assert.equal(prompts[0].version, 1);
});

test("A11 compatibility bridge: only PGRST202 (function not deployed) falls back to the legacy RPC", async () => {
  assert.equal(edit.isMissingProjectScopedFunction(dbError(404, "PGRST202")), true);
  for (const other of [dbError(404, "PGRST205"), dbError(400, "P0001"), dbError(404, "PGRST116"), dbError(403, "42501"), new TypeError("fetch failed")]) {
    assert.equal(edit.isMissingProjectScopedFunction(other), false);
  }
  const prompts = [promptA2()];
  const { call, calls } = promptRpcMock({ deployed: false, prompts });
  const result = await edit.updatePromptInProject(call, { organizationId: ORG_A, projectId: PROJECT_A2 }, change());
  assert.equal(result.ok, true);
  assert.equal(result.rpc, "rpc/update_prompt_versioned");
  assert.deepEqual(calls.map((c) => c.path), ["rpc/update_prompt_versioned_in_project", "rpc/update_prompt_versioned"]);
});

test("A11 route wiring: PATCH keeps the scoped read first, passes context.projectId, and can only reach the two versioning RPCs", async () => {
  const route = await readFile(new URL("../app/api/prompts/route.ts", import.meta.url), "utf8");
  const patch = route.slice(route.indexOf("export async function PATCH"));
  const scopedRead = patch.indexOf("&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&limit=1");
  const rpcCall = patch.indexOf("updatePromptInProject(");
  assert.ok(scopedRead > 0 && rpcCall > scopedRead);
  assert.match(patch, /\{ organizationId: context\.organizationId, projectId: context\.projectId \}/);
  assert.doesNotMatch(patch, /body\.projectId|body\.project_id|body\.organizationId/);
  assert.match(patch, /path !== "rpc\/update_prompt_versioned_in_project" && path !== "rpc\/update_prompt_versioned"/);
  assert.doesNotMatch(patch, /supabaseRest<[^>]*>\("rpc\/update_prompt_versioned"/, "no direct org-only RPC call remains");
  const migration = await readFile(new URL("../docs/execution/attach-v1/04-status.md", import.meta.url), "utf8");
  assert.match(migration, /20261013100000/, "status records the dependency on the FM-00/Chat02 migration");
});

const validDecision = (overrides = {}) => ({ saveKey: KEY, kind: "no_action", decisionState: "DO_NOT_DO", rationale: "  Evidence   insufficient for a company change. ", ...overrides });

test("CV-05: decision validation — no fabricated owner for no-action/disagreement; approval needs owner+action+date", () => {
  const ok = decisions.validateSaveDecisionInput(RUN, validDecision());
  assert.equal(ok.ok, true);
  assert.equal(ok.value.rationale, "Evidence insufficient for a company change.");
  assert.equal(ok.value.ownerId, null);
  const cases = [
    [validDecision({ ownerRole: "Marketing lead" }), /never take an owner/],
    [validDecision({ kind: "reviewer_disagreement", decisionState: "MONITOR_ONLY", dueDate: "2026-11-01" }), /never take an owner/],
    [validDecision({ approve: true }), /never take an owner/],
    [validDecision({ decisionState: "DO_NOW" }), /no-action decision must be/],
    [validDecision({ saveKey: "short" }), /save key/],
    [validDecision({ kind: "maybe" }), /Choose a Change Specification/],
    [validDecision({ rationale: " " }), /rationale/],
    [validDecision({ kind: "change_specification", decisionState: "DO_NOW", approve: true, ownerRole: "Marketing lead" }), /action, due date/],
    [validDecision({ kind: "change_specification", decisionState: "DO_NOW", dueDate: "2026-02-30" }), /calendar date/],
    [validDecision({ kind: "change_specification", decisionState: "TEST_FIRST", ownerId: "not-a-uuid" }), /member ID/],
  ];
  for (const [body, pattern] of cases) {
    const result = decisions.validateSaveDecisionInput(RUN, body);
    assert.equal(result.ok, false, JSON.stringify(body));
    assert.match(result.error, pattern);
  }
  assert.equal(decisions.validateSaveDecisionInput("../other", validDecision()).ok, false, "Record id comes from a validated path");
  const approved = decisions.validateSaveDecisionInput(RUN, validDecision({ kind: "change_specification", decisionState: "DO_NOW", approve: true, ownerId: USER, actionSummary: "Publish verified pricing table", dueDate: "2026-11-01" }));
  assert.equal(approved.ok, true);
  const incomplete = decisions.validateSaveDecisionInput(RUN, validDecision({ kind: "change_specification", decisionState: "DO_NOW" }));
  assert.equal(incomplete.ok, true, "an unapproved decision may be saved first and completed later (action_required stage)");
});

test("CV-05: RPC body uses server scope; client-sent org/project in the body is ignored", () => {
  const parsed = decisions.validateSaveDecisionInput(RUN, { ...validDecision(), organizationId: ORG_B, projectId: PROJECT_A2 });
  assert.equal(parsed.ok, true);
  const body = decisions.saveDecisionRpcBody({ organizationId: ORG_A, projectId: PROJECT_A1 }, parsed.value);
  assert.equal(body.p_organization_id, ORG_A);
  assert.equal(body.p_project_id, PROJECT_A1);
  assert.equal(body.p_baseline_run_id, RUN);
  assert.equal(body.p_save_key, KEY);
  assert.equal(body.p_approve, false);
});

/** In-memory model of save_record_decision semantics (idempotent by save key, ACK loss injectable). */
function decisionDb() {
  const rows = [];
  let dropNextAck = false;
  let failReads = false;
  return {
    rows,
    dropAck() { dropNextAck = true; },
    breakReads() { failReads = true; },
    deps: {
      rpc: async (body) => {
        const existing = rows.find((r) => r.organization_id === body.p_organization_id && r.project_id === body.p_project_id && r.save_key === body.p_save_key);
        if (existing && (existing.baseline_run_id !== body.p_baseline_run_id || existing.decision_kind !== body.p_decision_kind)) throw dbError(409, "PT409");
        let out;
        if (existing) out = { id: existing.id, outcome: "existing" };
        else {
          const row = { id: `d-${rows.length + 1}`, organization_id: body.p_organization_id, project_id: body.p_project_id, baseline_run_id: body.p_baseline_run_id, save_key: body.p_save_key, decision_kind: body.p_decision_kind, decision_state: body.p_decision_state, rationale: body.p_rationale, change_specification_id: null, decided_by: USER, decided_at: "2026-10-13T10:00:00Z", approved_by: null, approved_at: null, owner_id: null, owner_role: null, action_summary: null, due_date: null };
          rows.push(row);
          out = { id: row.id, outcome: "created" };
        }
        if (dropNextAck) { dropNextAck = false; throw new TypeError("fetch failed: socket hang up"); }
        return out;
      },
      readBySaveKey: async (saveKey) => {
        if (failReads) throw new TypeError("fetch failed");
        return rows.filter((r) => r.save_key === saveKey);
      },
    },
  };
}

test("A15: lost ACK after commit reconciles by save key (no duplicate); replay returns the same decision", async () => {
  const db = decisionDb();
  const scope = { organizationId: ORG_A, projectId: PROJECT_A1 };
  const input = decisions.validateSaveDecisionInput(RUN, validDecision()).value;
  db.dropAck();
  const first = await decisions.saveRecordDecision(db.deps, scope, input);
  assert.deepEqual(first, { ok: true, id: "d-1", outcome: "reconciled" });
  const replay = await decisions.saveRecordDecision(db.deps, scope, input);
  assert.deepEqual(replay, { ok: true, id: "d-1", outcome: "existing" });
  assert.equal(db.rows.length, 1);
});

test("A15: unconfirmed save asks for a same-key retry; key reuse for another Record is a conflict; pending migration is explicit", async () => {
  const scope = { organizationId: ORG_A, projectId: PROJECT_A1 };
  const input = decisions.validateSaveDecisionInput(RUN, validDecision()).value;
  const neverCommitted = await decisions.saveRecordDecision({ rpc: async () => { throw dbError(504, undefined); }, readBySaveKey: async () => [] }, scope, input);
  assert.equal(neverCommitted.ok, false);
  assert.equal(neverCommitted.code, "decision_save_unconfirmed");
  const db = decisionDb();
  db.breakReads();
  db.dropAck();
  const unreadable = await decisions.saveRecordDecision(db.deps, scope, input);
  assert.equal(unreadable.code, "decision_save_unconfirmed");
  const conflictDb = decisionDb();
  await decisions.saveRecordDecision(conflictDb.deps, scope, input);
  const other = decisions.validateSaveDecisionInput(RUN_2, validDecision()).value;
  const conflict = await decisions.saveRecordDecision(conflictDb.deps, scope, other);
  assert.deepEqual([conflict.ok, conflict.status, conflict.code], [false, 409, "decision_conflict"]);
  assert.equal(conflictDb.rows.length, 1);
  // A lost ACK whose persisted row belongs to a different Record is reported as a conflict, not "saved".
  const reconcileConflict = await decisions.saveRecordDecision({
    rpc: async () => { throw new TypeError("network"); },
    readBySaveKey: async () => conflictDb.rows,
  }, scope, other);
  assert.equal(reconcileConflict.status, 409);
  for (const [error, code] of [[dbError(404, "PGRST202"), "decision_persistence_pending"], [dbError(404, "PGRST205"), "decision_persistence_pending"], [dbError(400, "42703"), "decision_persistence_pending"]]) {
    const pending = await decisions.saveRecordDecision({ rpc: async () => { throw error; }, readBySaveKey: async () => [] }, scope, input);
    assert.deepEqual([pending.ok, pending.status, pending.code], [false, 503, code]);
  }
  const forbidden = await decisions.saveRecordDecision({ rpc: async () => { throw dbError(403, "PT403"); }, readBySaveKey: async () => [] }, scope, input);
  assert.equal(forbidden.status, 403);
  const notInProject = await decisions.saveRecordDecision({ rpc: async () => { throw dbError(404, "PT404"); }, readBySaveKey: async () => [] }, scope, input);
  assert.equal(notInProject.status, 404);
});

const ctx = { locale: "en-US", market: "US", buyerStage: "evaluation", promptVersion: "p1", parserVersion: "x1", retrievalVersion: "r1", policyVersion: "c1", schemaVersion: "s1", evaluationVersion: "e1", provider: "ignored", modelVersion: "unreported" };
const runRow = (id, createdAt, overrides = {}) => ({ id, organization_id: ORG_A, project_id: PROJECT_A1, status: "complete", created_at: createdAt, methodology_version: "m-2026-10", question_set_version: 3, cycle_origin: "customer_cycle", ...overrides });
const answerRow = (runId, overrides = {}) => ({ run_id: runId, organization_id: ORG_A, prompt_key: "k1", prompt_text: "Which HR platform?", provider: "cloudflare", model: "m1", review_status: "verified", observation_method: "api_hosted_model_with_independent_retrieval", sampling_json: { temperature: 0.1, samples: 1 }, measurement_context_json: ctx, ...overrides });

function persistedSnapshot({ runs, answers, decisionRows = [] }) {
  return snapshot.buildLoopSnapshot({
    organizationId: ORG_A, projectId: PROJECT_A1, brand: "Northstar",
    activePrompts: [{ prompt_text: "Which HR platform?", updated_at: "2026-10-01T00:00:00Z" }],
    questionSetVersion: 3, runs, answers, decisions: decisionRows.map(decisions.decisionRowToLoop),
  });
}
const decisionRow = (overrides = {}) => ({ id: "d-1", organization_id: ORG_A, project_id: PROJECT_A1, baseline_run_id: RUN, save_key: KEY, decision_kind: "no_action", decision_state: "MONITOR_ONLY", rationale: "Monitor before changing pages.", change_specification_id: null, decided_by: USER, decided_at: "2026-10-02T00:00:00Z", approved_by: null, approved_at: null, owner_id: null, owner_role: null, action_summary: null, due_date: null, ...overrides });

test("A14/CV-05 mapping: persisted rows → comparable later cycle; customer_cycle closes proof, causation never proven", () => {
  const runs = [runRow(RUN, "2026-10-01T00:00:00Z"), runRow(RUN_2, "2026-10-20T00:00:00Z")];
  const answers = [answerRow(RUN), answerRow(RUN_2, { sampling_json: { samples: 1, temperature: 0.1 } })];
  const state = loop.computeCustomerValueLoop(persistedSnapshot({ runs, answers, decisionRows: [decisionRow()] }));
  assert.equal(state.stage, "comparable_later_cycle", JSON.stringify(state));
  assert.equal(state.causation, "not_proven");
  assert.equal(state.closesCustomerProof, true);
  assert.equal(snapshot.samplingIdentity({ b: 1, a: 2 }), snapshot.samplingIdentity({ a: 2, b: 1 }), "key order is not a sampling change");
});

test("A14/CV-05 mapping: unknown origin, changed question-set epoch, missing method/sampling and excluded answers are all explicit", () => {
  const base = [runRow(RUN, "2026-10-01T00:00:00Z")];
  const unknownOrigin = loop.computeCustomerValueLoop(persistedSnapshot({
    runs: [...base, runRow(RUN_2, "2026-10-20T00:00:00Z", { cycle_origin: null })],
    answers: [answerRow(RUN), answerRow(RUN_2)], decisionRows: [decisionRow()],
  }));
  assert.equal(unknownOrigin.stage, "comparable_later_cycle");
  assert.equal(unknownOrigin.closesCustomerProof, false, "NULL cycle_origin (unknown) never closes customer proof");
  assert.equal(unknownOrigin.laterCycle.evidence, "unknown");

  const epochChanged = loop.computeCustomerValueLoop(persistedSnapshot({
    runs: [...base, runRow(RUN_2, "2026-10-20T00:00:00Z", { question_set_version: 4 })],
    answers: [answerRow(RUN), answerRow(RUN_2)], decisionRows: [decisionRow()],
  }));
  assert.equal(epochChanged.stage, "later_cycle_not_comparable");
  assert.ok(epochChanged.blockers.some((b) => /question set version/i.test(b)));

  const preMigration = loop.computeCustomerValueLoop(persistedSnapshot({
    runs: [runRow(RUN, "2026-10-01T00:00:00Z", { question_set_version: null }), runRow(RUN_2, "2026-10-20T00:00:00Z")],
    answers: [answerRow(RUN, { observation_method: null, sampling_json: null }), answerRow(RUN_2)], decisionRows: [decisionRow()],
  }));
  assert.equal(preMigration.stage, "later_cycle_not_comparable");
  assert.ok(preMigration.blockers.some((b) => /question set version is missing/i.test(b)));
  assert.ok(preMigration.blockers.some((b) => /Sampling or observation-method provenance is unavailable/.test(b)));

  const excluded = loop.computeCustomerValueLoop(persistedSnapshot({
    runs: [...base, runRow(RUN_2, "2026-10-20T00:00:00Z")],
    answers: [answerRow(RUN), answerRow(RUN, { prompt_key: "k2", review_status: "excluded" }), answerRow(RUN_2)], decisionRows: [decisionRow()],
  }));
  assert.equal(excluded.stage, "comparable_later_cycle");
  assert.ok(excluded.laterCycle.exclusions.some((e) => /k2\/cloudflare excluded \(rejected\)/.test(e)));
});

test("CV-05 mapping: tenant/project scoping and decision gaps from persisted rows", () => {
  const foreignRun = runRow("7b000000-0000-4000-8000-00000000000b", "2026-10-05T00:00:00Z", { organization_id: ORG_B });
  const siblingRun = runRow("7c000000-0000-4000-8000-00000000000c", "2026-10-06T00:00:00Z", { project_id: PROJECT_A2 });
  const snap = persistedSnapshot({ runs: [runRow(RUN, "2026-10-01T00:00:00Z"), foreignRun, siblingRun], answers: [answerRow(RUN)], decisionRows: [decisionRow({ organization_id: ORG_B })] });
  assert.deepEqual(snap.runs.map((r) => r.id), [RUN]);
  assert.equal(snap.decisions.length, 0);
  assert.equal(loop.computeCustomerValueLoop(snap).stage, "decision_required");
  const cs = decisionRow({ decision_kind: "change_specification", decision_state: "DO_NOW" });
  const pending = loop.computeCustomerValueLoop(persistedSnapshot({ runs: [runRow(RUN, "2026-10-01T00:00:00Z")], answers: [answerRow(RUN)], decisionRows: [cs] }));
  assert.equal(pending.stage, "action_required");
  assert.deepEqual(pending.blockers, ["approval", "owner", "action", "dueDate"]);
  const noQuestions = snapshot.buildLoopSnapshot({ organizationId: ORG_A, projectId: PROJECT_A1, brand: "Northstar", activePrompts: [], questionSetVersion: 1, runs: [], answers: [], decisions: [] });
  assert.equal(loop.computeCustomerValueLoop(noQuestions).stage, "questions_required");
});

test("CV-05 routes: decision + loop routes are scoped to the active org/project, origin-checked and role-gated", async () => {
  const decision = await readFile(new URL("../app/api/records/[id]/decision/route.ts", import.meta.url), "utf8");
  for (const method of ["POST", "PATCH"]) {
    const handler = decision.slice(decision.indexOf(`export async function ${method}`));
    assert.match(handler.slice(0, 200), /isTrustedMutationOrigin\(request\)/, `${method} origin check first`);
  }
  assert.match(decision, /rpc\/save_record_decision/);
  assert.match(decision, /rpc\/complete_record_decision_action/);
  assert.match(decision, /organizationId: context\.organizationId, projectId: context\.projectId/);
  assert.doesNotMatch(decision, /body\.organizationId|body\.projectId/);
  assert.match(decision, /canApprove\(role\)/);
  const loopRoute = await readFile(new URL("../app/api/customer-value-loop/route.ts", import.meta.url), "utf8");
  for (const table of ["prompts", "project_question_set_versions", "runs", "record_decisions"]) {
    assert.match(loopRoute, new RegExp("`" + table + "\\?select=[^`]*organization_id=eq\\.\\$\\{org\\}&project_id=eq\\.\\$\\{project\\}"), `${table} scoped`);
  }
  assert.match(loopRoute, /run_answers\?select=\$\{LOOP_ANSWER_COLUMNS\}&organization_id=eq\.\$\{org\}&run_id=in\./);
});

test("CV-05 proposal SQL stays a proposal and carries the reviewed invariants", async () => {
  const sql = await readFile(new URL("../docs/execution/attach-v1/04-proposals/migrations/20261013140000_chat04_customer_value_loop_persistence.proposal.sql", import.meta.url), "utf8");
  const { readdir } = await import("node:fs/promises");
  const applied = await readdir(new URL("../supabase/migrations/", import.meta.url));
  assert.ok(!applied.some((f) => /chat04_customer_value_loop/.test(f)), "Chat04 does not add shared migrations directly (FM-00 adopts)");
  for (const pattern of [
    /record_decisions_save_key_unique unique \(organization_id, project_id, save_key\)/,
    /record_decisions_no_fabricated_owner/,
    /record_decisions_approved_action_complete/,
    /revoke all on table public\.record_decisions from public, anon, authenticated/,
    /grant select on table public\.record_decisions to authenticated/,
    /security definer\s+set search_path = ''/,
    /new\.question_set_version := \(/,
    /Run question-set version is immutable/,
    /raw_json -> 'observationMethod'/,
    /private\.has_org_role\(p_organization_id, array\['owner','admin'\]/,
  ]) assert.match(sql, pattern);
  assert.doesNotMatch(sql, /alter table public\.change_specifications/i, "existing Change Specification lifecycle untouched");
  assert.doesNotMatch(sql, /function (public|private)\.complete_onboarding/i, "zero-question setup stays deferred");
});
