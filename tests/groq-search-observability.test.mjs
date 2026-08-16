import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("Groq web-search execution remains distinct from returned citations", async () => {
  const [adapter, diagnostics, page, canary, envExample] = await Promise.all([
    text("lib/providers/groq.ts"),
    text("lib/provider-run-diagnostics.ts"),
    text("app/app/runs/[id]/page.tsx"),
    text("scripts/first-evidence-production-canary.mjs"),
    text(".env.example"),
  ]);

  assert.match(adapter, /tool\.type === "search"/);
  assert.match(adapter, /searchObservationVersion: 1/);
  assert.match(adapter, /searchResultCount/);
  assert.match(adapter, /searchUsed/);
  assert.doesNotMatch(adapter, /searchUsed:\s*citations\.length\s*>\s*0/);

  // The pinned 2025-07-23 Compound version uses paid basic web search. Because
  // web_search is the only enabled tool, requiring a tool call must force
  // evidence collection rather than silently accepting a memory-only answer.
  assert.match(adapter, /Groq-Model-Version": process\.env\.GROQ_MODEL_VERSION \|\| "2025-07-23"/);
  assert.match(adapter, /enabled_tools: \["web_search"\]/);
  assert.match(adapter, /tool_choice:\s*"required"/);
  assert.match(adapter, /GROQ_BASIC_SEARCH_REQUEST_COST_USD\s*=\s*0\.005/);
  assert.match(adapter, /rates\.requestUsd\s*<\s*GROQ_BASIC_SEARCH_REQUEST_COST_USD/);
  assert.match(adapter, /Groq fixed request cost must reserve at least/);
  assert.match(envExample, /GROQ_REQUEST_COST_USD=0\.005/);

  assert.match(diagnostics, /raw_json/);
  assert.match(diagnostics, /sanitizeProviderRunDiagnostics/);
  assert.match(diagnostics, /searchObservationVersion !== 1/);
  assert.match(diagnostics, /provider=eq\.groq/);
  assert.match(diagnostics, /organization_id=eq\./);
  assert.match(diagnostics, /run_id=eq\./);
  assert.match(diagnostics, /encodeURIComponent\(organizationId\)/);
  assert.match(diagnostics, /encodeURIComponent\(runId\)/);
  assert.match(diagnostics, /searchResultCount/);
  assert.match(diagnostics, /searchUsed/);
  assert.doesNotMatch(diagnostics, /arguments|content|reasoning|snippet/i);

  assert.match(page, /loadProviderRunDiagnostics/);
  assert.match(page, /data-provider-search-used/);
  assert.match(page, /data-provider-search-result-count/);
  assert.match(page, /structured search-result count was not recorded/i);
  assert.match(page, /search execution and returned citations are separate facts/i);
  assert.doesNotMatch(page, /raw_json|raw_response/);

  assert.match(canary, /providerSearchUsed/);
  assert.match(canary, /providerSearchResultCount/);
  assert.match(canary, /data-provider-search-used/);
  assert.match(canary, /data-provider-search-result-count/);
  assert.match(canary, /provider-search-diagnostics-recorded/);
});
