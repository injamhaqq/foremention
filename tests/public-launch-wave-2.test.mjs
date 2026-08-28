import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");
const optionalText = async (path) => {
  try {
    return await text(path);
  } catch (error) {
    if (error?.code === "ENOENT") return "";
    throw error;
  }
};

const pricing = await text("app/pricing/page.tsx");
const homepage = await text("app/page.tsx");
const sourceMap = await text("app/source-map/page.tsx");
const homepageStyles = await text("components/homepage-readiness.module.css");
const sitemap = await text("app/sitemap.ts");
const compare = await optionalText("app/compare/page.tsx");

test("pricing sells the outcome without publishing unvalidated paid anchors during free beta", () => {
  assert.match(pricing, /Commercial packaging is not final yet/i);
  assert.match(pricing, /Core/);
  assert.match(pricing, /Signal/);
  assert.match(pricing, /Intelligence/);
  assert.match(pricing, /Pricing to be confirmed/i);
  assert.match(pricing, /Join private beta/);
  assert.match(pricing, /does not charge a card/i);
  assert.match(pricing, /paid checkout is not active/i);
  assert.match(pricing, /Recommendation Records/);
  assert.match(pricing, /Evidence inspection inside each record/i);
  assert.doesNotMatch(pricing, /\$149|\$499/);
  assert.doesNotMatch(homepage, /\$149|\$499/);
  assert.doesNotMatch(pricing, /pricingComparison/);
  assert.doesNotMatch(pricing, /peec\.ai\/pricing|scrunch\.com\/pricing|tryprofound\.com\/pricing/);
});

test("Source Map is a clearly dated self-audit instead of a mixed competitor destination", () => {
  assert.match(sourceMap, /dated website audit/i);
  assert.match(sourceMap, /not a continuously refreshed dashboard/i);
  assert.doesNotMatch(sourceMap, /marketEvidenceRecords/);
  assert.doesNotMatch(sourceMap, /Live Source Map/);
  assert.match(sourceMap, /href="\/compare"/);
});

test("market evidence keeps a dedicated comparison hub without promoting it into the canonical search sitemap", () => {
  assert.match(compare, /marketEvidenceRecords/);
  assert.match(compare, /not that an AI engine cited the page/i);
  assert.match(compare, /not that a vendor claim is independently true/i);
  assert.match(compare, /\/compare\/monitoring-tools/);
  assert.match(compare, /\/compare\/geo-agencies/);
  assert.match(compare, /\/compare\/pr-agencies/);
  assert.doesNotMatch(sitemap, /path:\s*"\/compare"/);
});

test("Recommendation Monitor compacts intentionally on narrow phones", () => {
  assert.match(homepageStyles, /\.previewEvidence\s*>\s*div:first-child\s*>\s*strong\s*\{[^}]*display:\s*block;/s);
  assert.match(homepageStyles, /@media\s*\(max-width:\s*520px\)/);
  assert.match(homepageStyles, /@media\s*\(max-width:\s*520px\)[\s\S]*\.previewAnswer,[\s\S]*\.previewEvidence\s*\{[^}]*padding:\s*0\.9rem;/);
});
