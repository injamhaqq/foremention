import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

test("public browser suites use distinct local Workers and fail if a suite kills its Worker", async () => {
  const workflow=await readFile(new URL("../.github/workflows/browser-acceptance.yml",import.meta.url),"utf8");
  const start=workflow.indexOf("          assert_worker_healthy() {");
  const first=workflow.indexOf("          node scripts/browser-acceptance.mjs",start);
  const zoom=workflow.indexOf("          node scripts/browser-zoom-reflow.mjs",first);
  const canonical=workflow.indexOf("          node scripts/canonical-brand-visual-proof.mjs",zoom);
  const stop=workflow.indexOf("          stop_worker",canonical);
  assert.ok(start>0 && first>start && zoom>first && canonical>zoom && stop>canonical);
  assert.match(workflow.slice(start,first),/kill -0 "\$server_pid"/);
  assert.match(workflow.slice(start,first),/\/api\/health/);
  assert.match(workflow.slice(first,zoom),
    /browser-acceptance\.mjs\s+assert_worker_healthy\s+start_worker\s+/);
  assert.match(workflow.slice(zoom,canonical),
    /browser-zoom-reflow\.mjs\s+assert_worker_healthy\s+start_worker\s+/);
  assert.match(workflow.slice(canonical,stop),
    /canonical-brand-visual-proof\.mjs\s+assert_worker_healthy\s+/);
  assert.doesNotMatch(workflow.slice(start,stop),/\|\| true|retry|continue-on-error/);
  assert.match(workflow,/FOREMENTION_EXPECTED_BUILD_COMMIT:/,
    "trusted production exact-head smoke remains independent");
  assert.match(workflow,/Run trusted production browser and accessibility acceptance/,
    "the production path must remain unchanged");
});
