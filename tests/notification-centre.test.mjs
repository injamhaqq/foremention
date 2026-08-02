import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("the workspace top bar exposes a tenant-scoped notification centre", async () => {
  const [bell, layout, data, api] = await Promise.all([
    text("components/notification-bell.tsx"), text("app/app/layout.tsx"),
    text("lib/data.ts"), text("app/api/notifications/route.ts"),
  ]);
  assert.match(bell, /Notifications/);
  assert.match(bell, /unread/);
  assert.match(bell, /createdAt/);
  assert.match(layout, /loadNotifications/);
  assert.match(data, /organization_id=eq\.\$\{organizationId\}&user_id=eq\.\$\{viewer\.id\}/);
  assert.match(api, /organization_id=eq\.\$\{organizationId\}&user_id=eq\.\$\{viewer\.id\}/);
});
