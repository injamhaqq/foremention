import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("global workspace search routes safely into the org-scoped evidence index", async () => {
  const shell = await readFile(new URL("../components/app-shell.tsx", import.meta.url), "utf8");
  const search = await readFile(new URL("../components/workspace-global-search.tsx", import.meta.url), "utf8");
  const intelligence = await readFile(new URL("../lib/intelligence-loop.ts", import.meta.url), "utf8");
  assert.match(shell, /WorkspaceGlobalSearch/);
  assert.match(search, /encodeURIComponent\(normalized\)/);
  assert.match(search, /slice\(0, 160\)/);
  for (const kind of ["Answer", "Source", "Evidence", "Claim", "Action"]) assert.match(intelligence, new RegExp(`kind: "${kind}"`));
  assert.match(intelligence, /organization_id=eq\.\$\{context\.organizationId\}/);
  assert.match(intelligence, /loadPlacements\(viewer\)/);
});
