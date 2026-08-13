import assert from "node:assert/strict";
import test from "node:test";
import { checkPasswordSafety, HashRangeUnavailable } from "../lib/password-safety.ts";

const sha1Hex = async (value) => {
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(value));
  return Buffer.from(digest).toString("hex").toUpperCase();
};

test("password safety sends only a five-character hash prefix and detects a match", async () => {
  const password = "Correct-Horse-Battery-Staple!9";
  const hash = await sha1Hex(password);
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);
  let requestedUrl = "";
  let requestedHeaders = null;
  const result = await checkPasswordSafety(password, {
    fetchImpl: async (url, init) => {
      requestedUrl = String(url);
      requestedHeaders = init?.headers || null;
      return new Response(`${suffix}:42\r\n${"A".repeat(35)}:0\r\n`, { status: 200 });
    },
  });
  assert.equal(result.compromised, true);
  assert.equal(result.breachCount, 42);
  assert.ok(requestedUrl.endsWith(prefix));
  assert.equal(requestedUrl.includes(suffix), false);
  assert.equal(requestedUrl.includes(password), false);
  assert.equal(requestedHeaders?.["add-padding"], "true");
});

test("password safety treats padded zero-count rows as not compromised", async () => {
  const password = "Another-Unique-Password!8";
  const hash = await sha1Hex(password);
  const suffix = hash.slice(5);
  const result = await checkPasswordSafety(password, {
    fetchImpl: async () => new Response(`${suffix}:0\r\n`, { status: 200 }),
  });
  assert.deepEqual(result, { compromised: false, breachCount: 0 });
});

test("password safety fails closed when the range service is unavailable", async () => {
  await assert.rejects(
    () => checkPasswordSafety("Unique-Password-For-Test!7", { fetchImpl: async () => new Response("down", { status: 503 }) }),
    HashRangeUnavailable,
  );
});
