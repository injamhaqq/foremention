import assert from "node:assert/strict";
import test from "node:test";

const rotation = await import("../lib/secret-rotation.ts");

test("rotation reminders become due after ninety days without exposing secret values", () => {
  const previous = process.env.GROQ_API_KEY_ROTATED_AT;
  process.env.GROQ_API_KEY_ROTATED_AT = "2026-01-01T00:00:00.000Z";
  try {
    const items = rotation.getSecretRotationStatuses(Date.parse("2026-05-01T00:00:00.000Z"));
    const groq = items.find((item) => item.label === "Groq provider key");
    assert.equal(groq?.state, "due");
    assert.equal(groq?.ageDays, 120);
  } finally {
    if (previous === undefined) delete process.env.GROQ_API_KEY_ROTATED_AT; else process.env.GROQ_API_KEY_ROTATED_AT = previous;
  }
});
