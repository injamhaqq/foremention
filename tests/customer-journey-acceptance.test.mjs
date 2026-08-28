import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("a nontechnical customer can follow website to question to collection to source to opportunity to action", async () => {
  const [overview, onboarding, questions, runs, runDetail, sources, sourceDetail, opportunities, opportunityList, actions] = await Promise.all([
    text("app/app/page.tsx"),
    text("components/onboarding-wizard.tsx"),
    text("app/app/prompts/page.tsx"),
    text("app/app/runs/page.tsx"),
    text("app/app/runs/[id]/page.tsx"),
    text("app/app/source-map/page.tsx"),
    text("app/app/sources/[id]/page.tsx"),
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
  assert.match(runDetail, /Sources returned by the AI system/);
  assert.match(sources, /Human review queue/);
  assert.match(sourceDetail, /SourceReviewForm/);
  assert.match(opportunities, /No composite score hides weak evidence/);
  assert.match(opportunityList, /Create action/);
  assert.match(opportunityList, /disabled=.*source\.score === null/);
  assert.match(actions, /Every action keeps the source/);
});

test("core customer navigation uses Registered Evidence outcomes while proven secondary routes remain advanced", async () => {
  const navigation = await text("components/workspace-navigation.tsx");
  for (const label of ["Attention", "Questions", "Records", "Comparisons", "Settings"]) assert.match(navigation, new RegExp(label));
  assert.doesNotMatch(navigation, /Source X-Ray|source-xray/i);
  for (const retained of ["Competitors", "Opportunities", "Actions", "Agent Control Plane"]) assert.match(navigation, new RegExp(retained));
  assert.match(navigation, /<details className="sidebar-advanced">/);
  assert.match(navigation, /<summary><span>Advanced<\/span><small>\{advancedNav\.length\} tools<\/small><\/summary>/);
  assert.match(navigation, /aria-label="Advanced workspace tools"/);
});
