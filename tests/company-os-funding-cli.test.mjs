import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const command = new URL("../scripts/prepare-funding-draft.mjs", import.meta.url);
const fixture = new URL("./fixtures/company-os-funding-draft.json", import.meta.url);
const run = (args) => spawnSync(process.execPath, ["--experimental-strip-types", command.pathname, ...args], { encoding: "utf8", timeout: 10000, maxBuffer: 4 * 1024 * 1024 });

test("the offline command yields a reviewable artifact with package integrity hashes", () => {
  const result = run([fixture.pathname]);
  assert.equal(result.status, 0, result.stderr);
  const artifact = JSON.parse(result.stdout);
  assert.equal(artifact.runtime, "offline-cli");
  assert.equal(artifact.pack.submissionAuthorized, false);
  assert.equal(artifact.pack.opportunities[0].readiness, "review_ready");
  assert.equal(artifact.pack.facts.find((row) => row.key === "company.country").value, "BD");
  assert.deepEqual(artifact.pack.opportunities[0].criteria[0].expected, ["BD", "IN"]);
  assert.equal(artifact.instructionPackages.length, 2);
  for (const instruction of artifact.instructionPackages) {
    const bytes = readFileSync(new URL("../" + instruction.instructionPath, import.meta.url));
    assert.equal(instruction.sha256, createHash("sha256").update(bytes).digest("hex"));
  }
  const { artifactDigest, ...reviewed } = artifact;
  assert.equal(artifactDigest, createHash("sha256").update(JSON.stringify(reviewed)).digest("hex"));
});

test("CLI errors do not expose malformed input contents and oversized inputs fail", () => {
  const folder = mkdtempSync(join(tmpdir(), "foremention-funding-test-"));
  try {
    const input = join(folder, "input.json");
    writeFileSync(input, '{"secret":"synthetic-sensitive-value",');
    const malformed = run([input]);
    assert.equal(malformed.status, 1);
    assert.equal(malformed.stdout, "");
    assert.ok(!malformed.stderr.includes("synthetic-sensitive-value"));
    writeFileSync(input, " ".repeat(2 * 1024 * 1024 + 1));
    const oversized = run([input]);
    assert.equal(oversized.status, 1);
    assert.ok(oversized.stderr.includes("FUNDING_DRAFT_INPUT_TOO_LARGE"));
  } finally { rmSync(folder, { recursive: true, force: true }); }
});

test("the CLI requires one explicit input file", () => {
  for (const args of [[], ["--help"], [fixture.pathname, "extra"]]) {
    const result = run(args);
    assert.equal(result.status, 2);
    assert.equal(result.stdout, "");
  }
});
