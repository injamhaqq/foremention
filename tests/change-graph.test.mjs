import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildSourceChangeGraph, EMPTY_SOURCE_CHANGE_GRAPH } from "../lib/change-graph.ts";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

const row = (overrides) => ({
  id: "snapshot-default",
  source_id: "11111111-1111-4111-8111-111111111111",
  run_id: null,
  previous_snapshot_id: null,
  canonical_url: "https://example.com/page",
  final_url: "https://example.com/page",
  retrieved_at: "2026-08-01T00:00:00.000Z",
  access: "open",
  http_status: 200,
  page_title: "Example page",
  change_state: "initial",
  change_reason: "First saved page observation for this source.",
  ...overrides,
});

test("Source Change Graph separates baselines, matches, differences, reachability loss, and non-comparable checks", () => {
  const graph = buildSourceChangeGraph([
    row({ id: "s1", retrieved_at: "2026-08-01T00:00:00.000Z", change_state: "initial" }),
    row({ id: "s2", previous_snapshot_id: "s1", retrieved_at: "2026-08-02T00:00:00.000Z", change_state: "unchanged" }),
    row({ id: "s3", run_id: "22222222-2222-4222-8222-222222222222", previous_snapshot_id: "s2", retrieved_at: "2026-08-03T00:00:00.000Z", change_state: "changed", change_reason: "The bounded visible-text fingerprint differed from the previous saved page observation." }),
    row({ id: "s4", previous_snapshot_id: "s3", retrieved_at: "2026-08-04T00:00:00.000Z", access: "blocked", http_status: 403, change_state: "unreachable", change_reason: "A previously reachable cited page did not allow a safe bounded inspection." }),
    row({ id: "s5", previous_snapshot_id: "s4", retrieved_at: "2026-08-05T00:00:00.000Z", access: "blocked", http_status: 403, change_state: "unknown", change_reason: "There was not enough comparable bounded text evidence to classify this page change." }),
  ], new Map([["s3", 2]]));

  assert.equal(graph.checkedCount, 5);
  assert.equal(graph.baselineCount, 1);
  assert.equal(graph.unchangedCount, 1);
  assert.equal(graph.differenceCount, 1);
  assert.equal(graph.unreachableCount, 1);
  assert.equal(graph.nonComparableCount, 1);
  assert.equal(graph.latestCheckedAt, "2026-08-05T00:00:00.000Z");
  assert.deepEqual(graph.events.map((event) => event.id), ["s4", "s3"]);
  assert.equal(graph.events[0].collectionLinked, false);
  assert.equal(graph.events[1].collectionLinked, true);
  assert.equal(graph.events[1].linkedObservationCount, 2);
});

test("an empty Change Graph stays an explicit zero-evidence state", () => {
  assert.deepEqual(buildSourceChangeGraph([]), EMPTY_SOURCE_CHANGE_GRAPH);
});

test("Change Graph reads only the signed-in workspace source set and never uses service role", async () => {
  const source = await text("lib/change-graph.ts");
  assert.match(source, /loadWorkspaceContext\(viewer\)/);
  assert.match(source, /organization_id=eq\.\$\{context\.organizationId\}/);
  assert.match(source, /source_id=in\.\(\$\{scopedSourceIds\.join\(","\)\}\)/);
  assert.match(source, /token: viewer\.accessToken/);
  assert.doesNotMatch(source, /serviceRole:\s*true/);
});

test("Analytics explains Source Change Graph as observed difference rather than causation", async () => {
  const page = await text("app/app/analytics/page.tsx");
  assert.match(page, /Source Change Graph/);
  assert.match(page, /immutable bounded page observations/);
  assert.match(page, /does not establish causation/);
  assert.match(page, /AI ranking movement, traffic, leads, or revenue/);
  assert.doesNotMatch(page, /caused (?:the )?AI/i);
});
