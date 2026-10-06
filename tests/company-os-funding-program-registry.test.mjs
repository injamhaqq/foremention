import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = async (path) => {
  try { return await readFile(new URL(path, root), "utf8"); }
  catch { return ""; }
};

test("funding program registry parser is strict and bounded", async () => {
  const helper = await read("lib/company-os/funding-program-registry.ts");
  assert.match(helper, /parseFundingProgramRevisionRequest/);
  assert.match(helper, /schemaVersion/);
  assert.match(helper, /evidenceItemId/);
  assert.match(helper, /sourceCheckId/);
  assert.match(helper, /sourceReviewId/);
  assert.match(helper, /supersedesRevisionId/);
  assert.match(helper, /grant/);
  assert.match(helper, /accelerator/);
  assert.match(helper, /fellowship/);
  assert.match(helper, /credit/);
  assert.match(helper, /unknown_property/);
  assert.match(helper, /criteria/);
  assert.match(helper, /questions/);
  assert.match(helper, /maxChars/);
});

test("funding program revisions are append-only service-only reviewed records", async () => {
  const sql = await read("supabase/migrations/20261006000200_company_funding_program_registry.sql");
  assert.match(sql, /create table public\.company_funding_program_revisions/i);
  assert.match(sql, /program_id uuid not null/i);
  assert.match(sql, /supersedes_revision_id uuid/i);
  assert.match(sql, /unique\s*\(supersedes_revision_id\)/i);
  assert.match(sql, /company_funding_source_checks/i);
  assert.match(sql, /company_funding_source_reviews/i);
  assert.match(sql, /review\.decision = 'accepted'/i);
  assert.match(sql, /source_check\.evidence_verified_at = evidence\.verified_at/i);
  assert.match(sql, /snapshot\.content_hash is not null/i);
  assert.match(sql, /nullif\(trim\(snapshot\.evidence_excerpt\), ''\) is not null/i);
  assert.match(sql, /program_id = id|new\.program_id <> new\.id/i);
  assert.match(sql, /Funding program revisions are append-only/i);
  assert.match(sql, /revoke all on table public\.company_funding_program_revisions from public, anon, authenticated/i);
  assert.match(sql, /grant select, insert, delete on table public\.company_funding_program_revisions to service_role/i);
});

test("funding program registry route is exact-scope and internal-only", async () => {
  const route = await read("app/api/internal/company-os/funding-programs/route.ts");
  assert.match(route, /isTrustedMutationOrigin\(request\)/);
  assert.match(route, /getViewer\(\)/);
  assert.match(route, /isCompanyOperatorEmail\(viewer\.email\)/);
  assert.match(route, /configuredCompanyOsScope\(\)/);
  assert.match(route, /role === "owner" \|\| role === "admin"/);
  assert.match(route, /status=eq\.active/);
  assert.match(route, /company_funding_source_checks/);
  assert.match(route, /company_funding_source_reviews/);
  assert.match(route, /serviceRole:\s*true/);
  assert.doesNotMatch(route, /sendEmail|submitApplication|browser\.newPage|payment/i);
});

test("funding draft v2 accepts registry revision ids and no caller opportunity definitions", async () => {
  const service = await read("lib/company-os/funding-draft-service.ts");
  const route = await read("app/api/internal/company-os/funding-drafts/route.ts");
  assert.match(service, /schemaVersion:\s*2/);
  assert.match(service, /programRevisionIds/);
  assert.doesNotMatch(service, /allowed = new Set\(\["schemaVersion", "programEvidenceIds", "opportunities"\]\)/);
  assert.match(route, /company_funding_program_revisions/);
  assert.match(route, /programRevisionIds/);
  assert.match(route, /program_revision_ids/);
  assert.match(route, /supersedes_revision_id/);
  assert.match(route, /fundingServiceDigest\(\{[\s\S]*programRevisionIds:[\s\S]*programSourceCheckIds:[\s\S]*programSourceReviewIds:/);
});

test("funding draft artifact binds current program revision provenance", async () => {
  const sql = await read("supabase/migrations/20261006000300_company_funding_draft_program_revision_provenance.sql");
  assert.match(sql, /add column program_revision_ids uuid\[\]/i);
  assert.match(sql, /cardinality\(new\.program_revision_ids\)[\s\S]*cardinality\(new\.program_evidence_ids\)/i);
  assert.match(sql, /company_funding_program_revisions/i);
  assert.match(sql, /revision\.evidence_item_id = requested\.evidence_id/i);
  assert.match(sql, /revision\.source_check_id = requested\.check_id/i);
  assert.match(sql, /revision\.source_review_id = requested\.review_id/i);
  assert.match(sql, /supersedes_revision_id = revision\.id/i);
});

test("registry SQL acceptance and CI wiring cover fail-closed cases", async () => {
  const sql = await read("scripts/verify-company-funding-program-registry.sql");
  const workflow = await read(".github/workflows/ci.yml");
  assert.match(workflow, /verify-company-funding-program-registry\.sql/);
  assert.match(sql, /Authenticated owner received direct funding program registry access/i);
  assert.match(sql, /non-owner\/admin funding program revision creator was accepted/i);
  assert.match(sql, /stale funding source review was accepted into registry/i);
  assert.match(sql, /rejected funding source review was accepted into registry/i);
  assert.match(sql, /cross-project funding source review was accepted into registry/i);
  assert.match(sql, /funding program supersession fork was accepted/i);
  assert.match(sql, /cross-program supersession was accepted/i);
  assert.match(sql, /draft without program revision provenance was accepted/i);
  assert.match(sql, /superseded funding program revision created a draft/i);
  assert.match(sql, /current funding program revision draft was rejected/i);
});
