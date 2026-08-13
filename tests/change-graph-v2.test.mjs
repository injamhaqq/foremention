import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { assessChangeGraphSafety } from "../lib/change-graph-safety-core.ts";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

const reviewedRuns = [
  { id: "latest", status: "complete" },
  { id: "previous", status: "complete" },
];
const matchingAnswers = [
  { run_id: "latest", prompt_key: "q1", prompt_text: "What is the best evidence platform?", provider: "groq", model: "compound-mini" },
  { run_id: "previous", prompt_key: "q1", prompt_text: "What is the best evidence platform?", provider: "groq", model: "compound-mini" },
];

test("Change Graph safety gate requires reviewed terminal runs and exact question/provider/model parity", () => {
  assert.deepEqual(assessChangeGraphSafety("latest", "previous", reviewedRuns, matchingAnswers), { comparable: true, reason: null });

  const changedQuestion = matchingAnswers.map((answer) => ({ ...answer }));
  changedQuestion[0].prompt_text = "Which evidence platform should I buy?";
  assert.equal(assessChangeGraphSafety("latest", "previous", reviewedRuns, changedQuestion).comparable, false);

  const stillReviewing = [{ id: "latest", status: "review" }, reviewedRuns[1]];
  assert.match(assessChangeGraphSafety("latest", "previous", stillReviewing, matchingAnswers).reason || "", /finish human review/i);

  const missingModel = matchingAnswers.map((answer) => ({ ...answer }));
  missingModel[0].model = null;
  assert.match(assessChangeGraphSafety("latest", "previous", reviewedRuns, missingModel).reason || "", /model provenance/i);
});

test("Change Graph safety gate refuses missing or changed answer matrices", () => {
  assert.equal(assessChangeGraphSafety("latest", null, reviewedRuns, matchingAnswers).comparable, false);
  assert.equal(assessChangeGraphSafety("latest", "previous", reviewedRuns, matchingAnswers.slice(0, 1)).comparable, false);

  const missingQuestionText = matchingAnswers.map((answer) => ({ ...answer }));
  missingQuestionText[1].prompt_text = null;
  assert.match(assessChangeGraphSafety("latest", "previous", reviewedRuns, missingQuestionText).reason || "", /question text/i);
});

test("Change Graph engine withholds run movement unless methodology and exact-model answer matrices match", async () => {
  const engine = await text("lib/change-graph-engine.ts");
  const wrapper = await text("lib/change-graph.ts");

  assert.match(engine, /input\.latest\.methodologyVersion === input\.previous\.methodologyVersion/);
  assert.match(engine, /missingExactModels > 0/);
  assert.match(engine, /latestKeys\.every\(\(key, index\) => key === previousKeys\[index\]\)/);
  assert.match(engine, /status: "not_comparable"/);
  assert.match(wrapper, /assessChangeGraphSafety/);
  assert.match(wrapper, /review_status=eq\.verified/);
  assert.match(wrapper, /project_id=eq\.\$\{context\.projectId\}/);
  assert.match(wrapper, /Cross-collection movement withheld/);
});

test("Change Graph keeps distinct evidence types without collapsing them into one score", async () => {
  const engine = await text("lib/change-graph-engine.ts");

  for (const kind of ["brand_mention", "citation", "source", "source_content", "competitor", "context", "methodology"]) {
    assert.match(engine, new RegExp(`\\| "${kind}"|kind: "${kind}"`));
  }
  assert.match(engine, /citationGains/);
  assert.match(engine, /citationLosses/);
  assert.match(engine, /gainedSources/);
  assert.match(engine, /lostSources/);
  assert.match(engine, /gainedCompetitors/);
  assert.match(engine, /lostCompetitors/);
  assert.match(engine, /contextChanges/);
  assert.doesNotMatch(engine, /priority_score|visibility_score|change_score/i);
});

test("saved cited-page changes remain independent observations and never become causal claims", async () => {
  const engine = await text("lib/change-graph-engine.ts");
  const wrapper = await text("lib/change-graph.ts");

  assert.match(engine, /snapshot\.changeState === "unreachable"/);
  assert.match(engine, /source_content/);
  assert.match(engine, /does not prove what caused the difference or that AI behavior changed because of it/);
  assert.match(wrapper, /independentPageEvents/);
  assert.match(wrapper, /do not prove causation/);
});

test("Change Graph queries remain tenant/project scoped with customer RLS credentials", async () => {
  const engine = await text("lib/change-graph-engine.ts");
  const wrapper = await text("lib/change-graph.ts");
  const combined = `${engine}\n${wrapper}`;

  assert.match(combined, /loadWorkspaceContext\(viewer\)/);
  assert.match(combined, /organization_id=eq\.\$\{context\.organizationId\}/g);
  assert.match(engine, /latestRow\.project_id !== context\.projectId/);
  assert.match(engine, /previousRow\.project_id !== context\.projectId/);
  assert.match(combined, /token: viewer\.accessToken/g);
  assert.doesNotMatch(combined, /serviceRole: true/);
});

test("Analytics suppresses misleading deltas and labels bars as observations when comparability fails", async () => {
  const analytics = await text("app/app/analytics/page.tsx");

  assert.match(analytics, /loadChangeGraph/);
  assert.match(analytics, /changeGraph\.status === "comparable"/);
  assert.match(analytics, /cross-collection movement withheld/i);
  assert.match(analytics, /Bars show persisted collection observations, not automatically comparable trend points/);
  assert.match(analytics, /same reviewed buyer-question, provider, exact-model, and methodology matrix/);
  assert.match(analytics, /movement is observed change, not proof that an action caused it/);
});
