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

test("operational collection notifications, digest delivery, and schedule-driven recurring collection remain intact", async () => {
  const [jobs, dispatcher] = await Promise.all([text("lib/jobs/inngest.ts"), text("lib/jobs/measurement-schedule-dispatcher.ts")]);
  for (const value of [
    "mark-run-for-human-review",
    "notify-run-owner",
    "email-first-run-owner",
    "run_ready",
    "first_run_completed",
    "schedule-weekly-workspace-digests",
    'cron: "0 8 * * 1"',
  ]) assert.ok(jobs.includes(value), `Missing operational contract: ${value}`);
  assert.doesNotMatch(jobs, /prepareWeeklyRun|schedule-weekly-workspace-runs/);
  assert.match(dispatcher, /id: "dispatch-measurement-schedules"/);
  assert.match(dispatcher, /reserve_run_quota_server/);
  assert.match(dispatcher, /reserve_run_budget_server/);
});

test("review-time movement remains behind human review and exact run-pair comparability", async () => {
  const [review, reviewedChanges, comparability, answerGate] = await Promise.all([
    text("app/api/runs/[id]/review/route.ts"),
    text("lib/reviewed-change-notifications.ts"),
    text("lib/run-pair-comparability.ts"),
    text("lib/run-pair-answer-gate.ts"),
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
  assert.match(comparability, /assessCompleteVerifiedRunPair/);
  assert.match(answerGate, /assessExactQuestionComparability/);
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
