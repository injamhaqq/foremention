import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("completed runs can be repeated through the existing guarded queue endpoint", async () => {
  const button = await readFile(new URL("../components/run-rerun-button.tsx", import.meta.url), "utf8");
  const data = await readFile(new URL("../lib/data.ts", import.meta.url), "utf8");
  const route = await readFile(new URL("../app/api/runs/route.ts", import.meta.url), "utf8");
  assert.match(button, /fetch\("\/api\/runs"/);
  assert.match(button, /"idempotency-key": crypto\.randomUUID\(\)/);
  assert.match(button, /promptIds, providers: \[provider\]/);
  assert.match(data, /status=in\.\(complete,partial\)/);
  assert.match(data, /run_prompt_selections\?select=prompt_id/);
  assert.match(data, /organization_id=eq\.\$\{organizationId\}/);
  assert.match(route, /reserve_run_budget/);
  assert.match(route, /active_request_key/);
});
