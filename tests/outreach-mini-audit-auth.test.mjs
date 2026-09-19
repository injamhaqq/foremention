import test from "node:test";
import assert from "node:assert/strict";
import { createHash, createPrivateKey, createPublicKey, sign } from "node:crypto";
import {
  authorizeOutreachMiniAuditRequest,
  authorizeSignedOutreachMiniAuditRequest,
  stableOutreachMiniAuditJson,
} from "../lib/outreach-mini-audit-auth.ts";
import { parseOutreachMiniAuditInput } from "../lib/outreach-mini-audit.ts";

test("outreach mini audit auth accepts the exact bearer secret", () => {
  const request = new Request("https://foremention.com/api/internal/outreach/mini-audit", {
    headers: { authorization: "Bearer test-secret-value" },
  });
  assert.equal(authorizeOutreachMiniAuditRequest(request, "test-secret-value"), true);
});

test("outreach mini audit auth rejects missing or invalid auth", () => {
  const missing = new Request("https://foremention.com/api/internal/outreach/mini-audit");
  const invalid = new Request("https://foremention.com/api/internal/outreach/mini-audit", {
    headers: { authorization: "Bearer wrong" },
  });
  assert.equal(authorizeOutreachMiniAuditRequest(missing, "test-secret-value"), false);
  assert.equal(authorizeOutreachMiniAuditRequest(invalid, "test-secret-value"), false);
});

test("mini audit input rejects more than five questions", () => {
  assert.throws(() => parseOutreachMiniAuditInput({
    brand: "Acme",
    domain: "acme.example",
    questions: ["q1", "q2", "q3", "q4", "q5", "q6"],
  }), /maximum of five/i);
});

test("mini audit input accepts three to five non-empty questions", () => {
  const parsed = parseOutreachMiniAuditInput({
    brand: "Acme",
    domain: "https://acme.example/",
    questions: [" q1 ", "q2", "q3"],
  });
  assert.equal(parsed.brand, "Acme");
  assert.equal(parsed.domain, "acme.example");
  assert.deepEqual(parsed.questions, ["q1", "q2", "q3"]);
});


function testSigningIdentity(secret) {
  const seed = createHash("sha256").update(secret, "utf8").digest();
  const prefix = Buffer.from("302e020100300506032b657004220420", "hex");
  const privateKey = createPrivateKey({
    key: Buffer.concat([prefix, seed]),
    format: "der",
    type: "pkcs8",
  });
  const publicKey = createPublicKey(privateKey).export({ format: "der", type: "spki" }).toString("base64url");
  return { privateKey, publicKey };
}

function signedRequest(body, secret, timestamp) {
  const { privateKey, publicKey } = testSigningIdentity(secret);
  const bodyText = stableOutreachMiniAuditJson(body);
  const bodyHash = createHash("sha256").update(bodyText, "utf8").digest("hex");
  const payload = [
    "foremention-outreach-v1",
    timestamp,
    "POST",
    "/api/internal/outreach/mini-audit",
    bodyHash,
  ].join("\n");
  const signature = sign(null, Buffer.from(payload, "utf8"), privateKey).toString("base64url");
  const keyId = createHash("sha256").update(publicKey, "utf8").digest("hex").slice(0, 16);
  return {
    request: new Request("https://foremention.com/api/internal/outreach/mini-audit", {
      method: "POST",
      headers: {
        "x-foremention-key-id": keyId,
        "x-foremention-timestamp": timestamp,
        "x-foremention-signature": signature,
      },
    }),
    publicKey,
  };
}

test("outreach mini audit auth accepts a pinned, fresh signature over canonical body content", () => {
  const body = {
    domain: "acme.example",
    brand: "Acme",
    questions: ["q1", "q2", "q3"],
  };
  const nowMs = Date.parse("2026-09-19T12:00:00.000Z");
  const timestamp = new Date(nowMs).toISOString();
  const { request, publicKey } = signedRequest(body, "railway-side-secret", timestamp);
  assert.equal(authorizeSignedOutreachMiniAuditRequest(request, body, [publicKey], nowMs), true);
});

test("outreach mini audit signature rejects stale timestamps and changed bodies", () => {
  const body = { brand: "Acme", domain: "acme.example", questions: ["q1", "q2", "q3"] };
  const signedAt = Date.parse("2026-09-19T12:00:00.000Z");
  const timestamp = new Date(signedAt).toISOString();
  const { request, publicKey } = signedRequest(body, "railway-side-secret", timestamp);

  assert.equal(
    authorizeSignedOutreachMiniAuditRequest(request, body, [publicKey], signedAt + 6 * 60 * 1000),
    false,
  );
  assert.equal(
    authorizeSignedOutreachMiniAuditRequest(request, { ...body, brand: "Changed" }, [publicKey], signedAt),
    false,
  );
});
