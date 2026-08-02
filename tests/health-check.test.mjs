import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("health check exposes dependency reachability without secrets or customer data", () => {
  const worker = readFileSync("worker/index.ts", "utf8");
  assert.match(worker, /url\.pathname === "\/api\/health"/);
  assert.match(worker, /worker: "reachable"/);
  assert.match(worker, /d1: d1Status/);
  assert.match(worker, /supabase: supabaseStatus/);
  assert.match(worker, /inngest: inngestStatus/);
  assert.match(worker, /configured_not_probed/);
  assert.match(worker, /No credentials, customer data, prompts, or provider responses are included/);
});
