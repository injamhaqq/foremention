import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("canonical visual system is wired before the founder-reference and release layers", async () => {
  const [layout, css, homepageCss, releaseCss] = await Promise.all([
    text("app/layout.tsx"),
    text("app/canonical-system.css"),
    text("app/homepage-reference.css"),
    text("app/canonical-release.css"),
  ]);

  assert.match(layout, /import "\.\/canonical-system\.css";/);
  assert.match(layout, /import "\.\/homepage-reference\.css";/);
  assert.match(layout, /import "\.\/canonical-release\.css";/);
  assert.ok(layout.indexOf('import "./canonical-system.css";') > layout.indexOf('import "./accessibility-hardening.css";'));
  assert.ok(layout.indexOf('import "./homepage-reference.css";') > layout.indexOf('import "./canonical-system.css";'));
  assert.ok(layout.indexOf('import "./canonical-release.css";') > layout.indexOf('import "./homepage-reference.css";'));

  assert.match(css, /--fm-bg:\s*#0D0F0E/i);
  assert.match(css, /--fm-surface:\s*#151817/i);
  assert.match(css, /--fm-paper:\s*#F4F0E8/i);
  assert.match(css, /--fm-clean:\s*#FFFDF9/i);
  assert.match(css, /--fm-signal:\s*#176347/i);
  assert.match(css, /--fm-signal-light:\s*#65B58E/i);
  assert.match(releaseCss, /prefers-reduced-motion:\s*reduce/i);
  assert.doesNotMatch(`${css}\n${homepageCss}\n${releaseCss}`, /source-x-ray/i);
});

test("canonical identity uses approved production SVG assets with exact lockup ratio", async () => {
  const brand = await text("components/brand.tsx");
  assert.match(brand, /\/brand\/foremention-logo-white\.svg/);
  assert.match(brand, /\/brand\/foremention-logo\.svg/);
  assert.match(brand, /\/brand\/foremention-mark-white\.svg/);
  assert.match(brand, /\/brand\/foremention-mark\.svg/);
  assert.match(brand, /width="264\.096"/);
  assert.match(brand, /height="33\.24"/);
});

test("homepage follows the founder-supplied original reference with lightweight layered 5d depth", async () => {
  const [home, signal, layout, homepageCss, releaseCss] = await Promise.all([
    text("components/goat-home-experience.tsx"),
    text("components/canonical-signal-field.tsx"),
    text("app/layout.tsx"),
    text("app/homepage-reference.css"),
    text("app/canonical-release.css"),
  ]);

  assert.match(home, /THE FOREMENTION STANDARD/);
  assert.match(home, /Register\. Prove\. Prepare\./);
  assert.match(home, /The trusted foundation for recommendation intelligence/);
  assert.match(home, /Capture signals as immutable records\./);
  assert.match(home, /Verify provenance with integrity at every step\./);
  assert.match(home, /Make confident decisions with real evidence\./);
  assert.match(home, /canonical-home__dot/);
  assert.match(home, /canonical-button--overview/);
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
  const nav = await text("components/workspace-navigation.tsx");
  const primary = nav.slice(nav.indexOf("const primaryNav"), nav.indexOf("const workspaceNav"));
  for (const label of ["Attention", "Questions", "Records", "Comparisons", "Settings"]) {
    assert.match(primary, new RegExp(`"${label}"`));
  }
  assert.doesNotMatch(primary, /Source X-Ray|Evidence Vault|Competitors|Actions/);
});

test("Recommendation Record evidence semantics stay distinct and standalone Source X-Ray is retired", async () => {
  const [home, runDetail, retiredSourceRoute, activationAnalytics, reviewForm] = await Promise.all([
    text("components/goat-home-experience.tsx"),
    text("app/app/runs/[id]/page.tsx"),
    text("app/app/sources/[id]/page.tsx"),
    text("components/workspace-activation-analytics.tsx"),
    text("components/source-review-form.tsx"),
  ]);

  for (const label of ["ANSWER", "REFERENCE", "SOURCE", "REVIEW"]) assert.match(home, new RegExp(label));
  for (const label of ["RETURNED", "RETRIEVED", "OBSERVED", "REVIEWED", "SAFE CONCLUSION"]) assert.match(home, new RegExp(label));
  assert.match(home, /registered-foundation/);
  assert.match(home, /Inspect evidence/);
  assert.match(runDetail, /Recommendation Record/);
  assert.doesNotMatch(runDetail, /Source X-Ray/);
  assert.match(retiredSourceRoute, /redirect\("\/app\/source-map"\)/);
  assert.doesNotMatch(activationAnalytics, /source_xray/);
  assert.doesNotMatch(reviewForm, /source_xray/);
});
