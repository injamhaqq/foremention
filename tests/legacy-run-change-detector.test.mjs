import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("collection processing no longer creates chronological movement claims before human review", async () => {
  const jobs = await text("lib/jobs/inngest.ts");
  assert.doesNotMatch(jobs, /async function recordRunChanges/);
  assert.doesNotMatch(jobs, /detect-run-changes/);
  assert.doesNotMatch(jobs, /recordRunChanges\(run, identity\)/);
  assert.doesNotMatch(jobs, /across comparable scheduled runs/i);
  assert.doesNotMatch(jobs, /between comparable runs/i);
  assert.doesNotMatch(jobs, /competitor_overtook:/);
});

test("operational collection notifications and the bounded weekly scheduler remain intact", async () => {
  const jobs = await text("lib/jobs/inngest.ts");
  for (const value of [
    "mark-run-for-human-review",
    "notify-run-owner",
    "email-first-run-owner",
    "run_ready",
    "first_run_completed",
    "schedule-weekly-workspace-runs",
    'cron: "0 8 * * 1"',
    "prepareWeeklyRun",
  ]) assert.match(jobs, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("review-time movement remains behind human review and exact run-pair comparability", async () => {
  const [review, reviewedChanges, comparability] = await Promise.all([
    text("app/api/runs/[id]/review/route.ts"),
    text("lib/reviewed-change-notifications.ts"),
    text("lib/run-pair-comparability.ts"),
  ]);

  assert.match(review, /recordReviewedComparableChangeNotifications/);
  assert.match(reviewedChanges, /assessWorkspaceRunPairComparability/);
  assert.match(reviewedChanges, /terminalReviewedStates = new Set\(\["complete", "partial"\]\)/);
  assert.match(reviewedChanges, /status=in\.\(complete,partial\)/);
  assert.match(reviewedChanges, /reviewed_change:/);

  assert.match(comparability, /terminalReviewedStates = new Set\(\["complete", "partial"\]\)/);
  assert.match(comparability, /methodology_version/);
  assert.match(comparability, /review_status=eq\.verified/);
  assert.match(comparability, /prompt_text,provider,model/);
  assert.match(comparability, /assessExactQuestionComparability/);
});

test("legacy notification and email suppression guards remain as defense in depth", async () => {
  const [migration, email] = await Promise.all([
    text("supabase/migrations/20260813033833_suppress_legacy_ungated_movement_alerts.sql"),
    text("lib/workspace-email-alerts.ts"),
  ]);
  assert.match(migration, /brand_presence_changed:/);
  assert.match(migration, /new_sources:/);
  assert.match(migration, /lost_sources:/);
  assert.match(migration, /competitor_movement:/);
  assert.match(email, /input\.kind === "competitor_overtook"/);
});
