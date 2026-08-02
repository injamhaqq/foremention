import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("claims remain pending until an authorized human verifies or disputes them", async () => {
  const [route, component, migration, data] = await Promise.all([
    text("app/api/claims/route.ts"), text("components/claim-ledger.tsx"),
    text("supabase/migrations/20260802000400_claim_verification_workflow.sql"), text("lib/data.ts"),
  ]);
  assert.match(route, /verification_status: "pending"/);
  assert.match(route, /claim\.verification\.updated/);
  assert.match(route, /verificationStatus === "verified" && evidenceInvalid/);
  assert.match(route, /claim\.verification_status !== "verified"/);
  for (const status of ["pending", "verified", "disputed"]) assert.match(migration, new RegExp(status));
  assert.match(component, /Save verification/);
  assert.match(component, /Review note/);
  assert.match(data, /verificationStatus/);
});
