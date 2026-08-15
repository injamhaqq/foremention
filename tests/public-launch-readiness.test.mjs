import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

const [layout, shell, analytics, homepageCss, sourceMap, sitemap] = await Promise.all([
  text("app/layout.tsx"),
  text("components/public-shell.tsx"),
  text("components/contentsquare-analytics.tsx"),
  text("components/homepage-readiness.module.css"),
  text("app/source-map/page.tsx"),
  text("app/sitemap.ts"),
]);

const compareHub = await text("app/compare/page.tsx").catch(() => "");

test("private beta structured data does not advertise inactive paid offers", () => {
  assert.match(layout, /SoftwareApplication/);
  assert.doesNotMatch(layout, /\"@type\":\s*\"Offer\"/);
  assert.doesNotMatch(layout, /price:\s*\"149\"/);
  assert.doesNotMatch(layout, /price:\s*\"499\"/);
});

test("public footer separates legal trust navigation and names subprocessors clearly", () => {
  assert.match(shell, /Legal \/ trust/);
  assert.match(shell, />Subprocessors</);
  assert.doesNotMatch(shell, />Service providers</);
});

test("footer analytics control is explicitly scoped to optional experience analytics", () => {
  assert.match(analytics, /Optional analytics settings/);
  assert.match(analytics, /Microsoft Clarity and Contentsquare/);
  assert.match(analytics, /Keep off/);
  assert.match(analytics, /Allow analytics/);
});

test("Recommendation Monitor keeps evidence intro readable and intentionally compact on phones", () => {
  assert.match(homepageCss, /\.previewEvidence\s*>\s*div:first-child\s*>\s*strong\s*\{[^}]*display:\s*block;/s);
  assert.match(homepageCss, /@media\s*\(max-width:\s*520px\)[\s\S]*\.previewAnswer/);
  assert.match(homepageCss, /@media\s*\(max-width:\s*520px\)[\s\S]*\.previewEvidenceCard/);
});

test("market evidence has a dedicated comparison home instead of interrupting Source Map", () => {
  assert.doesNotMatch(sourceMap, /marketEvidenceRecords/);
  assert.doesNotMatch(sourceMap, /Four real platforms/);
  assert.doesNotMatch(sourceMap, /Live Source Map/);
  assert.match(compareHub, /marketEvidenceRecords/);
  assert.match(compareHub, /first-party/i);
  assert.match(compareHub, /not that an AI engine cited/i);
  assert.match(sitemap, /path:\s*\"\/compare\"/);
});
