import assert from "node:assert/strict";
import test from "node:test";

const security = await import("../lib/account-security.ts");

function unsignedJwt(payload) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none", typ: "JWT" })}.${encode(payload)}.`;
}

test("invitation tokens are stored as deterministic hashes, not raw secrets", async () => {
  assert.equal(await security.sha256Hex("same-token"), await security.sha256Hex("same-token"));
  assert.notEqual(await security.sha256Hex("same-token"), "same-token");
  assert.notEqual(await security.sha256Hex("same-token"), await security.sha256Hex("other-token"));
  assert.match(security.createOpaqueToken(), /^[A-Za-z0-9_-]{40,}$/);
});

test("destructive account requests require a recent authenticated session", () => {
  const now = Math.floor(Date.now() / 1000);
  assert.equal(security.isRecentAccessToken(unsignedJwt({ iat: now - 60 })), true);
  assert.equal(security.isRecentAccessToken(unsignedJwt({ iat: now - 60 * 60 })), false);
  assert.equal(security.isRecentAccessToken("not-a-jwt"), false);
});
