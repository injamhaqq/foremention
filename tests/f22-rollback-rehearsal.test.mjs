import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("F22 main CI rehearses a deployable rollback candidate from the previous main SHA", async () => {
  const [workflow, script] = await Promise.all([
    text(".github/workflows/ci.yml"),
    text("scripts/rehearse-rollback-build.sh"),
  ]);
  assert.match(workflow, /Rehearse rollback build from previous main/);
  assert.match(workflow, /ROLLBACK_SHA: \$\{\{ github\.event\.before \}\}/);
  assert.match(workflow, /bash scripts\/rehearse-rollback-build\.sh/);
  assert.match(script, /git worktree add --detach/);
  assert.match(script, /pnpm install --frozen-lockfile/);
  assert.match(script, /pnpm build/);
  assert.match(script, /wrangler deploy --dry-run/);
});
