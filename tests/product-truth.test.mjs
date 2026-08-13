import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { productTruthForRunMetric, productTruthMetric } from "../lib/product-truth.ts";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("Product Truth requires source, sample, denominator, freshness, verification, scope, and methodology", () => {
  const metric = productTruthMetric({
    label: "Brand presence",
    source: "Verified AI answers",
    sample: "5 answers",
    denominator: "5 reviewed answer slots",
    freshness: "Latest included collection: Aug 13, 2026",
    verification: "Human reviewed",
    scope: "Active organization and project only",
    methodology: "Exact question/provider/model/methodology comparison boundary",
  });
  assert.equal(metric.id, "brand-presence");
  assert.equal(metric.sample, "5 answers");
  assert.throws(() => productTruthMetric({
    label: "Incomplete",
    source: "",
    sample: "1",
    denominator: "1",
    freshness: "today",
    verification: "reviewed",
    scope: "workspace",
    methodology: "v1",
  }), /missing source/i);
});

test("run metric truth labels demo isolation and collection freshness without inventing provenance", () => {
  const live = productTruthForRunMetric({
    label: "Cited sources",
    source: "Provider-returned citations",
    sample: "7 citation observations",
    denominator: "5 mapped sources",
    collectedAt: "Aug 13, 2026",
    verification: "3 of 5 pages checked",
    demo: false,
    methodology: "Returned citations only",
  });
  assert.equal(live.scope, "Active organization and project only");
  assert.equal(live.freshness, "Latest included collection: Aug 13, 2026");

  const demo = productTruthForRunMetric({ ...live, collectedAt: "Jul 20, 2026", demo: true });
  assert.equal(demo.scope, "Fictional demo workspace only");
});

test("Overview exposes compact provenance for all four primary metrics", async () => {
  const [page, panel] = await Promise.all([
    text("app/app/page.tsx"),
    text("components/product-truth-panel.tsx"),
  ]);
  for (const id of ["overview-brand-presence", "overview-competitor-appearances", "overview-cited-sources", "overview-reviewed-opportunities"]) {
    assert.match(page, new RegExp(id));
  }
  assert.match(page, /ProductTruthPanel/);
  assert.match(page, /Why you can trust these four metrics/);
  assert.match(page, /Cross-collection movement is shown only when exact buyer-question text, provider, exact model, and methodology all match/);
  for (const label of ["Source", "Sample", "Denominator", "Freshness", "Verification", "Workspace scope", "Methodology"]) {
    assert.match(panel, new RegExp(`>${label}<`));
  }
});
