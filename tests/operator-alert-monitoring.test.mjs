import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const route = await readFile(new URL("../app/api/ops/operator-alert-probe/route.ts", import.meta.url), "utf8");
const alerts = await readFile(new URL("../lib/operator-alerts.ts", import.meta.url), "utf8");
const migration = await readFile(new URL("../supabase/migrations/20260814090000_operator_alert_monitoring.sql", import.meta.url), "utf8");

test("operator alert probe derives the deployed SHA from the Worker and accepts no caller payload", () => {
  assert.match(route, /cloudflare:workers/);
  assert.match(route, /FOREMENTION_BUILD_COMMIT/);
  assert.doesNotMatch(route, /request\.json|searchParams|get\("recipient"\)|get\("email"\)/);
  assert.match(route, /accepts no request body/);
});

test("operator alert delivery is service-only, fixed-recipient and idempotent per build", () => {
  assert.match(alerts, /operator_alert_config\?select=recipient_email,enabled/);
  assert.match(alerts, /serviceRole: true/);
  assert.match(alerts, /operator_alert_deliveries\?on_conflict=build_commit/);
  assert.match(alerts, /resolution=ignore-duplicates,return=representation/);
  assert.match(alerts, /sendProductAlertEmail/);
  assert.doesNotMatch(alerts, /prompt_text|answer_text|canonical_url|raw_response/);
});

test("operator alert tables are inaccessible to browser roles", () => {
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all on table public\.operator_alert_config from anon, authenticated/);
  assert.match(migration, /revoke all on table public\.operator_alert_deliveries from anon, authenticated/);
  assert.match(migration, /build_commit text not null unique/);
  assert.match(migration, /attempt_count integer not null default 1 check \(attempt_count between 1 and 3\)/);
});
