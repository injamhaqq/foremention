import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url); const text = (path) => readFile(new URL(path, root), "utf8");
test("competitor tracking uses organization-scoped answer and reviewed-source observations", async () => {
  const [data, route, page, component, nav, bridge] = await Promise.all([text("lib/data.ts"), text("app/api/competitors/route.ts"), text("app/app/competitors/page.tsx"), text("components/competitor-tracker.tsx"), text("components/workspace-navigation.tsx"), text("components/retention-surface-bridge.tsx")]);
  assert.match(data, /loadCompetitorTracking/); assert.match(data, /organization_id=eq\.\$\{context\.organizationId\}/); assert.match(data, /answer_text\.toLocaleLowerCase/); assert.match(data, /sourceOverlap/);
  assert.match(route, /getPrimaryWorkspaceRole/); assert.match(route, /role === "viewer"/); assert.match(route, /organization_id=eq\.\$\{context\.organizationId\}/);
  assert.match(page, /CompetitorTracker/); assert.match(component, /This does not estimate market share/);
  assert.match(nav, /CONTEXTUAL_WORKSPACE_ROUTES[\s\S]*\/app\/competitors[\s\S]*Competitors/);
  assert.doesNotMatch(nav, /sidebar-advanced|sidebar-nav--advanced/);
  assert.match(bridge, /href="\/app\/competitors"/);
  assert.match(bridge, /Review competitors/);
});

test("competitor movement independently re-verifies the exact full pair after the safe-intelligence read", async () => {
  const [integrity, component, data] = await Promise.all([
    text("lib/evidence-integrity-data.ts"),
    text("components/competitor-tracker.tsx"),
    text("lib/data.ts"),
  ]);
  assert.equal(integrity.includes("runs?select=id,project_id,status,answer_count,methodology_version,created_at"), true);
  assert.equal(integrity.includes("project_id=eq.${context.projectId}"), true);
  assert.equal(integrity.includes("validPairedRunAnswerBudget(previous, latest)"), true);
  assert.equal(integrity.includes("assessCompleteVerifiedRunPair(previous, latest, candidatePairAnswers)"), true);
  assert.match(integrity, /measurement_context_json/);
  assert.match(integrity, /review_status=eq\.verified/);
  assert.match(integrity, /limit=501/);
  assert.equal(integrity.includes("MAX_COMPETITOR_HISTORY_RUNS + 1"), true);
  assert.match(integrity, /MAX_COMPETITOR_HISTORY_ANSWERS/);
  assert.match(integrity, /assessCompleteCompetitorHistory/);
  assert.match(data, /answerHistoryComplete: boolean/);
  assert.match(component, /Historical aggregate withheld/);
  assert.match(component, /independently re-read exact comparable pair/);
});
