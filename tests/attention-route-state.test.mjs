import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { buildBaselineGuidance } from "../lib/baseline-guidance.ts";
import { deriveActivationStage, deriveAttentionItems } from "../lib/retention-loop.ts";
import { deriveRetentionHealth } from "../lib/retention-health.ts";

function moduleWithMocks(path, mocks) {
  const code = ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: (name) => {
    if (!(name in mocks)) throw new Error(`Unexpected dependency: ${name}`);
    return mocks[name];
  }, Date, Set, console });
  return exports;
}

function fixture(options = {}) {
  const queries = [];
  const rest = async (query, auth) => {
    queries.push(query);
    assert.equal(auth.token, "viewer-token");
    assert.equal(auth.serviceRole, undefined);
    if (options.fail) throw new Error("private database failure");
    if (query.startsWith("prompts?")) return [{ id: "prompt-a" }];
    if (query.startsWith("runs?")) return [{ id: "run-a" }];
    if (query.startsWith("measurement_schedules?")) {
      assert.match(query, /organization_id=eq.org-a&project_id=eq.project-a/);
      return [];
    }
    if (query.startsWith("placements?")) return options.rows || [];
    throw new Error(`Unexpected read: ${query}`);
  };
  const scope = moduleWithMocks("lib/project-placement-scope.ts", { "@/lib/supabase-rest": { supabaseRest: rest } });
  const route = moduleWithMocks("app/api/retention/attention/route.ts", {
    "next/server": { NextResponse: { json: (body, init) => ({ body, status: init?.status || 200 }) } },
    "@/lib/auth": { getViewer: async () => options.anonymous ? null : { mode: "supabase", accessToken: "viewer-token" } },
    "@/lib/data": {
      loadWorkspaceContext: async () => ({ organizationId: "org-a", projectId: "project-a", website: "https://example.com" }),
      loadPrompts: async () => Array.from({ length: options.questions ?? 5 }, () => ({ approved: true })),
      loadRuns: async () => [{ id: "run-a", status: "complete", answers: 1, citations: 0 }],
      loadRunAnswers: async () => [{ status: "verified" }],
      loadNotifications: async () => [],
      loadProviderStatuses: async () => [{ configured: true }],
    },
    "@/lib/evidence-integrity-data": { loadTruthfulSourceMap: async () => [] },
    "@/lib/retention-health": { deriveRetentionHealth },
    "@/lib/retention-loop": { deriveActivationStage, deriveAttentionItems },
    "@/lib/safe-intelligence": { loadSafeWeeklyIntelligence: async () => ({ latest: null, changes: [] }) },
    "@/lib/baseline-guidance": { buildBaselineGuidance },
    "@/lib/project-placement-scope": scope,
    "@/lib/supabase-rest": { supabaseRest: rest },
  });
  return { route, queries };
}

test("Attention denies anonymous requests before reads", async () => {
  const { route, queries } = fixture({ anonymous: true });
  assert.equal((await route.GET()).status, 401);
  assert.equal(queries.length, 0);
});
test("Attention failures return unavailable, never a fabricated quiet workspace", async () => {
  const { route } = fixture({ fail: true });
  const response = await route.GET();
  assert.equal(response.status, 503);
  assert.equal(response.body.data, undefined);
  assert.doesNotMatch(JSON.stringify(response), /private database failure/);
});
test("Attention uses the same five-question step and zero-citation boundary", async () => {
  const { route } = fixture({ questions: 4 });
  const response = await route.GET();
  assert.equal(response.status, 200);
  assert.equal(response.body.data.find((item) => item.id === "setup").href, "/app/prompts");
  assert.equal(response.body.data.find((item) => item.id === "answer-only-evidence").href, "/app/runs/run-a");
  assert.equal(response.body.onboardingComplete, false);
});
test("sibling-project, unlinked and ambiguous actions cannot enter Attention or activation", async () => {
  const base = { owner_id: "owner", page_title: "action", source_url: "https://example.com", remeasurement_due_at: "2020-01-01", due_at: null, target_prompt_ids: [], baseline_run_id: null, remeasurement_run_id: null };
  const rows = [
    { ...base, id: "own", baseline_run_id: "run-a" },
    { ...base, id: "foreign", baseline_run_id: "run-b" },
    { ...base, id: "unlinked" },
    { ...base, id: "ambiguous", baseline_run_id: "run-a", target_prompt_ids: ["prompt-b"] },
    { ...base, id: "task-only", baseline_run_id: "run-a", remeasurement_due_at: null, due_at: "2020-01-01" },
  ];
  const response = await fixture({ rows }).route.GET();
  assert.equal(response.status, 200);
  assert.deepEqual(Array.from(response.body.data.filter((item) => item.kind === "action"), (item) => item.id), ["action-own"]);
  const foreignOnly = await fixture({ rows: rows.slice(1, 4) }).route.GET();
  assert.equal(foreignOnly.body.activation.key, "first_action");
});
test("bounded action overflow is unavailable instead of incomplete success", async () => {
  const response = await fixture({ rows: Array.from({ length: 1001 }, () => ({})) }).route.GET();
  assert.equal(response.status, 503);
});
