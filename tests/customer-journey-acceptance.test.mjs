import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("a nontechnical customer can follow website to question to collection to Record evidence to opportunity to action", async () => {
  const [overview, onboarding, questions, runs, runDetail, answerRecord, sourceEvidence, retiredSourceRoute, sources, opportunities, opportunityList, actions] = await Promise.all([
    text("app/app/page.tsx"),
    text("components/onboarding-wizard.tsx"),
    text("app/app/prompts/page.tsx"),
    text("app/app/runs/page.tsx"),
    text("app/app/runs/[id]/page.tsx"),
    text("components/recommendation-answer-record.tsx"),
    text("components/recommendation-source-evidence.tsx"),
    text("app/app/sources/[id]/page.tsx"),
    text("app/app/source-map/page.tsx"),
    text("app/app/opportunities/page.tsx"),
    text("components/opportunity-list.tsx"),
    text("app/app/placements/page.tsx"),
  ]);

  for (const step of ["Add your website", "Review buyer questions", "Start your first collection", "See your first AI result", "Review your first source"]) {
    assert.match(overview, new RegExp(step));
  }
  assert.match(onboarding, /Generate my setup/);
  assert.match(questions, /Buyer/);
  assert.match(runs, /AI Results/);
  assert.match(runDetail, /Recommendation Record/);
  assert.match(answerRecord, /References returned by the AI system/);
  assert.match(answerRecord, /Evidence inspection/);
  assert.match(sourceEvidence, /SourceReviewForm/);
  assert.match(sourceEvidence, /Saved page observations/);
  assert.match(sourceEvidence, /entityType="source_map_entry"/);
  assert.match(retiredSourceRoute, /redirect\("\/app\/source-map"\)/);
  assert.match(sources, /Human review queue/);
  assert.match(opportunities, /No composite score hides weak evidence/);
  assert.match(opportunityList, /Create action/);
  assert.match(opportunityList, /disabled=.*source\.score === null/);
  assert.match(actions, /Every action keeps the source/);
});

test("core customer navigation exposes five objects while proven secondary routes stay contextually reachable", async () => {
  const [navigation, bridge] = await Promise.all([
    text("components/workspace-navigation.tsx"),
    text("components/retention-surface-bridge.tsx"),
  ]);
  const primary = navigation.slice(navigation.indexOf("const primaryNav"), navigation.indexOf("export const CONTEXTUAL_WORKSPACE_ROUTES"));
  for (const label of ["Attention", "Questions", "Records", "Comparisons", "Settings"]) assert.match(primary, new RegExp(label));
  assert.doesNotMatch(primary, /Source X-Ray|Competitors|Opportunities|Actions|Evidence Vault|Agent Control Plane/);
  assert.doesNotMatch(navigation, /sidebar-advanced|advancedNav|workspaceNav/);
  for (const route of ["/app/competitors", "/app/opportunities", "/app/placements", "/app/resolutions", "/app/outcomes", "/app/passport", "/app/intelligence", "/app/agents", "/app/decision-lab", "/app/evidence", "/app/alerts", "/app/team", "/app/settings#integrations"]) {
    assert.match(bridge, new RegExp(route.replaceAll("/", "\\/")));
  }
});
