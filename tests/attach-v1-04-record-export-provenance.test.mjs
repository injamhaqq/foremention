import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

test("CV-05: Record CSV preserves existing answer columns and adds inspection provenance", () => {
  const route = read("app/api/export/record/[id]/route.ts");
  const original = [
    "record_id", "collection_date", "question", "provider", "model", "review_state",
    "collected_at", "answer", "returned_reference_count", "returned_references",
  ];
  let last = -1;
  for (const column of original) {
    const index = route.indexOf(`"${column}"`);
    assert.ok(index > last, `original CSV column order changed: ${column}`);
    last = index;
  }
  for (const name of [
    "organization_id", "project_id", "run_created_at", "methodology_version",
    "question_version", "question_locale", "question_market", "measurement_surface",
    "consumer_interface_equivalent", "reference_provenance",
    "comparison_eligibility", "causal_uplift_claim",
  ]) assert.ok(route.includes(`"${name}"`), `Missing explicit export provenance: ${name}`);
  assert.match(route, /loadRunManifest\(viewer, id\)\.catch\(\(\) => null\)/);
});

test("CV-05: no inferred question version or native citations from unavailable evidence", () => {
  const route = read("app/api/export/record/[id]/route.ts");
  assert.match(route, /question\.text === answer\.prompt/);
  assert.match(route, /matches\.length === 1/);
  assert.match(route, /question\?\.revision \?\? "unavailable"/);
  assert.match(route, /surface\?\.kind \|\| "unavailable"/);
  assert.match(route, /native\/provider-origin not established by CSV/);
  assert.match(route, /not assessed; compare exact eligible reviewed run pair separately/);
  assert.match(route, /before\/after is observational/);
  assert.match(route, /\.map\(csvCell\)\.join\(","\)/);
  assert.match(route, /cache-control": "no-store"/);
});
