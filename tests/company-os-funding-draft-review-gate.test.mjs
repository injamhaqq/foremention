import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = async (path) => {
  try {
    return await readFile(new URL(path, root), "utf8");
  } catch {
    return "";
  }
};

test("funding draft route requires a current accepted source review for every official program evidence item", async () => {
  const route = await read("app/api/internal/company-os/funding-drafts/route.ts");

  assert.match(route, /company_funding_source_checks/);
  assert.match(route, /company_funding_source_reviews/);
  assert.match(route, /decision=eq\.accepted/);
  assert.match(route, /source_snapshots/);
  assert.match(route, /content_hash/);
  assert.match(route, /evidence_excerpt/);
  assert.match(route, /FUNDING_PROGRAM_EVIDENCE_MAX_AGE_DAYS/);
  assert.match(route, /checked_at/);
  assert.match(route, /decided_at/);
  assert.match(route, /Every funding-program source requires a current accepted source review/i);
});

test("funding draft evidence freshness is anchored to the reviewed source observation", async () => {
  const route = await read("app/api/internal/company-os/funding-drafts/route.ts");

  assert.match(route, /fundingEvidence\([\s\S]*checkedAt/);
  assert.match(route, /observedAt:\s*checkedAt/);
  assert.match(route, /program_source_check_ids/);
  assert.match(route, /program_source_review_ids/);
});

test("funding draft review-gate migration binds exact evidence, check, and accepted review provenance", async () => {
  const sql = await read("supabase/migrations/20261006000100_company_funding_draft_review_gate.sql");

  assert.match(sql, /add column program_source_check_ids uuid\[\]/i);
  assert.match(sql, /add column program_source_review_ids uuid\[\]/i);
  assert.match(sql, /cardinality\(new\.program_source_check_ids\)[\s\S]*cardinality\(new\.program_evidence_ids\)/i);
  assert.match(sql, /cardinality\(new\.program_source_review_ids\)[\s\S]*cardinality\(new\.program_evidence_ids\)/i);
  assert.match(sql, /with ordinality/i);
  assert.match(sql, /company_funding_source_checks/i);
  assert.match(sql, /company_funding_source_reviews/i);
  assert.match(sql, /review\.decision = 'accepted'/i);
  assert.match(sql, /source_check\.evidence_verified_at = evidence\.verified_at/i);
  assert.match(sql, /source\.canonical_url = evidence\.source_url/i);
  assert.match(sql, /snapshot\.content_hash is not null/i);
  assert.match(sql, /nullif\(trim\(snapshot\.evidence_excerpt\), ''\) is not null/i);
  assert.match(sql, /review\.decided_at >= source_check\.checked_at/i);
  assert.match(sql, /FUNDING_PROGRAM_EVIDENCE_MAX_AGE_DAYS|interval '30 days'/i);
});

test("CI executes the reviewed-evidence acceptance verifier after migration replay", async () => {
  const workflow = await read(".github/workflows/ci.yml");
  assert.match(workflow, /verify-company-funding-draft-review-gate\.sql/);
});

test("legacy funding draft fixtures carry accepted reviewed-source provenance under the new gate", async () => {
  const sql = await read("scripts/verify-company-funding-draft-isolation.sql");
  assert.match(sql, /company_funding_source_checks/);
  assert.match(sql, /company_funding_source_reviews/);
  assert.match(sql, /program_source_check_ids/);
  assert.match(sql, /program_source_review_ids/);
  assert.match(sql, /source_check\.checked_at/);
});

test("SQL acceptance proves the reviewed-evidence funding draft gate fails closed", async () => {
  const sql = await read("scripts/verify-company-funding-draft-review-gate.sql");

  assert.match(sql, /funding draft without accepted source review was accepted/i);
  assert.match(sql, /funding draft with rejected source review was accepted/i);
  assert.match(sql, /funding draft with stale source check was accepted/i);
  assert.match(sql, /funding draft with superseded evidence review was accepted/i);
  assert.match(sql, /cross-project source review was accepted/i);
  assert.match(sql, /valid reviewed funding draft was rejected/i);
});
