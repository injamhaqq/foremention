import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { CURRENT_OBSERVATION_METHODOLOGY, currentObservationMethodologyVersion } from "../lib/methodology-registry.ts";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("the observation methodology registry describes the evidence boundary explicitly", () => {
  assert.equal(currentObservationMethodologyVersion(), "3.0");
  assert.equal(CURRENT_OBSERVATION_METHODOLOGY.observationSurface, "provider-api");
  assert.equal(CURRENT_OBSERVATION_METHODOLOGY.promptSnapshot, "persisted-run-selection");
  assert.equal(CURRENT_OBSERVATION_METHODOLOGY.providerIdentity, "exact-provider");
  assert.equal(CURRENT_OBSERVATION_METHODOLOGY.modelIdentity, "exact-returned-or-configured-model");
  assert.equal(CURRENT_OBSERVATION_METHODOLOGY.citationHandling, "provider-returned-only");
  assert.equal(CURRENT_OBSERVATION_METHODOLOGY.humanReview, "required-before-trend-analytics");
  assert.equal(CURRENT_OBSERVATION_METHODOLOGY.comparisonBoundary, "exact-question-provider-model-methodology");
});

test("customer-created runs use the registry instead of an independent methodology literal", async () => {
  const route = await text("app/api/runs/route.ts");
  assert.match(route, /currentObservationMethodologyVersion/);
  assert.match(route, /methodology_version: currentObservationMethodologyVersion\(\)/);
  assert.doesNotMatch(route, /methodology_version:\s*["']3\.0["']/);
});

test("Source Maps inherit the exact persisted methodology of their collection run", async () => {
  const sourceMap = await text("lib/source-map-generation.ts");
  assert.match(sourceMap, /methodologyVersionForRun/);
  assert.match(sourceMap, /runs\?select=methodology_version&id=eq\.\$\{run\.id\}&organization_id=eq\.\$\{run\.organization_id\}/);
  assert.match(sourceMap, /methodology_version: methodologyVersion/);
  assert.match(sourceMap, /missing its persisted methodology version/);
  assert.doesNotMatch(sourceMap, /const METHODOLOGY_VERSION/);
});

test("the legacy weekly scheduler cannot silently drift from the registry version", async () => {
  const jobs = await text("lib/jobs/inngest.ts");
  const match = jobs.match(/methodology_version:\s*["']([^"']+)["']/);
  assert.ok(match, "weekly scheduled run methodology stamp must remain explicit until the scheduler is moved onto the registry helper");
  assert.equal(match[1], currentObservationMethodologyVersion());
});
