import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildRunChangeGraph, fictionalRunChangeGraph } from "../lib/run-change-graph-core.ts";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

const answer = (overrides) => ({
  runId: "latest",
  promptKey: "q1",
  prompt: "Best evidence platform?",
  provider: "groq",
  model: "groq/compound-mini",
  answerText: "Foremention is included.",
  brandPresent: true,
  citationUrls: ["https://example.com/new"],
  ...overrides,
});

test("Run Change Graph compares only the same methodology and exact persisted answer matrix", () => {
  const graph = buildRunChangeGraph({
    latest: { id: "latest", methodologyVersion: "3.0" },
    previous: { id: "previous", methodologyVersion: "3.0" },
    answers: [
      answer({ runId: "previous", answerText: "Another vendor is included.", brandPresent: false, citationUrls: ["https://example.com/old"] }),
      answer({ runId: "latest", answerText: "Foremention is included.", brandPresent: true, citationUrls: ["https://example.com/new"] }),
    ],
    competitors: [
      { runId: "previous", names: ["OldCo"] },
      { runId: "latest", names: ["NewCo"] },
    ],
  });

  assert.equal(graph.status, "comparable");
  assert.equal(graph.comparable, true);
  assert.deepEqual(graph.answerMatrix, { latest: 1, previous: 1, missingExactModels: 0, missingQuestionTexts: 0 });
  assert.deepEqual(graph.summary, {
    brandGains: 1,
    brandLosses: 0,
    citationGains: 1,
    citationLosses: 1,
    sourceGains: 1,
    sourceLosses: 1,
    competitorGains: 1,
    competitorLosses: 1,
    contextChanges: 1,
  });
  assert.deepEqual(graph.events.map((event) => event.kind), ["brand_mention", "citation", "source", "competitor", "context"]);
  assert.match(graph.note, /same reviewed buyer-question text, provider, exact-model, and methodology matrix/i);
});

test("Run Change Graph withholds movement when methodology changes", () => {
  const graph = buildRunChangeGraph({
    latest: { id: "latest", methodologyVersion: "3.1" },
    previous: { id: "previous", methodologyVersion: "3.0" },
    answers: [answer({ runId: "previous" }), answer({ runId: "latest" })],
  });

  assert.equal(graph.status, "not_comparable");
  assert.equal(graph.comparable, false);
  assert.equal(graph.events[0]?.kind, "methodology");
  assert.match(graph.events[0]?.detail || "", /Methodology changed from 3\.0 to 3\.1/);
});

test("Run Change Graph withholds movement when exact model provenance is missing", () => {
  const graph = buildRunChangeGraph({
    latest: { id: "latest", methodologyVersion: "3.0" },
    previous: { id: "previous", methodologyVersion: "3.0" },
    answers: [answer({ runId: "previous", model: null }), answer({ runId: "latest", model: null })],
  });

  assert.equal(graph.status, "not_comparable");
  assert.equal(graph.answerMatrix.missingExactModels, 2);
  assert.match(graph.events[0]?.detail || "", /missing exact model provenance/i);
});

test("Run Change Graph withholds movement when persisted buyer-question text is missing", () => {
  const graph = buildRunChangeGraph({
    latest: { id: "latest", methodologyVersion: "3.0" },
    previous: { id: "previous", methodologyVersion: "3.0" },
    answers: [answer({ runId: "previous", prompt: "" }), answer({ runId: "latest", prompt: "" })],
  });

  assert.equal(graph.status, "not_comparable");
  assert.equal(graph.answerMatrix.missingQuestionTexts, 2);
  assert.match(graph.events[0]?.detail || "", /missing the persisted buyer-question text/i);
});

test("Run Change Graph withholds movement when the question wording changes under the same prompt key", () => {
  const graph = buildRunChangeGraph({
    latest: { id: "latest", methodologyVersion: "3.0" },
    previous: { id: "previous", methodologyVersion: "3.0" },
    answers: [
      answer({ runId: "previous", promptKey: "q1", prompt: "Best evidence platform?" }),
      answer({ runId: "latest", promptKey: "q1", prompt: "Best AI evidence platform for B2B teams?" }),
    ],
  });

  assert.equal(graph.status, "not_comparable");
  assert.match(graph.events[0]?.detail || "", /buyer-question text.*matrix changed/i);
});

test("Run Change Graph withholds movement when the reviewed answer slots change", () => {
  const graph = buildRunChangeGraph({
    latest: { id: "latest", methodologyVersion: "3.0" },
    previous: { id: "previous", methodologyVersion: "3.0" },
    answers: [
      answer({ runId: "previous", promptKey: "q1" }),
      answer({ runId: "latest", promptKey: "q2", prompt: "Different question" }),
    ],
  });

  assert.equal(graph.status, "not_comparable");
  assert.match(graph.events[0]?.detail || "", /matrix changed/i);
});

test("one reviewed collection stays a baseline and the fictional demo never compares", () => {
  const baseline = buildRunChangeGraph({
    latest: { id: "latest", methodologyVersion: "3.0" },
    previous: null,
    answers: [answer({ runId: "latest" })],
  });
  assert.equal(baseline.status, "baseline");
  assert.equal(baseline.comparable, false);
  assert.equal(baseline.events.length, 0);

  const demo = fictionalRunChangeGraph("latest", "previous");
  assert.equal(demo.status, "fictional");
  assert.equal(demo.events.length, 0);
  assert.match(demo.note, /fictional demo/i);
});

test("Run Change Graph loader is tenant, project, finalized-review, and customer-token scoped", async () => {
  const loader = await text("lib/run-change-graph.ts");

  assert.match(loader, /loadWorkspaceContext\(viewer\)/);
  assert.match(loader, /organization_id=eq\.\$\{context\.organizationId\}/g);
  assert.match(loader, /latest\.project_id !== context\.projectId/);
  assert.match(loader, /previous\.project_id !== context\.projectId/);
  assert.match(loader, /select=id,methodology_version,project_id,status/);
  assert.match(loader, /reviewFinished\(latest\.status\)/);
  assert.match(loader, /previous && !reviewFinished\(previous\.status\)/);
  assert.match(loader, /Both collections must finish human review/);
  assert.match(loader, /review_status=eq\.verified/);
  assert.match(loader, /prompt: answer\.prompt_text \|\| ""/);
  assert.match(loader, /name\.startsWith\("Reviewed collection"\)/);
  assert.match(loader, /comparableCompetitorContext/);
  assert.match(loader, /canonicalizeEvidenceUrl/);
  assert.match(loader, /token: viewer\.accessToken/g);
  assert.doesNotMatch(loader, /serviceRole:\s*true/);
});

test("Analytics shows raw latest observations but withholds deltas unless Run Change Graph is comparable", async () => {
  const page = await text("app/app/analytics/page.tsx");

  assert.match(page, /loadRunChangeGraph/);
  assert.match(page, /runChangeGraph\.status === "comparable"/);
  assert.match(page, /cross-collection movement withheld/i);
  assert.match(page, /Bars show persisted collection observations, not automatically comparable trend points/);
  assert.match(page, /same buyer-question, provider, exact-model, and methodology gate/i);
  assert.match(page, /Change Graph · cited page observations/);
  assert.match(page, /does not establish causation/);
});
