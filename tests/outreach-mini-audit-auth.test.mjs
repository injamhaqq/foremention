import test from "node:test";
import assert from "node:assert/strict";
import { authorizeOutreachMiniAuditRequest } from "../lib/outreach-mini-audit-auth.ts";
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
