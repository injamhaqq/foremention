// Chat01 reproduction suite (CV-01/A08 + CV-02/CV-11/A09 + metric contract).
// Runs the REAL grounded Cloudflare path (retrieval -> relevance gate -> model)
// against raw synthetic fixtures in tests/fixtures/fm01/. fetch and the Workers
// AI binding are fakes; no network, no paid call, no production data.
import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { citationOriginForAnswer, typedReferences, summarizeVisibility, observationOutcome, referenceExportColumns } from "../lib/evidence-provenance.mjs";

const root = new URL("../", import.meta.url);
const scratch = await mkdtemp(join(tmpdir(), "fm01-repro-"));
const fixture = async (name) => JSON.parse(await readFile(new URL(`fixtures/fm01/${name}`, import.meta.url), "utf8"));

async function loadCloudflare() {
  const source = await readFile(new URL("lib/providers/cloudflare.ts", root), "utf8");
  const resolved = source.replace(/from "@\/lib\/([^"]+)"/g, (_m, target) =>
    `from "${new URL(`lib/${target}${/\.(m?js|ts)$/.test(target) ? "" : ".ts"}`, root).href}"`);
  const file = join(scratch, `cloudflare-${Math.random().toString(36).slice(2)}.ts`);
  await writeFile(file, resolved);
  return import(pathToFileURL(file).href);
}
const cf = await loadCloudflare();
const modelAnswer = await fixture("workers-ai-grounded-answer.json");

async function runCase(name, { modelResponse = modelAnswer } = {}) {
  const fx = await fixture(name);
  const prevKey = process.env.BRAVE_SEARCH_API_KEY;
  process.env.BRAVE_SEARCH_API_KEY = "offline-fixture-key";
  const originalFetch = globalThis.fetch;
  const searchCalls = [];
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    assert.equal(url.hostname, "api.search.brave.com", "only the fixture search endpoint may be reached");
    searchCalls.push(url);
    return new Response(JSON.stringify(fx.response), { status: 200, headers: { "content-type": "application/json" } });
  };
  const modelCalls = [];
  const binding = { async run(model, body) { modelCalls.push({ model, body }); return modelResponse; } };
  try {
    const result = await cf.runGroundedCloudflareWithBinding({ binding, model: "@cf/fixture/pinned", prompt: fx.question, maxOutputTokens: 300 })
      .then((value) => ({ ok: true, value }), (error) => ({ ok: false, error }));
    return { fx, result, searchCalls, modelCalls };
  } finally {
    globalThis.fetch = originalFetch;
    if (prevKey === undefined) delete process.env.BRAVE_SEARCH_API_KEY; else process.env.BRAVE_SEARCH_API_KEY = prevKey;
  }
}

test("CV-01/A08 reproduction: the B2B question with 8 dictionary 'should' hits is evidence-unavailable (422) and the model is never called", async () => {
  const { result, searchCalls, modelCalls } = await runCase("brave-b2b-should-dictionary.json");
  assert.equal(result.ok, false);
  assert.equal(result.error.status, 422);
  assert.equal(result.error.retryable, false);
  assert.match(result.error.message, /NO_TOPICALLY_RELEVANT_RESULTS/);
  assert.match(result.error.message, /8 candidate\(s\) were withheld/);
  assert.equal(searchCalls.length, 1, "no retry or fallback search");
  assert.equal(modelCalls.length, 0, "irrelevant results never reach inference");
  // Metric contract: this attempt is not a zero-visibility observation.
  assert.equal(observationOutcome({ status: "failed", httpStatus: 422 }), "evidence_unavailable");
});

