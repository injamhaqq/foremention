import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url); const text = (path) => readFile(new URL(path, root), "utf8");
test("question performance is derived from verified organization-scoped answers", async () => {
  const [data, page] = await Promise.all([text("lib/data.ts"), text("app/app/analytics/page.tsx")]);
  assert.match(data, /loadQuestionPerformance/); assert.match(data, /review_status=eq\.verified/); assert.match(data, /organization_id=eq\.\$\{context\.organizationId\}/); assert.match(data, /citationCount/); assert.match(data, /brandMentionCount/);
  assert.match(page, /Question performance/); assert.match(page, /evidence yield, not search volume or revenue value/);
});
