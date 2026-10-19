import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const read = (file) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

test("public prompt checker exposes one real grounded Cloudflare answer labelled with the retrieval that actually ran", () => {
  const worker = read("worker/index.ts");
  const retrieval = read("lib/free-web-retrieval.ts");
  const start = worker.indexOf("async function handlePromptCoverage");
  const end = worker.indexOf("async function handleSourceGapRequest", start);
  const promptCheck = worker.slice(start, end);
  assert.match(promptCheck, /runPublicGroundedCloudflare/);
  // Evidence trust: the label follows grounded.retrievalProvider (Brave Search
  // or Bing RSS) and marks the references as Foremention's own retrieval.
  assert.match(promptCheck, /provider: publicGroundedProviderLabel\(grounded\.retrievalProvider\)/);
  assert.match(promptCheck, /referenceOrigin: "independent_retrieval"/);
  assert.doesNotMatch(promptCheck, /provider: "Cloudflare Workers AI \+ Bing Search RSS"/);
  assert.match(retrieval, /parseBingSearchRss/);
  assert.match(retrieval, /Bing RSS returned no verifiable source URLs/);
  assert.match(promptCheck, /No result was invented/);
  assert.doesNotMatch(promptCheck, /GEMINI_API_KEY|api\.groq\.com/);
});

test("public prompt checker is hashed-rate-limited and ends with a signup CTA", () => {
  const worker = read("worker/index.ts");
  const ui = read("components/prompt-coverage-checker.tsx");
  assert.match(worker, /publicRateLimit\(request, env, "prompt-check", 5/);
  assert.match(ui, /Track this question over time/);
  assert.match(ui, /not a permanent rank/);
});
