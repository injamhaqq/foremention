import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

const [workflow, config, provider] = await Promise.all([
  text(".github/workflows/quality.yml"),
  text("evals/promptfooconfig.yaml"),
  text("evals/foremention-safety-provider.ts"),
]);

test("quality tools are isolated, pinned, and use a compatible evaluator Node runtime", () => {
  assert.match(workflow, /node-version: 22\.22\.0/);
  assert.match(workflow, /"knip": "6\.32\.2"/);
  assert.match(workflow, /"promptfoo": "0\.122\.0"/);
  assert.match(workflow, /--ignore-scripts/);
  assert.doesNotMatch(workflow, /secrets\./);
});

test("Promptfoo uses a zero-cost synthetic Foremention provider rather than model APIs", () => {
  assert.match(workflow, /PROMPTFOO_DISABLE_TELEMETRY: '1'/);
  assert.match(workflow, /PROMPTFOO_DISABLE_UPDATE: '1'/);
  assert.match(workflow, /PROMPTFOO_DISABLE_REMOTE_GENERATION: 'true'/);
  assert.match(workflow, /PROMPTFOO_DISABLE_REDTEAM_REMOTE_GENERATION: 'true'/);
  assert.match(config, /file:\/\/foremention-safety-provider\.ts/);
  assert.doesNotMatch(config, /openai:|anthropic:|gemini:|groq:|perplexity:/i);
  assert.doesNotMatch(workflow, /OPENAI_API_KEY|ANTHROPIC_API_KEY|GEMINI_API_KEY|GROQ_API_KEY|PERPLEXITY_API_KEY/);
});

test("safety evals exercise native URL, redaction, and inert source-text boundaries", () => {
  assert.match(provider, /validatePublicSourceUrl/);
  assert.match(provider, /redactOperationalText/);
  assert.match(provider, /inspectSourceUrl/);
  for (const phrase of [
    "rejects file URLs",
    "rejects localhost",
    "rejects cloud metadata addresses",
    "rejects credential-bearing source URLs",
    "rejects nonstandard source ports",
    "redacts bearer-shaped operational secrets",
    "redacts query-string token values",
    "redacts key-shaped values",
    "prompt-injection-looking page content",
  ]) {
    assert.match(config, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  }
});

test("Knip starts audit-first without hiding execution failures", () => {
  assert.match(workflow, /knip --reporter json > quality-results\/knip\.json/);
  assert.match(workflow, /knip_status=\$\?/);
  assert.match(workflow, /validate-knip-audit\.mjs quality-results\/knip\.json "\$knip_status"/);
  assert.doesNotMatch(workflow, /continue-on-error/);
});
