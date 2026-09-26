import assert from "node:assert/strict";
import test from "node:test";
import { classifyHealthObservation, verifyBoundedReleaseHealth } from "../scripts/bounded-release-health.mjs";

const exact = "b79fa2fdead1605abd9ad9773d8a4b1fdbc0d546";
const other = "1276d9d524800d0a5db1c94c4b8b3094be1ca8ab";
const sample = async (observations) => {
  let calls = 0;
  let pauses = 0;
  const results = await verifyBoundedReleaseHealth({
    expectedBuildCommit: exact,
    request: async () => { const answer = observations[calls++]; if (answer instanceof Error) throw answer; return answer; },
    pause: async () => { pauses += 1; },
  });
  return { results, calls, pauses };
};

test("first exact healthy release succeeds with a single request", async () => {
  const { results, calls, pauses } = await sample([{ status: 200, buildCommit: exact }]);
  assert.equal(results.ok, true);
  assert.equal(calls, 1);
  assert.equal(pauses, 0);
  assert.deepEqual(results.receipts, [{ status: 200, buildCommit: exact }]);
});

test("bounded transient dependency 503 is retried and explicitly retained as evidence", async () => {
  const { results, calls, pauses } = await sample([
    { status: 503, buildCommit: exact },
    { status: 200, buildCommit: exact },
  ]);
  assert.equal(results.ok, true);
  assert.equal(calls, 2);
  assert.equal(pauses, 1);
  assert.deepEqual(results.receipts.map((x) => x.status), [503, 200]);
});

test("persistent degradation fails closed after exactly three tries", async () => {
  const { results, calls, pauses } = await sample(Array.from({ length: 3 }, () => ({ status: 503, buildCommit: exact })));
  assert.equal(results.ok, false);
  assert.equal(results.reason, "transient_health");
  assert.equal(calls, 3);
  assert.equal(pauses, 2);
});

test("wrong SHA fails immediately and cannot be hidden by retry", async () => {
  const { results, calls } = await sample([{ status: 503, buildCommit: other }, { status: 200, buildCommit: exact }]);
  assert.equal(results.ok, false);
  assert.equal(results.reason, "wrong_sha");
  assert.equal(calls, 1);
});

test("healthy HTTP 200 missing exact SHA and unexpected 401 fail immediately", () => {
  assert.deepEqual(classifyHealthObservation(200, null, exact), { action: "fail", reason: "missing_build_sha" });
  assert.deepEqual(classifyHealthObservation(401, exact, exact), { action: "fail", reason: "unexpected_health_status" });
});

test("network exceptions never disclose raw URL, token or error strings", async () => {
  const { results, calls } = await sample([
    new Error("SECRET=never-log-this https://example.com/login?password=never-log-this"),
    { status: 200, buildCommit: exact },
  ]);
  assert.equal(results.ok, true);
  assert.equal(calls, 2);
  assert.deepEqual(results.receipts.map((x) => x.status), [0, 200]);
  assert.doesNotMatch(JSON.stringify(results), /SECRET|never-log-this|password|example\.com/);
});

