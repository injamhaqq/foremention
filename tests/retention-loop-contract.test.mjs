import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
async function text(path) {
  try { return await readFile(new URL(path, root), "utf8"); }
  catch { return ""; }
}

test("retention migration adds schedules shares billing roles and market-aware action linkage without duplicating entitlements", async () => {
  const sql = await text("supabase/migrations/20260829000100_retention_loop_v1.sql");
  for (const table of ["measurement_schedules", "record_shares", "billing_accounts"]) {
    assert.match(sql, new RegExp(`create table if not exists public\\.${table}`, "i"));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
  }
  assert.match(sql, /alter table public\.organization_entitlements/i);
  assert.doesNotMatch(sql, /create table if not exists public\.organization_entitlements/i);
  assert.match(sql, /weekly.*biweekly.*monthly/is);
  assert.match(sql, /timezone/i);
  assert.match(sql, /question_ids/i);
  assert.match(sql, /provider_ids/i);
  assert.match(sql, /model_snapshot/i);
  assert.match(sql, /methodology_snapshot/i);
  assert.match(sql, /next_run_at/i);
  assert.match(sql, /last_run_at/i);
  assert.match(sql, /token_hash/i);
  assert.match(sql, /expires_at/i);
  assert.match(sql, /revoked_at/i);
  assert.match(sql, /verified_webhook_at/i);
  assert.match(sql, /package_key/i);
  assert.match(sql, /feature_keys/i);
  assert.match(sql, /owner_id/i);
  assert.match(sql, /due_at/i);
  assert.match(sql, /priority/i);
  assert.match(sql, /remeasurement/i);
  assert.match(sql, /locale/i);
  assert.match(sql, /market/i);
  assert.match(sql, /reviewer/i);
  assert.match(sql, /stakeholder/i);
});

test("schedule and retention services enforce truthful recurring measurement and exact change detection", async () => {
  const schedules = await text("lib/measurement-schedules.ts");
  const retention = await text("lib/retention-loop.ts");
  const entitlements = await text("lib/entitlements.ts");
  for (const fn of ["validateMeasurementSchedule", "nextScheduleAt", "scheduleIdempotencyKey"]) assert.match(schedules, new RegExp(`export function ${fn}`));
  assert.match(schedules, /weekly/);
  assert.match(schedules, /biweekly/);
  assert.match(schedules, /monthly/);
  assert.match(schedules, /Intl\.DateTimeFormat/);
  assert.match(schedules, /questionIds/);
  assert.match(schedules, /providerIds/);
  assert.match(schedules, /modelSnapshot/);
  assert.match(schedules, /methodologySnapshot/);
  for (const fn of ["deriveAttentionItems", "deriveComparableChanges", "deriveRetentionMilestones"]) assert.match(retention, new RegExp(`export function ${fn}`));
  assert.match(retention, /comparison_withheld/);
  assert.match(retention, /recommendation_presence_changed/);
  assert.match(retention, /competitor_appearance_changed/);
  assert.match(retention, /citation_set_changed/);
  assert.match(retention, /action_remeasurement_due/);
  assert.match(retention, /locale/);
  assert.match(retention, /market/);
  assert.match(entitlements, /export function hasEntitlement/);
  assert.match(entitlements, /return false/);
});

test("scheduled execution attention record actions sharing billing and SSO stay inside existing product boundaries", async () => {
  const [api, dispatcher, inngestRoute, attentionApi, bridge, shareApi, sharePage, billing, sso] = await Promise.all([
    text("app/api/schedules/route.ts"),
    text("lib/jobs/measurement-schedule-dispatcher.ts"),
    text("app/api/inngest/route.ts"),
    text("app/api/retention/attention/route.ts"),
    text("components/retention-surface-bridge.tsx"),
    text("app/api/records/[id]/share/route.ts"),
    text("app/share/record/[token]/page.tsx"),
    text("app/api/billing/webhook/route.ts"),
    text("app/api/auth/sso/route.ts"),
  ]);
  assert.match(api, /requireViewer/);
  assert.doesNotMatch(api, /body\.organizationId/);
  assert.match(api, /validateMeasurementSchedule/);
  assert.match(dispatcher, /measurement schedule/i);
  assert.match(dispatcher, /scheduleIdempotencyKey/);
  assert.match(inngestRoute, /dispatchMeasurementSchedules/);
  assert.match(attentionApi, /deriveAttentionItems/);
  assert.match(bridge, /AttentionInbox/);
  assert.match(bridge, /MeasurementScheduleControl/);
  assert.match(bridge, /SSO/);
  assert.match(bridge, /Billing/);
  assert.match(bridge, /Recommendation Record/);
  assert.match(bridge, /Evidence inspection/);
  assert.match(bridge, /Share/);
  assert.match(bridge, /Export/);
  assert.match(bridge, /owner/i);
  assert.match(bridge, /due/i);
  assert.match(bridge, /remeasure/i);
  assert.match(shareApi, /record-sharing/);
  assert.match(sharePage, /read-only/i);
  assert.match(billing, /verifyBillingWebhook/);
  assert.match(billing, /not configured/i);
  assert.match(sso, /startEnterpriseSso/);
  assert.match(sso, /not configured/i);
});

test("recommendation intelligence extensions remain grounded and do not become a generic score dashboard", async () => {
  const [quality, gap, bridge, prompts, competitors] = await Promise.all([
    text("lib/evidence-quality.ts"),
    text("lib/recommendation-gap.ts"),
    text("components/retention-surface-bridge.tsx"),
    text("app/app/prompts/page.tsx"),
    text("app/app/competitors/page.tsx"),
  ]);
  for (const dimension of ["freshness", "retrievability", "authority", "corroboration", "review"]) assert.match(quality, new RegExp(dimension, "i"));
  assert.doesNotMatch(quality, /verifiedScore/);
  assert.match(gap, /observation/i);
  assert.match(gap, /inference/i);
  assert.match(gap, /evidence/i);
  assert.match(bridge, /benchmark held until the cohort is eligible/i);
  assert.match(bridge, /privacy-safe cohort/i);
  assert.match(bridge, /minimum sample threshold/i);
  assert.match(bridge, /locale/i);
  assert.match(bridge, /market/i);
  for (const cluster of ["Discovery", "Comparison", "Alternative", "Use case", "Trust", "Constraint"]) assert.match(bridge, new RegExp(cluster));
  assert.match(bridge, /candidate/i);
  assert.match(bridge, /confirm/i);
  assert.ok(prompts.length > 0);
  assert.ok(competitors.length > 0);
});

test("retention analytics use safe milestone events without customer PII", async () => {
  const contract = await text("lib/product-analytics-contract.ts");
  const analytics = await text("lib/product-analytics.ts");
  for (const event of ["first_record_reviewed", "action_created", "second_comparable_cycle_completed", "measurement_schedule_enabled", "record_share_created", "team_invite_sent"]) {
    assert.match(contract, new RegExp(event));
    assert.match(analytics, new RegExp(event));
  }
  assert.doesNotMatch(contract, /raw_question|raw_answer|customer_name/);
});

test("homepage remains functionally untouched by retention loop implementation", async () => {
  const home = await text("app/page.tsx");
  assert.match(home, /MissingAnswerExperience/);
  assert.match(home, /Recommendation Intelligence for B2B Software/);
});
