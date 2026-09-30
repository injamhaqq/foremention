import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const text = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("authenticated Recommendation Record reader proves active-project ownership and full-set completeness", async () => {
  const reader = await text("lib/recommendation-record-reader.ts");

  assert.match(reader, /loadWorkspaceContext\(viewer\)/);
  assert.match(
    reader,
    /runs\?select=id,status,answer_count,citation_count,created_at,completed_at&id=eq\.\$\{encodeURIComponent\(runId\)\}&organization_id=eq\.\$\{context\.organizationId\}&project_id=eq\.\$\{context\.projectId\}&limit=1/,
  );
  assert.match(
    reader,
    /run_answers\?select=id,run_id,prompt_key,prompt_text,provider,model,answer_text,citations_json,review_status,collected_at&organization_id=eq\.\$\{context\.organizationId\}&run_id=eq\.\$\{encodeURIComponent\(run\.id\)\}/,
  );
  assert.match(reader, /MAX_SHARED_RECORD_ANSWERS \+ 1/);
  assert.match(reader, /assessSharedRecordEvidenceSet\(run, rows\)/);
  assert.match(reader, /evidenceState\.fullyLoaded\s*\?\s*rows\.map/);
  assert.match(reader, /:\s*\[\]/);
});

test("print Record withholds detail unless the independently persisted full set is proven", async () => {
  const page = await text("app/app/runs/[id]/print/page.tsx");

  assert.match(page, /loadAuthenticatedRecommendationRecord\(viewer, id\)/);
  assert.doesNotMatch(page, /loadRuns|loadRunAnswers/);
  assert.match(page, /evidenceState\.fullyLoaded/);
  assert.match(page, /Completeness unavailable/);
  assert.match(page, /Answer review/);
  assert.match(page, /evidenceState\.reviewComplete \? "Complete" : "Not established"/);
  assert.match(page, /Full Record unavailable/);
  assert.match(page, /withheld rather than printing a partial subset/i);
  assert.match(page, /does not independently prove citation relevance/i);
  assert.doesNotMatch(page, /safeConclusion/);
});

test("CSV Record export refuses a partial or unverifiable answer set", async () => {
  const route = await text("app/api/export/record/[id]/route.ts");

  assert.match(route, /loadAuthenticatedRecommendationRecord\(viewer, id\)/);
  assert.doesNotMatch(route, /loadRuns|loadRunAnswers/);
  assert.match(route, /if \(!evidenceState\.fullyLoaded\)/);
  assert.match(route, /complete Recommendation Record could not be verified/i);
  assert.match(route, /status: 409/);
  assert.match(route, /"cache-control": "no-store"/);
  assert.match(route, /content-disposition/);
});
