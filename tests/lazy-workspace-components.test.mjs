import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");

test("heavy workspace panels are split behind accessible lazy boundaries", () => {
  const lazyPanels = read("components/lazy-workspace-panels.tsx");
  for (const component of ["source-map-table", "evidence-manager", "claim-ledger", "competitor-tracker", "intelligence-loop", "team-management"]) {
    assert.match(lazyPanels, new RegExp(`lazy\\(\\(\\) => import\\(\"@/components/${component}\"\\)`));
  }
  assert.match(lazyPanels, /aria-live="polite"/);
  assert.match(lazyPanels, /aria-busy="true"/);
  assert.match(lazyPanels, /Real workspace records will replace these placeholders/);

  const routeImports = [
    "app/app/source-map/page.tsx",
    "app/app/evidence/page.tsx",
    "app/app/competitors/page.tsx",
    "app/app/intelligence/page.tsx",
    "app/app/team/page.tsx",
  ].map(read).join("\n");
  assert.match(routeImports, /@\/components\/lazy-workspace-panels/);
  assert.doesNotMatch(routeImports, /@\/components\/(source-map-table|evidence-manager|claim-ledger|competitor-tracker|intelligence-loop|team-management)/);
});
