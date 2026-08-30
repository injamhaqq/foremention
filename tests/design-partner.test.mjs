import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

const contact = await read("app/contact/page.tsx");

test("design-partner page captures the concrete retention loop", () => {
  assert.match(contact, /Design partner/i);
  assert.match(contact, /5 priority buyer questions/i);
  assert.match(contact, /baseline Recommendation Record/i);
  assert.match(contact, /one owned action/i);
  assert.match(contact, /comparable remeasurement/i);
  assert.match(contact, /action="\/api\/design-partner"/);
});

test("design-partner application is server-only, bounded, and not auto-provisioning", async () => {
  const validator = await read("lib/design-partner.ts");
  const route = await read("app/api/design-partner/route.ts");
  const migration = await read("supabase/migrations/20260829000200_design_partner_applications.sql");
  assert.match(validator, /MAX_QUESTIONS\s*=\s*5/);
  assert.match(validator, /320/);
  assert.match(validator, /currentProblem/);
  assert.match(route, /isTrustedMutationOrigin/);
  assert.match(route, /serviceRole:\s*true/);
  assert.match(route, /design_partner_applications/);
  assert.doesNotMatch(route, /organizations|organization_members|auth\.admin/);
  assert.match(migration, /enable row level security/i);
  assert.doesNotMatch(migration, /create policy/i);
});
