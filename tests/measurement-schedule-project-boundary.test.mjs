import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const text = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("measurement schedule API is scoped to the active project", async () => {
  const api = await text("app/api/schedules/route.ts");

  assert.match(
    api,
    /measurement_schedules\?select=id,cadence,timezone,question_ids,provider_ids,model_snapshot,methodology_snapshot,locale,market,enabled,next_run_at,last_run_at,last_run_id&organization_id=eq\.\$\{context\.organizationId\}&project_id=eq\.\$\{context\.projectId\}/,
  );
  assert.match(api, /organization_id: context\.organizationId/);
  assert.match(api, /project_id: context\.projectId/);
  assert.match(api, /category_id: context\.categoryId/);
  assert.match(
    api,
    /measurement_schedules\?id=eq\.\$\{encodeURIComponent\(body\.id\)\}&organization_id=eq\.\$\{context\.organizationId\}&project_id=eq\.\$\{context\.projectId\}/,
  );
});

test("schedule dispatcher re-verifies project category and questions before reserving a run", async () => {
  const dispatcher = await text("lib/jobs/measurement-schedule-dispatcher.ts");

  assert.match(dispatcher, /projectId: string/);
  assert.match(
    dispatcher,
    /projects\?select=id&id=eq\.\$\{schedule\.project_id\}&organization_id=eq\.\$\{schedule\.organization_id\}&status=eq\.active/,
  );
  assert.match(
    dispatcher,
    /categories\?select=id&id=eq\.\$\{schedule\.category_id\}&organization_id=eq\.\$\{schedule\.organization_id\}&active=eq\.true/,
  );
  assert.match(
    dispatcher,
    /prompts\?select=id,prompt_key,prompt_text,locale,market&organization_id=eq\.\$\{schedule\.organization_id\}&project_id=eq\.\$\{schedule\.project_id\}&category_id=eq\.\$\{schedule\.category_id\}&active=eq\.true/,
  );
  assert.match(
    dispatcher,
    /runs\?select=id,status,estimated_max_cost_usd,requested_units&organization_id=eq\.\$\{schedule\.organization_id\}&project_id=eq\.\$\{schedule\.project_id\}&idempotency_key=eq/,
  );
});

test("schedule dispatch and advancement preserve project identity", async () => {
  const dispatcher = await text("lib/jobs/measurement-schedule-dispatcher.ts");

  assert.match(
    dispatcher,
    /data: \{ runId: data\.runId, organizationId: data\.organizationId, projectId: data\.projectId \}/,
  );
  assert.match(
    dispatcher,
    /measurement_schedules\?id=eq\.\$\{data\.scheduleId\}&organization_id=eq\.\$\{data\.organizationId\}&project_id=eq\.\$\{data\.projectId\}&next_run_at=eq/,
  );
  assert.match(dispatcher, /scheduleIdempotencyKey/);
  assert.match(dispatcher, /nextScheduleAt/);
});
