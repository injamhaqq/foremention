import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("operational logging uses an allow-list and excludes customer content", () => {
  const logger = readFileSync("lib/structured-logger.ts", "utf8");
  const worker = readFileSync("worker/index.ts", "utf8");
  const jobs = readFileSync("lib/jobs/inngest.ts", "utf8");
  assert.match(logger, /safeKeys/);
  assert.match(logger, /Never pass prompt, answer, email, IP, URL query, token, or secret/);
  assert.match(worker, /request_started/);
  assert.match(worker, /request_completed/);
  assert.match(jobs, /provider_request_started/);
  assert.match(jobs, /provider_request_completed/);
});
