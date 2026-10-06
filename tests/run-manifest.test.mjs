import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const text = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Recommendation Records expose an inspectable persisted run manifest", async () => {
  const [manifest, page, panel] = await Promise.all([
    text("lib/run-manifest.ts"),
    text("app/app/runs/[id]/page.tsx"),
    text("components/run-manifest-panel.tsx"),
  ]);

  assert.match(manifest, /runs\?select=id,organization_id,project_id,status,provider_ids,prompt_count,answer_count,requested_units,estimated_max_cost_usd,actual_cost_usd,methodology_version/);
  assert.match(manifest, /project_id=eq\.\$\{context\.projectId\}/);
  assert.match(manifest, /run_prompt_selections\?select=prompt_id,prompt_key,prompt_text,locale,market/);
  assert.match(manifest, /run_attempts\?select=prompt_key,provider,model,status,attempt_number/);
  assert.match(manifest, /measurement_context_json/);
  assert.match(manifest, /failedObservations/);
  assert.match(manifest, /excludedObservations/);
  assert.match(manifest, /missingObservations/);

  assert.match(manifest, /MAX_RUN_MANIFEST_QUESTIONS = 100/);
  assert.match(manifest, /MAX_RUN_MANIFEST_ATTEMPTS = 500/);
  assert.match(manifest, /MAX_RUN_MANIFEST_ANSWERS = 500/);
  assert.match(manifest, /MAX_RUN_MANIFEST_PROMPT_VERSIONS = 500/);
  assert.match(manifest, /selections\.length !== Number\(run\.prompt_count\)/);
  assert.match(manifest, /answers\.length !== Number\(run\.answer_count\)/);
  assert.match(manifest, /promptVersions\.length > MAX_RUN_MANIFEST_PROMPT_VERSIONS\) return null/);

  assert.match(page, /loadRunManifest\(viewer, id\)/);
  assert.match(page, /<RunManifestPanel manifest=\{manifest\} \/>/);
  assert.match(panel, /Measurement contract/);
  assert.match(panel, /Run manifest/);
  assert.match(panel, /Question snapshot and version identity/);
});

test("measurement surfaces distinguish search-backed APIs from consumer interfaces", async () => {
  const [manifest, methodology, panel] = await Promise.all([
    text("lib/run-manifest.ts"),
    text("lib/methodology-registry.ts"),
    text("components/run-manifest-panel.tsx"),
  ]);

  for (const provider of ["openai", "gemini", "anthropic", "perplexity", "groq", "cloudflare"]) {
    assert.match(manifest, new RegExp(`"${provider}"`));
  }
  assert.match(manifest, /kind: "search-backed-provider-api"/);
  assert.match(manifest, /kind: "provider-api"/);
  assert.match(manifest, /consumerInterfaceEquivalent: false/);
  assert.match(methodology, /observationSurface: "provider-api"/);
  assert.match(panel, /not an observation of the provider's consumer application interface/);
  assert.match(panel, /not an observation of a consumer application interface/);
});
