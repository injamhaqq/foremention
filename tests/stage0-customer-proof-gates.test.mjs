import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("Stage-0 public funnel keeps the primary design-partner CTA visible early", async () => {
  const [home, shell, css, contact] = await Promise.all([
    read("components/goat-home-experience.tsx"),
    read("components/public-shell.tsx"),
    read("app/outreach-site.css"),
    read("app/contact/page.tsx"),
  ]);

  assert.equal((home.match(/<h1\b/g) || []).length, 1);
  assert.equal((shell.match(/<main\b/g) || []).length, 1);
  assert.match(home, /data-design-partner-cta="home_hero"/);
  assert.match(css, /min-height:\s*min\(720px,\s*calc\(100svh - 76px\)\)/);
  assert.match(css, /font-size:\s*clamp\(48px,\s*5\.5vw,\s*78px\)/);
  assert.match(contact, /Optional context — add now or cover it on the call/);
  assert.match(contact, /Founder review target: one business day/);
});

test("Stage-0 funnel analytics measures CTA impression through application submission", async () => {
  const [analytics, contract] = await Promise.all([
    read("components/public-activation-analytics.tsx"),
    read("lib/product-analytics-contract.ts"),
  ]);

  for (const event of [
    "design_partner_cta_impression",
    "design_partner_cta_clicked",
    "design_partner_page_viewed",
    "design_partner_application_started",
    "design_partner_application_submitted",
  ]) {
    assert.match(analytics, new RegExp(event));
    assert.match(contract, new RegExp(event));
  }
  assert.doesNotMatch(analytics, /FormData|\.elements\b|\[name=|\.value\b/);
});

test("public agent discovery exposes evidence-bound markdown resources", async () => {
  const [layout, seo, homePage, llms, full, sitemap, homepageMirror, agents] = await Promise.all([
    read("app/layout.tsx"),
    read("lib/seo.ts"),
    read("app/page.tsx"),
    read("public/llms.txt"),
    read("public/llms-full.txt"),
    read("public/sitemap.md"),
    read("public/index.md"),
    read("public/AGENTS.md"),
  ]);

  assert.match(layout, /rel="describedby" href="\/llms\.txt"/);
  assert.match(seo, /max-snippet:-1/);
  assert.match(seo, /max-image-preview:large/);
  assert.match(homePage, /webPageJsonLd/);
  assert.match(homePage, /Recommendation Intelligence for B2B Software/);
  assert.match(llms, /^# Foremention/m);
  assert.match(llms, /^> /m);
  assert.match(llms, /## Core/);
  assert.match(llms, /llms-full\.txt/);
  assert.match(full, /## Evidence boundaries/);
  assert.match(sitemap, /## Agent-readable resources/);
  assert.match(homepageMirror, /^---[\s\S]*canonical:/);
  assert.match(homepageMirror, /## Sitemap/);
  assert.match(agents, /## Evidence rules/);
});
