import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("Evidence Standard foundation remains available beneath Registered Evidence", () => {
  const layout = read("app/layout.tsx");
  const css = read("app/evidence-standard.css");

  assert.match(layout, /import "\.\/evidence-standard\.css"/);
  assert.match(layout, /import "\.\/registered-evidence\.css"/);
  assert.ok(layout.indexOf("registered-evidence.css") > layout.indexOf("evidence-standard.css"));
  for (const token of [
    "--fm-paper: #F7F5EF",
    "--fm-surface: #FCFBF7",
    "--fm-ink: #10110F",
    "--fm-graphite: #3F403B",
    "--fm-muted: #6E7068",
    "--fm-rule: #D8D5CC",
    "--fm-evidence: #879A4A",
    "--fm-evidence-wash: #E2E6CF",
    "--fm-evidence-deep: #4D5837",
  ]) assert.ok(css.includes(token), `missing ${token}`);

  assert.match(css, /--fm-font-display:/);
  assert.match(css, /--fm-font-sans:/);
  assert.match(css, /--fm-font-mono:/);
  assert.match(css, /\.button--ink[\s\S]*background:\s*var\(--fm-ink\)/);
});

test("public Evidence Standard accessibility refinements remain explicit", () => {
  const homeCss = read("app/evidence-standard-home.css");
  const home = read("app/page.tsx");

  assert.match(homeCss, /@media \(prefers-reduced-transparency: reduce\)/);
  assert.match(homeCss, /backdrop-filter:\s*none/);
  assert.match(homeCss, /\.fm-honesty-state[\s\S]*font-size:\s*11px/);
  assert.match(homeCss, /\.fm-record-meta[\s\S]*font-size:\s*11px/);
  assert.match(homeCss, /\.fm-readiness-states span[\s\S]*font-size:\s*11px/);
  assert.match(homeCss, /\.xray-product-shell[\s\S]*background:\s*var\(--fm-ink\)/);
  assert.match(home, /fm-compare__boundary[^>]*><Arrow \/><\/div>/);
});

test("public navigation reflects the Registered Evidence information architecture", () => {
  const shell = read("components/public-shell.tsx");
  for (const item of ["Product", "Methodology", "Research"]) assert.ok(shell.includes('\"' + item + '\"'));
  assert.match(shell, /Request a demo/);
  assert.match(shell, /Sign in/);
  assert.match(shell, /Private beta workspace/);
  assert.match(shell, /href="\/recommendation-record"/);
  assert.match(shell, /href="\/recommendation-intelligence"/);
  assert.match(shell, /href="\/ai-mediated-buying"/);
  assert.doesNotMatch(shell, /Source X-Ray|\/source-x-ray/);
  assert.doesNotMatch(shell, /\["\/pricing", "Pricing"\]/);
});

test("public metadata keeps the returned-evidence boundary without causal overclaim", () => {
  const layout = read("app/layout.tsx");
  assert.match(layout, /returned citation URLs/i);
  assert.match(layout, /returned-source records/i);
  assert.doesNotMatch(layout, /Know why AI recommends/i);
  assert.doesNotMatch(layout, /webpages supporting them/i);
});

test("homepage hero uses Registered Evidence while commercial truth remains explicit", () => {
  const experience = read("components/goat-home-experience.tsx");
  const home = read("app/page.tsx");
  const pricing = read("app/pricing/page.tsx");
  const primitives = read("components/evidence-standard-primitives.tsx");
  const combined = experience + "\n" + home;

  assert.match(experience, /Register\. Prove\./);
  assert.match(experience, /Prepare\./);
  assert.match(experience, /Recommendation intelligence for B2B software\./);
  assert.match(experience, /LIVE RECORD \/ ILLUSTRATIVE/);
  assert.match(experience, /Recommendation Record/);
  assert.match(experience, /Evidence inspection/);
  assert.match(home, /Private beta/);
  assert.match(pricing, /Creating a workspace does not charge a card/);
  assert.match(pricing, /Paid checkout is not active/);
  assert.match(combined, /returned reference/i);
  assert.match(combined, /retrievable/i);
  assert.match(combined, /review/i);
  assert.match(primitives, /NOT OBSERVED/);
  assert.match(primitives, /NOT COMPARABLE/);
  assert.match(primitives, /INSUFFICIENT EVIDENCE/);
});

test("homepage retains the canonical six-scene evidence narrative beneath the conviction layer", () => {
  const home = read("app/page.tsx");

  for (const scene of [
    "01 / Recommendation record",
    "02 / Honesty as product",
    "03 / Competitor evidence",
    "04 / Decision Gate",
    "05 / Later measurement",
    "06 / Enter workspace",
  ]) assert.ok(home.includes(scene), "missing homepage scene: " + scene);

  assert.doesNotMatch(home, /Source X-Ray|source-xray/i);
  assert.match(home, /Decision-ready/);
  assert.match(home, /Directional only/);
  assert.match(home, /Insufficient evidence/);
  assert.match(home, /collection coverage/i);
  assert.match(home, /provider agreement/i);
  assert.match(home, /source review/i);
  assert.match(home, /source concentration/i);
  assert.match(home, /exact repeatability/i);
  assert.doesNotMatch(home, /\b\d{1,3}\s*\/\s*100\b/);
  assert.match(home, /RUN \/ 01/);
  assert.match(home, /RUN \/ 02/);
  assert.match(home, /Build your first Recommendation Record\./);
});

test("competitor and later-measurement scenes preserve product truth boundaries", () => {
  const home = read("app/page.tsx");

  assert.match(home, /Illustrative product interface/);
  assert.match(home, /provider/i);
  assert.match(home, /run id/i);
  assert.match(home, /returned reference/i);
  assert.match(home, /distinct source/i);
  assert.match(home, /review state/i);
  assert.match(home, /observed change/i);
  assert.match(home, /not proof of causation/i);
  assert.match(home, /≠ NOT COMPARABLE/);
  assert.doesNotMatch(home, /leaderboard/i);
});

test("Recommendation Record integrates evidence inspection without causal overclaim", () => {
  const experience = read("components/goat-home-experience.tsx");
  const home = read("app/page.tsx");
  const combined = experience + "\n" + home;

  assert.match(experience, /id="recommendation-record"/);
  assert.match(experience, /Evidence inspection/);
  assert.match(experience, /Returned/);
  assert.match(experience, /Retrievable/);
  assert.match(experience, /REVIEW/);
  assert.doesNotMatch(combined, /Source X-Ray|source-xray/i);
  assert.doesNotMatch(combined, /What shaped the answer/i);
});

test("semantic primitives keep evidence meaning visible without color", () => {
  const primitives = read("components/evidence-standard-primitives.tsx");
  assert.match(primitives, /export function RunningLabel/);
  assert.match(primitives, /export function EvidenceReference/);
  assert.match(primitives, /export function HonestyState/);
  assert.match(primitives, /NOT OBSERVED/);
  assert.match(primitives, /NOT COMPARABLE/);
  assert.match(primitives, /INSUFFICIENT EVIDENCE/);
});
