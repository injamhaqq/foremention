import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("Cloudflare builds persist their exact Git commit into the runtime health contract", async () => {
  const [prepareConfig, worker] = await Promise.all([
    text("scripts/prepare-worker-config.mjs"),
    text("worker/index.ts"),
  ]);

  assert.match(prepareConfig, /WORKERS_CI_COMMIT_SHA/);
  assert.match(prepareConfig, /GITHUB_SHA/);
  assert.match(prepareConfig, /FOREMENTION_BUILD_COMMIT/);
  assert.match(prepareConfig, /git\s+rev-parse/i, "build provenance must fall back to the checked-out Git commit when provider env vars are absent");
  assert.match(prepareConfig, /\^\[0-9a-f\]\{40\}\$/i);
  assert.match(worker, /FOREMENTION_BUILD_COMMIT\?: string/);
  assert.match(worker, /buildCommit/);
  assert.match(worker, /\^\[0-9a-f\]\{40\}\$/i);
});