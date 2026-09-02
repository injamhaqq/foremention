import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");
const exists = async (path) => {
  try {
    await access(new URL(path, root));
    return true;
  } catch {
    return false;
  }
};

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

test("approved canonical Foremention identity artwork stays locked while legacy artwork stays retired", async () => {
  const [brand, publicShell, workspaceNav, layout, seo] = await Promise.all([
    text("components/brand.tsx"),
    text("components/public-shell.tsx"),
    text("components/workspace-navigation.tsx"),
    text("app/layout.tsx"),
    text("lib/seo.ts"),
  ]);

  assert.match(brand, /ForementionMark/);
  assert.match(brand, /wordmark__art/);
  assert.match(brand, /foremention-logo-white\.svg/);
  assert.match(brand, /foremention-mark-white\.svg/);
  assert.match(brand, /<img/);
  assert.doesNotMatch(brand, /wordmark--text-only|wordmark__text|source-eclipse\.svg/);
  assert.match(publicShell, /Wordmark/);
  assert.match(workspaceNav, /Wordmark|ForementionMark/);
  assert.doesNotMatch(`${layout}\n${seo}`, /og\.png|og-platform\.png|SOCIAL_IMAGE/);

  for (const path of [
    "public/brand/foremention-logo-white.svg",
    "public/brand/foremention-mark-white.svg",
  ]) assert.equal(await exists(path), true, `${path} must remain present`);

  for (const path of [
    "public/brand/foremention-logo.svg",
    "public/brand/foremention-mark.svg",
    "public/foremention-wordmark.png",
    "public/source-eclipse.svg",
    "public/og.png",
    "public/og-platform.png",
    "app/icon.svg",
    "app/icon.png",
    "app/favicon.ico",
  ]) assert.equal(await exists(path), false, `${path} must remain retired`);
});

test("homepage uses the approved outreach composition while retaining lightweight layered signal depth", async () => {
  const [home, signal, layout, outreachCss, releaseCss] = await Promise.all([
    text("components/goat-home-experience.tsx"),
    text("components/canonical-signal-field.tsx"),
    text("app/layout.tsx"),
    text("app/outreach-site.css"),
    text("app/canonical-release.css"),
  ]);

  assert.match(home, /Know what your company should change next to become the stronger recommendation\./);
  assert.match(home, /Recommendation intelligence for B2B software/i);
  assert.match(home, /Apply as a Design Partner/);
  assert.match(home, /See how it works/);
  assert.match(home, /CanonicalSignalField/);
  assert.match(home, /Company Truth/);
  assert.match(home, /Eligibility/);
  assert.match(home, /Change Specification/);
  assert.match(home, /NEXT COMPANY CHANGE/);
  assert.match(signal, /canonical-signal--5d/);
  assert.match(signal, /IntersectionObserver/);
  assert.match(signal, /prefers-reduced-motion/);
  assert.match(signal, /canonical-signal__horizon/);
  assert.match(signal, /canonical-signal__beam/);
  assert.doesNotMatch(signal, /foremention-hero-signal\.jpg/);
  assert.doesNotMatch(signal, /three|webgl|canvas/i);
  assert.match(outreachCss, /\.outreach-hero/);
  assert.match(outreachCss, /\.outreach-workflow/);
  assert.match(releaseCss, /canonical-signal__depth--horizon/);
  assert.match(layout, /Recommendation intelligence for B2B software/);
});

test("signed-in primary IA remains exactly five product objects", async () => {
  const nav = await text("components/workspace-navigation.tsx");
  const primary = nav.slice(nav.indexOf("const primaryNav"), nav.indexOf("export const CONTEXTUAL_WORKSPACE_ROUTES"));
  for (const label of ["Attention", "Questions", "Records", "Comparisons", "Settings"]) assert.match(primary, new RegExp(`"${label}"`));
  assert.doesNotMatch(primary, /Source X-Ray|Evidence Vault|Competitors|Actions/);
  assert.match(nav, /CONTEXTUAL_WORKSPACE_ROUTES/);
});

test("Recommendation Record evidence semantics stay distinct and standalone Source X-Ray is retired", async () => {
  const [recordPage, runDetail, retiredSourceRoute, activationAnalytics, reviewForm] = await Promise.all([
    text("app/recommendation-record/page.tsx"),
    text("app/app/runs/[id]/page.tsx"),
    text("app/app/sources/[id]/page.tsx"),
    text("components/workspace-activation-analytics.tsx"),
    text("components/source-review-form.tsx"),
  ]);
  for (const label of ["Observed answer", "Returned references", "Distinct sources", "Review state"]) assert.match(recordPage, new RegExp(label, "i"));
  for (const label of ["Returned", "Retrieved", "Observed", "Reviewed", "Safe conclusion"]) assert.match(recordPage, new RegExp(label, "i"));
  assert.match(recordPage, /Recommendation Record/);
  assert.match(recordPage, /Inspect the evidence chain/);
  assert.match(runDetail, /Recommendation Record/);
  assert.doesNotMatch(runDetail, /Source X-Ray/);
  assert.match(retiredSourceRoute, /redirect\("\/app\/source-map"\)/);
  assert.doesNotMatch(activationAnalytics, /source_xray/);
  assert.doesNotMatch(reviewForm, /source_xray/);
});
