import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("Groq Browser Search reserves the full provider run envelope before queueing or another provider call", async () => {
  const [policy, route, job, adapter] = await Promise.all([
    text("lib/collection-policy.ts"),
    text("app/api/runs/route.ts"),
    text("lib/jobs/inngest.ts"),
    text("lib/providers/groq.ts"),
  ]);

  assert.match(policy, /export function estimateReservedRunCost/);
  assert.match(policy, /provider === "groq"/);
  assert.match(policy, /safePromptCount \* GROQ_SPEND_LIMITS\.maxRunCostUsd/);

  assert.match(route, /estimateReservedRunCost\(providerId, prompts\.length, rates\)/);
  assert.match(job, /estimateReservedRunCost\(providerId, prompts\.length, rates\)/);

  // Browser Search can expand provider-side context far beyond the buyer prompt.
  // Do not use the generic 512-token prompt estimate as Groq's pre-call reservation.
  assert.match(adapter, /estimatedPromptCost = GROQ_SPEND_LIMITS\.maxRunCostUsd/);
  assert.doesNotMatch(adapter, /estimatedPromptCost = estimateMaximumRunCost\(1, rates\)/);
});
