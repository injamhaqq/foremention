import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const wrangler = await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8");
const worker = await readFile(new URL("../worker/index.ts", import.meta.url), "utf8");

test("production enables the deterministic Agent OS layer", () => {
  assert.match(wrangler, /"FOREMENTION_AGENT_OS_ENABLED":\s*"1"/);
});

test("public health exposes only boolean Agent OS readiness signals", () => {
  assert.match(worker, /agentOs\s*=\s*\{/);
  assert.match(worker, /enabled:\s*env\.FOREMENTION_AGENT_OS_ENABLED === "1"/);
  assert.match(worker, /reasoningEnabled:\s*env\.FOREMENTION_AGENT_REASONING_ENABLED === "1"/);
  assert.match(worker, /operatorConfigured:\s*Boolean\(/);
  assert.match(worker, /openaiConfigured:\s*Boolean\(env\.OPENAI_API_KEY\)/);
  assert.match(worker, /applicationEmailConfigured:\s*Boolean\(/);
  assert.doesNotMatch(worker, /agentOs:[^\n]*OPENAI_API_KEY/);
});


test("production fail-closes bounded reasoning when the configured OpenAI provider is unavailable", () => {
  assert.match(wrangler, /"FOREMENTION_AGENT_REASONING_ENABLED":\s*"0"/);
  assert.match(wrangler, /"FOREMENTION_AGENT_REASONING_MODEL":\s*"gpt-5\.6-luna"/);
  assert.match(wrangler, /"FOREMENTION_AGENT_REASONING_INPUT_COST_PER_MILLION_USD":\s*"0\.20"/);
  assert.match(wrangler, /"FOREMENTION_AGENT_REASONING_OUTPUT_COST_PER_MILLION_USD":\s*"1\.20"/);
  assert.match(wrangler, /"FOREMENTION_AGENT_REASONING_MAX_RUN_COST_USD":\s*"0\.01"/);
  assert.match(wrangler, /"FOREMENTION_AGENT_REASONING_DAILY_COST_CAP_USD":\s*"0\.10"/);
});
