import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("Recommendation Engineering is the internal core category and Category Leadership OS is destination only", async () => {
  const [claude, skill, status, state] = await Promise.all([
    text("CLAUDE.md"),
    text(".claude/skills/foremention-product-truth/SKILL.md"),
    text("docs/billion-dollar-build/EXECUTION-STATUS.md"),
    text("FOREMENTION_STATE.md"),
  ]);
  for (const source of [claude, skill, status, state]) {
    assert.match(source, /Recommendation Engineering/);
    assert.match(source, /Recommendation Intelligence/);
    assert.match(source, /Category Leadership OS/);
    assert.match(source, /Change Specification/i);
  }
  assert.doesNotMatch(claude, /Category:\s*Recommendation Intelligence\./);
  assert.match(claude, /public positioning.*Recommendation Intelligence/i);
  assert.match(state, /do not merge #197 as-is/i);
});
