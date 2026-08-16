import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("Groq web-search execution remains distinct from returned citations", async () => {
  const [adapter, diagnostics, page, canary, envExample, workerConfig, inngest] = await Promise.all([
    text("lib/providers/groq.ts"),
    text("lib/provider-run-diagnostics.ts"),
    text("app/app/runs/[id]/page.tsx"),
    text("scripts/first-evidence-production-canary.mjs"),
    text(".env.example"),
    text("wrangler.jsonc"),
    text("lib/jobs/inngest.ts"),
  ]);

  assert.match(adapter, /searchObservationVersion: 1/);
  assert.match(adapter, /searchResultCount/);
  assert.match(adapter, /searchUsed/);
  assert.doesNotMatch(adapter, /searchUsed:\s*citations\.length\s*>\s*0/);

  // The production Compound request was empirically rejected with HTTP 400 when
  // tool_choice=required was combined with compound_custom. Use Groq's documented
  // GPT-OSS Browser Search contract instead, with only browser search available.
  assert.match(adapter, /tools:\s*\[\{\s*type:\s*"browser_search"\s*\}\]/);
  assert.match(adapter, /tool_choice:\s*"required"/);
  assert.match(adapter, /reasoning_effort:\s*"low"/);
  assert.doesNotMatch(adapter, /compound_custom/);
  assert.doesNotMatch(adapter, /Groq-Model-Version/);
  assert.match(adapter, /GROQ_BROWSER_SEARCH_RESERVED_USD\s*=\s*0\.05/);
  assert.match(adapter, /rates\.requestUsd\s*<\s*GROQ_BROWSER_SEARCH_RESERVED_USD/);
  assert.match(adapter, /Groq fixed request cost must reserve at least/);

  assert.match(envExample, /GROQ_MODEL=openai\/gpt-oss-20b/);
  assert.match(envExample, /GROQ_INPUT_COST_PER_MILLION_USD=0\.075/);
  assert.match(envExample, /GROQ_OUTPUT_COST_PER_MILLION_USD=0\.30/);
  assert.match(envExample, /GROQ_REQUEST_COST_USD=0\.05/);
  assert.match(workerConfig, /"GROQ_MODEL":\s*"openai\/gpt-oss-20b"/);
  assert.match(workerConfig, /"GROQ_INPUT_COST_PER_MILLION_USD":\s*"0\.075"/);
  assert.match(workerConfig, /"GROQ_OUTPUT_COST_PER_MILLION_USD":\s*"0\.30"/);
  assert.match(workerConfig, /"GROQ_REQUEST_COST_USD":\s*"0\.05"/);

  // Permanent provider rejections must not consume all Inngest step retries.
  assert.match(inngest, /NonRetriableError/);
  assert.match(inngest, /error instanceof ProviderRequestError\s*&&\s*!error\.retryable/);

  // The canary may archive only the already-redacted operational run summary,
  // never provider raw payloads or customer prompt content.
  assert.match(canary, /runErrorSummary/);
  assert.match(canary, /run\.errorSummary/);
  assert.doesNotMatch(canary, /raw_response|raw_json/);

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
