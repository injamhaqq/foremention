import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("intelligence movement requires exact model and methodology comparability", async () => {
  const intelligence = await readFile(new URL("../lib/intelligence-loop.ts", import.meta.url), "utf8");

  assert.match(intelligence, /methodology_version: string/);
  assert.match(intelligence, /provider_ids,methodology_version,prompt_count/);
  assert.match(intelligence, /row\.prompt_key.*row\.provider.*model/s);
  assert.match(intelligence, /comparisonSignature\(run: RunRow, rows: AnswerRow\[\]\)/);
  assert.match(intelligence, /run\.methodology_version/);
  assert.match(intelligence, /comparisonSignature\(latestRun,/);
  assert.match(intelligence, /comparisonSignature\(candidate,/);
  assert.match(intelligence, /same question, provider, exact model, and methodology/);
});
