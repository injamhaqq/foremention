// Fix track "ux" (2026-10-19), item 2: failed runs show a human-readable
// reason and a Retry action that reuses POST /api/runs (and therefore every
// origin, auth, role, plan, duplicate, spend and capacity check it applies).
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { classifyRunFailure, describeRunFailure } from "../lib/run-failure-reason.ts";

const text = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
// The exact summary the collection job persists for an interrupted run.
const INTERRUPTED_RUN_SUMMARY_FOR_TEST = (await text("lib/jobs/inngest.ts")).match(/INTERRUPTED_RUN_SUMMARY = "([^"]+)"/)[1];

test("persisted failure summaries map to plain-language reasons", () => {
  const cases = [
    ["Today's live-evidence capacity is used up. No new provider calls were made and nothing was charged; collection resumes after 00:00 UTC.", "capacity", true],
    ["Provider returned HTTP 429: quota exhausted for project", "capacity", true],
    [INTERRUPTED_RUN_SUMMARY_FOR_TEST, "interrupted", true],
    ["Request failed with 401 Unauthorized: invalid api key", "provider_auth", false],
    ["models/gemini-1.5-pro is retired (404)", "model_unavailable", false],
    ["Upstream 503 Service Unavailable", "provider_unavailable", true],
    ["fetch failed: ECONNRESET", "provider_unavailable", true],
    ["3 provider attempt(s) failed. Review the successful evidence before publishing.", "no_evidence", true],
    ["Collection was cancelled.", "cancelled", true],
    ["Live collection needs the server database secret; provider not configured", "configuration", false],
    ["something odd happened", "unknown", true],
  ];
  for (const [summary, kind, retryable] of cases) {
    const reason = describeRunFailure(summary);
    assert.equal(reason.kind, kind, summary);
    assert.equal(reason.retryable, retryable, summary);
    assert.ok(reason.title.length > 8 && reason.detail.length > 40, `copy present for ${kind}`);
    assert.doesNotMatch(reason.title, /HTTP|\b\d{3}\b|undefined|null/i, "headline is human-readable");
  }
});

test("missing summaries still produce a reason, and technical detail is redacted", () => {
  for (const empty of [null, undefined, "", "   "]) {
    const reason = describeRunFailure(empty);
    assert.equal(reason.kind, "unknown");
    assert.equal(reason.technicalDetail, null);
  }
  const leaky = describeRunFailure("401 Unauthorized calling https://api.example/v1?key=AIzaSyDUMMYDUMMYDUMMYDUMMYDUMMY1234 with Bearer sk-live-abcdefghijklmnop");
  assert.equal(leaky.kind, "provider_auth");
  assert.doesNotMatch(leaky.technicalDetail, /AIzaSy|sk-live|abcdefghijklmnop/);
  assert.match(leaky.technicalDetail, /\[redacted\]/);
  assert.ok(describeRunFailure("x".repeat(2000)).technicalDetail.length <= 300);
  assert.equal(classifyRunFailure("Collection was cancelled."), "cancelled");
});

test("run detail renders the reason and a Retry that reuses the run-creation route", async () => {
  const [page, button, data, list] = await Promise.all([
    text("app/app/runs/[id]/page.tsx"),
    text("components/run-rerun-button.tsx"),
    text("lib/data.ts"),
    text("app/app/runs/page.tsx"),
  ]);
  assert.match(page, /describeRunFailure\(run\.errorSummary\)/);
  assert.match(page, /className="panel run-failure" role="alert"/);
  assert.match(page, /<RunRerunButton mode="retry"/);
  assert.match(page, /loadRunConfiguration\(viewer, id, \{ includeFailed: true \}\)/);
  assert.match(page, /role === "owner" \|\| role === "admin" \|\| role === "analyst"/, "Retry offered only to roles /api/runs accepts");
  assert.match(page, /Only owners, admins, and analysts can retry a collection\./);
  // The Retry posts to the same endpoint as every other collection start.
  assert.match(button, /fetch\("\/api\/runs", \{ method: "POST"/);
  assert.match(button, /"idempotency-key": crypto\.randomUUID\(\)/);
  assert.match(button, /Retry this collection/);
  assert.doesNotMatch(button, /\/api\/runs\/[^"]*retry|serviceRole/);
  // Failed runs can expose their configuration; finalized-only remains the default.
  assert.match(data, /options\.includeFailed \? "status=in\.\(complete,partial,failed\)" : "status=in\.\(complete,partial\)"/);
  assert.match(list, /describeRunFailure\(run\.errorSummary\)\.title/);
});

test("the run-creation route still enforces auth, role and capacity for retries", async () => {
  const route = await text("app/api/runs/route.ts");
  assert.match(route, /isTrustedMutationOrigin\(request\)/);
  assert.match(route, /if \(!viewer\) return NextResponse\.json\(\{ error: "Unauthorized" \}, \{ status: 401 \}\)/);
  assert.match(route, /\["owner", "admin", "analyst"\]\.includes\(role\)/);
  assert.match(route, /EVIDENCE_CAPACITY_DAILY_MESSAGE/);
  assert.match(route, /status: 429/);
});
