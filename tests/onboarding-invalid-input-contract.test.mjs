import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("invalid onboarding fails before derived question generation or persistence", async () => {
  const route = await text("app/api/onboarding/route.ts");
  const requiredBoundary = route.indexOf('if (!companyName || !domain || !category)');
  const generatedQuestions = route.indexOf("const generatedPrompts = generateBuyerQuestions(");
  const persistence = route.indexOf('supabaseRest<Record<string, unknown>>("rpc/complete_onboarding"');

  assert.ok(requiredBoundary >= 0, "required onboarding boundary must exist");
  assert.ok(generatedQuestions > requiredBoundary, "buyer-question generation must happen only after required fields pass");
  assert.ok(persistence > generatedQuestions, "persistence must remain after validated derived onboarding data");
  assert.match(route, /Company, domain, and category are required/);
});
