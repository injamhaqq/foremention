import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("claim builder drafts only from tenant-scoped verified evidence and persists every link", async () => {
  const [route, component, migration, data] = await Promise.all([
    text("app/api/claims/route.ts"), text("components/claim-ledger.tsx"),
    text("supabase/migrations/20260802000300_claim_evidence_links.sql"), text("lib/data.ts"),
  ]);
  assert.match(route, /export async function PUT/);
  assert.match(route, /organization_id=eq\.\$\{context\.organizationId\}/);
  assert.match(route, /verification_status !== "verified"/);
  assert.match(route, /verified_claim_evidence/);
  assert.match(route, /This draft states only that verified supporting evidence is on file/);
  assert.match(component, /Draft from selected evidence/);
  assert.match(component, /evidenceItemIds/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /verified_claim_evidence_write_analyst/);
  assert.match(data, /evidenceItems:/);
});
