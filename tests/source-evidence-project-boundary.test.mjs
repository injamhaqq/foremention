import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const text = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("source-map loaders derive project ownership through their producing runs", async () => {
  const [data, integrity] = await Promise.all([
    text("lib/data.ts"),
    text("lib/evidence-integrity-data.ts"),
  ]);

  assert.match(
    data,
    /source_maps\?select=id,run:runs!inner\(project_id\)&organization_id=eq\.\$\{context\.organizationId\}&run\.project_id=eq\.\$\{context\.projectId\}/,
  );
  assert.match(
    integrity,
    /source_maps\?select=id,run_id,run:runs!inner\(project_id\)[^\n]+run\.project_id=eq\.\$\{context\.projectId\}/,
  );
  assert.match(
    data,
    /source_map_entries\?select=[^\n]+organization_id=eq\.\$\{context\.organizationId\}&source_map_id=eq\.\$\{maps\[0\]\.id\}/,
  );
});

test("source evidence excerpts cannot reuse sibling-project run answers", async () => {
  const data = await text("lib/data.ts");

  assert.match(data, /loadSourceEvidenceContexts[\s\S]+const context = await loadWorkspaceContext\(viewer\)/);
  assert.match(
    data,
    /run_answers\?select=id,prompt_key,prompt_text,provider,model,answer_text,run:runs!inner\(project_id\)&organization_id=eq\.\$\{context\.organizationId\}&run\.project_id=eq\.\$\{context\.projectId\}/,
  );
  assert.doesNotMatch(
    data,
    /run_answers\?select=id,prompt_key,prompt_text,provider,model,answer_text&organization_id=eq\.\$\{organizationId\}&id=in\.\(\$\{answerIds\.join\(","\)\}\)/,
  );
});
