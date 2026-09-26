import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { attachProviderAttempt, resolveProviderAttempt } from "../lib/jobs/provider-attempt-receipt.ts";

test("durable collection receipt retains the exact provider attempt across function-level retries", () => {
  const answer = { answer: "Grounded response", citations: [{ url: "https://example.org" }] };
  const collectedInAttemptTwo = attachProviderAttempt(answer, 2);
  const persistedInAttemptFour = resolveProviderAttempt(collectedInAttemptTwo, 4);
  assert.equal(persistedInAttemptFour.attemptNumber, 2);
  assert.equal(persistedInAttemptFour.answer, answer);
  assert.equal(persistedInAttemptFour.legacy, false);
});

test("legacy pre-release step results are flagged instead of misrepresented as proven", () => {
  const legacyResult = { answer: "Prior deployment answer" };
  const recovered = resolveProviderAttempt(legacyResult, 3);
  assert.equal(recovered.legacy, true);
  assert.equal(recovered.attemptNumber, 3);
  assert.equal(recovered.answer, legacyResult);
});

test("malformed receipts fail closed instead of inventing a successful provider attempt", () => {
  assert.throws(() => attachProviderAttempt({}, 0), /positive/);
  assert.throws(() => attachProviderAttempt({}, 1.5), /positive/);
  assert.throws(() => resolveProviderAttempt({
    _foremention_collected_attempt_receipt: 1,
    successfulAttemptNumber: 0,
    answer: {},
  }, 2), /malformed/);
  assert.throws(() => resolveProviderAttempt({
    _foremention_collected_attempt_receipt: 1,
    successfulAttemptNumber: 2,
  }, 2), /malformed/);
  assert.throws(() => resolveProviderAttempt({ answer: "old" }, 0), /positive/);
});

test("collection and persistence keep their independent durable steps and propagate the actual success receipt", async () => {
  const code = await readFile(new URL("../lib/jobs/inngest.ts", import.meta.url), "utf8");
  assert.match(code, /return attachProviderAttempt\(answer, recordedAttemptNumber\)/);
  assert.match(code, /resolveProviderAttempt<ProviderAnswer>\(collected, attempt \+ 1\)/);
  assert.match(code, /persistAnswer\(run, prompt, providerId, successfulReceipt\.answer, identity, successfulReceipt\.attemptNumber\)/);
  assert.match(code, /\`collect-\$\{providerId\}-\$\{prompt\.prompt_key\}\`/);
  assert.match(code, /\`persist-\$\{providerId\}-\$\{prompt\.prompt_key\}\`/);
  assert.doesNotMatch(code, /persistAnswer\(run, prompt, providerId, answer, identity, attempt \+ 1\)/);
  const persistAnswerSegment = code.slice(code.indexOf("async function persistAnswer("), code.indexOf("export const runMultiEngineScan"));
  assert.match(persistAnswerSegment, /status: "complete",[\s\S]*?error_code: null,[\s\S]*?error_detail: null,/);
});