test("A08 positive control: known-relevant AI-visibility sources pass, reach the model, and keep provenance", async () => {
  const { result, modelCalls } = await runCase("brave-b2b-positive-control.json");
  assert.equal(result.ok, true);
  assert.equal(modelCalls.length, 1);
  assert.equal(result.value.citations.length, 2);
  assert.equal(result.value.retrievalProvider, "brave-search");
  assert.equal(result.value.retrievedCandidateCount, 2);
  assert.equal(result.value.relevanceRejectedCount, 0);
  assert.match(result.value.retrievalQuery, /AI visibility monitoring/);
});

test("A08 partial source set: only the 2 relevant pages are given to the model; 6 rejections are recorded", async () => {
  const { result, modelCalls } = await runCase("brave-b2b-partial-relevant.json");
  assert.equal(result.ok, true);
  const evidenceText = modelCalls[0].body.messages[1].content;
  assert.doesNotMatch(evidenceText, /dictionary\.example|grammar\.example|esl\.example/);
  assert.match(evidenceText, /research\.example/);
  assert.equal(result.value.retrievedCandidateCount, 8);
  assert.equal(result.value.relevanceRejectedCount, 6);
  assert.deepEqual(result.value.citations.map((c) => new URL(c.url).hostname).sort(), ["analyst.example", "research.example"]);
});

test("A08 ambiguous question fails closed as QUESTION_TOO_AMBIGUOUS, no inference", async () => {
  const { result, modelCalls } = await runCase("brave-ambiguous-question.json");
  assert.equal(result.ok, false);
  assert.equal(result.error.status, 422);
  assert.match(result.error.message, /QUESTION_TOO_AMBIGUOUS/);
  assert.equal(modelCalls.length, 0);
});

test("A08 empty result set fails before inference and is never an answer", async () => {
  const { result, modelCalls } = await runCase("brave-empty.json");
  assert.equal(result.ok, false);
  assert.equal(modelCalls.length, 0);
  assert.equal(observationOutcome({ status: "failed", answer: null }), "failed");
});

test("CV-02/CV-11/A09: adapter raw declares independent retrieval, API method and no consumer-app observation", async () => {
  const source = await readFile(new URL("lib/providers/cloudflare.ts", root), "utf8");
  assert.match(source, /referenceProvenance: "independent_retrieval"/);
  assert.match(source, /observationMethod: "api_hosted_model_with_independent_retrieval"/);
  assert.match(source, /consumerProductObservation: false/);
});

test("provenance contract: independent retrieval, native citation and answer URL are never conflated; review is an overlay", () => {
  const cfAnswer = { provider: "cloudflare", raw: { retrievalProvider: "brave-search", referenceProvenance: "independent_retrieval" }, citations: [{ url: "https://research.example/a", title: "A" }] };
  const refs = typedReferences(cfAnswer, "verified");
  assert.equal(refs[0].origin, "independent_retrieval");
  assert.equal(refs[0].countsAsProviderCitation, false);
  assert.equal(refs[0].humanReview, "verified");
  assert.match(refs[0].originLabel, /not a provider citation/);
  assert.deepEqual(referenceExportColumns(refs[0]), { reference_origin: "independent_retrieval", reference_origin_label: refs[0].originLabel, human_review: "verified" });

  const native = typedReferences({ provider: "openai", raw: {}, citations: [{ url: "https://n.example" }], mentionedUrls: [{ url: "https://typed.example" }] });
  assert.deepEqual(native.map((r) => r.origin), ["native_citation", "answer_url"]);
  assert.equal(native[1].countsAsProviderCitation, false);

  assert.equal(citationOriginForAnswer({ provider: "cloudflare", raw: {} }), "independent_retrieval");
  assert.equal(citationOriginForAnswer({ provider: "mystery", raw: {} }), "unknown");
  assert.equal(citationOriginForAnswer({ provider: "openai", raw: { retrievalProvider: "bing-rss" } }), "independent_retrieval", "retrieval metadata always wins over provider name");
});

