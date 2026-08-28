import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("canonical visual system is wired as the final presentation layer", async () => {
  const [layout, css] = await Promise.all([
    text("app/layout.tsx"),
    text("app/canonical-system.css"),
  ]);

  assert.match(layout, /import "\.\/canonical-system\.css";/);
  assert.ok(layout.indexOf('import "./canonical-system.css";') > layout.indexOf('import "./accessibility-hardening.css";'));

  assert.match(css, /--fm-bg:\s*#0D0F0E/i);
  assert.match(css, /--fm-surface:\s*#151817/i);
  assert.match(css, /--fm-paper:\s*#F4F0E8/i);
  assert.match(css, /--fm-clean:\s*#FFFDF9/i);
  assert.match(css, /--fm-signal:\s*#176347/i);
  assert.match(css, /--fm-signal-light:\s*#65B58E/i);
  assert.match(css, /prefers-reduced-motion:\s*reduce/i);
  assert.doesNotMatch(css, /source-x-ray/i);
});

test("canonical identity uses approved production SVG assets", async () => {
  const brand = await text("components/brand.tsx");
  assert.match(brand, /\/brand\/foremention-logo-white\.svg/);
  assert.match(brand, /\/brand\/foremention-logo\.svg/);
  assert.match(brand, /\/brand\/foremention-mark-white\.svg/);
  assert.match(brand, /\/brand\/foremention-mark\.svg/);
});

test("homepage implements the approved Figma expression and signal field", async () => {
  const [home, signal] = await Promise.all([
    text("components/goat-home-experience.tsx"),
    text("components/canonical-signal-field.tsx"),
  ]);

  assert.match(home, /THE FOREMENTION STANDARD/);
  assert.match(home, /Register\. Prove\. Prepare\./);
  assert.match(home, /Recommendation intelligence for B2B software\./);
  assert.match(home, /CanonicalSignalField/);
  assert.match(home, /Register/);
  assert.match(home, /Prove/);
  assert.match(home, /Prepare/);
  assert.match(signal, /aria-hidden="true"/);
  assert.doesNotMatch(signal, /confidence|accuracy|score/i);
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

  assert.match(runDetail, /Recommendation Record/);
  assert.doesNotMatch(runDetail, /Source X-Ray/);
  assert.match(retiredSourceRoute, /redirect\("\/app\/source-map"\)/);
  assert.doesNotMatch(activationAnalytics, /source_xray/);
  assert.doesNotMatch(reviewForm, /source_xray/);
});
