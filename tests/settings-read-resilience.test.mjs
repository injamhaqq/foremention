import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("Settings survives transient read failures without inventing workspace data", async () => {
  const settings = await text("app/app/settings/page.tsx");

  assert.match(settings, /recoverSettingsRead/);
  assert.match(settings, /Settings read temporarily unavailable/);
  assert.match(settings, /settingsReadDegraded = true/);
  assert.match(settings, /recoverSettingsRead\("workspace", loadWorkspaceSummary\(viewer\), null\)/);
  assert.match(settings, /recoverSettingsRead\("team", loadTeam\(viewer\), \{ members: \[\], invitations: \[\], role: null \}\)/);
  assert.match(settings, /recoverSettingsRead\("account-deletion", loadPendingDeletionRequest\(viewer\), null\)/);
  assert.match(settings, /recoverSettingsRead\("provider-status", loadProviderStatuses\(viewer\), getProviderStatuses\(\)\)/);
  assert.match(settings, /recoverSettingsRead\("notification-preference", loadNotificationPreference\(viewer\), \{ emailEnabled: false, weeklyDigestEnabled: true, unsubscribed: false \}\)/);

  assert.match(settings, /className="inline-notice" role="status"/);
  assert.match(settings, /No values were invented/);
  assert.doesNotMatch(settings, /\{ members: \[\], invitations: \[\], role: "owner" \}/);
});
