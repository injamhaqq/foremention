import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const read = (file) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

test("public visibility score uses five grounded Cloudflare Browser Run answers without fabricated fallback", () => {
  const worker = read("worker/index.ts");
  const retrieval = read("lib/free-web-retrieval.ts");
  assert.match(worker, /answers\.length !== 5/);
  assert.match(worker, /No result was invented/);
  assert.match(worker, /runPublicGroundedCloudflare/);
  assert.match(worker, /runGroundedCloudflareWithBinding/);
  assert.match(worker, /provider: "Cloudflare Workers AI \+ Browser Run"/);
  assert.match(retrieval, /https:\/\/search\.brave\.com/);
  assert.match(retrieval, /quickAction\("links"/);
  assert.match(retrieval, /cloudflare-browser-search/);
  assert.match(worker, /appearedIn/);
  assert.match(worker, /methodology/);
  assert.doesNotMatch(worker, /Math\.random/);
});

test("public visibility score is free-only, hashed-rate-limited, cached, and shareable", () => {
  const worker = read("worker/index.ts");
  const schema = read("db/schema.ts");
  const ui = read("components/visibility-score-form.tsx");
  assert.match(worker, /FOREMENTION_FREE_ONLY_MODE/);
  assert.match(worker, /env\.AI/);
  assert.match(worker, /env\.BROWSER/);
  assert.match(worker, /env\.CLOUDFLARE_MODEL/);
  const scoreSlice = worker.slice(worker.indexOf("async function handleVisibilityScore"), worker.indexOf("async function handlePromptCoverage"));
  assert.doesNotMatch(scoreSlice, /GEMINI_API_KEY|api\.groq\.com|s\.jina\.ai/);
  assert.match(worker, /sha256/);
  assert.match(schema, /public_visibility_scores/);
  assert.match(ui, /Copy share link/);
  assert.match(ui, /Three checks per day/);
});
