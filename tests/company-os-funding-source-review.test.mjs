import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function optional(path) {
  try {
    return await readFile(new URL(path, import.meta.url), "utf8");
  } catch {
    return "";
  }
}

test("funding source review request contract is strict and bounded", async () => {
  const helper = await optional("../lib/company-os/funding-source-review.ts");
  assert.match(helper, /parseFundingSourceCheckRequest/);
  assert.match(helper, /parseFundingSourceReviewRequest/);
  assert.match(helper, /schemaVersion/);
  assert.match(helper, /evidenceItemId/);
  assert.match(helper, /checkId/);
  assert.match(helper, /accepted/);
  assert.match(helper, /rejected/);
  assert.match(helper, /unknown_property/);
});

test("funding source review route reuses native inspection and exact Company OS scope", async () => {
  const route = await optional("../app/api/internal/company-os/funding-source-reviews/route.ts");
  assert.match(route, /isTrustedMutationOrigin\(request\)/);
  assert.match(route, /getViewer\(\)/);
  assert.match(route, /isCompanyOperatorEmail\(viewer\.email\)/);
  assert.match(route, /configuredCompanyOsScope\(\)/);
  assert.match(route, /role === "owner" \|\| role === "admin"/);
  assert.match(route, /status=eq\.active/);
  assert.match(route, /funding_program_official/);
  assert.match(route, /verification_status/);
  assert.match(route, /usage_rights/);
  assert.match(route, /validatePublicSourceUrl/);
  assert.match(route, /inspectSourceUrl/);
  assert.match(route, /includePageText:\s*true/);
  assert.match(route, /maxExtractedTextChars:\s*24_000/);
  assert.match(route, /persistSourceSnapshot/);
  assert.match(route, /source_snapshots\?select=id,access,content_hash,evidence_excerpt/);
  assert.match(route, /content_hash/);
  assert.match(route, /evidence_excerpt/);
  assert.match(route, /serviceRole:\s*true/);
  assert.doesNotMatch(route, /sendProductAlertEmail|sendEmail|submitApplication|browser\.newPage|payment/i);
});

test("funding source review persistence is project-scoped, append-only, and service-only", async () => {
  const migration = await optional("../supabase/migrations/20261005000200_company_funding_source_reviews.sql");
  assert.match(migration, /create table public\.company_funding_source_checks/i);
  assert.match(migration, /create table public\.company_funding_source_reviews/i);
  assert.match(migration, /evidence_item_id uuid not null references public\.evidence_items/i);
  assert.match(migration, /source_id uuid not null references public\.sources/i);
  assert.match(migration, /source_snapshot_id uuid not null references public\.source_snapshots/i);
  assert.match(migration, /unique\s*\(check_id\)/i);
  assert.match(migration, /alter table public\.company_funding_source_checks enable row level security/i);
  assert.match(migration, /alter table public\.company_funding_source_reviews enable row level security/i);
  assert.match(migration, /revoke all on table public\.company_funding_source_checks, public\.company_funding_source_reviews from public, anon, authenticated/i);
  assert.match(migration, /grant select, insert, delete on table public\.company_funding_source_checks, public\.company_funding_source_reviews to service_role/i);
  assert.doesNotMatch(migration, /grant[^;]*\bauthenticated\b/i);
  assert.match(migration, /project_status is distinct from 'active'/i);
  assert.match(migration, /membership\.user_id = new\.created_by/i);
  assert.match(migration, /funding_program_official/i);
  assert.match(migration, /evidence\.verification_status (?:<>|is distinct from) 'verified'/i);
  assert.match(migration, /not \(source\.canonical_url = evidence\.source_url\)/i);
  assert.match(migration, /not \(snapshot\.source_id = new\.source_id\)/i);
  assert.match(migration, /decision = 'accepted'[\s\S]*snapshot\.access not in \('open','partial'\)/i);
  assert.match(migration, /decision = 'accepted'[\s\S]*snapshot\.content_hash is null/i);
  assert.match(migration, /decision = 'accepted'[\s\S]*nullif\(trim\(snapshot\.evidence_excerpt\), ''\) is null/i);
  assert.match(migration, /mode'[\s\S]*internal_review_only/i);
  assert.match(migration, /externalEffects'[\s\S]*false/i);
  assert.match(migration, /submissionAuthorized'[\s\S]*false/i);
});

test("isolated SQL acceptance covers direct browser denial and review fail-closed cases", async () => {
  const sql = await optional("../scripts/verify-company-funding-source-review-isolation.sql");
  assert.match(sql, /Authenticated owner received direct funding source check access/i);
  assert.match(sql, /Authenticated owner bypassed trusted funding source check write path/i);
  assert.match(sql, /non-owner\/admin funding source check creator/i);
  assert.match(sql, /unreachable funding source check was accepted/i);
  assert.match(sql, /unreviewable partial funding source check was accepted/i);
  assert.match(sql, /duplicate funding source review was accepted/i);
  assert.match(sql, /cross-project funding evidence was accepted/i);
});
