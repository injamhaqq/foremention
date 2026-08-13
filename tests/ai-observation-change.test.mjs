import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildAiObservationChangeGraph, fictionalAiObservationChangeGraph } from "../lib/ai-observation-change-core.ts";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");
const answer = (overrides = {}) => ({
  runId: "latest",
  promptKey: "q1",
  promptText: "Best evidence platform?",
  provider: "groq",
  model: "groq/compound-mini",
  answerText: "Foremention is included.",
  brandPresent: true,
  citationUrls: ["https://example.com/new"],
  ...overrides,
});

test("AI Observation Change Graph separates brand, citation, source, competitor, and answer-context changes", () => {
  const graph = buildAiObservationChangeGraph({
    latest: { id: "latest", methodologyVersion: "3.0" },
    previous: { id: "previous", methodologyVersion: "3.0" },
    answers: [
      answer({ runId: "previous", answerText: "Another vendor is included.", brandPresent: false, citationUrls: ["https://example.com/old"] }),
      answer({ runId: "latest", citationUrls: ["https://example.com/new"] }),
    ],
    competitors: [
      { runId: "previous", names: ["OldCo"] },
      { runId: "latest", names: ["NewCo"] },
    ],
    competitorContextComparable: true,
  });

  assert.equal(graph.status, "comparable");
  assert.equal(graph.comparable, true);
  assert.deepEqual(graph.summary, {
    brandGains: 1,
    brandLosses: 0,
    citationGains: 1,
    citationLosses: 1,
    sourceGains: 1,
    sourceLosses: 1,
    competitorGains: 1,
    competitorLosses: 1,
    answerContextChanges: 1,
  });
  assert.deepEqual(graph.events.map((event) => event.kind), ["brand_mention", "citation", "source", "competitor", "answer_context"]);
  assert.match(graph.events.at(-1)?.detail || "", /does not claim that meaning, factual accuracy, buyer behavior, or a customer action caused the difference/i);
});

test("same prompt key with changed exact buyer-question text cannot create a change event", () => {
  const graph = buildAiObservationChangeGraph({
    latest: { id: "latest", methodologyVersion: "3.0" },
    previous: { id: "previous", methodologyVersion: "3.0" },
    answers: [
      answer({ runId: "previous", promptKey: "q1", promptText: "Best evidence platform?", brandPresent: false }),
      answer({ runId: "latest", promptKey: "q1", promptText: "Which evidence platform should I buy?", brandPresent: true }),
    ],
  });

  assert.equal(graph.status, "withheld");
  assert.equal(graph.comparable, false);
  assert.equal(graph.events.length, 0);
  assert.match(graph.note, /exact buyer-question\/provider\/model matrix changed/i);
});

test("AI Observation Change Graph defensively withholds methodology, model, and missing question provenance", () => {
  const methodologyChange = buildAiObservationChangeGraph({
    latest: { id: "latest", methodologyVersion: "3.1" },
    previous: { id: "previous", methodologyVersion: "3.0" },
    answers: [answer({ runId: "previous" }), answer({ runId: "latest" })],
  });
  assert.equal(methodologyChange.status, "withheld");
  assert.match(methodologyChange.note, /methodology version changed/i);

  const missingModel = buildAiObservationChangeGraph({
    latest: { id: "latest", methodologyVersion: "3.0" },
    previous: { id: "previous", methodologyVersion: "3.0" },
    answers: [answer({ runId: "previous", model: null }), answer({ runId: "latest", model: null })],
  });
  assert.equal(missingModel.status, "withheld");
  assert.match(missingModel.note, /model provenance/i);

  const missingQuestion = buildAiObservationChangeGraph({
    latest: { id: "latest", methodologyVersion: "3.0" },
    previous: { id: "previous", methodologyVersion: "3.0" },
    answers: [answer({ runId: "previous", promptText: null }), answer({ runId: "latest", promptText: null })],
  });
  assert.equal(missingQuestion.status, "withheld");
  assert.match(missingQuestion.note, /question text/i);
});

test("competitor movement is withheld unless both runs have reviewed Source Map context", () => {
  const graph = buildAiObservationChangeGraph({
    latest: { id: "latest", methodologyVersion: "3.0" },
    previous: { id: "previous", methodologyVersion: "3.0" },
    answers: [answer({ runId: "previous" }), answer({ runId: "latest" })],
    competitors: [{ runId: "previous", names: ["OldCo"] }, { runId: "latest", names: ["NewCo"] }],
    competitorContextComparable: false,
  });

  assert.equal(graph.status, "comparable");
  assert.equal(graph.coverage.competitorContext, "unavailable");
  assert.equal(graph.summary.competitorGains, 0);
  assert.equal(graph.summary.competitorLosses, 0);
  assert.equal(graph.events.some((event) => event.kind === "competitor"), false);
});

test("one reviewed collection stays a baseline and fictional demo comparisons stay disabled", () => {
  const baseline = buildAiObservationChangeGraph({
    latest: { id: "latest", methodologyVersion: "3.0" },
    previous: null,
    answers: [answer()],
  });
  assert.equal(baseline.status, "baseline");
  assert.equal(baseline.events.length, 0);

  const demo = fictionalAiObservationChangeGraph("latest", "previous");
  assert.equal(demo.status, "fictional");
  assert.equal(demo.events.length, 0);
  assert.match(demo.note, /fictional demo/i);
});

test("AI observation loader is tenant, active-project, terminal-review, verified-answer, and customer-token scoped", async () => {
  const loader = await text("lib/ai-observation-change.ts");
  assert.match(loader, /loadWorkspaceContext\(viewer\)/);
  assert.match(loader, /organization_id=eq\.\$\{context\.organizationId\}/g);
  assert.match(loader, /latest\.project_id !== context\.projectId/);
  assert.match(loader, /previous\.project_id !== context\.projectId/);
  assert.match(loader, /reviewedTerminalStatuses/);
  assert.match(loader, /review_status=eq\.verified/);
  assert.match(loader, /name\.startsWith\("Reviewed collection"\)/);
  assert.match(loader, /canonicalizeEvidenceUrl/);
  assert.match(loader, /token: viewer\.accessToken/g);
  assert.doesNotMatch(loader, /serviceRole:\s*true/);
});

test("Analytics uses the exact-safe pair and separates AI observation changes from Source Change Graph", async () => {
  const [page, panel] = await Promise.all([
    text("app/app/analytics/page.tsx"),
    text("components/ai-observation-change-graph.tsx"),
  ]);
  assert.match(page, /loadSafeWeeklyIntelligence/);
  assert.match(page, /const previous = intelligence\.previous/);
  assert.match(page, /loadAiObservationChangeGraph\(viewer, latest\.id, previous\?\.id \|\| null\)/);
  assert.match(page, /AiObservationChangeGraphPanel/);
  assert.match(page, /Source Change Graph/);
  assert.match(panel, /AI Observation Change Graph/);
  assert.match(panel, /persisted observation differences, not explanations/i);
  assert.match(panel, /do not establish causation, ranking, market share, demand, traffic, leads, revenue, or publisher acceptance/i);
});
