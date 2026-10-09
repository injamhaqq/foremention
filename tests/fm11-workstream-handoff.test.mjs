import assert from "node:assert/strict";
import test from "node:test";
import { validateHandoff } from "../scripts/verify-workstream-handoff.mjs";

const sha = "a".repeat(40);
const now = Date.parse("2026-10-09T10:00:00Z");
const packet = () => ({
  workstream: "FM-11", baseSha: sha, branch: "fm-11/handoff-guard", prNumber: null,
  writeSet: ["docs/operations/FM-11-WORKSTREAM-PROTOCOL.md"],
  tests: [{ command: "node --test tests/fm11-workstream-handoff.test.mjs", status: "pass" }],
  dependencies: [], blockers: [], nextTask: "FM-00 review",
});
const snapshot = () => ({
  complete: true, mainSha: sha, capturedAt: new Date(now).toISOString(),
  prs: [{ number: 449, files: [".github/workflows/agent-harness.yml"] }],
});

test("permits bounded exact-base nonconflicting worker handoff", () => {
  assert.deepEqual(validateHandoff(packet(), snapshot(), sha, now), { ok: true, errors: [] });
});
test("rejects stale base SHA and stale PR inventory", () => {
  assert.match(validateHandoff({ ...packet(), baseSha: "b".repeat(40) }, snapshot(), sha, now).errors.join(" "), /baseSha/);
  assert.match(validateHandoff(packet(), { ...snapshot(), capturedAt: new Date(now - 960000).toISOString() }, sha, now).errors.join(" "), /Stale PR snapshot/);
});
test("rejects an open-PR exact-path collision and FM-00-reserved file", () => {
  const proposed = packet();
  proposed.writeSet.push(".github/workflows/ci.yml");
  const active = snapshot();
  active.prs.push({ number: 450, files: [proposed.writeSet[0]] });
  const result = validateHandoff(proposed, active, sha, now);
  assert.equal(result.ok, false);
  assert.match(result.errors.join(" "), /FM-00-owned integration path/);
  assert.match(result.errors.join(" "), /Open PR #450/);
});
test("rejects traversal, unowned branches and missing test evidence", () => {
  const proposed = packet();
  proposed.branch = "autopilot/unowned";
  proposed.writeSet = ["../secrets.env"];
  proposed.tests = [];
  const result = validateHandoff(proposed, snapshot(), sha, now);
  assert.equal(result.ok, false);
  assert.match(result.errors.join(" "), /Invalid workstream branch|Unsafe writeSet path|Missing or invalid test results/);
});
test("skips own PR only, not other PRs", () => {
  const proposed = packet();
  proposed.prNumber = 449;
  proposed.writeSet = ["docs/existing.md"];
  const active = snapshot();
  active.prs[0].files = ["docs/existing.md"];
  active.prs[0].headBranch = proposed.branch;
  assert.equal(validateHandoff(proposed, active, sha, now).ok, true);
  active.prs.push({ number: 450, files: ["docs/existing.md"] });
  assert.equal(validateHandoff(proposed, active, sha, now).ok, false);
});

test("rejects own-PR spoofing when branch or PR identifier does not match", () => {
  const own = packet();
  own.prNumber = 449;
  const active = snapshot();
  active.prs[0].files = [own.writeSet[0]];
  assert.match(validateHandoff(own, active, sha, now).errors.join(" "), /does not match/);
  active.prs = [];
  assert.match(validateHandoff(own, active, sha, now).errors.join(" "), /missing from/);
});

test("accepts established FM-07 and FM-03 branch conventions", () => {
  for (const branch of ["fm07/eval-contract", "audit/fm-03-ux-20261009"]) {
    const workstream = branch.includes("03") ? "FM-03" : "FM-07";
    const proposed = { ...packet(), workstream, branch };
    assert.equal(validateHandoff(proposed, snapshot(), sha, now).ok, true);
  }
});

test("keeps the inventory collector FM-00-owned", () => {
  const proposed = { ...packet(), writeSet: ["scripts/capture-workstream-prs.mjs"] };
  assert.match(validateHandoff(proposed, snapshot(), sha, now).errors.join(" "), /FM-00-owned/);
});
