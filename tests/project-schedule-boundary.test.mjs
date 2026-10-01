import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const text = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("customer schedule reads and toggles are scoped to the active project", async () => {
  const route = await text("app/api/schedules/route.ts");

  assert.match(
    route,
    /measurement_schedules\?select=id,cadence,timezone,question_ids,provider_ids,model_snapshot,methodology_snapshot,locale,market,enabled,next_run_at,last_run_at,last_run_id&organization_id=eq\.\$\{context\.organizationId\}&project_id=eq\.\$\{context\.projectId\}/,
  );
  assert.match(
    route,
    /measurement_schedules\?id=eq\.\$\{encodeURIComponent\(body\.id\)\}&organization_id=eq\.\$\{context\.organizationId\}&project_id=eq\.\$\{context\.projectId\}/,
  );
});

test("service-role recurring measurement rehydrates prompts only from the schedule project", async () => {
  const dispatcher = await text("lib/jobs/measurement-schedule-dispatcher.ts");

  assert.match(
    dispatcher,
    /prompts\?select=id,prompt_key,prompt_text,locale,market&organization_id=eq\.\$\{schedule\.organization_id\}&project_id=eq\.\$\{schedule\.project_id\}&active=eq\.true/,
  );
  assert.match(dispatcher, /if \(prompts\.length !== schedule\.question_ids\.length\) return null/);
});

test("schedule cadence advancement cannot update a sibling-project schedule", async () => {
  const dispatcher = await text("lib/jobs/measurement-schedule-dispatcher.ts");

  assert.match(dispatcher, /projectId: string/);
  assert.match(dispatcher, /projectId: schedule\.project_id/);
  assert.match(
    dispatcher,
    /measurement_schedules\?id=eq\.\$\{data\.scheduleId\}&organization_id=eq\.\$\{data\.organizationId\}&project_id=eq\.\$\{data\.projectId\}&next_run_at=eq\./,
  );
});
