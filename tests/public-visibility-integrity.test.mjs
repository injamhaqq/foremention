import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  assessPublicVisibilityAggregate,
  MAX_PUBLIC_REPORT_ANSWERS,
  selectPublicReportRuns,
} from "../lib/public-visibility-integrity.mjs";

const run = (id, overrides = {}) => ({
  id, status: "complete", answer_count: 2, citation_count: 3, brand_presence_pct: 50,
  provider_ids: ["cloudflare"], completed_at: "2026-10-01T00:00:00Z", ...overrides,
});
const answer = (id, run_id, prompt_key, overrides = {}) => ({
  id, run_id, prompt_key, provider: "cloudflare", review_status: "verified",
  brand_present: false, citations_json: [], ...overrides,
});
const goodRows = () => [
  answer("a1", "r2", "q1", { brand_present: true, citations_json: [{ url: "https://www.Example.com/a#x" }, { url: "https://example.com/b" }] }),
  answer("a2", "r2", "q2", { citations_json: [{ url: "https://example.com/a" }] }),
  answer("a3", "r1", "q1", { brand_present: true, citations_json: [{ url: "https://other.com/c" }] }),
  answer("a4", "r1", "q2", { citations_json: [{ url: "https://example.com/b" }, { url: "https://other.com/d" }] }),
];

test("public aggregate is recomputed only from complete fully verified answer sets", () => {
  const result = assessPublicVisibilityAggregate([run("r2"), run("r1")], goodRows());
  assert.equal(result.ok, true);
  assert.deepEqual(result.aggregate, {
    runs: 2, providerCoverage: 1, latestBrandPresence: 50, totalAnswers: 4, totalCitations: 6, citedUrlCount: 4,
  });
});

test("a truncated or partially verified answer set withholds the whole public aggregate", () => {
  const runs = [run("r2"), run("r1")];
  assert.equal(assessPublicVisibilityAggregate(runs, goodRows().slice(0, 3)).ok, false);
  const pending = goodRows(); pending[3] = { ...pending[3], review_status: "unreviewed" };
  assert.equal(assessPublicVisibilityAggregate(runs, pending).reason, "INVALID_VERIFIED_ANSWER_PROVENANCE");
  const duplicateSlot = goodRows(); duplicateSlot[1] = { ...duplicateSlot[1], prompt_key: "q1" };
  assert.equal(assessPublicVisibilityAggregate(runs, duplicateSlot).reason, "DUPLICATE_QUESTION_PROVIDER_SLOT");
  const otherProvider = goodRows(); otherProvider[0] = { ...otherProvider[0], provider: "openai" };
  assert.equal(assessPublicVisibilityAggregate(runs, otherProvider).reason, "UNRECORDED_PROVIDER");
});

test("contradicted run counters fail closed instead of publishing stale figures", () => {
  assert.equal(assessPublicVisibilityAggregate([run("r2", { brand_presence_pct: 100 }), run("r1")], goodRows()).reason, "BRAND_PRESENCE_MISMATCH");
  assert.equal(assessPublicVisibilityAggregate([run("r2", { citation_count: 9 }), run("r1")], goodRows()).reason, "CITATION_COUNT_MISMATCH");
  assert.equal(assessPublicVisibilityAggregate([run("r2", { answer_count: 3 }), run("r1")], goodRows()).ok, false);
  const unresolved = goodRows(); unresolved[1] = { ...unresolved[1], brand_present: null };
  assert.equal(assessPublicVisibilityAggregate([run("r2"), run("r1")], unresolved).reason, "UNRESOLVED_BRAND_OBSERVATION");
  assert.equal(assessPublicVisibilityAggregate([run("r2", { status: "partial" }), run("r1")], goodRows()).reason, "NON_COMPLETE_RUN");
});

test("run selection reserves a sentinel under the bounded answer read", () => {
  const big = Math.floor(MAX_PUBLIC_REPORT_ANSWERS / 2);
  const selection = selectPublicReportRuns([run("r3", { answer_count: big }), run("r2", { answer_count: big }), run("r1", { answer_count: 1 })]);
  assert.equal(selection.ok, true);
  assert.deepEqual(selection.runs.map((r) => r.id), ["r3"]);
  assert.ok(selection.expectedAnswers < MAX_PUBLIC_REPORT_ANSWERS);
  assert.equal(selectPublicReportRuns([run("r1", { answer_count: MAX_PUBLIC_REPORT_ANSWERS })]).ok, false);
  assert.equal(selectPublicReportRuns([run("r1", { answer_count: null })]).reason, "INVALID_RECORDED_RUN_DENOMINATOR");
});

test("public report loader uses the integrity gate and no organization-wide source count", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "lib/public-visibility-report.ts"), "utf8");
  assert.match(source, /assessPublicVisibilityAggregate/);
  assert.match(source, /review_status=eq\.verified/);
  assert.doesNotMatch(source, /sources\?select=id/);
  assert.doesNotMatch(source, /limit=5000/);
});
