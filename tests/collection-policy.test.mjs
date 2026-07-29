import assert from "node:assert/strict";
import test from "node:test";

const policy = await import("../lib/collection-policy.ts");

test("evidence URLs are canonicalized without merging distinct pages", () => {
  assert.equal(
    policy.canonicalizeEvidenceUrl("https://WWW.Example.com:443/a//b/?utm_source=test&b=2&a=1#section"),
    "https://example.com/a/b?a=1&b=2",
  );
  assert.equal(policy.canonicalizeEvidenceUrl("file:///etc/passwd"), null);
  assert.equal(policy.canonicalizeEvidenceUrl("javascript:alert(1)"), null);
});

test("maximum run cost is deterministic and bounded", () => {
  const estimate = policy.estimateMaximumRunCost(2, { inputPerMillionUsd: 1, outputPerMillionUsd: 2, requestUsd: 0 });
  assert.equal(estimate, 0.005824);
  assert.equal(policy.estimateMaximumRunCost(999, { inputPerMillionUsd: 1, outputPerMillionUsd: 2, requestUsd: 0 }), 0.02912);
});

test("operational errors redact credential-shaped values", () => {
  const safe = policy.safeOperationalError(new Error("token=secret-value Bearer another-secret"));
  assert.doesNotMatch(safe, /secret-value|another-secret/);
  assert.match(safe, /redacted/);
  assert.equal(policy.safeOperationalError("Every provider attempt failed. No evidence was invented."), "Every provider attempt failed. No evidence was invented.");
});

test("provider circuit counts distinct failed runs instead of retry attempts", () => {
  assert.equal(
    policy.hasOpenProviderCircuit([
      { run_id: "run-a" },
      { run_id: "run-a" },
      { run_id: "run-a" },
    ]),
    false,
  );
  assert.equal(
    policy.hasOpenProviderCircuit([
      { run_id: "run-a" },
      { run_id: "run-b" },
      { run_id: "run-c" },
    ]),
    true,
  );
});
