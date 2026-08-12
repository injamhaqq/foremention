import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("global workspace search is tenant-scoped and covers all customer product areas", async () => {
  const [shell, searchBox, page, search] = await Promise.all([
    text("components/app-shell.tsx"),
    text("components/workspace-global-search.tsx"),
    text("app/app/search/page.tsx"),
    text("lib/workspace-search.ts"),
  ]);
  assert.match(shell, /WorkspaceGlobalSearch/);
  assert.match(searchBox, /Search Foremention/);
  assert.match(searchBox, /encodeURIComponent\(normalized\)/);
  assert.match(searchBox, /slice\(0, 160\)/);
  assert.match(searchBox, /\/app\/search\?q=/);
  assert.match(page, /requireViewer\("\/app\/search"\)/);
  assert.match(page, /Results below are partial/);

  for (const kind of ["Question", "AI Result", "Source", "Competitor", "Opportunity", "Action"]) {
    assert.match(search, new RegExp(`kind: "${kind}"`));
  }
  assert.match(search, /organization_id=eq\.\$\{context\.organizationId\}/);
  assert.match(search, /project_id=eq\.\$\{context\.projectId\}/);
  assert.match(search, /run:runs!inner\(project_id\)/);
  assert.match(search, /run\.project_id=eq\.\$\{context\.projectId\}/);
  assert.match(search, /review_status=eq\.verified/);
  assert.match(search, /client_present=eq\.false/);
  assert.match(search, /failedKinds/);
  assert.doesNotMatch(search, /serviceRole: true/);
});
