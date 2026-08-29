import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

const files = {
  layout: "app/layout.tsx",
  home: "app/page.tsx",
  homeExperience: "components/goat-home-experience.tsx",
  heroSignal: "components/canonical-signal-field.tsx",
  workspaceNav: "components/workspace-navigation.tsx",
  runDetail: "app/app/runs/[id]/page.tsx",
  retiredSourceRoute: "app/app/sources/[id]/page.tsx",
  sourceReview: "components/source-review-form.tsx",
  activationAnalytics: "components/workspace-activation-analytics.tsx",
  globals: "app/globals.css",
  canonicalCss: "app/canonical-system.css",
  canonicalHomepage: "app/canonical-homepage.css",
  canonicalReleaseQa: "app/canonical-release-qa.css",
};

test("canonical visual system is wired before the founder-reference and release layers", async () => {
  const layout = await text(files.layout);
  const canonicalIndex = layout.indexOf('import "./canonical-system.css"');
  const referenceIndex = layout.indexOf('import "./founder-reference-system.css"');
  const releaseIndex = layout.indexOf('import "./canonical-release-qa.css"');
  assert.ok(canonicalIndex >= 0, "canonical-system.css must be imported");
  assert.ok(referenceIndex > canonicalIndex, "founder-reference-system.css must refine canonical-system.css");
  assert.ok(releaseIndex > referenceIndex, "canonical-release-qa.css must stay last");
});

test("canonical CSS carries the approved black graphite green system without reviving retired color directions", async () => {
  const [canonical, homepage, release] = await Promise.all([
    text(files.canonicalCss),
    text(files.canonicalHomepage),
    text(files.canonicalReleaseQa),
  ]);
  const combined = `${canonical}\n${homepage}\n${release}`;
  for (const token of ["#0D0F0E", "#151817", "#176347"]) assert.match(combined, new RegExp(token, "i"));
  assert.doesNotMatch(canonical, /#CF8B5C|#70F0C6|#041514/);
});

test("approved canonical Foremention identity artwork stays locked while legacy artwork stays retired", async () => {
  const brand = await text("components/brand.tsx");
  assert.match(brand, /foremention-logo-white\.svg/);
  assert.match(brand, /foremention-mark-white\.svg/);
  assert.doesNotMatch(brand, /source-eclipse|Meridian OS/i);
});

test("homepage follows the approved product composition with lightweight layered 5d depth", async () => {
  const [home, signal, homepageCss, releaseCss, layout] = await Promise.all([
    text(files.home),
    text(files.heroSignal),
    text(files.canonicalHomepage),
    text(files.canonicalReleaseQa),
    text(files.layout),
  ]);
  assert.match(home, /CanonicalSignalField/);
  assert.match(signal, /canonical-signal--5d/);
  assert.match(signal, /IntersectionObserver/);
  assert.match(signal, /prefers-reduced-motion/);
  assert.match(signal, /canonical-signal__horizon/);
  assert.match(signal, /canonical-signal__beam/);
  assert.doesNotMatch(signal, /foremention-hero-signal\.jpg/);
  assert.doesNotMatch(signal, /three|webgl|canvas/i);
  assert.match(homepageCss, /canonical-home__pillars--reference/);
  assert.match(releaseCss, /canonical-signal__depth--horizon/);
  assert.match(layout, /Recommendation intelligence for B2B software/);
});

test("signed-in primary IA remains exactly five product objects", async () => {
  const nav = await text(files.workspaceNav);
  const primary = nav.slice(nav.indexOf("const primaryNav"), nav.indexOf("export const CONTEXTUAL_WORKSPACE_ROUTES"));
  for (const label of ["Attention", "Questions", "Records", "Comparisons", "Settings"]) assert.match(primary, new RegExp(`"${label}"`));
  assert.doesNotMatch(primary, /Source X-Ray|Evidence Vault|Competitors|Actions/);
  assert.match(nav, /CONTEXTUAL_WORKSPACE_ROUTES/);
});

test("Recommendation Record evidence semantics stay distinct and standalone Source X-Ray is retired", async () => {
  const [home, runDetail, retiredSourceRoute, activationAnalytics, reviewForm] = await Promise.all([
    text(files.homeExperience),
    text(files.runDetail),
    text(files.retiredSourceRoute),
    text(files.activationAnalytics),
    text(files.sourceReview),
  ]);
  for (const label of ["ANSWER", "REFERENCE", "SOURCE", "REVIEW"]) assert.match(home, new RegExp(label));
  for (const label of ["RETURNED", "RETRIEVED", "OBSERVED", "REVIEWED", "SAFE CONCLUSION"]) assert.match(home, new RegExp(label));
  assert.match(home, /registered-foundation/);
  assert.match(runDetail, /Recommendation Record/);
  assert.match(retiredSourceRoute, /redirect\("\/app\/source-map"\)/);
  assert.doesNotMatch(home, /Source X-Ray|source-xray/i);
  assert.match(activationAnalytics, /evidence_inspection_opened/);
  assert.match(reviewForm, /review/i);
});