test("metric contract: abstained / unavailable / failed attempts never become 0% visibility", () => {
  const attempts = [
    { status: "complete", answer: "Acme and Beta are leading AI visibility tools.", brandPresent: true },
    { status: "complete", answer: "Beta is a common choice.", brandPresent: false },
    { status: "complete", answer: "I can't verify this from the retrieved evidence.", brandPresent: false },
    { status: "failed", httpStatus: 422 },
    { status: "failed", httpStatus: 503 },
  ];
  const summary = summarizeVisibility(attempts);
  assert.equal(summary.denominator, 2);
  assert.equal(summary.value, 50);
  assert.equal(summary.abstained, 1);
  assert.equal(summary.evidence_unavailable, 1);
  assert.equal(summary.failed, 1);
  assert.equal(summarizeVisibility(attempts, { requireComplete: true }).value, null);
  const none = summarizeVisibility([{ status: "failed", httpStatus: 422 }, { status: "complete", answer: "I cannot verify that." }]);
  assert.equal(none.value, null, "nothing observed is unknown, not 0%");
  assert.equal(none.withheldReason, "NO_OBSERVED_ANSWERS");
});

test("ObservationEnvelope: preserves method/provider/model/receipt/retrieval and lists missing fields instead of zeroing them", async () => {
  const { buildObservationEnvelope } = await import("../lib/evidence-provenance.mjs");
  const { result } = await runCase("brave-b2b-positive-control.json");
  const answer = {
    provider: "cloudflare", model: result.value.model, answer: result.value.answer, citations: result.value.citations,
    raw: { referenceProvenance: "independent_retrieval", observationMethod: "api_hosted_model_with_independent_retrieval", retrievalProvider: result.value.retrievalProvider, retrievalQuery: result.value.retrievalQuery, retrievedCandidateCount: result.value.retrievedCandidateCount, relevanceRejectedCount: result.value.relevanceRejectedCount },
    collectedAt: "2026-10-12T00:00:00.000Z", usage: result.value.usage,
  };
  const env = buildObservationEnvelope(answer, { organizationId: "org_fixture", questionId: "q1", questionVersion: 3, questionText: "fixture", locale: "en-US" });
  assert.equal(env.method, "api_hosted_model_with_independent_retrieval");
  assert.equal(env.consumerProductObservation, false);
  assert.equal(env.outcome, "observed");
  assert.equal(env.retrieval.provider, "brave-search");
  assert.ok(env.references.every((r) => r.origin === "independent_retrieval" && !r.countsAsProviderCitation));
  assert.ok(env.unavailable.includes("providerRequestId"));
  assert.ok(env.unavailable.includes("billedCostUsd"), "unknown cost is unavailable, not $0");
  const failed = buildObservationEnvelope(null, { attempt: { status: "failed", httpStatus: 422 } });
  assert.equal(failed.outcome, "evidence_unavailable");
  assert.equal(failed.rawAnswer, null);
  assert.ok(failed.unavailable.includes("model"));
});

test("CV-01/A08: a real topic hit after eight irrelevant results is retained without a second search call", async () => {
  const fx = await fixture("brave-b2b-late-relevance.json");
  const result = await runCase("brave-b2b-late-relevance.json", {
    modelResponse: { response: { answer: "AI visibility monitoring software is relevant to B2B SaaS.", source_numbers: [1] }, usage: { prompt_tokens: 70, completion_tokens: 24 } },
  });
  assert.equal(result.result.ok, true);
  assert.equal(result.searchCalls.length, 1);
  assert.equal(result.searchCalls[0].searchParams.get("count"), "20");
  assert.equal(result.modelCalls.length, 1);
  assert.equal(result.result.value.retrievedCandidateCount, fx.response.web.results.length);
  assert.equal(result.result.value.relevanceRejectedCount, 9);
  assert.deepEqual(result.result.value.citations.map((c) => c.url), ["https://research.example/ai-visibility-monitoring-b2b"]);
  assert.doesNotMatch(result.modelCalls[0].body.messages[1].content, /dictionary\.example/);
});
