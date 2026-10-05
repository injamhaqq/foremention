import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  deriveFundingProfileRevision,
  fundingServiceDigest,
  parseFundingServiceRequest,
  prepareScopedFundingDraft,
  sameFundingServiceScope,
} from "../lib/company-os/funding-draft-service.ts";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

const organizationId = "11111111-1111-4111-8111-111111111111";
const projectId = "22222222-2222-4222-8222-222222222222";
const programEvidenceId = "33333333-3333-4333-8333-333333333333";
const companyEvidenceId = "44444444-4444-4444-8444-444444444444";

const request = () => ({
  schemaVersion: 1,
  programEvidenceIds: [programEvidenceId],
  opportunities: [{
    id: "synthetic-grant",
    name: "Synthetic Grant",
    kind: "grant",
    sourceEvidenceId: programEvidenceId,
    deadlineAt: "2026-11-01T23:59:59Z",
    criteria: [{ id: "country", factKey: "company.country", operator: "eq", expected: "BD" }],
    questions: [{ id: "company-name", prompt: "Company name", factKey: "company.name", maxChars: 120, required: true }],
  }],
});

test("service request cannot supply organization, project, clock, evidence, facts, or profile verification", () => {
  for (const forbidden of ["organizationId", "projectId", "asOf", "evidence", "facts", "profileRevision"]) {
    assert.throws(
      () => parseFundingServiceRequest({ ...request(), [forbidden]: "attacker-controlled" }),
      /FUNDING_SERVICE_INVALID:request:unknown_property/,
      forbidden,
    );
  }
});

test("service request requires unique UUID official-source references", () => {
  assert.throws(
    () => parseFundingServiceRequest({ ...request(), programEvidenceIds: ["not-a-uuid"] }),
    /FUNDING_SERVICE_INVALID:programEvidenceIds\.0/,
  );
  assert.throws(
    () => parseFundingServiceRequest({ ...request(), programEvidenceIds: [programEvidenceId, programEvidenceId] }),
    /FUNDING_SERVICE_INVALID:programEvidenceIds:duplicate/,
  );
});

test("trusted service inputs bind scope and preserve draft-only authority flags", async () => {
  const serviceRequest = parseFundingServiceRequest(request());
  const profileRevision = await deriveFundingProfileRevision([{ id: "truth-1", key: "company.country", value: "BD" }]);
  const draft = await prepareScopedFundingDraft({
    serviceRequest,
    scope: { organizationId, projectId },
    asOf: "2026-10-05T12:00:00Z",
    profileRevision,
    programEvidence: [{
      id: programEvidenceId,
      url: "https://funding.example.org/program",
      authority: "official",
      observedAt: "2026-10-05T10:00:00Z",
      maxAgeDays: 30,
    }],
    companyEvidence: [{
      id: companyEvidenceId,
      url: "https://records.example.org/company",
      authority: "company_record",
      observedAt: "2026-10-05T09:00:00Z",
      maxAgeDays: 365,
    }],
    companyFacts: [
      { key: "company.country", value: "BD", verification: "verified", evidenceId: companyEvidenceId },
      { key: "company.name", value: "Synthetic Company", verification: "verified", evidenceId: companyEvidenceId },
    ],
  });
  assert.equal(draft.organizationId, organizationId);
  assert.equal(draft.projectId, projectId);
  assert.equal(draft.asOf, "2026-10-05T12:00:00Z");
  assert.equal(draft.profileRevision, profileRevision);
  assert.equal(draft.mode, "internal_draft_only");
  assert.equal(draft.externalEffects, false);
  assert.equal(draft.submissionAuthorized, false);
  assert.equal(draft.requiresSubmissionApproval, true);
  assert.equal(draft.opportunities[0].eligibility, "eligible");
});

test("profile revision and artifact digest are deterministic change detectors", async () => {
  const first = await deriveFundingProfileRevision([{ id: "truth-1", value: "BD" }]);
  const repeat = await deriveFundingProfileRevision([{ id: "truth-1", value: "BD" }]);
  const changed = await deriveFundingProfileRevision([{ id: "truth-1", value: "US" }]);
  assert.equal(first, repeat);
  assert.notEqual(first, changed);
  assert.match(first, /^company-truth-v1-[0-9a-f]{64}$/);
  assert.equal(await fundingServiceDigest({ b: 2, a: 1 }), await fundingServiceDigest({ a: 1, b: 2 }));
});

