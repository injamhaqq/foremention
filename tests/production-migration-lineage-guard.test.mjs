import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");
test("old resolution handoff is visibly historical and does not offer an executable bulk production push", async () => {
  const handoff=await read("docs/APPLY-RESOLUTION-MIGRATION.md");
  assert.match(handoff, /^> \*\*HISTORICAL HANDOFF/);
  assert.match(handoff, /BLOCKED FOR THIS EXISTING PRODUCTION HISTORY/);
  assert.doesNotMatch(handoff, /```bash\s+npx supabase db push/);
  assert.match(handoff, /PRODUCTION-MIGRATION-LINEAGE-2026-09-26\.md/);
});
test("the deployment runbook separates empty database bootstrap from existing production drift", async () => {
  const deploy=await read("docs/DEPLOYMENT.md");
  const lineage=await read("docs/operations/PRODUCTION-MIGRATION-LINEAGE-2026-09-26.md");
  assert.match(deploy, /brand-new empty database only/);
  assert.match(deploy, /existing Foremention production project/);
  assert.match(deploy, /PRODUCTION-MIGRATION-LINEAGE-2026-09-26\.md/);
  assert.match(lineage, /93 SQL migration files/);
  assert.match(lineage, /96 entries/);
  assert.match(lineage, /do not run an undifferentiated/);
  assert.match(lineage, /actual executed SQL\/normalized statements/);
  assert.match(lineage, /explicit sign-off/);
});
