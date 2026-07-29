import assert from "node:assert/strict";
import test from "node:test";

const { ProviderRequestError } = await import("../lib/providers/types.ts");

test("provider failures preserve useful detail without retaining credentials", () => {
  const error = new ProviderRequestError(
    "Gemini",
    404,
    "[NOT_FOUND] Model was not found. api_key=AIzaSyExampleCredentialValue123456",
  );
  assert.equal(error.status, 404);
  assert.equal(error.code, "provider_rejected");
  assert.equal(error.retryable, false);
  assert.match(error.message, /NOT_FOUND/);
  assert.match(error.message, /Model was not found/);
  assert.doesNotMatch(error.message, /AIzaSyExampleCredentialValue123456/);
});

test("rate limits remain explicitly retryable", () => {
  const error = new ProviderRequestError("Gemini", 429, "[RESOURCE_EXHAUSTED] Free-tier quota reached.");
  assert.equal(error.code, "rate_limited");
  assert.equal(error.retryable, true);
});
