import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("Company OS funding route derives authorization and scope server-side", async () => {
  const [route, service] = await Promise.all([
    read("app/api/internal/company-os/funding-drafts/route.ts"),
    read("lib/company-os/funding-draft-service.ts"),
  ]);

  assert.match(route, /isTrustedMutationOrigin\(request\)/);
  assert.match(route, /getViewer\(\)/);
  assert.match(route, /viewer\.mode === "demo"/);
  assert.match(route, /!viewer\.accessToken/);
  assert.match(route, /isCompanyOperatorEmail\(viewer\.email\)/);
  assert.match(route, /configuredCompanyOsScope\(\)/);
  assert.match(route, /role === "owner" \|\| role === "admin"/);
  assert.match(route, /status=eq\.active/);
  assert.match(route, /token: viewer\.accessToken/);

  assert.match(service, /FOREMENTION_COMPANY_OS_ORGANIZATION_ID/);
  assert.match(service, /FOREMENTION_COMPANY_OS_PROJECT_ID/);
  assert.doesNotMatch(route, /body\.(?:organizationId|projectId|createdBy)/);
  assert.doesNotMatch(route, /SUPABASE_SERVICE_ROLE_KEY|service[_-]?role/i);
});

test("funding POST accepts only bounded opportunity inputs and derives company truth from the configured project", async () => {
  const [route, service] = await Promise.all([
    read("app/api/internal/company-os/funding-drafts/route.ts"),
    read("lib/company-os/funding-draft-service.ts"),
  ]);

  assert.match(service, /new Set\(\["schemaVersion", "programEvidenceIds", "opportunities"\]\)/);
  assert.match(service, /programEvidenceIds\.length < 1 \|\| root\.programEvidenceIds\.length > 10/);
  assert.match(service, /sourceEvidenceId/);
  assert.match(route, /company_truth_entities\?select=id,canonical_key/);
  assert.match(route, /company_truth_assertions\?select=id,attribute_key,asserted_value_json,evidence_item_id,verified_at/);
  assert.match(route, /organization_id=eq\.\$\{encodeURIComponent\(context\.organizationId\)\}/);
  assert.match(route, /project_id=eq\.\$\{encodeURIComponent\(context\.projectId\)\}/);
  assert.match(route, /verification_state=eq\.verified&superseded_at=is\.null/);
  assert.match(route, /evidence_type\.trim\(\)\.toLowerCase\(\) !== "funding_program_official"/);
});

test("funding persistence remains internal draft only and append-only for authenticated operators", async () => {
  const [route, migration] = await Promise.all([
    read("app/api/internal/company-os/funding-drafts/route.ts"),
    read("supabase/migrations/20261005000100_company_funding_draft_artifacts.sql"),
  ]);

  assert.match(route, /mode: "internal_draft_only"/);
  assert.match(route, /grants no submission authority/);
  assert.match(migration, /externalEffects'[\s\S]*'false'::jsonb/i);
  assert.match(migration, /submissionAuthorized'[\s\S]*'false'::jsonb/i);
  assert.match(migration, /requiresSubmissionApproval'[\s\S]*'true'::jsonb/i);
  assert.match(migration, /alter table public\.company_funding_draft_artifacts enable row level security/i);
  assert.match(migration, /grant select, insert on table public\.company_funding_draft_artifacts to authenticated/i);
  assert.doesNotMatch(migration, /grant\s+(?:update|delete|all)[^;]*\bauthenticated\b/i);
  assert.match(migration, /if tg_op = 'UPDATE' then[\s\S]*Company funding draft revisions are immutable/i);
});
