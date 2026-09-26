import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { measureRunPhase } from "../lib/jobs/run-phase-timing.ts";

function withCapturedLogs(operation) {
  const original = console.info;
  const lines = [];
  console.info = (line) => lines.push(JSON.parse(line));
  return Promise.resolve().then(operation).then(
    (value) => ({ value, lines }),
    (error) => ({ error, lines }),
  ).finally(() => { console.info = original; });
}

test("durable step timing logs only fixed operational metadata on success", async () => {
  const times = [10.25, 34.55];
  const { value, lines } = await withCapturedLogs(() =>
    measureRunPhase("load_run", "00000000-0000-4000-8000-000000000001", async () => 42, () => times.shift()),
  );
  assert.equal(value, 42);
  assert.deepEqual(lines, [{
    event: "run_phase_timing",
    runId: "00000000-0000-4000-8000-000000000001",
    phase: "load_run",
    status: 200,
    durationMs: 24,
  }]);
});

test("failed timed step propagates its original error and emits failure metadata without error content", async () => {
  const times = [100, 99];
  const original = new Error("synthetic-only SECRET=must-not-appear");
  const { error, lines } = await withCapturedLogs(() =>
    measureRunPhase("load_prompts", "00000000-0000-4000-8000-000000000002", async () => {
      throw original;
    }, () => times.shift()),
  );
  assert.equal(error, original);
  assert.equal(lines[0].status, 500);
  assert.equal(lines[0].durationMs, 0);
  assert.deepEqual(Object.keys(lines[0]).sort(), ["durationMs", "event", "phase", "runId", "status"]);
  assert.doesNotMatch(JSON.stringify(lines), /SECRET|synthetic-only/);
});

test("the fourteen timing markers remain entirely inside existing durable step callbacks", async () => {
  const code = await readFile(new URL("../lib/jobs/inngest.ts", import.meta.url), "utf8");
  for (const phase of ["load_run", "start_supervisor", "load_prompts", "load_identity", "record_question_scout", "check_provider_circuit", "mark_running", "start_collector", "persist_answer", "record_collector", "count_sources", "mark_for_review", "generate_source_map", "notify_owner"]) {
    assert.ok(code.includes(`measureRunPhase("${phase}"`), `missing ${phase}`);
  }
  assert.match(code, /step\.run\("load-and-revalidate-run", \(\) =>\s*measureRunPhase/);
  assert.match(code, /step\.run\("count-run-sources", \(\) =>\s*measureRunPhase/);
  assert.match(code, /step\.run\("mark-run-for-human-review", \(\) =>\s*measureRunPhase/);
  assert.match(code, /step\.run\(`collect-\$\{providerId\}-\$\{prompt\.prompt_key\}`/);
  assert.match(code, /step\.run\(\s*`persist-\$\{providerId\}-\$\{prompt\.prompt_key\}`/);
  // Time only the independent persistence step body, not provider collection or function replay.
  assert.match(code, /measureRunPhase\("persist_answer", run\.id, \(\) =>\s*persistAnswer\(/);
  assert.match(code, /step\.run\("generate-observed-source-map", \(\) =>\s*measureRunPhase\("generate_source_map"/);
  assert.match(code, /step\.run\("notify-run-owner", \(\) =>\s*measureRunPhase\("notify_owner"/);
  assert.doesNotMatch(code, /measureRunPhase\("persist_answer",[^]*?adapter\.run\(/);
  assert.doesNotMatch(code, /step\.run\("combined-provider-and-persistence/);
});
