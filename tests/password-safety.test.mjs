import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { checkPasswordSafety, HashRangeUnavailable } from "../lib/password-safety.ts";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

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

test("signup and recovery enforce the server-side safety boundary", async () => {
  const [safety, signup, recovery] = await Promise.all([
    text("lib/password-safety.ts"),
    text("app/api/auth/signup/route.ts"),
    text("app/api/auth/password/route.ts"),
  ]);

  assert.match(safety, /crypto\.randomUUID\(\)/);
  assert.match(safety, /digestHex\("SHA-256", token\)/);
  assert.match(safety, /digestHex\("SHA-256", normalizedEmail\)/);
  assert.match(safety, /rpc\/issue_signup_security_attestation/);
  assert.match(safety, /serviceRole: true/);
  assert.match(safety, /p_token_hash: tokenHash/);
  assert.match(safety, /p_email_hash: emailHash/);
  assert.doesNotMatch(safety, /p_password|password_hash/);

  assert.match(signup, /checkPasswordSafety\(password\)/);
  assert.match(signup, /issueSignupSecurityAttestation\(email\)/);
  assert.match(signup, /signup_security_attestation: signupSecurityAttestation/);
  assert.match(signup, /No account was created/);

  assert.match(recovery, /checkPasswordSafety\(password\)/);
  assert.match(recovery, /recovery !== "1"/);
  assert.match(recovery, /Your password was not changed/);
});
