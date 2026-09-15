import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");
const exists = (path) => access(new URL(path, root));

test("CI blocks release when deterministic Foremention AI quality floors fail", async () => {
  const [workflow, pkg] = await Promise.all([
    text(".github/workflows/ci.yml"),
    text("package.json"),
  ]);
  assert.match(pkg, /"eval:gate"\s*:/);
  assert.match(workflow, /Run deterministic AI quality release gate/);
  assert.match(workflow, /pnpm eval:gate/);
  await exists("scripts/verify-ai-evaluation-gate.mjs");
  await exists("evals/release-quality-observations.json");
});
