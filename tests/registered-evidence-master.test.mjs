import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const read = (file) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

test("Registered Evidence is the final presentation layer", () => {
  const layout = read("app/layout.tsx");
  const css = read("app/registered-evidence.css");

  assert.match(layout, /import "\.\/registered-evidence\.css";/);
  assert.ok(layout.indexOf("registered-evidence.css") > layout.indexOf("canonical-brand.css"));

  for (const [token, value] of [
    ["--re-ink", "#0D0F0E"],
    ["--re-graphite", "#151817"],
    ["--re-warm", "#F4F0E8"],
    ["--re-surface", "#FFFDF9"],
    ["--re-registered", "#176347"],
    ["--re-info", "#355F7A"],
    ["--re-warning", "#9A6700"],
    ["--re-contradictory", "#A33A34"],
    ["--re-unknown", "#6B706C"],
    ["--re-insufficient", "#775E29"],
    ["--re-not-comparable", "#59606A"],
  ]) assert.match(css, new RegExp(`${token}:\\s*${value}`, "i"));

  assert.match(css, /--re-font-display:[^;]*Newsreader/i);
  assert.match(css, /--re-font-sans:[^;]*Inter/i);
  assert.match(css, /--re-font-mono:[^;]*IBM Plex Mono/i);
  assert.match(css, /@media \(max-width:\s*1024px\)/);
  assert.match(css, /@media \(max-width:\s*780px\)/);
  assert.match(css, /@media \(max-width:\s*480px\)/);
  assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /@media \(prefers-reduced-transparency:\s*reduce\)/);
  assert.doesNotMatch(css, /linear-gradient|radial-gradient|filter:\s*blur/i);
});

test("homepage carries the locked Foremention category and original-reference hero", () => {
  const hero = read("components/goat-home-experience.tsx");
  const signal = read("components/canonical-signal-field.tsx");

  assert.match(hero, /THE FOREMENTION STANDARD/);
  assert.match(hero, /aria-label="Register\. Prove\. Prepare\."/);
  assert.match(hero, /Recommendation intelligence for B2B software\./);
  assert.match(hero, /Request a demo/);
  assert.match(hero, /View overview/);
  assert.match(hero, /LIVE RECORD \/ ILLUSTRATIVE/);
  assert.match(hero, /ANSWER/);
  assert.match(hero, /Observed/);
  assert.match(hero, /REFERENCE/);
  assert.match(hero, /Returned/);
  assert.match(hero, /SOURCE/);
  assert.match(hero, /Retrievable/);
  assert.match(hero, /REVIEW/);
  assert.match(hero, /Pending/);
  assert.match(signal, /canonical-signal__depth--rings/);
  assert.match(signal, /canonical-signal__beam/);
  assert.match(signal, /canonical-signal__horizon/);
  assert.match(hero, /The recommendation is only the start\./);
  assert.match(hero, /returned references[^.]*distinct sources[^.]*retrievability[^.]*review state[^.]*later comparison eligibility/i);
});

test("public navigation reflects the locked public information architecture", () => {
  const shell = read("components/public-shell.tsx");

  assert.match(shell, /\["\/product", "Product"\]/);
  assert.match(shell, /\["\/methodology", "Methodology"\]/);
  assert.match(shell, /\["\/insights", "Research"\]/);
  assert.match(shell, />Request a demo/);
  assert.match(shell, /href="\/login">Sign in/);
  assert.match(shell, /Recommendation intelligence for B2B software/);
  assert.doesNotMatch(shell, /Source X-Ray|\/source-x-ray/);
});

test("workspace primary navigation is the five-object inspection architecture without deleting proven routes", () => {
  const nav = read("components/workspace-navigation.tsx");

  for (const [route, label] of [
    ["/app", "Attention"],
    ["/app/prompts", "Questions"],
    ["/app/runs", "Records"],
    ["/app/analytics", "Comparisons"],
    ["/app/settings", "Settings"],
  ]) assert.ok(nav.includes(`["${route}", "${label}"]`), `missing ${label} navigation route`);

  assert.doesNotMatch(nav, /Source X-Ray/);
  assert.match(nav, /\["\/app\/competitors", "Competitors"\]/);
  assert.match(nav, /\["\/app\/opportunities", "Opportunities"\]/);
  assert.match(nav, /\["\/app\/placements", "Actions"\]/);
  assert.match(nav, /<ForementionMark \/>Workspace menu/);
});

test("Recommendation Record owns evidence inspection and Source X-Ray is retired as a standalone surface", () => {
  const record = read("app/recommendation-record/page.tsx");
  const recordComponent = read("components/recommendation-answer-record.tsx");
  const evidenceComponent = read("components/recommendation-source-evidence.tsx");
  const retiredRoute = read("app/app/sources/[id]/page.tsx");
  const homepage = read("app/page.tsx");
  const product = read("app/product/page.tsx");
  const sitemap = read("app/sitemap.ts");

  assert.match(record, /Returned/i);
  assert.match(record, /Retrieved/i);
  assert.match(record, /Observed/i);
  assert.match(record, /Reviewed/i);
  assert.match(record, /Conclude|conclusion/i);
  assert.match(record, /returned (?:reference|source)[^.]*causal|do not establish[^.]*caus/i);
  assert.match(record, /comparison eligibility|later-comparison eligibility/i);
  assert.match(recordComponent, /Evidence inspection/);
  assert.match(evidenceComponent, /SourceLiveInspector/);
  assert.match(evidenceComponent, /SourceReviewForm/);
  assert.match(retiredRoute, /redirect\("\/app\/source-map"\)/);

  assert.doesNotMatch(record, /Source X-Ray|\/source-x-ray/);
  assert.doesNotMatch(homepage, /Source X-Ray|source-xray/i);
  assert.doesNotMatch(product, /Source X-Ray|source-xray/i);
  assert.doesNotMatch(sitemap, /\/source-x-ray/);
  assert.equal(fs.existsSync(path.join(process.cwd(), "app/source-x-ray/page.tsx")), false);
});
