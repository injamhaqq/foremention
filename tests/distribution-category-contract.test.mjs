import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
async function text(path) {
  try { return await readFile(new URL(path, root), "utf8"); }
  catch { return ""; }
}

test("Recommendation Intelligence category ownership is explicit without unsupported leadership claims", async () => {
  const [category, glossary, shell] = await Promise.all([
    text("app/recommendation-intelligence/page.tsx"),
    text("app/glossary/page.tsx"),
    text("components/public-shell.tsx"),
  ]);
  assert.match(category, /Recommendation Intelligence/);
  assert.match(category, /SEO/);
  assert.match(category, /GEO|AEO/);
  assert.match(category, /rank tracking/i);
  assert.match(category, /AI visibility/i);
  assert.match(category, /buyer question/i);
  assert.match(category, /Recommendation Record/);
  assert.doesNotMatch(category, /market leader|category leader|world.?s first|#1/i);
  assert.match(glossary, /Recommendation Record/);
  assert.match(glossary, /comparab/i);
  assert.match(glossary, /returned source/i);
  assert.match(shell, /recommendation-intelligence/);
  assert.match(shell, /glossary/);
});

test("research and partner distribution surfaces are evidence gated and do not fabricate proof", async () => {
  const [research, partners] = await Promise.all([
    text("app/insights/page.tsx"),
    text("app/partners/page.tsx"),
  ]);
  assert.match(research, /Foremention Research/);
  assert.match(research, /State of Recommendation Intelligence/);
  assert.match(research, /benchmark/i);
  assert.match(research, /minimum sample|sample threshold|eligible cohort/i);
  assert.match(partners, /agenc/i);
  assert.match(partners, /consult/i);
  assert.match(partners, /VC|venture/i);
  assert.match(partners, /accelerator/i);
  assert.match(partners, /integration/i);
  assert.match(partners, /no partner logos|not.*partnership|does not imply/i);
});

test("SEO distribution publishes an intentional finite index with methodology authority", async () => {
  const [sitemap, robots, seo] = await Promise.all([
    text("app/sitemap.ts"),
    text("app/robots.ts"),
    text("lib/seo.ts"),
  ]);
  for (const path of ["/recommendation-intelligence", "/methodology", "/insights", "/glossary", "/partners", "/recommendation-record"]) {
    assert.match(sitemap, new RegExp(path.replaceAll("/", "\\/")));
  }
  assert.match(robots, /\/app\//);
  assert.match(robots, /\/share\//);
  assert.match(robots, /\/api\//);
  assert.match(seo, /DefinedTermSet|CollectionPage|WebPage/);
});

test("shared Recommendation Records support privacy-first stakeholder and executive views with attribution", async () => {
  const [shareApi, sharePage, actions] = await Promise.all([
    text("app/api/records/[id]/share/route.ts"),
    text("app/share/record/[token]/page.tsx"),
    text("components/shared-record-actions.tsx"),
  ]);
  assert.match(shareApi, /expiresInDays/);
  assert.match(shareApi, /revok/i);
  assert.match(shareApi, /includeEvidence/);
  assert.match(shareApi, /visibility/);
  assert.match(shareApi, /private/);
  assert.match(sharePage, /stakeholder/i);
  assert.match(sharePage, /executive/i);
  assert.match(sharePage, /noindex|index: false/i);
  assert.match(actions, /Foremention/);
  assert.match(actions, /shared-record/);
  assert.match(actions, /record_share_viewed/);
  assert.match(actions, /record_share_workspace_cta_clicked/);
});

test("distribution analytics remain allowlisted and PII-safe", async () => {
  const [contract, analytics] = await Promise.all([
    text("lib/product-analytics-contract.ts"),
    text("lib/product-analytics.ts"),
  ]);
  for (const event of ["record_share_viewed", "record_share_workspace_cta_clicked", "category_page_viewed", "research_page_viewed", "partner_page_viewed"]) {
    assert.match(contract, new RegExp(event));
  }
  assert.doesNotMatch(contract, /raw_question|raw_answer|customer_name|share_token/);
  assert.doesNotMatch(analytics, /share_token/);
});

test("distribution operating system is documented without fake prospects partnerships or benchmarks", async () => {
  const doc = await text("docs/billion-dollar-build/04-distribution-category.md");
  assert.match(doc, /ICP target account/i);
  assert.match(doc, /trigger event/i);
  assert.match(doc, /LinkedIn/i);
  assert.match(doc, /design partner/i);
  assert.match(doc, /CRM schema/i);
  assert.match(doc, /research/i);
  assert.match(doc, /partner/i);
  assert.match(doc, /benchmark/i);
  assert.match(doc, /no synthetic|never fabricate|do not fabricate/i);
});
