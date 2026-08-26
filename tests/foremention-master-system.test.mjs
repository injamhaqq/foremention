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

  for (const legacy of ["/source-gap", "/monitoring-vs-execution", "/compare/geo-agencies", "/compare/pr-agencies"]) {
    assert.doesNotMatch(sitemap, new RegExp(legacy.replaceAll("/", "\\/")));
  }
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
  assert.match(shell, /Request a demo/);
});
