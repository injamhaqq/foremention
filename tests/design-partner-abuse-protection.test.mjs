import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

const [route, lib, migration] = await Promise.all([
  text("app/api/design-partner/route.ts"),
  text("lib/design-partner.ts"),
  text("supabase/migrations/20260830000100_design_partner_submission_limits.sql"),
]);

test("individual buyer questions are rejected rather than silently truncated", () => {
  assert.match(lib, /MAX_QUESTION\s*=\s*500/);
  assert.match(lib, /question\.length\s*>\s*MAX_QUESTION/);
  assert.match(lib, /Keep each buyer question to 500 characters or fewer/);
});

test("design-partner submission claims are service-only and privacy-minimized", () => {
  assert.match(migration, /create table if not exists public\.design_partner_submission_claims/i);
  assert.match(migration, /key_hash text not null/i);
  assert.doesNotMatch(migration, /\bemail\b|\bcompany\b/i);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /revoke all on function public\.claim_design_partner_submission/i);
  assert.match(migration, /grant execute on function public\.claim_design_partner_submission\(text\) to service_role/i);
});

test("route claims the normalized application before persistence and fails closed on abuse", () => {
  assert.match(route, /designPartnerSubmissionKey/);
  assert.match(route, /rpc\/claim_design_partner_submission/);
  assert.match(route, /p_key_hash/);
  assert.ok(route.indexOf("claim_design_partner_submission") < route.indexOf('supabaseRest("design_partner_applications"'));
  assert.match(route, /claim === "duplicate"/);
  assert.match(route, /claim === "limited"/);
  assert.match(route, /status:\s*429/);
});
