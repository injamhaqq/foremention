import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("production free-only mode is grounded Cloudflare plus Jina without paid fallback", async () => {
  const [config, prepare, policy, collection, cloudflare, retrieval, worker, env] = await Promise.all([
    text("wrangler.jsonc"),
    text("scripts/prepare-worker-config.mjs"),
    text("lib/free-provider-mode.ts"),
    text("lib/collection-policy.ts"),
    text("lib/providers/cloudflare.ts"),
    text("lib/free-web-retrieval.ts"),
    text("worker/index.ts"),
    text(".env.example"),
  ]);
  for (const source of [config, prepare]) {
    assert.doesNotMatch(source, /FOREMENTION_FREE_ONLY_MODE/);
    assert.doesNotMatch(source, /GEMINI_INPUT_COST_PER_MILLION_USD/);
    assert.doesNotMatch(source, /GEMINI_OUTPUT_COST_PER_MILLION_USD/);
    assert.doesNotMatch(source, /GEMINI_REQUEST_COST_USD/);
    assert.doesNotMatch(source, /OUTREACH_MINI_AUDIT_PROVIDERS/);
  }
  assert.match(policy, /FREE_ONLY_COLLECTION_PROVIDER[^\n]*"cloudflare"/);
  assert.match(policy, /FOREMENTION_FREE_ONLY_MODE !== "0"/);
  assert.match(policy, /FREE_ONLY_INTERNAL_MODEL_PROVIDERS[^\n]*\["cloudflare"\]/);
  assert.match(collection, /freeOnlyProviderMode\(\).*provider === FREE_ONLY_COLLECTION_PROVIDER/s);
  assert.match(collection, /inputPerMillionUsd: 0, outputPerMillionUsd: 0, requestUsd: 0/);
  assert.match(cloudflare, /retrieveFreeWebEvidence/);
  assert.match(cloudflare, /grounded: true/);
  assert.match(cloudflare, /SOURCES:/);
  assert.doesNotMatch(cloudflare, /extractUrls/);
  assert.match(retrieval, /https:\/\/s\.jina\.ai/);
  assert.match(retrieval, /parseJinaSearchCitations/);
  assert.match(retrieval, /Jina Search returned no verifiable source URLs/);
  assert.match(worker, /runGroundedCloudflareWithBinding/);
  assert.match(env, /FOREMENTION_FREE_ONLY_MODE=1/);
});

test("only grounded Cloudflare may create customer evidence while free-only mode is enabled", async () => {
  const [policy, route, jobs, schedules, data, outreach] = await Promise.all([
    text("lib/free-provider-mode.ts"),
    text("app/api/runs/route.ts"),
    text("lib/jobs/inngest.ts"),
    text("lib/jobs/measurement-schedule-dispatcher.ts"),
    text("lib/data.ts"),
    text("lib/outreach-mini-audit.ts"),
  ]);
  assert.match(policy, /FREE_ONLY_COLLECTION_PROVIDER[^\n]*"cloudflare"/);
  assert.match(policy, /process\.env\.FOREMENTION_FREE_ONLY_MODE !== "0"/);
  for (const source of [route, jobs, schedules]) assert.match(source, /providerAllowedForLiveCollection/);
  assert.match(route, /Grounded Cloudflare Workers AI with Jina Search/);
  assert.match(data, /Cloudflare Workers AI \+ Jina Search/);
  assert.match(data, /id: "cloudflare"[\s\S]*supportsCitations: true/);
  assert.match(outreach, /DEFAULT_PROVIDER_ORDER[^\n]*\["cloudflare"/);
  assert.match(outreach, /free-only mode permits only grounded Cloudflare Workers AI with Jina Search/);
});

test("public score and prompt-check use the same free grounded Cloudflare plus Jina path", async () => {
  const worker = await text("worker/index.ts");
  const start = worker.indexOf("async function runPublicGroundedCloudflare");
  const end = worker.indexOf("async function handleSourceGapRequest", start);
  assert.ok(start >= 0 && end > start);
  const publicAi = worker.slice(start, end);
  assert.match(publicAi, /runGroundedCloudflareWithBinding/);
  assert.match(publicAi, /env\.AI/);
  assert.match(publicAi, /env\.CLOUDFLARE_MODEL/);
  assert.match(publicAi, /provider: "Cloudflare Workers AI \+ Jina Search"/);
  assert.doesNotMatch(publicAi, /runPublicGroundedGemini|google_search|api\.groq\.com/);
});

test("optional Gemini adapter still fails closed without structured provider grounding citations", async () => {
  const gemini = await text("lib/providers/gemini.ts");
  assert.match(gemini, /tools: \[\{ google_search: \{\} \}\]/);
  assert.match(gemini, /groundingChunks/);
  assert.match(gemini, /Grounded response returned no provider citation metadata/);
  assert.doesNotMatch(gemini, /extractUrls/);
});

test("trusted-main acceptance canary is fixed to the free grounded Cloudflare path", async () => {
  const workflow = await text(".github/workflows/first-evidence-canary.yml");
  assert.match(workflow, /FOREMENTION_ACCEPTANCE_PROVIDER: 'cloudflare'/);
  assert.match(workflow, /FOREMENTION_ACCEPTANCE_EXPECTED_MODEL: '@cf\/google\/gemma-4-26b-a4b-it'/);
  assert.match(workflow, /FOREMENTION_ACCEPTANCE_MAX_COST_USD: '0\.01'/);
  assert.doesNotMatch(workflow, /FOREMENTION_ACCEPTANCE_PROVIDER:\s*\$\{\{\s*secrets\./);
});
