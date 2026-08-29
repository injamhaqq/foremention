import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("production canary verifies evidence inspection inside the Recommendation Record", async () => {
  const canary = await text("scripts/first-evidence-production-canary.mjs");

  assert.match(canary, /canonical-contained-evidence/);
  assert.match(canary, /Evidence inspection/);
  assert.match(canary, /sourceReviewFormVisible/);
  assert.doesNotMatch(canary, /Source X-Ray|sourceXrayOpened|source-xray-/i);
  assert.doesNotMatch(canary, /a\[href\^="\/app\/sources\/"\]/);
});

test("authenticated warm inspection surfaces pin accessible foreground colors", async () => {
  const css = await text("app/canonical-release-qa.css");

  assert.match(css, /\.app-frame \.question-planner/);
  assert.match(css, /\.app-frame \.prompt-create/);
  assert.match(css, /\.app-frame \.inline-notice/);
  assert.match(css, /\.app-frame \.data-quality-grid/);
  assert.match(css, /\.app-frame \.review-queue-callout/);
  assert.match(css, /\.app-frame \.settings-grid input/);
  assert.match(css, /\.app-frame \.latest-answer > p/);
  assert.match(css, /\.app-frame \.review-action > div > p/);
  assert.match(css, /color:\s*#0d0f0e\s*!important/i);
  assert.match(css, /color:\s*#4f5952\s*!important/i);
  assert.match(css, /color:\s*#d7dbd5\s*!important/i);
}
);
