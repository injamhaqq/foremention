// Fix track "ux" (2026-10-19), item 1: /app/sources/<id> links work again.
// Before: the route redirected every link (Sources "Review source", Overview,
// notifications, comments, webhooks) back to /app/source-map, so a source could
// never be opened or reviewed from those links. Now it resolves the entry to
// the Recommendation Record that published it, scoped to org + active project.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  isSourceEntryId,
  isUuid,
  resolveDemoSourceRunId,
  resolveSourceRecordRunId,
  sourceEvidenceAnchor,
  sourceRecordHref,
} from "../lib/source-record-location.ts";

const text = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const ORG = "11111111-1111-4111-8111-111111111111";
const OTHER_ORG = "99999999-9999-4999-8999-999999999999";
const PROJECT = "22222222-2222-4222-8222-222222222222";
const OTHER_PROJECT = "33333333-3333-4333-8333-333333333333";
const ENTRY = "44444444-4444-4444-8444-444444444444";
const MAP = "55555555-5555-4555-8555-555555555555";
const RUN = "66666666-6666-4666-8666-666666666666";

/** Minimal PostgREST stand-in that honours the filters the resolver sends. */
function fakeRest({ entries = [], maps = [] } = {}) {
  const calls = [];
  const param = (query, key) => new URLSearchParams(query).get(key)?.replace(/^eq\./, "") ?? null;
  const rest = async (path) => {
    calls.push(path);
    const [table, query] = path.split("?");
    if (table === "source_map_entries") {
      return entries.filter((row) => row.id === param(query, "id") && row.organization_id === param(query, "organization_id")).slice(0, 1);
    }
    if (table === "source_maps") {
      return maps.filter((row) => row.id === param(query, "id")
        && row.organization_id === param(query, "organization_id")
        && row.status === param(query, "status")
        && row.run.project_id === param(query, "run.project_id")
        && (!param(query, "category_id") || row.category_id === param(query, "category_id")))
        .map(({ id, run_id, run }) => ({ id, run_id, run }));
    }
    throw new Error(`unexpected table ${table}`);
  };
  return { rest, calls };
}

const seeded = (overrides = {}) => fakeRest({
  entries: [{ id: ENTRY, source_map_id: MAP, organization_id: ORG, ...overrides.entry }],
  maps: [{ id: MAP, run_id: RUN, organization_id: ORG, status: "published", category_id: "cat", run: { project_id: PROJECT }, ...overrides.map }],
});

test("a live source entry resolves to the Recommendation Record that published it", async () => {
  const { rest, calls } = seeded();
  assert.equal(await resolveSourceRecordRunId({ organizationId: ORG, projectId: PROJECT, categoryId: "cat", entryId: ENTRY, rest }), RUN);
  assert.equal(calls.length, 2);
  assert.match(calls[0], new RegExp(`organization_id=eq.${ORG}`));
  assert.match(calls[1], new RegExp(`run.project_id=eq.${PROJECT}`));
  assert.match(calls[1], /status=eq\.published/);
});

test("entries from another organization, another project, or an unpublished map never resolve", async () => {
  assert.equal(await resolveSourceRecordRunId({ organizationId: OTHER_ORG, projectId: PROJECT, entryId: ENTRY, rest: seeded().rest }), null);
  assert.equal(await resolveSourceRecordRunId({ organizationId: ORG, projectId: OTHER_PROJECT, entryId: ENTRY, rest: seeded().rest }), null);
  assert.equal(await resolveSourceRecordRunId({ organizationId: ORG, projectId: PROJECT, entryId: ENTRY, rest: seeded({ map: { status: "draft" } }).rest }), null);
  assert.equal(await resolveSourceRecordRunId({ organizationId: ORG, projectId: PROJECT, entryId: ENTRY, rest: seeded({ map: { run_id: null } }).rest }), null);
  assert.equal(await resolveSourceRecordRunId({ organizationId: ORG, projectId: PROJECT, categoryId: "other", entryId: ENTRY, rest: seeded().rest }), null);
});

test("malformed ids are refused before any database read", async () => {
  const { rest, calls } = seeded();
  for (const id of ["", "not-a-uuid", `${ENTRY}&organization_id=eq.${OTHER_ORG}`, "../../etc", "src-01"]) {
    assert.equal(await resolveSourceRecordRunId({ organizationId: ORG, projectId: PROJECT, entryId: id, rest }), null, id);
  }
  assert.equal(calls.length, 0);
  assert.equal(isUuid(ENTRY), true);
  assert.equal(isSourceEntryId("src-01"), true);
  assert.equal(isSourceEntryId("a b"), false);
  assert.equal(isSourceEntryId("<script>"), false);
});

test("the in-app target opens the entry's evidence inside its run, same-origin and relative", () => {
  assert.equal(sourceRecordHref(RUN, ENTRY), `/app/runs/${RUN}?source=${ENTRY}#source-${ENTRY}`);
  assert.equal(sourceEvidenceAnchor(ENTRY), `source-${ENTRY}`);
  assert.equal(sourceRecordHref("//evil.example", ENTRY), null);
  assert.equal(sourceRecordHref(RUN, "javascript:alert(1)"), null);
});

test("demo source ids resolve only to fictional runs whose source map contains them", () => {
  const maps = { "RUN-1": [{ id: "src-02" }], "RUN-2": [{ id: "src-01" }, { id: "src-02" }] };
  const mapFor = (id) => maps[id] || [];
  assert.equal(resolveDemoSourceRunId("src-01", ["RUN-1", "RUN-2"], mapFor), "RUN-2");
  assert.equal(resolveDemoSourceRunId("src-02", ["RUN-1", "RUN-2"], mapFor), "RUN-1");
  assert.equal(resolveDemoSourceRunId("src-99", ["RUN-1", "RUN-2"], mapFor), null);
});

test("route wiring: resolve first, keep Source X-Ray retired, and fall back to Sources", async () => {
  const [route, runPage, record] = await Promise.all([
    text("app/app/sources/[id]/page.tsx"),
    text("app/app/runs/[id]/page.tsx"),
    text("components/recommendation-answer-record.tsx"),
  ]);
  assert.match(route, /resolveSourceRecordRunId/);
  assert.match(route, /token: viewer\.accessToken/, "live lookups stay viewer-token (RLS) bound");
  assert.doesNotMatch(route, /serviceRole/);
  assert.match(route, /resolveDemoSourceRunId/);
  assert.match(route, /redirect\("\/app\/source-map"\)/, "unresolvable entries still land on Sources");
  assert.doesNotMatch(route, /Source X-Ray/);
  assert.ok(route.indexOf("redirect(target)") < route.lastIndexOf('redirect("/app/source-map")'));
  assert.match(runPage, /isSourceEntryId\(focusSourceParam\)/);
  assert.match(runPage, /focusSourceId=\{focusSourceId\}/);
  assert.match(record, /open=\{focused \|\| undefined\}/);
  assert.match(record, /sourceEvidenceAnchor\(/);
});
