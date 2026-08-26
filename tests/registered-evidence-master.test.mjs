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

test("homepage carries the locked category and Registered Evidence hero", () => {
  const hero = read("components/goat-home-experience.tsx");

  assert.match(hero, /THE RECOMMENDATION STANDARD/);
  assert.match(hero, /Register\. Prove\.<br \/>Prepare\./);
  assert.match(hero, /Recommendation intelligence for B2B software\./);
  assert.match(hero, /See an example/);
  assert.match(hero, /ILLUSTRATIVE RECORD/);
  assert.match(hero, /ANSWER/);
  assert.match(hero, /Observed/);
  assert.match(hero, /SOURCE/);
  assert.match(hero, /Retrievable/);
  assert.match(hero, /REVIEW/);
  assert.match(hero, /Pending/);
  assert.match(hero, /registered-record__rings/);
  assert.match(hero, /registered-record__beam/);
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
});

test("workspace primary navigation is simplified without deleting proven routes", () => {
  const nav = read("components/workspace-navigation.tsx");

  for (const [route, label] of [
    ["/app", "Attention"],
    ["/app/prompts", "Questions"],
    ["/app/runs", "Records"],
    ["/app/source-map", "Source X-Ray"],
    ["/app/analytics", "Comparisons"],
    ["/app/settings", "Settings"],
  ]) assert.ok(nav.includes(`["${route}", "${label}"]`), `missing ${label} navigation route`);

  assert.match(nav, /\["\/app\/competitors", "Competitors"\]/);
  assert.match(nav, /\["\/app\/opportunities", "Opportunities"\]/);
  assert.match(nav, /\["\/app\/placements", "Actions"\]/);
  assert.match(nav, /<ForementionMark \/>Workspace menu/);
});

test("Source X-Ray keeps its interaction and epistemic boundary", () => {
  const source = read("components/goat-home-experience.tsx");

  assert.match(source, /id="source-xray-stage"/);
  assert.match(source, /ArrowRight/);
  assert.match(source, /event\.key === " " \|\| event\.key === "Enter"/);
  assert.match(source, /A returned source is evidence of what came with the answer—not proof that the source caused the answer\./);
  assert.match(source, /A provider may return no citations/);
});
