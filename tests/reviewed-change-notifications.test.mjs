import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("reviewed change notifications reuse the canonical exact run-pair gate", async () => {
  const helper = await text("lib/reviewed-change-notifications.ts");
  assert.match(helper, /assessWorkspaceRunPairComparability/);
  assert.match(helper, /terminalReviewedStates = new Set\(\["complete", "partial"\]\)/);
  assert.match(helper, /status=in\.\(complete,partial\)/);
  assert.match(helper, /created_at=lt\./);
  assert.match(helper, /if \(!comparison\.comparable\)/);

  const gate = helper.indexOf("if (!comparison.comparable)");
  const notificationWrite = helper.indexOf('supabaseRest("notifications?on_conflict=organization_id,user_id,event_key"');
  assert.ok(gate >= 0);
  assert.ok(notificationWrite > gate);
});

test("safe movement keys are distinct from the database-suppressed legacy pre-review keys", async () => {
  const [helper, migration] = await Promise.all([
    text("lib/reviewed-change-notifications.ts"),
    text("supabase/migrations/20260813033833_suppress_legacy_ungated_movement_alerts.sql"),
  ]);
  for (const key of [
    "reviewed_change:brand_presence",
    "reviewed_change:new_citation_sources",
    "reviewed_change:lost_citation_sources",
  ]) {
    assert.match(helper, new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.doesNotMatch(migration, new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  for (const legacy of ["brand_presence_changed:", "new_sources:", "lost_sources:", "competitor_movement:"]) {
    assert.match(migration, new RegExp(legacy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("movement copy is explicit about human review, exact measurement identity and non-causation", async () => {
  const helper = await text("lib/reviewed-change-notifications.ts");
  assert.match(helper, /two human-reviewed collections with identical persisted question text, provider, exact model, and methodology/);
  assert.match(helper, /not proof that any recorded action caused it/);
  assert.match(helper, /not proof of causation/);
  assert.match(helper, /provider-returned citation URL/);
});

test("run approval invokes safe movement only after the run is finalized", async () => {
  const route = await text("app/api/runs/[id]/review/route.ts");
  assert.match(route, /recordReviewedComparableChangeNotifications/);
  const finalize = route.indexOf("body: { status: finalStatus }");
  const changeNotification = route.indexOf("recordReviewedComparableChangeNotifications(viewer, run.id)");
  assert.ok(finalize >= 0);
  assert.ok(changeNotification > finalize);
  assert.match(route, /Promise\.allSettled/);
});

test("legacy competitor email remains disabled until a separately gated post-review email sender exists", async () => {
  const helper = await text("lib/workspace-email-alerts.ts");
  const guard = helper.indexOf('input.kind === "competitor_overtook"');
  const delivery = helper.indexOf("application_email_deliveries");
  assert.ok(guard >= 0);
  assert.ok(guard < delivery);
});
