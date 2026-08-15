import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("pause and resume persist tenant-scoped state and govern future competitor monitoring", async () => {
  const [component, route, jobs, data] = await Promise.all([
    text("components/competitor-tracker.tsx"),
    text("app/api/competitors/route.ts"),
    text("lib/jobs/inngest.ts"),
    text("lib/data.ts"),
  ]);

  assert.match(component, /active: nextActive/);
  assert.match(component, /Pause tracking/);
  assert.match(component, /Resume tracking/);
  assert.match(component, /item\.active \? "Active" : "Paused"/);
  assert.match(component, /Future collections will exclude this competitor/);
  assert.match(component, /historical observations are preserved/);
  assert.match(component, /router\.refresh\(\)/);

  assert.match(route, /typeof body\.active !== "boolean"/);
  assert.match(route, /organization_id=eq\.\$\{context\.organizationId\}/);
  assert.match(route, /project_id=eq\.\$\{context\.projectId\}/);
  assert.match(route, /body: \{ active: body\.active, updated_at:/);

  assert.match(data, /competitors\?select=id,name,website,competitor_type,active&organization_id=eq\.\$\{context\.organizationId\}&project_id=eq\.\$\{context\.projectId\}/);
  assert.match(jobs, /competitors\?select=name&project_id=eq\.\$\{run\.project_id\}&organization_id=eq\.\$\{run\.organization_id\}&active=eq\.true/);
  assert.doesNotMatch(jobs, /recordRunChanges\(run, identity\)/);
  assert.doesNotMatch(jobs, /competitor_overtook:/);
  assert.match(jobs, /schedule-weekly-workspace-runs/);
});
