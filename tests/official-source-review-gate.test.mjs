import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("workspace bulk run review cannot convert an abstaining official-source answer into VERIFIED evidence", async () => {
  const code = await readFile(new URL("../app/api/runs/[id]/review/route.ts", import.meta.url), "utf8");
  assert.match(code, /import \{ explicitOfficialSourceRequirement, assessExplicitOfficialSourceAnswer \}/);
  assert.match(code, /run_answers\?select=id,prompt_text,answer_text,citations_json/);
  assert.match(code, /explicitOfficialSourceRequirement\(answer\.prompt_text \|\| ""\)/);
  assert.match(code, /assessExplicitOfficialSourceAnswer\(answer\.answer_text, citations, requirement\)\.ok/);
  assert.match(code, /status: 422/);
  const guard = code.indexOf("if (!assessExplicitOfficialSourceAnswer(");
  const firstWrite = code.indexOf("supabaseRest(`run_answers?run_id=", guard);
  assert.ok(guard > 0 && guard < firstWrite, "guard must precede all bulk verified writes");
  assert.match(code, /source_observations\?organization_id=eq\.\$\{context\.organizationId\}/);
  assert.match(code, /review_status: "verified"/);
});
