import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);
const root = new URL("../", import.meta.url);

const versions = {
  promptVersion: "prompt.v1",
  parserVersion: "parser.v1",
  provider: "groq",
  model: "example-model",
  modelVersion: "unreported",
  retrievalVersion: "retrieval.v1",
  policyVersion: "policy.v1",
  schemaVersion: "record.v1",
  evaluationVersion: "eval.v1",
};

test("evaluation CLI produces Markdown and JSON without external calls", async () => {
  const directory = await mkdtemp(join(tmpdir(), "foremention-ai-eval-"));
  try {
    const input = join(directory, "capture.json");
    const report = join(directory, "report.md");
    const json = join(directory, "summary.json");
    await writeFile(input, JSON.stringify({
      runId: "cli-test-run",
      dataset: {
        version: "cli.synthetic.v1",
        cases: [{
          id: "cli-case",
          category: "common",
          question: "Synthetic CLI question",
          privacy: { classification: "synthetic" },
          expected: { classification: "present" },
        }],
      },
      observations: [{
        caseId: "cli-case",
        versions,
        providerFailure: false,
        citations: [],
        assertions: [{ support: "supported" }],
        classification: "present",
        humanReviewDecision: "accepted",
        outputStructureValid: true,
        latencyMs: 100,
        costUsd: 0.01,
      }],
    }), "utf8");

    const { stdout, stderr } = await execFileAsync(process.execPath, [
      new URL("scripts/run-ai-evaluation.mjs", root).pathname,
      "--input", input,
      "--report", report,
      "--json", json,
    ], { cwd: new URL(".", root).pathname });

    assert.equal(stdout, "");
    assert.equal(stderr, "");
    const reportText = await readFile(report, "utf8");
    const summary = JSON.parse(await readFile(json, "utf8"));
    assert.match(reportText, /cli-test-run/);
    assert.match(reportText, /Accepted: 1/);
    assert.equal(summary.datasetVersion, "cli.synthetic.v1");
    assert.deepEqual(summary.summary.metrics.classificationAccuracy, { numerator: 1, denominator: 1, value: 1 });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
