import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const read = (file) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

test("public prompt checker exposes one real web-retrieval-grounded answer with fetched citations", () => {
  const worker = read("worker/index.ts");
  const retrieval = read("lib/free-web-retrieval.ts");
  const start = worker.indexOf("async function handlePromptCoverage");
  const end = worker.indexOf("async function handleSourceGapRequest", start);
  const promptCheck = worker.slice(start, end);
  assert.match(promptCheck, /runPublicGroundedCloudflare/);
  assert.match(promptCheck, /provider: "Cloudflare Workers AI \+ Web Retrieval"/);
  assert.match(retrieval, /searchBrave/);\n  assert.match(retrieval, /searchDuckDuckGo/);\n  assert.match(retrieval, /searchBing/);
  assert.match(retrieval, /parseSearchHtmlLinks/);
  assert.match(retrieval, /keyless-search-evidence/);\n  assert.doesNotMatch(retrieval, /fetchSource|fetch\\(citation\\.url/);
  assert.match(promptCheck, /No result was invented/);
  assert.doesNotMatch(promptCheck, /env\.BROWSER|GEMINI_API_KEY|api\.groq\.com|s\.jina\.ai/);
});

test("public prompt checker is hashed-rate-limited and ends with a signup CTA", () => {
  const worker = read("worker/index.ts");
  const ui = read("components/prompt-coverage-checker.tsx");
  assert.match(worker, /publicRateLimit\(request, env, "prompt-check", 5/);
  assert.match(ui, /Track this question over time/);
  assert.match(ui, /not a permanent rank/);
});
