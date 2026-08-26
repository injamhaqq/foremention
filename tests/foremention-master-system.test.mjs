import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const read = (file) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

test("public product positioning is Recommendation Intelligence, not legacy AI visibility", () => {
  const product = read("app/product/page.tsx");
  assert.match(product, /Recommendation Intelligence/);
  assert.match(product, /Recommendation Record/);
  assert.match(product, /Source X-Ray/);
  assert.match(product, /returned references[^.]*causal/i);
  assert.doesNotMatch(product, /title:\s*"AI Visibility Platform/i);
  assert.doesNotMatch(product, /Start self-serve/i);
});

test("core public knowledge architecture is explicit and crawlable", () => {
  for (const file of [
    "app/recommendation-intelligence/page.tsx",
    "app/recommendation-record/page.tsx",
    "app/source-x-ray/page.tsx",
    "app/ai-mediated-buying/page.tsx",
  ]) assert.ok(fs.existsSync(path.join(process.cwd(), file)), `${file} must exist`);

  assert.match(read("app/recommendation-intelligence/page.tsx"), /Recommendation intelligence for B2B software/);
  assert.match(read("app/recommendation-record/page.tsx"), /immutable|canonical record/i);
  assert.match(read("app/source-x-ray/page.tsx"), /returned source[^.]*causal/i);
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
  assert.match(contact, /Source X-Ray/);
  assert.doesNotMatch(contact, /AI visibility platform access/i);
});

test("unvalidated pricing remains truthful and out of the search acquisition architecture", () => {
  const pricing = read("app/pricing/page.tsx");
  assert.match(pricing, /noIndex:\s*true/);
  assert.match(pricing, /Commercial packaging is not final yet/);
  assert.match(pricing, /not validated commercial pricing/i);
  assert.match(pricing, /Recommendation Records/);
  assert.match(pricing, /Source X-Ray/);
});

test("sitemap promotes the canonical category and product objects instead of legacy thin SEO architecture", () => {
  const sitemap = read("app/sitemap.ts");
  for (const route of [
    "/product",
    "/recommendation-intelligence",
    "/recommendation-record",
    "/source-x-ray",
    "/ai-mediated-buying",
    "/methodology",
    "/insights",
  ]) assert.match(sitemap, new RegExp(route.replaceAll("/", "\\/")));

  for (const legacy of [
    "/pricing",
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
  assert.match(shell, /href="\/source-x-ray"/);
  assert.match(shell, /href="\/recommendation-intelligence"/);
  assert.match(shell, /href="\/ai-mediated-buying"/);
  assert.match(shell, /Request a demo/);
});

test("August 2026 search guidance is reflected without AI-search hacks", () => {
  const guide = read("app/insights/seo-geo-technical-checklist/page.tsx");
  assert.match(guide, /August 26, 2026/);
  assert.match(guide, /llms\.txt is not needed for Google Search/i);
  assert.match(guide, /no requirement to chunk content/i);
  assert.match(guide, /Generative AI performance report/i);
  assert.doesNotMatch(guide, /Inspect Foremention’s live audit/);
});
