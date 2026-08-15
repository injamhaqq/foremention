import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");

test("background collection no longer computes or publishes pre-review movement", () => {
  const jobs = read("lib/jobs/inngest.ts");
  assert.doesNotMatch(jobs, /async function recordRunChanges/);
  assert.doesNotMatch(jobs, /detect-run-changes/);
  assert.doesNotMatch(jobs, /change_type: "brand_appeared"/);
  assert.doesNotMatch(jobs, /change_type: "brand_disappeared"/);
  assert.doesNotMatch(jobs, /change_type: "competitor_overtook"/);
  assert.doesNotMatch(jobs, /change_type: "new_citation"/);
  assert.doesNotMatch(jobs, /change_type: "lost_citation"/);
});

test("review-time comparable movement remains the only active movement notification path", () => {
  const review = read("app/api/runs/[id]/review/route.ts");
  const reviewedChanges = read("lib/reviewed-comparable-change-notifications.ts");

  assert.match(review, /recordReviewedComparableChangeNotifications/);
  assert.match(reviewedChanges, /assessWorkspaceRunPairComparability/);
  assert.match(reviewedChanges, /currentRunStatus: runStatus/);
  assert.match(reviewedChanges, /priorRunStatus: prior\.status/);
  assert.match(reviewedChanges, /status=in\.\(complete,partial\)/);
  assert.match(reviewedChanges, /reviewed_change:/);
});

test("the run API still blocks brand, citation, competitor, and recommendation movement before review", () => {
  const route = read("app/api/runs/route.ts");
  assert.match(route, /Current collections are queued or waiting for human review\. Longitudinal change alerts are withheld here/);
  assert.match(route, /brand_appeared/);
  assert.match(route, /citation_(?:appeared|disappeared)/);
  assert.match(route, /competitor_overtook/);
  assert.match(route, /recommendation_(?:gained|lost)/);
});
