import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("Competitors page uses the exact reviewed intelligence pair instead of chronological run neighbors", async () => {
  const page = await text("app/app/competitors/page.tsx");
  assert.match(page, /loadSafeWeeklyIntelligence\(viewer\)/);
  assert.match(page, /loadSafeCompetitorTracking/);
  assert.match(page, /latest: intelligence\.latest/);
  assert.match(page, /previous: intelligence\.previous/);
  assert.doesNotMatch(page, /loadCompetitorTracking/);
  assert.match(page, /no exact prior pair/i);
});

test("safe competitor metrics use only verified answers from the selected pair and active workspace", async () => {
  const loader = await text("lib/competitor-intelligence.ts");
  assert.match(loader, /loadWorkspaceContext\(viewer\)/);
  assert.match(loader, /project_id=eq\.\$\{context\.projectId\}/);
  assert.match(loader, /organization_id=eq\.\$\{context\.organizationId\}/g);
  assert.match(loader, /review_status=eq\.verified/);
  assert.match(loader, /selectedRunIds/);
  assert.match(loader, /pair\.latest/);
  assert.match(loader, /pair\.previous/);
  assert.doesNotMatch(loader, /status=in\.\(review,complete,partial\)/);
  assert.doesNotMatch(loader, /serviceRole:\s*true/);
});

test("competitor page observations do not masquerade as human-reviewed page facts or market share", async () => {
  const [loader, component] = await Promise.all([
    text("lib/competitor-intelligence.ts"),
    text("components/competitor-tracker.tsx"),
  ]);
  assert.match(loader, /name\.startsWith\("Reviewed collection"\)/);
  assert.match(loader, /crawler_checked_at/);
  assert.match(component, /Checked cited pages with competitor observed/);
  assert.match(component, /bounded checked-page observations/);
  assert.match(component, /not human confirmation of every competitor mention/i);
  assert.match(component, /exact buyer-question\/provider\/model\/methodology pair/);
  assert.match(component, /does not estimate market share or causation/i);
  assert.doesNotMatch(component, /Change from the previous collection/);
  assert.doesNotMatch(component, />Reviewed cited pages</);
});
