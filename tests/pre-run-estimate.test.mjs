import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const text = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("run launcher shows bounded usage and cost before dispatch", async () => {
  const [data, launcher, route, accessibility] = await Promise.all([
    text("lib/data.ts"),
    text("components/run-launcher.tsx"),
    text("app/api/runs/route.ts"),
    text("app/app/workspace-accessibility.css"),
  ]);

  assert.match(data, /estimateReservedRunCost/);
  assert.match(data, /estimatedMaxCostPerQuestionUsd/);
  assert.match(launcher, /Estimated usage/);
  assert.match(launcher, /Reserved maximum cost/);
  assert.match(launcher, /Estimate only/);
  assert.match(launcher, /selectedProvider\.estimatedMaxCostPerQuestionUsd \* selectedPrompts\.length/);
  assert.match(route, /estimatedMaximumCost = estimateReservedRunCost/);
  assert.match(route, /exceeds the configured per-run spending ceiling/);
  assert.match(accessibility, /\.app-frame \.run-estimate \{[\s\S]*--muted: #455a55;[\s\S]*color: #10110f;/);
  assert.match(accessibility, /\.app-frame \.run-estimate strong \{[\s\S]*color: #10110f;/);
  assert.match(accessibility, /\.app-frame \.run-estimate span,[\s\S]*\.app-frame \.run-estimate p \{[\s\S]*color: #455a55;/);
});
