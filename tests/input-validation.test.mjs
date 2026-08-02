import assert from "node:assert/strict";
import test from "node:test";

const validation = await import("../lib/input-validation.ts");

test("form inputs are normalized, size-capped, and reject control characters", () => {
  assert.equal(validation.cleanText("  Foremention\u0000\n", 50), "Foremention");
  assert.equal(validation.cleanText("x".repeat(12), 8), "x".repeat(8));
  assert.deepEqual(validation.cleanStringArray([" A ", "A", 7, "B"], 10, 5), ["A", "B"]);
});

test("identifiers and public URLs are strictly validated", () => {
  assert.equal(validation.isUuid("00000000-0000-4000-8000-000000000000"), true);
  assert.equal(validation.isUuid("not-an-id"), false);
  assert.equal(validation.publicHttpsUrl("https://example.com/path"), "https://example.com/path");
  assert.equal(validation.publicHttpsUrl("http://example.com"), null);
  assert.equal(validation.publicHttpsUrl("https://user:pass@example.com"), null);
});
