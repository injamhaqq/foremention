import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const text = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("core workspace reads stay inside the active project", async () => {
  const data = await text("lib/data.ts");

  assert.match(
    data,
    /runs\?select=id,status,error_summary,[^\n]+organization_id=eq\.\$\{context\.organizationId\}&project_id=eq\.\$\{context\.projectId\}/,
  );
  assert.match(
    data,
    /prompts\?select=id,prompt_key,prompt_text,active,prompt_clusters\(name\)&organization_id=eq\.\$\{context\.organizationId\}&project_id=eq\.\$\{context\.projectId\}/,
  );
  assert.match(
    data,
    /prompt_clusters\?select=id&organization_id=eq\.\$\{organizationId\}&project_id=eq\.\$\{project\.id\}/,
  );
  assert.match(data, /run:runs!inner\(project_id\)/);
  assert.match(data, /run\.project_id=eq\.\$\{context\.projectId\}/);
});

test("run and prompt mutations cannot cross the active project boundary", async () => {
  const [prompts, runs, review, cancel, shares] = await Promise.all([
    text("app/api/prompts/route.ts"),
    text("app/api/runs/route.ts"),
    text("app/api/runs/[id]/review/route.ts"),
    text("app/api/runs/[id]/route.ts"),
    text("app/api/records/[id]/share/route.ts"),
  ]);

  assert.match(
    prompts,
    /prompts\?select=id&id=eq\.\$\{id\}&organization_id=eq\.\$\{context\.organizationId\}&project_id=eq\.\$\{context\.projectId\}/,
  );
  assert.match(runs, /const persistedIdempotencyKey = \`\$\{context\.projectId\}:\$\{idempotencyKey\}\`/);
  assert.match(runs, /const idempotencyFilter = \[idempotencyKey, persistedIdempotencyKey\]/);
  assert.match(runs, /idempotency_key=in\.\(\$\{idempotencyFilter\}\)/);
  assert.match(runs, /idempotency_key: persistedIdempotencyKey/);
  assert.match(
    runs,
    /organization_id=eq\.\$\{context\.organizationId\}&project_id=eq\.\$\{context\.projectId\}&idempotency_key=/,
  );
  assert.match(
    runs,
    /organization_id=eq\.\$\{context\.organizationId\}&project_id=eq\.\$\{context\.projectId\}&active_request_key=/,
  );
  assert.match(
    review,
    /id=eq\.\$\{encodeURIComponent\(id\)\}&organization_id=eq\.\$\{context\.organizationId\}&project_id=eq\.\$\{context\.projectId\}/,
  );
  assert.match(
    cancel,
    /id=eq\.\$\{id\}&organization_id=eq\.\$\{context\.organizationId\}&project_id=eq\.\$\{context\.projectId\}/,
  );
  assert.match(shares, /const run = \(await loadRuns\(viewer\)\)\.find/);
  assert.match(shares, /Recommendation Record not found/);
});

test("explicit schedules are project-scoped without expanding legacy weekly billing behavior", async () => {
  const [dispatcher, inngest] = await Promise.all([
    text("lib/jobs/measurement-schedule-dispatcher.ts"),
    text("lib/jobs/inngest.ts"),
  ]);

  assert.match(
    dispatcher,
    /organization_id=eq\.\$\{schedule\.organization_id\}&project_id=eq\.\$\{schedule\.project_id\}&idempotency_key=/,
  );
  assert.match(inngest, /const byOrganization = new Map/);
  assert.match(inngest, /weekly:\$\{seed\.organization_id\}:\$\{weekKey\}/);
  assert.doesNotMatch(inngest, /byWorkspaceProject/);
});
