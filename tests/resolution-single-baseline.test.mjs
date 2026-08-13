import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const route = new URL("../app/api/resolutions/route.ts", import.meta.url);

test("resolution generation uses persisted historical question text from one exact baseline run", async () => {
  const source = await readFile(route, "utf8");

  assert.match(source, /run_answers\?select=id,run_id,prompt_id,prompt_text,provider,model,answer_text/);
  assert.match(source, /const baselineRunId = baselineRuns\[0\]\?\.id \|\| null/);
  assert.match(source, /candidateAnswers\.filter\(\(row\) => row\.run_id === baselineRunId\)/);
  assert.match(source, /question: answer\.prompt_text \|\| null/);
  assert.doesNotMatch(source, /prompts\?select=id,prompt_text/);
  assert.doesNotMatch(source, /promptById/);
});

test("Resolution Center does not silently order customer work by the legacy generated priority score", async () => {
  const source = await readFile(route, "utf8");

  assert.match(source, /opportunities\?select=id,title,next_action,source_id,created_at/);
  assert.match(source, /status=in\.\(open,qualified,approved,in_progress\)&order=created_at\.desc/);
  assert.doesNotMatch(source, /order=priority_score\.desc/);
});