test("configured Company OS scope comparison is exact", () => {
  assert.equal(sameFundingServiceScope(
    { organizationId, projectId },
    { organizationId: organizationId.toUpperCase(), projectId: projectId.toUpperCase() },
  ), true);
  assert.equal(sameFundingServiceScope(
    { organizationId, projectId },
    { organizationId, projectId: "55555555-5555-4555-8555-555555555555" },
  ), false);
});

test("internal funding route authenticates operator, active scope, role, trusted origin, and user-token RLS", async () => {
  const route = await read("app/api/internal/company-os/funding-drafts/route.ts");
  assert.match(route, /isTrustedMutationOrigin/);
  assert.match(route, /getViewer/);
  assert.match(route, /isCompanyOperatorEmail/);
  assert.match(route, /configuredCompanyOsScope/);
  assert.match(route, /organization_members\?select=role/);
  assert.match(route, /projects\?select=id,organization_id,status/);
  assert.match(route, /configured\.projectId/);
  assert.match(route, /status=eq\.active/);
  assert.match(route, /role === "owner" \|\| role === "admin"/);
  assert.doesNotMatch(route, /loadWorkspaceContext|getPrimaryWorkspaceRole/);
  assert.match(route, /funding_program_official/);
  assert.match(route, /company_truth_assertions/);
  assert.match(route, /new Date\(\)\.toISOString\(\)/);
  assert.doesNotMatch(route, /serviceRole:\s*true/);
  assert.doesNotMatch(route, /sendProductAlertEmail|sendEmail|submitApplication|browser/i);
});

test("funding artifact migration enforces tenant provenance, immutable authenticated revisions, and no execution authority", async () => {
  const sql = await read("supabase/migrations/20261005000100_company_funding_draft_artifacts.sql");
  assert.match(sql, /alter table public\.company_funding_draft_artifacts enable row level security/i);
  assert.match(sql, /public\.has_org_role[\s\S]*'owner','admin'/i);
  assert.match(sql, /created_by = \(select auth\.uid\(\)\)/i);
  assert.match(sql, /project\.id = project_id[\s\S]*project\.organization_id = organization_id[\s\S]*project\.status = 'active'/i);
  assert.match(sql, /funding_program_official/);
  assert.match(sql, /verification_state = 'verified'[\s\S]*superseded_at is null/i);
  assert.match(sql, /Company funding draft revisions are immutable/i);
  assert.match(sql, /Every persisted funding program evidence identifier must appear in the artifact evidence snapshot/i);
  assert.match(sql, /Every persisted Company Truth assertion identifier must appear as an exact artifact fact/i);
  assert.match(sql, /artifact ->> 'mode' is distinct from 'internal_draft_only'/i);
  assert.match(sql, /artifact -> 'externalEffects' is distinct from 'false'::jsonb/i);
  assert.match(sql, /artifact -> 'submissionAuthorized' is distinct from 'false'::jsonb/i);
  assert.match(sql, /artifact -> 'requiresSubmissionApproval' is distinct from 'true'::jsonb/i);
  assert.match(sql, /jsonb_typeof\(new\.artifact -> 'evidence'\) is distinct from 'array'/i);
  assert.match(sql, /grant select, insert on table public\.company_funding_draft_artifacts to authenticated/i);
  assert.doesNotMatch(sql, /grant[^;]*update[^;]*to authenticated/i);
  assert.doesNotMatch(sql, /grant[^;]*delete[^;]*to authenticated/i);
});

test("Company OS scope variables are documented but unset by default", async () => {
  const env = await read(".env.example");
  assert.match(env, /FOREMENTION_COMPANY_OS_ORGANIZATION_ID=\n/);
  assert.match(env, /FOREMENTION_COMPANY_OS_PROJECT_ID=\n/);
});
