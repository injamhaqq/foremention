import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const read = (file) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

test("public product positioning is Recommendation Intelligence, not legacy AI visibility", () => {
  const product = read("app/product/page.tsx");
  assert.match(product, /Recommendation Intelligence/);
  assert.match(product, /Recommendation Record/);
  assert.match(product, /evidence inspection lives in the record/i);
  assert.match(product, /returned source[^.]*causal|returned reference[^.]*causal/i);
  assert.doesNotMatch(product, /Source X-Ray|source-xray/i);
  assert.doesNotMatch(product, /title:\s*"AI Visibility Platform/i);
  assert.doesNotMatch(product, /Start self-serve/i);
});

test("core public knowledge architecture is explicit and crawlable", () => {
  for (const file of [
    "app/recommendation-intelligence/page.tsx",
    "app/recommendation-record/page.tsx",
    "app/ai-mediated-buying/page.tsx",
  ]) assert.ok(fs.existsSync(path.join(process.cwd(), file)), `${file} must exist`);

  assert.equal(fs.existsSync(path.join(process.cwd(), "app/source-x-ray/page.tsx")), false);
  assert.match(read("app/recommendation-intelligence/page.tsx"), /Recommendation intelligence for B2B software/);
  assert.match(read("app/recommendation-record/page.tsx"), /immutable|canonical record/i);
  assert.match(read("app/recommendation-record/page.tsx"), /Returned[\s\S]*Retrieved[\s\S]*Observed[\s\S]*Reviewed[\s\S]*(?:Safe conclusion|conclusion)/i);
  assert.match(read("app/ai-mediated-buying/page.tsx"), /AI-mediated software buying/i);
});

test("methodology, research, and contact reinforce the same category", () => {
  const methodology = read("app/methodology/page.tsx");
  const research = read("app/insights/page.tsx");
  const contact = read("app/contact/page.tsx");

  assert.match(methodology, /Recommendation Intelligence methodology/);
  assert.match(methodology, /returned references[^.]*distinct sources/i);
  assert.doesNotMatch(methodology, /title:\s*"AI Visibility Measurement Methodology"/i);

  assert.match(research, /Recommendation Intelligence Research/);
  assert.match(research, /AI-mediated software buying/);
  assert.doesNotMatch(research, /live Source Map/i);

  assert.match(contact, /Request a demo/);
  assert.match(contact, /Recommendation Record/);
  assert.match(contact, /inspects the returned evidence inside that record/i);
  assert.doesNotMatch(contact, /Source X-Ray|source-xray/i);
  assert.doesNotMatch(contact, /AI visibility platform access/i);
});

test("unvalidated pricing remains truthful and out of the search acquisition architecture", () => {
  const pricing = read("app/pricing/page.tsx");
  assert.match(pricing, /noIndex:\s*true/);
  assert.match(pricing, /Commercial packaging is not final yet/);
  assert.match(pricing, /not validated commercial pricing/i);
  assert.match(pricing, /Recommendation Records/);
  assert.match(pricing, /Evidence inspection inside each record/i);
  assert.doesNotMatch(pricing, /Source X-Ray|source-xray/i);
});

test("sitemap promotes the canonical category and product objects instead of legacy thin SEO architecture", () => {
  const sitemap = read("app/sitemap.ts");
  for (const route of [
    "/product",
    "/recommendation-intelligence",
    "/recommendation-record",
    "/ai-mediated-buying",
    "/methodology",
    "/insights",
  ]) assert.match(sitemap, new RegExp(route.replaceAll("/", "\\/")));

  for (const legacy of [
    "/pricing",
    "/source-x-ray",
    "/source-map",
    "/source-gap",
    "/monitoring-vs-execution",
    "/compare/geo-agencies",
    "/compare/pr-agencies",
  ]) assert.doesNotMatch(sitemap, new RegExp(legacy.replaceAll("/", "\\/")));
});

test("global structured data does not advertise unsupported SoftwareApplication rich-result data", () => {
  const layout = read("app/layout.tsx");
  assert.match(layout, /"@type":\s*"Organization"/);
  assert.doesNotMatch(layout, /"@type":\s*"SoftwareApplication"/);
});

test("public shell routes people to the defining Foremention objects", () => {
  const shell = read("components/public-shell.tsx");
  assert.match(shell, /href="\/recommendation-record"/);
  assert.match(shell, /href="\/recommendation-intelligence"/);
  assert.match(shell, /href="\/ai-mediated-buying"/);
  assert.match(shell, /Request a demo/);
  assert.doesNotMatch(shell, /Source X-Ray|\/source-x-ray/);
});

test("August 2026 search guidance is reflected without AI-search hacks", () => {
  const guide = read("app/insights/seo-geo-technical-checklist/page.tsx");
  assert.match(guide, /August 26, 2026/);
  assert.match(guide, /llms\.txt is not needed for Google Search/i);
  assert.match(guide, /no requirement to chunk content/i);
  assert.match(guide, /Generative AI performance report/i);
  assert.doesNotMatch(guide, /Inspect Foremention’s live audit/);
});
