import assert from "node:assert/strict";
import test from "node:test";
import { NonRetriableError } from "inngest";

const { ProviderRequestError } = await import("../lib/providers/types.ts");

test("provider step errors stop retries only for permanent provider rejections", async () => {
  const { toInngestProviderStepError } = await import("../lib/jobs/provider-step-error.ts");

  const permanent = new ProviderRequestError("Groq", 400, "[INVALID_REQUEST] Unsupported request contract.");
  const permanentResult = toInngestProviderStepError(permanent);
  assert.ok(permanentResult instanceof NonRetriableError);
  assert.equal(permanentResult.cause, permanent);
  assert.match(permanentResult.message, /Groq request failed \(400\)/);

  const rateLimited = new ProviderRequestError("Groq", 429, "[RATE_LIMITED] Try again later.");
  assert.equal(toInngestProviderStepError(rateLimited), rateLimited);

  const unavailable = new ProviderRequestError("Groq", 503, "[UNAVAILABLE] Temporary provider outage.");
  assert.equal(toInngestProviderStepError(unavailable), unavailable);

  const timeout = new DOMException("Timed out", "AbortError");
  assert.equal(toInngestProviderStepError(timeout), timeout);

  const unknown = new Error("Unexpected transient transport failure");
  assert.equal(toInngestProviderStepError(unknown), unknown);
});
