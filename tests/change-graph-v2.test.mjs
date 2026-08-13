import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("Change Graph v2 withholds run movement unless methodology and exact-model answer matrices match", async () => {
  const graph = await text("lib/change-graph.ts");

  assert.match(graph, /input\.latest\.methodologyVersion === input\.previous\.methodologyVersion/);
  assert.match(graph, /missingExactModels > 0/);
  assert.match(graph, /latestKeys\.every\(\(key, index\) => key === previousKeys\[index\]\)/);
  assert.match(graph, /status: "not_comparable"/);
  assert.match(graph, /Cross-collection movement withheld/);
  assert.match(graph, /will not label the difference as product movement/);
});

test("Change Graph keeps distinct observation types instead of collapsing them into one score", async () => {
  const graph = await text("lib/change-graph.ts");

  for (const kind of ["brand_mention", "citation", "source", "source_content", "competitor", "context", "methodology"]) {
    assert.match(graph, new RegExp(`\\| "${kind}"|kind: "${kind}"`));
  }
  assert.match(graph, /citationGains/);
  assert.match(graph, /citationLosses/);
  assert.match(graph, /gainedSources/);
  assert.match(graph, /lostSources/);
  assert.match(graph, /gainedCompetitors/);
  assert.match(graph, /lostCompetitors/);
  assert.match(graph, /contextChanges/);
  assert.match(graph, /if \(gainedSources\.length \|\| lostSources\.length\)/);
  assert.doesNotMatch(graph, /priority_score|visibility_score|change_score/i);
});

test("saved cited-page changes preserve snapshot lineage and citation linkage without causal claims", async () => {
  const graph = await text("lib/change-graph.ts");

  assert.match(graph, /snapshot\.changeState === "unreachable"/);
  assert.match(graph, /previous_snapshot_id,retrieved_at,change_state/);
  assert.match(graph, /source_snapshot_observations\?select=source_snapshot_id/);
  assert.match(graph, /linkedObservationCount: linkCounts\.get\(snapshot\.id\) \|\| 0/);
  assert.match(graph, /Compared with saved observation/);
  assert.match(graph, /Checked \$\{snapshot\.checkedAt\}/);
  assert.match(graph, /Linked to \$\{snapshot\.linkedObservationCount\} citation observation/);
  assert.match(graph, /No citation-observation link was recorded for this saved page check/);
  assert.match(graph, /does not prove what caused the difference or that AI behavior changed because of it/);
  assert.match(graph, /Page changes remain separate observations and never imply causation/);
});

test("Change Graph queries are tenant and active-project scoped with customer RLS credentials", async () => {
  const graph = await text("lib/change-graph.ts");

  assert.match(graph, /loadWorkspaceContext\(viewer\)/);
  assert.match(graph, /organization_id=eq\.\$\{context\.organizationId\}/g);
  assert.match(graph, /latestRow\.project_id !== context\.projectId/);
  assert.match(graph, /previousRow\.project_id !== context\.projectId/);
  assert.match(graph, /token: viewer\.accessToken/g);
  assert.doesNotMatch(graph, /serviceRole: true/);
});

test("Analytics suppresses misleading deltas and labels collection bars as observations when comparability fails", async () => {
  const analytics = await text("app/app/analytics/page.tsx");

  assert.match(analytics, /loadChangeGraph/);
  assert.match(analytics, /changeGraph\.status === "comparable"/);
  assert.match(analytics, /cross-collection movement withheld/i);
  assert.match(analytics, /Bars show persisted collection observations, not automatically comparable trend points/);
  assert.match(analytics, /same reviewed buyer-question, provider, exact-model, and methodology matrix/);
  assert.match(analytics, /movement is observed change, not proof that an action caused it/);
});
