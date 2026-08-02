import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("source bulk actions require reviewed facts and remain organization-authorized", async () => {
  const table = await readFile(new URL("../components/source-map-table.tsx", import.meta.url), "utf8");
  const reviewRoute = await readFile(new URL("../app/api/sources/[id]/review/route.ts", import.meta.url), "utf8");
  const actionRoute = await readFile(new URL("../app/api/placements/route.ts", import.meta.url), "utf8");
  assert.match(table, /I inspected every selected page/);
  assert.match(table, /data-workspace-review/);
  assert.match(table, /data-workspace-export/);
  assert.match(table, /data-workspace-action/);
  assert.match(table, /!entry\.reviewedAt \|\| !entry\.sourceId \|\| entry\.route === "unknown"/);
  assert.match(reviewRoute, /organization_id=eq\.\$\{organizationId\}/);
  assert.match(reviewRoute, /role === "viewer"/);
  assert.match(actionRoute, /organization_id=eq\.\$\{context\.organizationId\}/);
});
