import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("review reconciliation preserves terminal agent records and closes only stale telemetry", async () => {
  const controlPlane = await read("lib/agent-control-plane.ts");

  assert.match(controlPlane, /TERMINAL_AGENT_EXECUTION_STATUSES[\s\S]*complete[\s\S]*failed[\s\S]*cancelled/);
  assert.match(controlPlane, /reconcileReviewedRunAgentTelemetry/);
  assert.match(controlPlane, /human-review-gate/);
  assert.match(controlPlane, /run-supervisor/);
  assert.match(controlPlane, /TERMINAL_AGENT_EXECUTION_STATUSES\.has\(existing\.status\)/);
  assert.match(controlPlane, /attemptCount:\s*existing\?\.attempt_count \?\? 0/);
  assert.match(controlPlane, /reviewFinalized:\s*true/);
});

test("successful human review reconciles collection telemetry as a non-critical side effect", async () => {
  const route = await read("app/api/runs/[id]/review/route.ts");

  assert.match(route, /reconcileReviewedRunAgentTelemetry/);
  assert.match(route, /failedAttemptCount:\s*failedAttempts\.length/);
  assert.match(route, /verifiedSourceCount:\s*sourceCount/);
  assert.ok(route.indexOf("Promise.allSettled([") < route.indexOf("reconcileReviewedRunAgentTelemetry({"));
});
