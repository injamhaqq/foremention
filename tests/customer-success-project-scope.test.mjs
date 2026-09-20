import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { placementBelongsToProject } from "../lib/agent-os/customer-success-core.ts";

test("customer success links placements through project-owned prompts or runs", () => {
  const promptIds = new Set(["prompt-a"]);
  const runIds = new Set(["run-a"]);

  assert.equal(placementBelongsToProject({
    target_prompt_ids: ["prompt-a"],
    baseline_run_id: null,
    remeasurement_run_id: null,
  }, promptIds, runIds), true);

  assert.equal(placementBelongsToProject({
    target_prompt_ids: [],
    baseline_run_id: "run-a",
    remeasurement_run_id: null,
  }, promptIds, runIds), true);

  assert.equal(placementBelongsToProject({
    target_prompt_ids: [],
    baseline_run_id: null,
    remeasurement_run_id: "run-a",
  }, promptIds, runIds), true);
});

test("customer success excludes unlinked and other-project placements", () => {
  const promptIds = new Set(["prompt-a"]);
  const runIds = new Set(["run-a"]);

  assert.equal(placementBelongsToProject({
    target_prompt_ids: ["prompt-other"],
    baseline_run_id: "run-other",
    remeasurement_run_id: null,
  }, promptIds, runIds), false);

  assert.equal(placementBelongsToProject({
    target_prompt_ids: null,
    baseline_run_id: null,
    remeasurement_run_id: null,
  }, promptIds, runIds), false);
});

test("customer success never filters placements by nonexistent project_id", async () => {
  const source = await readFile(new URL("../lib/agent-os/customer-success.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /placements\?[^\n]*project_id=eq\./);
  assert.match(source, /placementBelongsToProject/);
});
