import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("production free-only mode pins grounded Gemini with zero app-side provider rates", async () => {
  const [config, prepare, env] = await Promise.all([
    text("wrangler.jsonc"),
    text("scripts/prepare-worker-config.mjs"),
    text(".env.example"),
  ]);
  for (const source of [config, prepare]) {
    assert.match(source, /FOREMENTION_FREE_ONLY_MODE/);
    assert.match(source, /gemini-2\.5-flash-lite/);
    assert.match(source, /GEMINI_INPUT_COST_PER_MILLION_USD[^\n]*0/);
    assert.match(source, /GEMINI_OUTPUT_COST_PER_MILLION_USD[^\n]*0/);
    assert.match(source, /GEMINI_REQUEST_COST_USD[^\n]*0/);
  }
  assert.match(config, /"FOREMENTION_FREE_ONLY_MODE":\s*"1"/);
  assert.match(config, /"OUTREACH_MINI_AUDIT_PROVIDERS":\s*"gemini"/);
  assert.match(env, /FOREMENTION_FREE_ONLY_MODE=1/);
  assert.match(env, /OUTREACH_MINI_AUDIT_PROVIDERS=gemini/);
});

test("only Gemini may create customer evidence while free-only mode is enabled", async () => {
  const [policy, route, jobs, schedules, data, outreach] = await Promise.all([
    text("lib/free-provider-mode.ts"),
    text("app/api/runs/route.ts"),
    text("lib/jobs/inngest.ts"),
    text("lib/jobs/measurement-schedule-dispatcher.ts"),
    text("lib/data.ts"),
    text("lib/outreach-mini-audit.ts"),
  ]);
  assert.match(policy, /FREE_ONLY_COLLECTION_PROVIDER[^\n]*"gemini"/);
  assert.match(policy, /process\.env\.FOREMENTION_FREE_ONLY_MODE === "1"/);
  for (const source of [route, jobs, schedules]) assert.match(source, /providerAllowedForLiveCollection/);
  assert.match(route, /Production is in free-only mode/);
  assert.match(data, /providerAllowedForLiveCollection/);
  assert.match(outreach, /DEFAULT_PROVIDER_ORDER[^\n]*\["gemini"/);
  assert.match(outreach, /free-only mode permits only grounded Gemini/);
});

test("public score and prompt-check use grounded Gemini and contain no direct Groq call", async () => {
  const worker = await text("worker/index.ts");
  const start = worker.indexOf("type PublicGeminiResponse");
  const end = worker.indexOf("async function handleSourceGapRequest", start);
  assert.ok(start >= 0 && end > start);
  const publicAi = worker.slice(start, end);
  assert.match(publicAi, /generativelanguage\.googleapis\.com/);
  assert.match(publicAi, /google_search/);
  assert.match(publicAi, /groundingChunks/);
  assert.match(publicAi, /provider: "Google Gemini"/);
  assert.match(publicAi, /FOREMENTION_FREE_ONLY_MODE/);
  assert.doesNotMatch(publicAi, /api\.groq\.com/);
  assert.doesNotMatch(publicAi, /OPENAI_API_KEY|OPENROUTER_API_KEY|PERPLEXITY_API_KEY|ANTHROPIC_API_KEY/);
});


test("Gemini customer evidence fails closed without structured provider grounding citations", async () => {
  const gemini = await text("lib/providers/gemini.ts");
  assert.match(gemini, /tools: \[\{ google_search: \{\} \}\]/);
  assert.match(gemini, /groundingChunks/);
  assert.match(gemini, /Grounded response returned no provider citation metadata/);
  assert.doesNotMatch(gemini, /extractUrls/);
});

test("trusted-main acceptance canary is fixed to free-only Gemini", async () => {
  const workflow = await text(".github/workflows/first-evidence-canary.yml");
  assert.match(workflow, /FOREMENTION_ACCEPTANCE_PROVIDER: 'gemini'/);
  assert.match(workflow, /FOREMENTION_ACCEPTANCE_EXPECTED_MODEL: 'gemini-2\.5-flash-lite'/);
  assert.match(workflow, /FOREMENTION_ACCEPTANCE_MAX_COST_USD: '0\.01'/);
  assert.doesNotMatch(workflow, /FOREMENTION_ACCEPTANCE_PROVIDER:\s*\$\{\{\s*secrets\./);
});
