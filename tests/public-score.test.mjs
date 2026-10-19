import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const read = (file) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

test("public visibility score uses five grounded Cloudflare answers labelled with the retrieval that actually ran and never fabricates a fallback", () => {
  const worker = read("worker/index.ts");
  const retrieval = read("lib/free-web-retrieval.ts");
  // Exactly five answers in question order, or fail closed (lib/public-score-answers.mjs).
  assert.match(worker, /const answers = parsePublicScoreAnswers\(grounded\.answer\);\n  if \(!answers\) return/);
  assert.match(worker, /No result was invented/);
  assert.match(worker, /runPublicGroundedCloudflare/);
  assert.match(worker, /runGroundedCloudflareWithBinding/);
  // Evidence trust: the label follows grounded.retrievalProvider (Brave Search
  // or Bing RSS) and marks the references as Foremention's own retrieval.
  assert.match(worker, /provider: publicGroundedProviderLabel\(grounded\.retrievalProvider\)/);
  assert.match(worker, /referenceOrigin: "independent_retrieval"/);
  assert.doesNotMatch(worker, /provider: "Cloudflare Workers AI \+ Bing Search RSS"/);
  assert.match(retrieval, /https:\/\/www\.bing\.com\/search/);
  assert.match(retrieval, /Bing RSS returned no verifiable source URLs/);
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
  assert.match(worker, /env\.CLOUDFLARE_MODEL/);
  const scoreSlice = worker.slice(worker.indexOf("async function handleVisibilityScore"), worker.indexOf("async function handlePromptCoverage"));
  assert.doesNotMatch(scoreSlice, /GEMINI_API_KEY|api\.groq\.com/);
  assert.match(worker, /sha256/);
  assert.match(schema, /public_visibility_scores/);
  assert.match(ui, /Copy share link/);
  assert.match(ui, /Three checks per day/);
});
